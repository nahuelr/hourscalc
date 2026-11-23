# HoursCalc — diseño

Fecha: 2026-11-23

## Objetivo

Una web app instalable (PWA) para Android que permite registrar las horas trabajadas
por la empleada doméstica, calcular cuánto hay que pagarle y consultar el historial
agrupado por mes.

La usa una sola persona en un solo celular. Los datos viven únicamente en ese celular.

## Fuera de alcance (pero previsto)

Más adelante se va a agregar sincronización con una base de datos en la nube y
login/logout (sin registro: los usuarios se crean a mano en la base). Nada de eso se
construye ahora. Lo que sí se deja preparado está en "Preparación para sincronizar".

## Tecnología

- HTML, CSS y JavaScript puros, con módulos ES. Sin frameworks ni paso de compilación.
- Datos en `localStorage` del navegador.
- Hospedaje en GitHub Pages. Todas las rutas son relativas para que funcione bajo
  `/<repo>/`.
- Pruebas con el corredor integrado de Node (`node --test`).
- Idioma de la interfaz: español (es-AR).

## Estructura de archivos

```
index.html
styles.css
manifest.webmanifest
sw.js                  service worker (funcionamiento sin conexión)
icons/                 íconos 192, 512 y maskable
js/
  app.js               arranque, pestañas, registro del service worker
  calc.js              cálculo de horas y montos (puro)
  ranking.js           orden ponderado de motivos (puro)
  historial.js         agrupado por mes, filtro, texto para copiar (puro)
  motivos.js           lista de motivos y sus valores por defecto
  formato.js           formato de dinero, horas y fechas
  store.js             único módulo que lee y escribe datos
  ui-calculadora.js    pantalla Calculadora
  ui-historial.js      pantalla Historial
tests/
  calc.test.js
  ranking.test.js
  historial.test.js
  store.test.js
```

Los módulos marcados como puros no tocan el DOM ni el almacenamiento.

## Motivos

| Clave | Etiqueta | Modo por defecto | Notas |
|---|---|---|---|
| `haberes` | Haberes | horas | |
| `feriado` | Feriado | horas | muestra la opción "Paga doble" |
| `licencia` | Licencia | horas | |
| `vacaciones` | Vacaciones | horas | |
| `aguinaldo` | Aguinaldo | fijo | |
| `art` | ART | horas | pago a la empleada por días de licencia por accidente |
| `otro` | Otro | horas | nota obligatoria |

El modo se puede cambiar a mano en cualquier motivo.

## Cálculo

### Modo horas

1. `diferencia = salida − entrada`, en minutos.
2. `minutosPagados = diferencia` redondeada hacia arriba al múltiplo de 15.
   Se redondea la diferencia, no cada hora por separado. Un múltiplo exacto no cambia.
3. `monto = precioHora × minutosPagados / 60 × multiplicador`, redondeado al peso
   entero más cercano (medio peso hacia arriba).
4. `multiplicador` es 2 si el motivo es Feriado y "Paga doble" está marcado; si no, 1.

Ejemplos: 08:00–13:30 → 5 h 30; 08:00–13:20 → 5 h 30; 08:05–13:06 → 5 h 15.

### Modo fijo

El usuario escribe el monto en pesos enteros. No hay horas.

### Validaciones

- La salida debe ser posterior a la entrada. No se contemplan turnos que crucen la
  medianoche.
- Precio por hora (modo horas) o monto (modo fijo) mayor que cero.
- El precio por hora admite hasta dos decimales, escritos con coma.
- El motivo Otro exige nota.
- Si algo falla, se muestra el error junto al campo y el botón Guardar queda
  deshabilitado.

## Registro

