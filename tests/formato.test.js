import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dinero, horas, mesCorto, mesLargo, fechaCorta, hoyLocal, parsearNumero, horaActual, rangoFechas,
} from '../js/formato.js';

test('dinero usa punto de miles y no muestra decimales', () => {
  assert.equal(dinero(0), '$ 0');
  assert.equal(dinero(950), '$ 950');
  assert.equal(dinero(24750), '$ 24.750');
  assert.equal(dinero(1234567), '$ 1.234.567');
});

test('horas omite los minutos cuando son cero', () => {
  assert.equal(horas(330), '5 h 30');
  assert.equal(horas(240), '4 h');
  assert.equal(horas(15), '0 h 15');
  assert.equal(horas(0), '0 h');
});

test('nombres de mes', () => {
  assert.equal(mesCorto('2026-11'), 'nov 2026');
  assert.equal(mesCorto('2026-09'), 'sep 2026');
  assert.equal(mesLargo('2026-11'), 'Noviembre 2026');
  assert.equal(mesLargo('2027-01'), 'Enero 2027');
});

test('fechaCorta muestra día y mes', () => {
  assert.equal(fechaCorta('2026-11-23'), '23/11');
  assert.equal(fechaCorta('2026-03-05'), '05/03');
});

test('hoyLocal usa la fecha local, no UTC', () => {
  assert.equal(hoyLocal(new Date(2026, 10, 23, 23, 30)), '2026-11-23');
  assert.equal(hoyLocal(new Date(2026, 0, 5, 0, 10)), '2026-01-05');
});

test('parsearNumero entiende formato argentino', () => {
  assert.equal(parsearNumero('4500'), 4500);
  assert.equal(parsearNumero('4.500'), 4500);
  assert.equal(parsearNumero('4.500,50'), 4500.5);
  assert.equal(parsearNumero('4500,5'), 4500.5);
  assert.equal(parsearNumero('1.234.567'), 1234567);
  assert.equal(parsearNumero(' $ 4.500 '), 4500);
});

test('parsearNumero acepta punto como decimal si no parece separador de miles', () => {
  assert.equal(parsearNumero('4500.5'), 4500.5);
  assert.equal(parsearNumero('4500.50'), 4500.5);
});

test('parsearNumero devuelve null si no hay un número', () => {
  assert.equal(parsearNumero(''), null);
  assert.equal(parsearNumero('   '), null);
  assert.equal(parsearNumero('abc'), null);
  assert.equal(parsearNumero('12,3,4'), null);
  assert.equal(parsearNumero('-5'), null);
});

test('horaActual devuelve la hora local con dos dígitos', () => {
  assert.equal(horaActual(new Date(2026, 10, 23, 9, 5)), '09:05');
  assert.equal(horaActual(new Date(2026, 10, 23, 17, 40)), '17:40');
});

test('rangoFechas muestra una fecha o el rango', () => {
  assert.equal(rangoFechas({ fecha: '2026-11-23', fechaHasta: null }), '23/11');
  assert.equal(rangoFechas({ fecha: '2026-11-23', fechaHasta: '2026-11-23' }), '23/11');
  assert.equal(rangoFechas({ fecha: '2026-11-23', fechaHasta: '2026-12-02' }), '23/11 al 02/12');
});
