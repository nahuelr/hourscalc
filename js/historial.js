import { MOTIVOS, etiquetaDe } from './motivos.js';
import { dinero, horas, rangoFechas, mesLargo } from './formato.js';

export function totales(registros) {
  let minutos = 0;
  let monto = 0;
  for (const r of registros) {
    minutos += r.minutosPagados;
    monto += r.monto;
  }
  return { minutos, monto };
}

const porFecha = (a, b) =>
  a.fecha.localeCompare(b.fecha) || String(a.creado).localeCompare(String(b.creado));

export function agruparPorMes(registros) {
  const grupos = new Map();
  for (const r of registros) {
    const mes = r.fecha.slice(0, 7);
    if (!grupos.has(mes)) grupos.set(mes, []);
    grupos.get(mes).push(r);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([mes, lista]) => {
      const ordenados = lista.sort(porFecha);
      return { mes, ...totales(ordenados), registros: ordenados };
    });
}

export function motivosPresentes(registros) {
  const usados = new Set(registros.map((r) => r.motivo));
  return MOTIVOS.map((m) => m.clave).filter((clave) => usados.has(clave));
}

export function filtrar(registros, claves) {
  if (claves.size === 0) return registros;
  return registros.filter((r) => claves.has(r.motivo));
}

export function etiquetaRegistro(r) {
  return r.multiplicador === 2 ? `${etiquetaDe(r.motivo)} (doble)` : etiquetaDe(r.motivo);
}

export function textoParaCopiar(mes, registros) {
  const lineas = [mesLargo(mes)];
  for (const r of registros) {
    const partes = [rangoFechas(r), etiquetaRegistro(r)];
    if (r.minutosPagados > 0) partes.push(horas(r.minutosPagados));
    partes.push(dinero(r.monto));
    if (r.nota) partes.push(r.nota);
    lineas.push(partes.join(' · '));
  }
  const total = totales(registros);
  const partesTotal = [];
  if (total.minutos > 0) partesTotal.push(horas(total.minutos));
  partesTotal.push(dinero(total.monto));
  lineas.push(`Total: ${partesTotal.join(' · ')}`);
  return lineas.join('\n');
}
