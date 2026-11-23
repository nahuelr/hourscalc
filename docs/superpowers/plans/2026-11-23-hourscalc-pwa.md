# HoursCalc PWA — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA instalable para registrar horas de la empleada doméstica, calcular el pago y ver el historial por mes.

**Architecture:** Lógica en módulos ES puros (cálculo, ranking, historial, formato) probados con `node --test`. Un único módulo `store.js` accede a `localStorage`. Dos módulos de pantalla manipulan el DOM y solo llaman a los anteriores.

**Tech Stack:** HTML, CSS y JavaScript sin dependencias ni compilación. Node solo para pruebas y para generar íconos.

Especificación: `docs/superpowers/specs/2026-11-23-hourscalc-pwa-design.md`

## Global Constraints

- Sin dependencias de terceros (ni en ejecución ni en pruebas).
- Todas las rutas relativas (`./`), para funcionar bajo `/<repo>/` en GitHub Pages.
- Interfaz en español (es-AR). Dinero `$ 123.456` sin decimales; horas `5 h 30`.
- Texto del usuario (notas) siempre con `textContent`, nunca `innerHTML`.
- Controles táctiles de al menos 48 px de alto. Tema claro y oscuro según el sistema.
- No crear nada en GitHub ni hacer push. Solo commits locales, sin línea de coautoría.

---

### Task 1: Base del proyecto, formato, motivos y cálculo

**Files:**
- Create: `package.json`, `js/motivos.js`, `js/formato.js`, `js/calc.js`
- Test: `tests/formato.test.js`, `tests/calc.test.js`

**Interfaces — Produces:**

```js
// motivos.js
export const MOTIVOS   // [{ clave, etiqueta, modo: 'horas'|'fijo', permiteDoble?, notaObligatoria? }]
export function motivoPorClave(clave)          // → motivo | undefined

// formato.js
export function dinero(n)                      // 123456 → '$ 123.456'
export function horas(min)                     // 330 → '5 h 30', 240 → '4 h'
export function mesCorto('2026-11')            // → 'nov 2026'
export function mesLargo('2026-11')            // → 'Noviembre 2026'
export function fechaCorta('2026-11-23')       // → '23/11'
export function hoyLocal(date = new Date())    // → 'YYYY-MM-DD' en hora local
export function parsearNumero(texto)           // '4.500,50' → 4500.5 ; '' o inválido → null

// calc.js
export function diferenciaMinutos(entrada, salida)   // 'HH:MM' → minutos (puede ser ≤ 0)
export function redondearA15(min)                    // hacia arriba al múltiplo de 15
export function montoPorHoras(precioHora, minutos, multiplicador) // pesos enteros
export function calcular(form)
//   form: { motivo, modo, entrada, salida, precioHora, doble, montoFijo, nota }
//   → { ok, errores: {campo: mensaje}, faltan: [campo], minutosReales, minutosPagados, multiplicador, monto }
export function construirRegistro(form, fecha, previo = null)
//   → registro sin marcas de tiempo (las pone el store); conserva id y creado de `previo`
```

- [ ] Escribir las pruebas: redondeo (330→330, 320→330, 301→315, 1→15), monto (4500 × 330 min = 24750; doble = 49500; redondeo a pesos con precio con centavos), validaciones (salida ≤ entrada, precio 0, monto 0, Otro sin nota, campos vacíos en `faltan`), formato y `parsearNumero` (`'4.500'`→4500, `'4500,5'`→4500.5, `'4500.5'`→4500.5, `'abc'`→null).
- [ ] Ejecutar `node --test` y verificar que falla por módulos inexistentes.
- [ ] Implementar. El monto se calcula en centavos enteros: `Math.round(Math.round(precio*100) * minutos * mult / 6000)`.
- [ ] Ejecutar `node --test` y verificar que pasa.
- [ ] Commit.

### Task 2: Ranking de motivos

**Files:** Create `js/ranking.js` · Test `tests/ranking.test.js`

**Interfaces — Consumes:** `MOTIVOS`. **Produces:**

```js
export function rankingInicial()                       // { haberes: 3, feriado: 0, ... }
export function registrarUso(puntajes, clave, factor = 0.9)  // → objeto nuevo
export function ordenar(puntajes)                      // → claves, mayor a menor; empate por orden de MOTIVOS
```

- [ ] Pruebas: inicial pone Haberes primero; un uso multiplica todo por 0,9 y suma 1; cuatro usos seguidos de Feriado lo ponen primero; empates por orden de la tabla; claves faltantes valen 0; no muta el argumento.
- [ ] Ver fallar, implementar, ver pasar, commit.

### Task 3: Historial