```js
{
  id: "uuid v4",              // crypto.randomUUID(), nunca cambia
  fecha: "2026-11-23",        // fecha local del trabajo
  motivo: "haberes",
  modo: "horas",              // "horas" | "fijo"
  entrada: "08:00",           // null en modo fijo
  salida: "13:20",            // null en modo fijo
  minutosPagados: 330,        // 0 en modo fijo
  precioHora: 4500,           // null en modo fijo
  multiplicador: 1,           // 1 | 2
  monto: 24750,               // pesos enteros
  nota: "",
  creado: "2026-11-23T16:40:00.000Z",
  modificado: "2026-11-23T16:40:00.000Z",
  eliminado: null             // marca de tiempo si se borró
}
```

El precio y el monto quedan guardados en cada registro: un aumento posterior no
altera los meses anteriores.

## Almacenamiento (`store.js`)

Claves en `localStorage`:

- `hourscalc.registros` — `{ version: 1, registros: [...] }`
- `hourscalc.ranking` — puntajes por motivo
- `hourscalc.prefs` — último precio por hora usado

Interfaz:

- `listar()` — registros no eliminados
- `guardar(registro)` — crea o actualiza por `id`, actualiza `modificado`
- `borrar(id)` — borrado lógico: completa `eliminado` y `modificado`
- `exportar()` — todo el contenido, incluidos los eliminados, como JSON
- `importar(json)` — fusiona por `id`; ante el mismo `id` gana el `modificado` más nuevo

El resto de la app solo usa esta interfaz.

## Preparación para sincronizar

- `id` generado en el dispositivo: sirve de clave de idempotencia (insertar o
  actualizar por `id`, sin duplicados).
- `creado` y `modificado` en UTC para resolver conflictos por última modificación.
- Borrado lógico, para que una eliminación se propague en lugar de reaparecer.
- `importar` ya aplica la misma regla de fusión que usará la sincronización.
- Todo el acceso a datos pasa por `store.js`; el login y la nube se agregan ahí.

## Orden de motivos (`ranking.js`)

- Cada motivo tiene un puntaje. Al guardar un registro nuevo, todos los puntajes se
  multiplican por 0,9 y al motivo usado se le suma 1. Editar un registro no cuenta.
- Puntajes iniciales: Haberes 3, el resto 0. Los empates se resuelven por el orden de
  la tabla de motivos.
- El primero del ranking aparece seleccionado al abrir la calculadora.

## Pantallas

Barra inferior con dos pestañas: Calculadora e Historial.

### Calculadora

Campos, de arriba hacia abajo:

1. **Fecha** — por defecto hoy, editable.
2. **Motivo** — los tres motivos con mayor puntaje como botones, más un botón "Más"
   que abre un panel inferior con los restantes. Si se elige uno del panel, el botón
   "Más" pasa a mostrar su nombre y queda resaltado.
3. **Modo** — control de dos posiciones: Por horas / Monto fijo.
4. **Entrada y Salida** — selector de hora nativo. Solo en modo horas.
5. **Precio por hora** — teclado numérico, precargado con el último usado. Solo en
   modo horas.
6. **Paga doble** — solo si el motivo es Feriado.
7. **Monto** — teclado numérico. Solo en modo fijo.
8. **Nota** — opcional, salvo en Otro.
9. **Resultado** — horas pagadas y monto, actualizados al escribir. Si hubo redondeo
   se aclara: "5 h 30 (real 5 h 20)".
10. **Guardar**.

Al guardar: se muestra una confirmación breve, se actualiza el ranking y el último
precio, y el formulario se limpia conservando el precio.

En modo edición (se llega desde el Historial) el formulario viene cargado, el botón
dice "Guardar cambios" y aparecen "Cancelar" y "Borrar". Borrar pide confirmación.

### Historial

Lista de meses, del más nuevo al más viejo. Cada registro pertenece al mes de su
`fecha`.

```
nov 2026    Horas: 110    Pagos: $ 123.456
```

- **Horas**: suma de `minutosPagados` del mes (el pago doble no duplica horas).
- **Pagos**: suma de `monto` del mes.

Al tocar un mes se expande y muestra:

- **Filtro**: etiquetas con "Todos" y los motivos presentes en ese mes. Se pueden
  marcar varias. Con filtro activo se agrega una línea de subtotal (horas y pagos de
  lo filtrado); el encabezado del mes sigue mostrando el total completo.
