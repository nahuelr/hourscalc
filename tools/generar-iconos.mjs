// Genera los íconos de la app (un reloj blanco sobre fondo verde) sin dependencias.
// Uso: node tools/generar-iconos.mjs
import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const FONDO = [15, 118, 110];
const BLANCO = [255, 255, 255];
const MUESTRAS = 4; // suavizado: 4×4 muestras por píxel

function distanciaASegmento(x, y, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

// Coordenadas normalizadas: el ícono ocupa de 0 a 1 en cada eje.
function esReloj(x, y) {
  const grosor = 0.055;
  const aro = Math.abs(Math.hypot(x - 0.5, y - 0.5) - 0.27) < grosor / 2;
  const minutero = distanciaASegmento(x, y, 0.5, 0.5, 0.5, 0.33) < grosor / 2;
  const horario = distanciaASegmento(x, y, 0.5, 0.5, 0.62, 0.5) < grosor / 2;
  return aro || minutero || horario;
}

function dentroDeEsquinasRedondeadas(x, y, radio) {
  const cx = Math.max(radio, Math.min(1 - radio, x));
  const cy = Math.max(radio, Math.min(1 - radio, y));
  return Math.hypot(x - cx, y - cy) <= radio;
}

function dibujar(lado, redondeado) {
  const pixeles = Buffer.alloc(lado * lado * 4);
  for (let py = 0; py < lado; py++) {
    for (let px = 0; px < lado; px++) {
      let cubierto = 0;
      let blanco = 0;
      for (let sy = 0; sy < MUESTRAS; sy++) {
        for (let sx = 0; sx < MUESTRAS; sx++) {
          const x = (px + (sx + 0.5) / MUESTRAS) / lado;
          const y = (py + (sy + 0.5) / MUESTRAS) / lado;
          if (redondeado && !dentroDeEsquinasRedondeadas(x, y, 0.22)) continue;
          cubierto++;
          if (esReloj(x, y)) blanco++;
        }
      }
      const i = (py * lado + px) * 4;
      const mezcla = cubierto ? blanco / cubierto : 0;
      for (let c = 0; c < 3; c++) {
        pixeles[i + c] = Math.round(FONDO[c] + (BLANCO[c] - FONDO[c]) * mezcla);
      }
      pixeles[i + 3] = Math.round((255 * cubierto) / (MUESTRAS * MUESTRAS));
    }
  }
  return pixeles;
}

function bloque(tipo, datos) {
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const suma = Buffer.alloc(4);
  suma.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, suma]);
}

function png(lado, pixeles) {
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(lado, 0);
  cabecera.writeUInt32BE(lado, 4);
  cabecera[8] = 8; // bits por canal
  cabecera[9] = 6; // RGBA
  const filas = Buffer.alloc((lado * 4 + 1) * lado);
  for (let y = 0; y < lado; y++) {
    pixeles.copy(filas, y * (lado * 4 + 1) + 1, y * lado * 4, (y + 1) * lado * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', cabecera),
    bloque('IDAT', deflateSync(filas, { level: 9 })),
    bloque('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('icons', { recursive: true });
for (const [nombre, lado, redondeado] of [
  ['icon-192.png', 192, true],
  ['icon-512.png', 512, true],
  ['icon-maskable-512.png', 512, false],
]) {
  writeFileSync(`icons/${nombre}`, png(lado, dibujar(lado, redondeado)));
  console.log(`icons/${nombre}`);
}
