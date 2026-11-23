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

const MENSAJE_FALTA = {
  fecha: 'Falta la fecha',
  fechaHasta: 'Falta la fecha de fin',
  entrada: 'Falta la hora de entrada',
  salida: 'Falta la hora de salida',
  horas: 'Falta la cantidad de horas',
  precioHora: 'Falta el precio por hora',
  monto: 'Falta el monto',
  nota: 'Falta la nota: es obligatoria para este motivo',
};

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
  // `revisar` se enciende al tocar Guardar con datos incompletos: desde ahí se
  // marcan también los campos obligatorios vacíos, no solo los valores inválidos.
  const estado = { motivo: 'haberes', modo: 'horas', editando: null, revisar: false };

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

  // Los botones solo se rearman cuando cambia el orden o el elegido. Si se
  // rearmaran en cada actualización, salir de un campo de texto tocando un
  // motivo reemplazaría el botón en pleno toque y ese toque se perdería.
  let motivosDibujados = '';

  function dibujarMotivos() {
    const orden = ordenar(ranking);
    const firma = `${orden.join(',')}|${estado.motivo}`;
    if (firma === motivosDibujados) return;
    motivosDibujados = firma;

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

  // Marca los campos de un grupo que tienen problema y muestra debajo el primero.
  // `grupo` es una lista de pares [campo, clave del problema].
  function mostrarErrores(idError, grupo, problemas) {
    let primero = '';
    for (const [campo, clave] of grupo) {
      const mensaje = problemas[clave];
      campo.classList.toggle('invalido', Boolean(mensaje));
      campo.setAttribute('aria-invalid', String(Boolean(mensaje)));
      primero ||= mensaje ?? '';
    }
    const caja = $(idError);
    caja.textContent = primero;
    caja.hidden = !primero;
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

    // Problemas a mostrar, por clave de campo. Los vacíos solo cuentan después
    // de un intento de guardar; los valores inválidos se muestran siempre.
    const problemas = {};
    if (estado.revisar) {
      for (const clave of r.faltan) problemas[clave] = MENSAJE_FALTA[clave];
    }
    Object.assign(problemas, r.errores);
    if (porHoras && r.tipo === 'rango' && ilegible(campos.horas)) {
      problemas.horas = 'Escribí solo números, por ejemplo 4,5';
    }
    if (porHoras && ilegible(campos.precio)) {
      problemas.precioHora = 'Escribí solo números, por ejemplo 4500';
    }
    if (!porHoras && ilegible(campos.monto)) {
      problemas.monto = 'Escribí solo números, por ejemplo 150000';
    }

    mostrarErrores('error-fechas', [[campos.fecha, 'fecha'], [campos.hasta, 'fechaHasta']], problemas);
    mostrarErrores('error-horario', [[campos.entrada, 'entrada'], [campos.salida, 'salida']], problemas);
    mostrarErrores('error-horas', [[campos.horas, 'horas']], problemas);
    mostrarErrores('error-precio', [[campos.precio, 'precioHora']], problemas);
    mostrarErrores('error-monto', [[campos.monto, 'monto']], problemas);
    mostrarErrores('error-nota', [[campos.nota, 'nota']], problemas);

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

    // El botón queda atenuado pero se puede tocar: al hacerlo señala qué falta.
    botonGuardar.classList.toggle('incompleto', !r.ok);
    return r;
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
    estado.revisar = false;
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
    estado.revisar = false;
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
    if (!actualizar().ok) {
      estado.revisar = true;
      actualizar();
      aviso('Revisá los campos marcados');
      document.querySelector('#form-carga input.invalido')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

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