**Files:** Create `js/historial.js` · Test `tests/historial.test.js`

**Interfaces — Consumes:** `MOTIVOS`, `formato.js`. **Produces:**

```js
export function agruparPorMes(registros)
//   → [{ mes: '2026-11', minutos, monto, registros }] meses de nuevo a viejo;
//     registros de cada mes por fecha ascendente y luego por `creado`
export function motivosPresentes(registros)     // → claves en orden de MOTIVOS
export function filtrar(registros, claves)      // claves: Set; vacío = todos
export function totales(registros)              // → { minutos, monto }
export function textoParaCopiar(mes, registros) // → texto de varias líneas
```

- [ ] Pruebas: agrupado y orden, totales (pago doble no duplica minutos), motivos presentes, filtro vacío y con varias claves, texto copiado exacto (incluye `(doble)`, nota al final, monto fijo sin horas, total sin horas si no hay minutos).
- [ ] Ver fallar, implementar, ver pasar, commit.

### Task 4: Almacenamiento

**Files:** Create `js/store.js` · Test `tests/store.test.js`

**Interfaces — Produces:**

```js
export function crearStore(storage, { ahora, nuevoId } = {})
// storage: objeto con getItem/setItem (localStorage o un doble de prueba)
// → {
//   listar(),                 // no eliminados
//   obtener(id),
//   guardar(registro),        // crea o actualiza por id; pone id, creado, modificado → registro guardado
//   borrar(id),               // borrado lógico
//   exportar(),               // string JSON con todo, incluidos eliminados
//   importar(json),           // fusiona → { agregados, actualizados }; lanza Error si es inválido
//   leerRanking(), guardarRanking(puntajes),
//   leerPrefs(), guardarPrefs(prefs)   // { precioHora }
// }
```

Claves: `hourscalc.registros` (`{ version: 1, registros }`), `hourscalc.ranking`, `hourscalc.prefs`.

- [ ] Pruebas con un almacenamiento falso: crear asigna id y marcas; actualizar conserva `creado` y cambia `modificado`; borrar oculta de `listar` pero queda en `exportar`; importar agrega nuevos, reemplaza solo si `modificado` entrante es más nuevo, respeta eliminados y rechaza JSON inválido.
- [ ] Ver fallar, implementar, ver pasar, commit.

### Task 5: Estructura, estilos y pantalla Calculadora

**Files:** Create `index.html`, `styles.css`, `js/app.js`, `js/ui-comun.js`, `js/ui-calculadora.js`

**Interfaces — Produces:**

```js
// ui-comun.js
export function aviso(texto)                       // mensaje breve en pantalla
export function confirmar(texto, etiquetaAceptar)  // → Promise<boolean>
// ui-calculadora.js
export function iniciarCalculadora({ store, alGuardar })  // → { editar(registro) }
```

- [ ] `index.html`: dos secciones, barra inferior de pestañas, panel "Más", diálogo de confirmación.
- [ ] `styles.css`: variables de color para claro y oscuro, controles de 48 px.
- [ ] Calculadora: fecha, tres motivos + "Más", modo, entrada/salida, precio, paga doble, monto, nota, resultado en vivo con aclaración de redondeo, Guardar. Modo edición con Guardar cambios, Cancelar y Borrar.
- [ ] Verificar en el navegador a 360 px de ancho: carga, redondeo visible, validaciones, guardado.
- [ ] Commit.

### Task 6: Pantalla Historial

**Files:** Create `js/ui-historial.js` · Modify `js/app.js`

**Interfaces — Produces:** `iniciarHistorial({ store, alEditar })` → `{ refrescar() }`

- [ ] Lista de meses expandibles con totales, filtro por motivos presentes, subtotal con filtro activo, registros que abren la edición, botón Copiar, exportar e importar copia, estado vacío.
- [ ] Verificar en el navegador: totales, filtro, copiar, editar, borrar, exportar e importar.
- [ ] Commit.

### Task 7: PWA

**Files:** Create `manifest.webmanifest`, `sw.js`, `tools/generar-iconos.mjs`, `icons/*` · Modify `index.html`, `js/app.js`

- [ ] Script de íconos sin dependencias (PNG 192, 512 y maskable 512).
- [ ] Manifest con `display: standalone`, colores e íconos.
- [ ] Service worker con caché versionada de todos los archivos; borra cachés viejas al activarse.
- [ ] Verificar: manifest e íconos cargan, el service worker queda activo y la app abre sin conexión.
- [ ] Commit.

### Task 8: Verificación final

- [ ] `node --test` completo.
- [ ] Recorrido completo en el navegador contra la especificación, en claro y oscuro.
- [ ] Corregir lo que aparezca y commit.
