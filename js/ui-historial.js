import { etiquetaDe } from './motivos.js';
import {
  agruparPorMes, motivosPresentes, filtrar, totales, textoParaCopiar, etiquetaRegistro,
} from './historial.js';
import { dinero, horas, mesCorto, fechaCorta, rangoFechas, hoyLocal } from './formato.js';
import { $, el, aviso, copiarTexto } from './ui-comun.js';

const SVG = 'http://www.w3.org/2000/svg';

function flecha() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'flecha');
  svg.setAttribute('aria-hidden', 'true');
  const trazo = document.createElementNS(SVG, 'path');
  trazo.setAttribute('d', 'M6 9l6 6 6-6');
  svg.append(trazo);
  return svg;
}

function resumen({ minutos, monto }) {
  return minutos > 0 ? `${horas(minutos)} · ${dinero(monto)}` : dinero(monto);
}

export function iniciarHistorial({ store, alEditar }) {
  const abiertos = new Set();   // meses expandidos
  const filtros = new Map();    // mes → Set de motivos marcados

  function filtroDe(mes, presentes) {
    if (!filtros.has(mes)) filtros.set(mes, new Set());
    const filtro = filtros.get(mes);
    // Descarta motivos que ya no están en el mes (por ejemplo, tras borrar una carga).
    for (const clave of filtro) if (!presentes.includes(clave)) filtro.delete(clave);
    return filtro;
  }

  function dibujarFiltro(mes, presentes, filtro) {
    const chip = (texto, activo, alTocar) => el('button', {
      type: 'button', 'aria-pressed': String(activo), text: texto, onclick: alTocar,
    });
    return el('div', { class: 'filtro', role: 'group', 'aria-label': 'Filtrar por motivo' },
      chip('Todos', filtro.size === 0, () => { filtro.clear(); refrescar(); }),
      ...presentes.map((clave) => chip(etiquetaDe(clave), filtro.has(clave), () => {
        if (filtro.has(clave)) filtro.delete(clave);
        else filtro.add(clave);
        refrescar();
      })),
    );
  }

  function dibujarRegistro(r) {
    const detalle = [];
    if (r.fechaHasta && r.fechaHasta !== r.fecha) detalle.push(`hasta el ${fechaCorta(r.fechaHasta)}`);
    if (r.entrada && r.salida) detalle.push(`${r.entrada}–${r.salida}`);
    if (r.minutosPagados > 0) detalle.push(horas(r.minutosPagados));
    if (r.nota) detalle.push(r.nota);
    return el('li', {},
      el('button', {
        type: 'button',
        class: 'registro',
        'aria-label': `Editar carga del ${rangoFechas(r)}, ${etiquetaRegistro(r)}, ${dinero(r.monto)}`,
        onclick: () => alEditar(r),
      },
        el('span', { class: 'registro-fecha', text: fechaCorta(r.fecha) }),
        el('span', { class: 'registro-centro' },
          el('strong', { text: etiquetaRegistro(r) }),
          el('small', { text: detalle.join(' · ') }),
        ),
        el('span', { class: 'registro-monto', text: dinero(r.monto) }),
      ),
    );
  }

  function dibujarDetalle(grupo) {
    const presentes = motivosPresentes(grupo.registros);
    const filtro = filtroDe(grupo.mes, presentes);
    const visibles = filtrar(grupo.registros, filtro);
    const detalle = el('div', { class: 'mes-detalle' });

    detalle.append(dibujarFiltro(grupo.mes, presentes, filtro));
    if (filtro.size > 0) {
      detalle.append(el('p', { class: 'subtotal', text: `Subtotal: ${resumen(totales(visibles))}` }));
    }
    detalle.append(
      el('ul', { class: 'registros' }, ...visibles.map(dibujarRegistro)),
      el('div', { class: 'mes-acciones' },
        el('button', {
          type: 'button',
          class: 'boton-secundario',
          text: filtro.size > 0 ? 'Copiar lo filtrado' : 'Copiar',
          onclick: async () => {
            const ok = await copiarTexto(textoParaCopiar(grupo.mes, visibles));
            aviso(ok ? 'Copiado. Ya podés pegarlo en WhatsApp' : 'No se pudo copiar');
          },
        }),
      ),
    );
    return detalle;
  }

  function dibujarMes(grupo) {
    const abierto = abiertos.has(grupo.mes);
    const encabezado = el('button', {
      type: 'button',
      class: 'mes-encabezado',
      'aria-expanded': String(abierto),
      onclick: () => {
        if (abierto) abiertos.delete(grupo.mes);
        else abiertos.add(grupo.mes);
        refrescar();
      },
    },
      el('span', { class: 'mes-nombre', text: mesCorto(grupo.mes) }),
      el('span', { class: 'dato' }, el('small', { text: 'Horas' }), el('strong', { text: horas(grupo.minutos) })),
      el('span', { class: 'dato' }, el('small', { text: 'Pagos' }), el('strong', { text: dinero(grupo.monto) })),
      flecha(),
    );
    const articulo = el('article', { class: 'mes' }, encabezado);
    if (abierto) articulo.append(dibujarDetalle(grupo));
    return articulo;
  }

  function refrescar() {
    const grupos = agruparPorMes(store.listar());
    $('lista-meses').replaceChildren(...grupos.map(dibujarMes));
    $('lista-meses').hidden = grupos.length === 0;
    $('historial-vacio').hidden = grupos.length > 0;
  }

  // ---------- Copia de seguridad ----------

  $('exportar').addEventListener('click', () => {
    const archivo = new Blob([store.exportar()], { type: 'application/json' });
    const enlace = el('a', {
      href: URL.createObjectURL(archivo),
      download: `hourscalc-copia-${hoyLocal()}.json`,
    });
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
    aviso('Copia descargada');
  });

  const selector = $('archivo-importar');
  $('importar').addEventListener('click', () => selector.click());
  selector.addEventListener('change', async () => {
    const [archivo] = selector.files;
    selector.value = '';
    if (!archivo) return;
    try {
      const { agregados, actualizados } = store.importar(await archivo.text());
      aviso(`Copia importada: ${agregados} nuevas, ${actualizados} actualizadas`);
      refrescar();
    } catch (error) {
      aviso(error.message);
    }
  });

  refrescar();
  return { refrescar };
}
