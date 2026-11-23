import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diferenciaMinutos, redondearA15, montoPorHoras, calcular, construirRegistro,
} from '../js/calc.js';

const base = {
  motivo: 'haberes', modo: 'horas', entrada: '08:00', salida: '13:30',
  precioHora: 4500, doble: false, montoFijo: null, nota: '',
};

test('diferenciaMinutos', () => {
  assert.equal(diferenciaMinutos('08:00', '13:30'), 330);
  assert.equal(diferenciaMinutos('08:05', '13:06'), 301);
  assert.equal(diferenciaMinutos('13:00', '08:00'), -300);
});

test('redondearA15 sube al múltiplo de 15 y deja igual los exactos', () => {
  assert.equal(redondearA15(330), 330);
  assert.equal(redondearA15(320), 330);
  assert.equal(redondearA15(301), 315);
  assert.equal(redondearA15(1), 15);
  assert.equal(redondearA15(15), 15);
  assert.equal(redondearA15(16), 30);
});

test('montoPorHoras', () => {
  assert.equal(montoPorHoras(4500, 330, 1), 24750);
  assert.equal(montoPorHoras(4500, 330, 2), 49500);
  assert.equal(montoPorHoras(4500, 15, 1), 1125);
});

test('montoPorHoras redondea al peso entero, medio peso hacia arriba', () => {
  assert.equal(montoPorHoras(3052.99, 60, 1), 3053);
  assert.equal(montoPorHoras(3052.4, 60, 1), 3052);
  assert.equal(montoPorHoras(4501, 30, 1), 2251); // 2250,5
});

test('calcular en modo horas con múltiplo exacto', () => {
  const r = calcular(base);
  assert.equal(r.ok, true);
  assert.equal(r.minutosReales, 330);
  assert.equal(r.minutosPagados, 330);
  assert.equal(r.multiplicador, 1);
  assert.equal(r.monto, 24750);
  assert.deepEqual(r.errores, {});
  assert.deepEqual(r.faltan, []);
});

test('calcular redondea la diferencia, no cada hora', () => {
  const r = calcular({ ...base, entrada: '08:05', salida: '13:06' });
  assert.equal(r.minutosReales, 301);
  assert.equal(r.minutosPagados, 315);
  assert.equal(r.monto, 23625);
});

test('paga doble solo aplica a motivos que lo permiten', () => {
  const feriado = calcular({ ...base, motivo: 'feriado', doble: true });
  assert.equal(feriado.multiplicador, 2);
  assert.equal(feriado.monto, 49500);
  assert.equal(feriado.minutosPagados, 330);

  const haberes = calcular({ ...base, doble: true });
  assert.equal(haberes.multiplicador, 1);
  assert.equal(haberes.monto, 24750);
});

test('la salida debe ser posterior a la entrada', () => {
  for (const salida of ['08:00', '07:00']) {
    const r = calcular({ ...base, salida });
    assert.equal(r.ok, false);
    assert.ok(r.errores.salida);
    assert.equal(r.monto, 0);
  }
});

test('el precio por hora debe ser mayor que cero', () => {
  const r = calcular({ ...base, precioHora: 0 });
  assert.equal(r.ok, false);
  assert.ok(r.errores.precioHora);
});

test('los campos vacíos se informan en faltan, no como error', () => {
  const r = calcular({ ...base, entrada: '', salida: '', precioHora: null });
  assert.equal(r.ok, false);
  assert.deepEqual(r.errores, {});
  assert.deepEqual(r.faltan, ['entrada', 'salida', 'precioHora']);
});

test('modo fijo usa el monto escrito y no tiene horas', () => {
  const r = calcular({
    ...base, motivo: 'aguinaldo', modo: 'fijo', entrada: '', salida: '',
    precioHora: null, montoFijo: 150000,
  });
  assert.equal(r.ok, true);
  assert.equal(r.minutosPagados, 0);
  assert.equal(r.monto, 150000);
});

test('modo fijo valida el monto', () => {
  const vacio = calcular({ ...base, modo: 'fijo', montoFijo: null });
  assert.equal(vacio.ok, false);
  assert.deepEqual(vacio.faltan, ['monto']);

  const cero = calcular({ ...base, modo: 'fijo', montoFijo: 0 });
  assert.equal(cero.ok, false);
  assert.ok(cero.errores.monto);
});

test('modo fijo redondea el monto a pesos enteros', () => {
  const r = calcular({ ...base, modo: 'fijo', montoFijo: 1000.6 });
  assert.equal(r.monto, 1001);
});

test('Otro exige nota', () => {
  const sin = calcular({ ...base, motivo: 'otro', nota: '   ' });
  assert.equal(sin.ok, false);
  assert.deepEqual(sin.faltan, ['nota']);

  const con = calcular({ ...base, motivo: 'otro', nota: 'Viáticos' });
  assert.equal(con.ok, true);
});

test('construirRegistro en modo horas', () => {
  const reg = construirRegistro({ ...base, nota: '  limpieza  ' }, '2026-11-23');
  assert.deepEqual(reg, {
    fecha: '2026-11-23', motivo: 'haberes', modo: 'horas',
    entrada: '08:00', salida: '13:30', minutosPagados: 330,
    precioHora: 4500, multiplicador: 1, monto: 24750, nota: 'limpieza',
  });
});

test('construirRegistro en modo fijo deja en null lo que no aplica', () => {
  const reg = construirRegistro({
    ...base, motivo: 'aguinaldo', modo: 'fijo', montoFijo: 150000,
  }, '2026-12-18');
  assert.equal(reg.entrada, null);
  assert.equal(reg.salida, null);
  assert.equal(reg.precioHora, null);
  assert.equal(reg.minutosPagados, 0);
  assert.equal(reg.multiplicador, 1);
  assert.equal(reg.monto, 150000);
});

test('construirRegistro conserva id y marcas del registro previo', () => {
  const previo = {
    id: 'abc', creado: '2026-11-01T10:00:00.000Z',
    modificado: '2026-11-01T10:00:00.000Z', eliminado: null,
  };
  const reg = construirRegistro(base, '2026-11-23', previo);
  assert.equal(reg.id, 'abc');
  assert.equal(reg.creado, '2026-11-01T10:00:00.000Z');
});

test('construirRegistro rechaza un formulario inválido', () => {
  assert.throws(() => construirRegistro({ ...base, salida: '07:00' }, '2026-11-23'));
});
