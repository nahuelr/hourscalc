import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearStore } from '../js/store.js';

function almacenFalso(inicial = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    datos,
  };
}

function nuevoStore(storage = almacenFalso()) {
  let reloj = 0;
  let ids = 0;
  const store = crearStore(storage, {
    ahora: () => `2026-11-23T10:00:${String(reloj++).padStart(2, '0')}.000Z`,
    nuevoId: () => `id-${++ids}`,
  });
  return { store, storage };
}

const carga = { fecha: '2026-11-23', motivo: 'haberes', monto: 24750 };

test('sin datos, listar devuelve vacío', () => {
  assert.deepEqual(nuevoStore().store.listar(), []);
});

test('guardar un registro nuevo le asigna id y marcas de tiempo', () => {
  const { store } = nuevoStore();
  const r = store.guardar(carga);
  assert.equal(r.id, 'id-1');
  assert.equal(r.creado, '2026-11-23T10:00:00.000Z');
  assert.equal(r.modificado, r.creado);
  assert.equal(r.eliminado, null);
  assert.deepEqual(store.listar(), [r]);
  assert.deepEqual(store.obtener('id-1'), r);
});

test('guardar con un id existente actualiza sin duplicar', () => {
  const { store } = nuevoStore();
  const original = store.guardar(carga);
  const editado = store.guardar({ ...original, monto: 30000 });
  assert.equal(store.listar().length, 1);
  assert.equal(editado.id, original.id);
  assert.equal(editado.creado, original.creado);
  assert.notEqual(editado.modificado, original.modificado);
  assert.equal(store.obtener(original.id).monto, 30000);
});

test('los datos persisten en el almacenamiento', () => {
  const { store, storage } = nuevoStore();
  store.guardar(carga);
  const otro = nuevoStore(storage).store;
  assert.equal(otro.listar().length, 1);
  assert.equal(JSON.parse(storage.getItem('hourscalc.registros')).version, 1);
});

test('borrar es lógico: desaparece de listar pero queda en exportar', () => {
  const { store } = nuevoStore();
  const r = store.guardar(carga);
  store.borrar(r.id);
  assert.deepEqual(store.listar(), []);
  assert.equal(store.obtener(r.id), undefined);
  const exportado = JSON.parse(store.exportar());
  assert.equal(exportado.registros.length, 1);
  assert.ok(exportado.registros[0].eliminado);
  assert.equal(exportado.registros[0].modificado, exportado.registros[0].eliminado);
});

test('importar agrega los registros que no existen', () => {
  const origen = nuevoStore().store;
  origen.guardar(carga);
  const { store } = nuevoStore();
  assert.deepEqual(store.importar(origen.exportar()), { agregados: 1, actualizados: 0 });
  assert.equal(store.listar().length, 1);
});

test('importar dos veces la misma copia no duplica', () => {
  const origen = nuevoStore().store;
  origen.guardar(carga);
  const { store } = nuevoStore();
  store.importar(origen.exportar());
  assert.deepEqual(store.importar(origen.exportar()), { agregados: 0, actualizados: 0 });
  assert.equal(store.listar().length, 1);
});

test('importar reemplaza solo si la copia es más nueva', () => {
  const { store } = nuevoStore();
  const local = store.guardar(carga);

  const vieja = { ...local, monto: 1, modificado: '2020-01-01T00:00:00.000Z' };
  assert.deepEqual(
    store.importar(JSON.stringify({ version: 1, registros: [vieja] })),
    { agregados: 0, actualizados: 0 },
  );
  assert.equal(store.obtener(local.id).monto, 24750);

  const nueva = { ...local, monto: 2, modificado: '2030-01-01T00:00:00.000Z' };
  assert.deepEqual(
    store.importar(JSON.stringify({ version: 1, registros: [nueva] })),
    { agregados: 0, actualizados: 1 },
  );
  assert.equal(store.obtener(local.id).monto, 2);
});

test('importar propaga un borrado más nuevo', () => {
  const { store } = nuevoStore();
  const local = store.guardar(carga);
  const borrado = {
    ...local, eliminado: '2030-01-01T00:00:00.000Z', modificado: '2030-01-01T00:00:00.000Z',
  };
  store.importar(JSON.stringify({ version: 1, registros: [borrado] }));
  assert.deepEqual(store.listar(), []);
});

test('importar rechaza archivos inválidos sin tocar los datos', () => {
  const { store } = nuevoStore();
  store.guardar(carga);
  for (const malo of ['no es json', '{}', '{"registros":"x"}', '{"registros":[{"sin":"id"}]}', '[]']) {
    assert.throws(() => store.importar(malo), /inválid/);
  }
  assert.equal(store.listar().length, 1);
});

test('ranking y preferencias se guardan y se leen', () => {
  const { store, storage } = nuevoStore();
  assert.equal(store.leerRanking(), null);
  assert.deepEqual(store.leerPrefs(), {});
  store.guardarRanking({ haberes: 3 });
  store.guardarPrefs({ precioHora: 4500 });
  const otro = nuevoStore(storage).store;
  assert.deepEqual(otro.leerRanking(), { haberes: 3 });
  assert.deepEqual(otro.leerPrefs(), { precioHora: 4500 });
});
