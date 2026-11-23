import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agruparPorMes, motivosPresentes, filtrar, totales, textoParaCopiar,
} from '../js/historial.js';

let n = 0;
const reg = (fecha, motivo, minutosPagados, monto, extra = {}) => ({
  id: `id-${++n}`, fecha, motivo, modo: minutosPagados ? 'horas' : 'fijo',
  minutosPagados, monto, multiplicador: 1, nota: '',
  creado: `2026-01-01T00:00:${String(n).padStart(2, '0')}.000Z`, ...extra,
});

const datos = [
  reg('2026-11-23', 'haberes', 330, 24750),
  reg('2026-09-10', 'haberes', 240, 18000),
  reg('2026-11-20', 'feriado', 240, 36000, { multiplicador: 2 }),
  reg('2026-11-05', 'haberes', 300, 22500, { nota: 'limpieza profunda' }),
  reg('2026-12-18', 'aguinaldo', 0, 150000),
];

test('agruparPorMes ordena los meses del más nuevo al más viejo', () => {
  assert.deepEqual(agruparPorMes(datos).map((g) => g.mes), ['2026-12', '2026-11', '2026-09']);
});

test('agruparPorMes suma horas y pagos de cada mes', () => {
  const nov = agruparPorMes(datos).find((g) => g.mes === '2026-11');
  assert.equal(nov.minutos, 870);
  assert.equal(nov.monto, 83250);
});

test('agruparPorMes ordena los registros por fecha y luego por creación', () => {
  const mismoDia = [
    reg('2026-10-02', 'haberes', 60, 1000),
    reg('2026-10-01', 'haberes', 60, 2000),
    reg('2026-10-02', 'licencia', 60, 3000),
  ];
  const [oct] = agruparPorMes(mismoDia);
  assert.deepEqual(oct.registros.map((r) => r.monto), [2000, 1000, 3000]);
});

test('agruparPorMes sin registros devuelve una lista vacía', () => {
  assert.deepEqual(agruparPorMes([]), []);
});

test('totales', () => {
  assert.deepEqual(totales(datos), { minutos: 1110, monto: 251250 });
  assert.deepEqual(totales([]), { minutos: 0, monto: 0 });
});

test('motivosPresentes devuelve solo los usados, en el orden de la tabla', () => {
  const nov = agruparPorMes(datos).find((g) => g.mes === '2026-11');
  assert.deepEqual(motivosPresentes(nov.registros), ['haberes', 'feriado']);
  assert.deepEqual(motivosPresentes([]), []);
});

test('filtrar con conjunto vacío devuelve todo', () => {
  assert.equal(filtrar(datos, new Set()).length, datos.length);
});

test('filtrar acepta varios motivos', () => {
  const r = filtrar(datos, new Set(['feriado', 'aguinaldo']));
  assert.deepEqual(r.map((x) => x.motivo), ['feriado', 'aguinaldo']);
});

test('textoParaCopiar arma el resumen del mes', () => {
  const nov = agruparPorMes(datos).find((g) => g.mes === '2026-11');
  assert.equal(textoParaCopiar('2026-11', nov.registros), [
    'Noviembre 2026',
    '05/11 · Haberes · 5 h · $ 22.500 · limpieza profunda',
    '20/11 · Feriado (doble) · 4 h · $ 36.000',
    '23/11 · Haberes · 5 h 30 · $ 24.750',
    'Total: 14 h 30 · $ 83.250',
  ].join('\n'));
});

test('textoParaCopiar omite las horas en montos fijos', () => {
  const dic = agruparPorMes(datos).find((g) => g.mes === '2026-12');
  assert.equal(textoParaCopiar('2026-12', dic.registros), [
    'Diciembre 2026',
    '18/12 · Aguinaldo · $ 150.000',
    'Total: $ 150.000',
  ].join('\n'));
});
