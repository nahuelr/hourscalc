import { motivoPorClave } from './motivos.js';

function aMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function diferenciaMinutos(entrada, salida) {
  return aMinutos(salida) - aMinutos(entrada);
}

export function redondearA15(min) {
  return Math.ceil(min / 15) * 15;
}

// Se opera en centavos enteros para no arrastrar errores de punto flotante.
export function montoPorHoras(precioHora, minutos, multiplicador) {
  const centavos = Math.round(precioHora * 100);
  return Math.round((centavos * minutos * multiplicador) / 6000);
}

/**
 * Valida y calcula una carga según el tipo del motivo:
 *   turno — fecha + entrada/salida; la salida debe ser posterior a la entrada.
 *   rango — fecha de inicio y de fin (pueden coincidir) + cantidad de horas.
 *   pago  — fecha de pago + monto; siempre es monto fijo.
 *
 * `errores` trae valores inválidos (con mensaje para mostrar);
 * `faltan` trae campos obligatorios todavía vacíos.
 */
export function calcular(form) {
  const motivo = motivoPorClave(form.motivo);
  const tipo = motivo?.tipo ?? 'turno';
  const modo = tipo === 'pago' ? 'fijo' : form.modo;
  const errores = {};
  const faltan = [];
  let minutosReales = 0;
  let minutosPagados = 0;
  let multiplicador = 1;
  let monto = 0;

  if (!form.fecha) faltan.push('fecha');

  if (tipo === 'rango') {
    if (!form.fechaHasta) faltan.push('fechaHasta');
    else if (form.fecha && form.fechaHasta < form.fecha) {
      errores.fechaHasta = 'La fecha de fin no puede ser anterior a la de inicio';
    }
  }

  if (modo === 'horas') {
    if (tipo === 'turno') {
      if (!form.entrada) faltan.push('entrada');
      if (!form.salida) faltan.push('salida');
      if (form.entrada && form.salida) {
        const diferencia = diferenciaMinutos(form.entrada, form.salida);
        if (diferencia <= 0) {
          errores.salida = 'La salida debe ser posterior a la entrada';
        } else {
          minutosReales = diferencia;
        }
      }
    } else if (form.horas == null) {
      faltan.push('horas');
    } else if (!(form.horas > 0)) {
      errores.horas = 'Las horas deben ser mayores que cero';
    } else {
      minutosReales = Math.round(form.horas * 60);
    }
    minutosPagados = redondearA15(minutosReales);

    if (form.precioHora == null) faltan.push('precioHora');
    else if (!(form.precioHora > 0)) errores.precioHora = 'El precio debe ser mayor que cero';

    if (motivo?.permiteDoble && form.doble) multiplicador = 2;

    if (minutosPagados > 0 && form.precioHora > 0) {
      monto = montoPorHoras(form.precioHora, minutosPagados, multiplicador);
    }
  } else if (form.montoFijo == null) {
    faltan.push('monto');
  } else if (!(form.montoFijo > 0)) {
    errores.monto = 'El monto debe ser mayor que cero';
  } else {
    monto = Math.round(form.montoFijo);
  }

  if (motivo?.notaObligatoria && !form.nota?.trim()) faltan.push('nota');

  const ok = faltan.length === 0 && Object.keys(errores).length === 0;
  return {
    ok, errores, faltan, tipo, modo, minutosReales, minutosPagados, multiplicador, monto,
  };
}

/**
 * Arma el registro a guardar. Si se está editando, `previo` aporta el id y las
 * marcas de tiempo; el store completa las que falten.
 */
export function construirRegistro(form, previo = null) {
  const r = calcular(form);
  if (!r.ok) throw new Error('El formulario no es válido');
  const porHoras = r.modo === 'horas';
  const conHorario = porHoras && r.tipo === 'turno';
  return {
    ...(previo ?? {}),
    fecha: form.fecha,
    fechaHasta: r.tipo === 'rango' ? form.fechaHasta : null,
    motivo: form.motivo,
    modo: r.modo,
    entrada: conHorario ? form.entrada : null,
    salida: conHorario ? form.salida : null,
    minutosPagados: r.minutosPagados,
    precioHora: porHoras ? form.precioHora : null,
    multiplicador: r.multiplicador,
    monto: r.monto,
    nota: form.nota?.trim() ?? '',
  };
}
