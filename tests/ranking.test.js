import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankingInicial, registrarUso, ordenar } from '../js/ranking.js';

const cerca = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test('el ranking inicial pone Haberes primero y el resto en el orden de la tabla', () => {
  assert.deepEqual(ordenar(rankingInicial()), [
    'haberes', 'feriado', 'licencia', 'vacaciones', 'aguinaldo', 'art', 'otro',
  ]);
});

test('registrarUso multiplica todo por 0,9 y suma 1 al usado', () => {
  const r = registrarUso({ haberes: 3, feriado: 1 }, 'feriado');
  cerca(r.haberes, 2.7);
  cerca(r.feriado, 1.9);
});

test('registrarUso no modifica el objeto recibido', () => {
  const original = { haberes: 3 };
  registrarUso(original, 'haberes');
  assert.deepEqual(original, { haberes: 3 });
});

test('un motivo sin puntaje previo arranca en cero', () => {
  const r = registrarUso({ haberes: 3 }, 'art');
  cerca(r.art, 1);
});

test('los usos recientes pesan más que los viejos', () => {
  let r = rankingInicial();
  for (let i = 0; i < 4; i++) r = registrarUso(r, 'feriado');
  assert.equal(ordenar(r)[0], 'feriado');
  for (let i = 0; i < 4; i++) r = registrarUso(r, 'haberes');
  assert.equal(ordenar(r)[0], 'haberes');
});

test('un solo uso de otro motivo no desplaza a Haberes', () => {
  const r = registrarUso(rankingInicial(), 'licencia');
  assert.deepEqual(ordenar(r).slice(0, 2), ['haberes', 'licencia']);
});

test('ordenar tolera puntajes faltantes o desconocidos', () => {
  assert.deepEqual(ordenar({ otro: 5, inexistente: 99 }), [
    'otro', 'haberes', 'feriado', 'licencia', 'vacaciones', 'aguinaldo', 'art',
  ]);
  assert.equal(ordenar({}).length, 7);
});
