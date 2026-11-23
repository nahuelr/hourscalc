import { motivoPorClave, etiquetaDe } from './motivos.js';
import { calcular, construirRegistro } from './calc.js';
import { rankingInicial, registrarUso, ordenar } from './ranking.js';
import {
  dinero, horas, hoyLocal, horaActual, parsearNumero, numeroEditable,
} from './formato.js';
import { $, el, aviso, confirmar, cerrarAlTocarFuera } from './ui-comun.js';

const VISIBLES = 3;

// Si la app estuvo en segundo plano más de este tiempo, al volver se la trata
// como recién abierta: fecha de hoy y hora de salida actual.
const PAUSA_LARGA_MS = 30 * 60 * 1000;

const ETIQUETA_FECHA = { turno: 'Fecha', rango: 'Desde', pago: 'Fecha de pago' };

export function iniciarCalculadora({ store, alGuardar }) {
  const campos = {
    fecha: $('fecha'),
    hasta: $('hasta'),
    entrada: $('entrada'),
    salida: $('salida'),
    horas: $('horas'),
    precio: $('precio'),
    doble: $('doble'),
    monto: $('monto'),
    nota: $('nota'),
  };
  const panel = $('panel-motivos');
  const botonGuardar = $('guardar');

  let ranking = store.leerRanking() ?? rankingInicial();
  // Última fecha cargada mientras la app está abierta; arranca en hoy.
  let fechaSesion = hoyLocal();
  const estado = { motivo: 'haberes', modo: 'horas', editando: null };

  // ---------- Motivos ----------

  function botonMotivo(clave, alElegir) {
    return el('button', {
      type: 'button',
      role: 'radio',
      'aria-checked': String(clave === estado.motivo),
      text: etiquetaDe(clave),
      onclick: () => alElegir(clave),
    });
  }

  function dibujarMotivos() {
    const orden = ordenar(ranking);
    const visibles = orden.slice(0, VISIBLES);
    const resto = orden.slice(VISIBLES);
    const elegidoEnResto = resto.includes(estado.motivo);

    const mas = el('button', {
      type: 'button',
      class: 'mas',
      role: 'radio',
      'aria-checked': String(elegidoEnResto),
      'aria-haspopup': 'dialog',
      text: elegidoEnResto ? etiquetaDe(estado.motivo) : 'Más',
      onclick: () => panel.showModal(),
    });
    $('motivos').replaceChildren(...visibles.map((c) => botonMotivo(c, elegirMotivo)), mas);

    $('panel-motivos-lista').replaceChildren(
      ...resto.map((c) => botonMotivo(c, (clave) => { panel.close(); elegirMotivo(clave); })),
    );
  }

  function elegirMotivo(clave) {
    const motivo = motivoPorClave(clave);
    estado.motivo = clave;
    estado.modo = motivo.modo;
    if (!motivo.permiteDoble) campos.doble.checked = false;
    alinearHasta();
    actualizar();
  }

  // El fin del rango nunca queda antes del inicio por un cambio en "Desde".
  function alinearHasta() {
    if (!campos.hasta.value || campos.hasta.value < campos.fecha.value) {
      campos.hasta.value = campos.fecha.value;
    }
  }

  // ---------- Lectura y validación ----------

  function leerForm() {
    return {
      motivo: estado.motivo,
      modo: estado.modo,
      fecha: campos.fecha.value,
      fechaHasta: campos.hasta.value,
      entrada: campos.entrada.value,
      salida: campos.salida.value,
      horas: parsearNumero(campos.horas.value),
      precioHora: parsearNumero(campos.precio.value),
      doble: campos.doble.checked,
      montoFijo: parsearNumero(campos.monto.value),
      nota: campos.nota.value,
    };
  }

  function mostrarError(idError, campo, mensaje) {
    const caja = $(idError);
    caja.textContent = mensaje ?? '';
    caja.hidden = !mensaje;
    campo.classList.toggle('invalido', Boolean(mensaje));
  }

  // Un campo numérico con texto que no se pudo interpretar.
  const ilegible = (campo) => campo.value.trim() !== '' && parsearNumero(campo.value) === null;

  function actualizar() {
    const motivo = motivoPorClave(estado.motivo);
    const r = calcular(leerForm());
    const porHoras = r.modo === 'horas';

    dibujarMotivos();
    for (const boton of document.querySelectorAll('.segmentado button')) {
      boton.setAttribute('aria-pressed', String(boton.dataset.modo === r.modo));
    }

    // Qué campos pide cada tipo de motivo.
    $('etiqueta-fecha').textContent = ETIQUETA_FECHA[r.tipo];
    $('campo-hasta').hidden = r.tipo !== 'rango';
    $('fila-fechas').classList.toggle('una', r.tipo !== 'rango');
    $('selector-modo').hidden = r.tipo === 'pago';
    $('bloque-horas').hidden = !porHoras;
    $('bloque-fijo').hidden = porHoras;
    $('fila-horario').hidden = r.tipo !== 'turno';
    $('campo-horas').hidden = r.tipo !== 'rango';
    $('fila-doble').hidden = !motivo.permiteDoble;
    $('etiqueta-nota').textContent = motivo.notaObligatoria ? 'Nota (obligatoria)' : 'Nota (opcional)';

    const horasIlegibles = porHoras && r.tipo === 'rango' && ilegible(campos.horas);
    const precioIlegible = porHoras && ilegible(campos.precio);
    const montoIlegible = !porHoras && ilegible(campos.monto);

    mostrarError('error-hasta', campos.hasta, r.errores.fechaHasta);
    mostrarError('error-salida', campos.salida, r.errores.salida);
    mostrarError('error-horas', campos.horas,
      horasIlegibles ? 'Escribí solo números, por ejemplo 4,5' : r.errores.horas);
    mostrarError('error-precio', campos.precio,
      precioIlegible ? 'Escribí solo números, por ejemplo 4500' : r.errores.precioHora);
    mostrarError('error-monto', campos.monto,
      montoIlegible ? 'Escribí solo números, por ejemplo 150000' : r.errores.monto);

    let detalle = '';
    if (porHoras && r.minutosPagados > 0) {
      detalle = horas(r.minutosPagados);
      if (r.minutosReales !== r.minutosPagados) detalle += ` (real ${horas(r.minutosReales)})`;
      if (r.multiplicador === 2) detalle += ' · paga doble';
    } else if (!porHoras) {
      detalle = 'Monto fijo';
    }
    $('resultado-horas').textContent = detalle;
    $('resultado-monto').textContent = dinero(r.monto);

    botonGuardar.disabled = !r.ok || horasIlegibles || precioIlegible || montoIlegible;
  }

  // ---------- Carga del formulario ----------

  function dibujarModoEdicion() {
    const editando = estado.editando;
    $('titulo-calculadora').textContent = editando ? 'Editar carga' : 'Nueva carga';
    $('cancelar-edicion').hidden = !editando;
    $('borrar').hidden = !editando;
    botonGuardar.textContent = editando ? 'Guardar cambios' : 'Guardar';
  }

  function reiniciar() {
    estado.editando = null;
    estado.motivo = ordenar(ranking)[0];
    estado.modo = motivoPorClave(estado.motivo).modo;
    campos.fecha.value = fechaSesion;
    campos.hasta.value = fechaSesion;
    campos.entrada.value = '';
    campos.salida.value = horaActual();
    campos.horas.value = '';
    campos.precio.value = numeroEditable(store.leerPrefs().precioHora);
    campos.doble.checked = false;
    campos.monto.value = '';
    campos.nota.value = '';
    dibujarModoEdicion();
    actualizar();
  }

  function editar(registro) {
    const motivo = motivoPorClave(registro.motivo);
    const porHoras = registro.modo === 'horas';
    estado.editando = registro;
    estado.motivo = registro.motivo;
    estado.modo = registro.modo;
    campos.fecha.value = registro.fecha;
    campos.hasta.value = registro.fechaHasta ?? registro.fecha;
    campos.entrada.value = registro.entrada ?? '';
    campos.salida.value = registro.salida ?? horaActual();
    campos.horas.value = porHoras && motivo.tipo === 'rango'
      ? numeroEditable(registro.minutosPagados / 60)
      : '';
    campos.precio.value = numeroEditable(registro.precioHora ?? store.leerPrefs().precioHora);
    campos.doble.checked = registro.multiplicador === 2;
    campos.monto.value = porHoras ? '' : numeroEditable(registro.monto);
    campos.nota.value = registro.nota ?? '';
    dibujarModoEdicion();
    actualizar();
    $('contenido').scrollTop = 0;
  }

  // ---------- Acciones ----------

  function guardar() {
    const form = leerForm();
    const eraEdicion = Boolean(estado.editando);
    const guardado = store.guardar(construirRegistro(form, estado.editando));

    if (!eraEdicion) {
      ranking = registrarUso(ranking, form.motivo);
      store.guardarRanking(ranking);
      fechaSesion = form.fecha;
    }
    if (guardado.modo === 'horas') {
      store.guardarPrefs({ ...store.leerPrefs(), precioHora: form.precioHora });
    }

    aviso(eraEdicion ? 'Cambios guardados' : `Guardado: ${dinero(guardado.monto)}`);
    reiniciar();
    alGuardar({ eraEdicion });
  }

  async function borrar() {
    if (!(await confirmar('¿Borrar esta carga? No se puede deshacer.', 'Borrar'))) return;
    store.borrar(estado.editando.id);
    aviso('Carga borrada');
    reiniciar();
    alGuardar({ eraEdicion: true });
  }

  // ---------- Eventos ----------

  campos.fecha.addEventListener('change', alinearHasta);
  for (const campo of Object.values(campos)) {
    campo.addEventListener('input', actualizar);
    campo.addEventListener('change', actualizar);
  }
  for (const boton of document.querySelectorAll('.segmentado button')) {
    boton.addEventListener('click', () => {
      estado.modo = boton.dataset.modo;
      actualizar();
    });
  }
  $('form-carga').addEventListener('submit', (evento) => evento.preventDefault());
  botonGuardar.addEventListener('click', guardar);
  $('borrar').addEventListener('click', borrar);
  $('cancelar-edicion').addEventListener('click', () => {
    reiniciar();
    alGuardar({ eraEdicion: true });
  });
  cerrarAlTocarFuera(panel);

  // En el celular la app suele quedar abierta en segundo plano de un día para
  // el otro; al volver tras una pausa larga se actualizan fecha y hora.
  let ocultaDesde = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      ocultaDesde = Date.now();
      return;
    }
    const pausaLarga = ocultaDesde !== null && Date.now() - ocultaDesde > PAUSA_LARGA_MS;
    ocultaDesde = null;
    if (!pausaLarga || estado.editando) return;
    fechaSesion = hoyLocal();
    campos.fecha.value = fechaSesion;
    campos.hasta.value = fechaSesion;
    campos.salida.value = horaActual();
    actualizar();
  });

  reiniciar();
  return { editar };
}
