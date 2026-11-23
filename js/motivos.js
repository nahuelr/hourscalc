// Lista de motivos de pago. El orden de esta tabla desempata el ranking.
export const MOTIVOS = [
  { clave: 'haberes', etiqueta: 'Haberes', modo: 'horas' },
  { clave: 'feriado', etiqueta: 'Feriado', modo: 'horas', permiteDoble: true },
  { clave: 'licencia', etiqueta: 'Licencia', modo: 'horas' },
  { clave: 'vacaciones', etiqueta: 'Vacaciones', modo: 'horas' },
  { clave: 'aguinaldo', etiqueta: 'Aguinaldo', modo: 'fijo' },
  { clave: 'art', etiqueta: 'ART', modo: 'horas' },
  { clave: 'otro', etiqueta: 'Otro', modo: 'horas', notaObligatoria: true },
];

export function motivoPorClave(clave) {
  return MOTIVOS.find((m) => m.clave === clave);
}

export function etiquetaDe(clave) {
  return motivoPorClave(clave)?.etiqueta ?? clave;
}
