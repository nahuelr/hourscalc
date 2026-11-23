// Utilidades de pantalla compartidas por las dos vistas.

export const $ = (id) => document.getElementById(id);

// Crea un elemento. El texto siempre entra por textContent, nunca como HTML.
export function el(etiqueta, props = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props)) {
    if (clave === 'class') nodo.className = valor;
    else if (clave === 'text') nodo.textContent = valor;
    else if (clave.startsWith('on')) nodo.addEventListener(clave.slice(2), valor);
    else nodo.setAttribute(clave, valor);
  }
  nodo.append(...hijos);
  return nodo;
}

let temporizador;

export function aviso(texto) {
  const caja = $('aviso');
  caja.textContent = texto;
  caja.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { caja.hidden = true; }, 2200);
}

export function confirmar(texto, etiquetaAceptar) {
  const dialogo = $('dialogo-confirmar');
  $('confirmar-texto').textContent = texto;
  $('confirmar-si').textContent = etiquetaAceptar;
  return new Promise((resolver) => {
    const cerrar = (valor) => () => dialogo.close(valor);
    const si = cerrar('si');
    const no = cerrar('no');
    $('confirmar-si').addEventListener('click', si);
    $('confirmar-no').addEventListener('click', no);
    dialogo.addEventListener('close', () => {
      $('confirmar-si').removeEventListener('click', si);
      $('confirmar-no').removeEventListener('click', no);
      resolver(dialogo.returnValue === 'si');
    }, { once: true });
    dialogo.returnValue = 'no';
    dialogo.showModal();
  });
}

// Cierra un <dialog> al tocar fuera de su contenido.
export function cerrarAlTocarFuera(dialogo) {
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });
}

export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Respaldo para navegadores sin permiso de portapapeles.
    const area = el('textarea', { style: 'position:fixed;opacity:0' });
    area.value = texto;
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}
