const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const dos = (n) => String(n).padStart(2, '0');

export function dinero(n) {
  const entero = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$ ${entero}`;
}

export function horas(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${dos(m)}`;
}

function partesDeMes(mes) {
  const [anio, numero] = mes.split('-');
  return { anio, nombre: MESES[Number(numero) - 1] };
}

export function mesCorto(mes) {
  const { anio, nombre } = partesDeMes(mes);
  return `${nombre.slice(0, 3)} ${anio}`;
}

export function mesLargo(mes) {
  const { anio, nombre } = partesDeMes(mes);
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${anio}`;
}

export function fechaCorta(fecha) {
  const [, mes, dia] = fecha.split('-');
  return `${dia}/${mes}`;
}

export function hoyLocal(date = new Date()) {
  return `${date.getFullYear()}-${dos(date.getMonth() + 1)}-${dos(date.getDate())}`;
}

export function horaActual(date = new Date()) {
  return `${dos(date.getHours())}:${dos(date.getMinutes())}`;
}

// "23/11", o "23/11 al 02/12" si el registro abarca más de un día.
export function rangoFechas({ fecha, fechaHasta }) {
  if (!fechaHasta || fechaHasta === fecha) return fechaCorta(fecha);
  return `${fechaCorta(fecha)} al ${fechaCorta(fechaHasta)}`;
}

// Interpreta un número escrito a mano. La coma es decimal y el punto separa miles;
// un punto que no agrupa de a tres dígitos se toma como decimal.
export function parsearNumero(texto) {
  const limpio = String(texto ?? '').replace(/[\s$]/g, '');
  let normal;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpio)) {
    normal = limpio.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+(,\d+)?$/.test(limpio)) {
    normal = limpio.replace(',', '.');
  } else if (/^\d+\.\d+$/.test(limpio)) {
    normal = limpio;
  } else {
    return null;
  }
  return Number(normal);
}

// Texto para precargar un campo numérico a partir de un número guardado.
export function numeroEditable(n) {
  return n == null ? '' : String(n).replace('.', ',');
}
