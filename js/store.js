// Único módulo que lee y escribe datos. Cuando llegue la sincronización con la
// nube y el login, se agregan acá sin tocar las pantallas.

const CLAVE_REGISTROS = 'hourscalc.registros';
const CLAVE_RANKING = 'hourscalc.ranking';
const CLAVE_PREFS = 'hourscalc.prefs';
const VERSION = 1;

function validarCopia(datos) {
  const valido =
    datos !== null &&
    typeof datos === 'object' &&
    Array.isArray(datos.registros) &&
    datos.registros.every(
      (r) => r && typeof r.id === 'string' && typeof r.modificado === 'string',
    );
  if (!valido) throw new Error('Archivo inválido: no es una copia de HoursCalc');
  return datos.registros;
}

export function crearStore(storage, opciones = {}) {
  const ahora = opciones.ahora ?? (() => new Date().toISOString());
  const nuevoId = opciones.nuevoId ?? (() => crypto.randomUUID());

  function leerJson(clave, porDefecto) {
    const crudo = storage.getItem(clave);
    return crudo === null ? porDefecto : JSON.parse(crudo);
  }

  function leerTodos() {
    return leerJson(CLAVE_REGISTROS, { version: VERSION, registros: [] }).registros;
  }

  function escribirTodos(registros) {
    storage.setItem(CLAVE_REGISTROS, JSON.stringify({ version: VERSION, registros }));
  }

  return {
    listar() {
      return leerTodos().filter((r) => !r.eliminado);
    },

    obtener(id) {
      return leerTodos().find((r) => r.id === id && !r.eliminado);
    },

    // Crea o actualiza por id: guardar dos veces el mismo registro no duplica.
    guardar(registro) {
      const todos = leerTodos();
      const momento = ahora();
      const id = registro.id ?? nuevoId();
      const indice = todos.findIndex((r) => r.id === id);
      const guardado = {
        ...registro,
        id,
        creado: indice >= 0 ? todos[indice].creado : (registro.creado ?? momento),
        modificado: momento,
        eliminado: null,
      };
      if (indice >= 0) todos[indice] = guardado;
      else todos.push(guardado);
      escribirTodos(todos);
      return guardado;
    },

    // Borrado lógico: el registro queda marcado para que la eliminación se
    // pueda propagar al sincronizar.
    borrar(id) {
      const todos = leerTodos();
      const registro = todos.find((r) => r.id === id);
      if (!registro) return;
      const momento = ahora();
      registro.eliminado = momento;
      registro.modificado = momento;
      escribirTodos(todos);
    },

    exportar() {
      return JSON.stringify({ version: VERSION, registros: leerTodos() }, null, 2);
    },

    // Fusiona por id; ante el mismo id gana la modificación más reciente.
    importar(json) {
      let datos;
      try {
        datos = JSON.parse(json);
      } catch {
        throw new Error('Archivo inválido: no se pudo leer');
      }
      const entrantes = validarCopia(datos);
      const todos = leerTodos();
      const porId = new Map(todos.map((r, i) => [r.id, i]));
      let agregados = 0;
      let actualizados = 0;
      for (const entrante of entrantes) {
        const indice = porId.get(entrante.id);
        if (indice === undefined) {
          porId.set(entrante.id, todos.push(entrante) - 1);
          agregados++;
        } else if (entrante.modificado > todos[indice].modificado) {
          todos[indice] = entrante;
          actualizados++;
        }
      }
      escribirTodos(todos);
      return { agregados, actualizados };
    },

    leerRanking() {
      return leerJson(CLAVE_RANKING, null);
    },
    guardarRanking(puntajes) {
      storage.setItem(CLAVE_RANKING, JSON.stringify(puntajes));
    },

    leerPrefs() {
      return leerJson(CLAVE_PREFS, {});
    },
    guardarPrefs(prefs) {
      storage.setItem(CLAVE_PREFS, JSON.stringify(prefs));
    },
  };
}
