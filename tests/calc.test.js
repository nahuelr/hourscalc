import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diferenciaMinutos, redondearA15, montoPorHoras, calcular, construirRegistro,
} from '../js/calc.js';

// Turno: un día con hora de entrada y de salida (Haberes, Otro).
const turno = {
  motivo: 'haberes', modo: 'horas', fecha: '2026-11-23', fechaHasta: '',
  entrada: '08:00', salida: '13:30', horas: null,
  precioHora: 4500, doble: false, montoFijo: null, nota: '',
};

// Rango: días de inicio y fin, sin horario (Feriado, Licencia, Vacaciones, ART).
const rango = {
  ...turno, motivo: 'licencia', fechaHasta: '2026-11-25',
  entrada: '', salida: '', horas: 12,
};

// Pago: solo fecha de pago y monto (Aguinaldo).
const pago = {
  ...turno, motivo: 'aguinaldo', modo: 'fijo', fecha: '2026-12-18',
  entrada: '', salida: '', precioHora: null, montoFijo: 150000,
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

// ---------- Turno ----------

test('turno con múltiplo exacto', () => {
  const r = calcular(turno);
  assert.equal(r.ok, true);
  assert.equal(r.tipo, 'turno');
  assert.equal(r.minutosReales, 330);
  assert.equal(r.minutosPagados, 330);
  assert.equal(r.multiplicador, 1);
  assert.equal(r.monto, 24750);
  assert.deepEqual(r.errores, {});
  assert.deepEqual(r.faltan, []);
});

test('turno redondea la diferencia, no cada hora', () => {
  const r = calcular({ ...turno, entrada: '08:05', salida: '13:06' });
  assert.equal(r.minutosReales, 301);
  assert.equal(r.minutosPagados, 315);
  assert.equal(r.monto, 23625);
});

test('turno: la salida debe ser posterior a la entrada', () => {
  for (const salida of ['08:00', '07:00']) {
    const r = calcular({ ...turno, salida });
    assert.equal(r.ok, false);
    assert.ok(r.errores.salida);
    assert.equal(r.monto, 0);
  }
});

test('turno no exige ni valida fecha de fin', () => {
  const r = calcular({ ...turno, fechaHasta: '2020-01-01' });
  assert.equal(r.ok, true);
});

test('el precio por hora debe ser mayor que cero', () => {
  const r = calcular({ ...turno, precioHora: 0 });
  assert.equal(r.ok, false);
  assert.ok(r.errores.precioHora);
});

test('los campos vacíos se informan en faltan, no como error', () => {
  const r = calcular({ ...turno, fecha: '', entrada: '', salida: '', precioHora: null });
  assert.equal(r.ok, false);
  assert.deepEqual(r.errores, {});
  assert.deepEqual(r.faltan, ['fecha', 'entrada', 'salida', 'precioHora']);
});

test('turno en monto fijo no pide horario', () => {
  const r = calcular({ ...turno, modo: 'fijo', entrada: '', salida: '', montoFijo: 1000.6 });
  assert.equal(r.ok, true);
  assert.equal(r.minutosPagados, 0);
  assert.equal(r.monto, 1001);
});

test('monto fijo valida el monto', () => {
  const vacio = calcular({ ...turno, modo: 'fijo', montoFijo: null });
  assert.equal(vacio.ok, false);
  assert.deepEqual(vacio.faltan, ['monto']);

  const cero = calcular({ ...turno, modo: 'fijo', montoFijo: 0 });
  assert.equal(cero.ok, false);
  assert.ok(cero.errores.monto);
});

test('Otro exige nota', () => {
  const sin = calcular({ ...turno, motivo: 'otro', nota: '   ' });
  assert.equal(sin.ok, false);
  assert.deepEqual(sin.faltan, ['nota']);

  const con = calcular({ ...turno, motivo: 'otro', nota: 'Viáticos' });
  assert.equal(con.ok, true);
});

// ---------- Rango ----------

test('rango usa la cantidad de horas escrita, sin horario', () => {
  const r = calcular(rango);
  assert.equal(r.ok, true);
  assert.equal(r.tipo, 'rango');
  assert.equal(r.minutosPagados, 720);
  assert.equal(r.monto, 54000);
});

test('rango ignora entrada y salida aunque vengan cargadas', () => {
  const r = calcular({ ...rango, entrada: '13:00', salida: '08:00' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.errores, {});
});

test('rango redondea las horas al cuarto de hora superior', () => {
  const r = calcular({ ...rango, horas: 4.1 });
  assert.equal(r.minutosReales, 246);
  assert.equal(r.minutosPagados, 255);
});

test('rango de un solo día es válido', () => {
  const r = calcular({ ...rango, fechaHasta: rango.fecha });
  assert.equal(r.ok, true);
});

test('rango: la fecha de fin no puede ser anterior a la de inicio', () => {
  const r = calcular({ ...rango, fechaHasta: '2026-11-22' });
  assert.equal(r.ok, false);
  assert.ok(r.errores.fechaHasta);
});

test('rango exige fecha de fin y cantidad de horas', () => {
  const r = calcular({ ...rango, fechaHasta: '', horas: null });
  assert.equal(r.ok, false);
  assert.deepEqual(r.faltan, ['fechaHasta', 'horas']);
});

test('rango: las horas deben ser mayores que cero', () => {
  const r = calcular({ ...rango, horas: 0 });
  assert.equal(r.ok, false);
  assert.ok(r.errores.horas);
});

test('rango en monto fijo no pide horas', () => {
  const r = calcular({ ...rango, modo: 'fijo', horas: null, montoFijo: 80000 });
  assert.equal(r.ok, true);
  assert.equal(r.minutosPagados, 0);
  assert.equal(r.monto, 80000);
});

test('paga doble solo aplica a motivos que lo permiten', () => {
  const feriado = calcular({ ...rango, motivo: 'feriado', horas: 5.5, doble: true });
  assert.equal(feriado.multiplicador, 2);
  assert.equal(feriado.monto, 49500);
  assert.equal(feriado.minutosPagados, 330);

  const licencia = calcular({ ...rango, horas: 5.5, doble: true });
  assert.equal(licencia.multiplicador, 1);
  assert.equal(licencia.monto, 24750);
});

// ---------- Pago ----------

test('pago solo necesita fecha y monto', () => {
  const r = calcular(pago);
  assert.equal(r.ok, true);
  assert.equal(r.tipo, 'pago');
  assert.equal(r.minutosPagados, 0);
  assert.equal(r.monto, 150000);
});

test('pago es siempre monto fijo e ignora horarios y fecha de fin', () => {
  const r = calcular({
    ...pago, modo: 'horas', entrada: '13:00', salida: '08:00', fechaHasta: '2020-01-01',
  });
  assert.equal(r.ok, true);
  assert.equal(r.modo, 'fijo');
  assert.equal(r.monto, 150000);
});

// ---------- Registro ----------

test('construirRegistro de un turno', () => {
  const reg = construirRegistro({ ...turno, nota: '  limpieza  ' });
  assert.deepEqual(reg, {
    fecha: '2026-11-23', fechaHasta: null, motivo: 'haberes', modo: 'horas',
    entrada: '08:00', salida: '13:30', minutosPagados: 330,
    precioHora: 4500, multiplicador: 1, monto: 24750, nota: 'limpieza',
  });
});

test('construirRegistro de un rango guarda ambas fechas y no guarda horario', () => {
  const reg = construirRegistro({ ...rango, entrada: '08:00', salida: '09:00' });
  assert.equal(reg.fecha, '2026-11-23');
  assert.equal(reg.fechaHasta, '2026-11-25');
  assert.equal(reg.entrada, null);
  assert.equal(reg.salida, null);
  assert.equal(reg.minutosPagados, 720);
  assert.equal(reg.precioHora, 4500);
});

test('construirRegistro de un pago deja en null lo que no aplica', () => {
  const reg = construirRegistro(pago);
  assert.deepEqual(reg, {
    fecha: '2026-12-18', fechaHasta: null, motivo: 'aguinaldo', modo: 'fijo',
    entrada: null, salida: null, minutosPagados: 0,
    precioHora: null, multiplicador: 1, monto: 150000, nota: '',
  });
});

test('construirRegistro conserva id y marcas del registro previo', () => {
  const previo = {
    id: 'abc', creado: '2026-11-01T10:00:00.000Z',
    modificado: '2026-11-01T10:00:00.000Z', eliminado: null,
  };
  const reg = construirRegistro(turno, previo);
  assert.equal(reg.id, 'abc');
  assert.equal(reg.creado, '2026-11-01T10:00:00.000Z');
});

test('construirRegistro rechaza un formulario inválido', () => {
  assert.throws(() => construirRegistro({ ...turno, salida: '07:00' }));
});