- **Registros** ordenados por fecha: fecha, motivo, horas, monto y nota. Tocar uno
  lo abre en la calculadora en modo edición.
- **Copiar**: copia al portapapeles el mes como texto, respetando el filtro.

Formato del texto copiado:

```
Noviembre 2026
20/11 · Feriado (doble) · 4 h · $ 36.000
23/11 · Haberes · 5 h 30 · $ 24.750 · nota si tiene
Total: 110 h · $ 123.456
```

Los registros de monto fijo omiten las horas. Con filtro activo, la línea de total
corresponde a lo filtrado.

Al pie del Historial: **Exportar copia** (descarga un archivo JSON) e **Importar
copia** (elige un archivo y fusiona).

Si no hay registros, se muestra un mensaje que invita a cargar el primero.

## Diseño visual

- Pensada para usar con una mano: controles de al menos 48 px de alto, acciones
  principales en la mitad inferior.
- Tema claro y oscuro según el sistema.
- Dinero con formato argentino: `$ 123.456`, sin decimales.
- Horas como `5 h 30`.

## PWA

- `manifest.webmanifest` con nombre, íconos, `display: standalone` y colores de tema.
- `sw.js` guarda en caché todos los archivos de la app y responde desde la caché, así
  funciona sin conexión. La caché lleva número de versión; al publicar una versión
  nueva se cambia ese número y la app se actualiza en la siguiente apertura.

## Pruebas

- `calc`: redondeo a 15 minutos (exacto, un minuto de más, un minuto de menos),
  monto, pago doble, redondeo a pesos, validaciones.
- `ranking`: decaimiento, empates, valores iniciales.
- `historial`: agrupado por mes, totales, filtro, motivos presentes, texto copiado.
- `store`: crear, actualizar, borrado lógico, fusión al importar.

Las pantallas se verifican a mano en el navegador.

## Revisión 2 (2026-11-23)

Cambios pedidos después de la primera prueba. Donde contradicen lo anterior, vale esto.

### Tipos de motivo

Cada motivo tiene un tipo que define qué fechas y horarios pide:

| Tipo | Motivos | Campos |
|---|---|---|
| `turno` | Haberes, Otro | Fecha, hora de entrada y de salida |
| `rango` | Feriado, Licencia, Vacaciones, ART | Desde y Hasta (por defecto el mismo día), sin horario |
| `pago` | Aguinaldo | Solo fecha de pago y monto |

- En `rango` por horas se escribe la **cantidad de horas** total; se redondea hacia
  arriba al cuarto de hora igual que la diferencia de un turno. También admite monto fijo.
- `pago` es siempre monto fijo; no muestra el selector de modo.
- El registro suma el campo `fechaHasta` (null salvo en `rango`). `entrada` y `salida`
  solo se guardan en `turno` por horas. Un rango cuenta en el mes de su fecha de inicio.

### Validación de inicio y fin

- `turno`: la salida debe ser estrictamente posterior a la entrada.
- `rango`: Hasta no puede ser anterior a Desde; pueden coincidir (un solo día).
- `pago`: no hay fin que validar.
- Al cambiar Desde a una fecha posterior a Hasta, Hasta se mueve a esa fecha.

### Valores por defecto

- Al abrir la app, la fecha es la de hoy. Mientras la app sigue abierta, después de
  guardar se conserva la última fecha cargada.
- Si la app vuelve de más de 30 minutos en segundo plano, se trata como recién abierta.
- La hora de salida arranca en la hora actual.

### Historial

- El filtro por motivo se muestra en cada mes siempre, aunque tenga un solo motivo.
- Los rangos de más de un día muestran "hasta el dd/mm"; en el texto copiado,
  "dd/mm al dd/mm".

### Otros

- El id se genera con `crypto.getRandomValues` cuando `crypto.randomUUID` no existe
  (pasa al abrir la app por http en la red local).
- Al llegar una versión nueva, la app se recarga sola para usarla enseguida.
