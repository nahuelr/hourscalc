// Lista de motivos de pago. El orden de esta tabla desempata el ranking.
//
// `tipo` define qué fechas y horarios pide cada motivo:
//   turno — un día, con hora de entrada y de salida
//   rango — día de inicio y día de fin, sin horario
//   pago  — solo fecha de pago y monto
export const MOTIVOS = [
  { clave: 'haberes', etiqueta: 'Haberes', tipo: 'turno', modo: 'horas' },
  { clave: 'feriado', etiqueta: 'Feriado', tipo: 'rango', modo: 'horas', permiteDoble: true },
  { clave: 'licencia', etiqueta: 'Licencia', tipo: 'rango', modo: 'horas' },
  { clave: 'vacaciones', etiqueta: 'Vacaciones', tipo: 'rango', modo: 'horas' },
  { clave: 'aguinaldo', etiqueta: 'Aguinaldo', tipo: 'pago', modo: 'fijo' },
  { clave: 'art', etiqueta: 'ART', tipo: 'rango', modo: 'horas' },
  { clave: 'otro', etiqueta: 'Otro', tipo: 'turno', modo: 'horas', notaObligatoria: true },
];

export function motivoPorClave(clave) {
  return MOTIVOS.find((m) => m.clave === clave);
}

export function etiquetaDe(clave) {
  return motivoPorClave(clave)?.etiqueta ?? clave;
}
