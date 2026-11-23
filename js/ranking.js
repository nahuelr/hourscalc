import { MOTIVOS } from './motivos.js';

// Cada uso nuevo descuenta los anteriores: uno de hace 7 cargas pesa la mitad.
const FACTOR = 0.9;

export function rankingInicial() {
  const puntajes = {};
  for (const m of MOTIVOS) puntajes[m.clave] = m.clave === 'haberes' ? 3 : 0;
  return puntajes;
}

export function registrarUso(puntajes, clave, factor = FACTOR) {
  const nuevo = {};
  for (const [k, v] of Object.entries(puntajes)) nuevo[k] = v * factor;
  nuevo[clave] = (nuevo[clave] ?? 0) + 1;
  return nuevo;
}

// Claves de mayor a menor puntaje. El orden de MOTIVOS desempata
// (Array.prototype.sort es estable).
export function ordenar(puntajes) {
  return MOTIVOS
    .map((m) => m.clave)
    .sort((a, b) => (puntajes[b] ?? 0) - (puntajes[a] ?? 0));
}
