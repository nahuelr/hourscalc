import { crearStore } from './store.js';
import { iniciarCalculadora } from './ui-calculadora.js';
import { iniciarHistorial } from './ui-historial.js';
import { iniciarTema } from './tema.js';
import { $ } from './ui-comun.js';

function mostrar(vista) {
  for (const nombre of ['calculadora', 'historial']) {
    $(`vista-${nombre}`).hidden = nombre !== vista;
  }
  for (const boton of document.querySelectorAll('.pestanas button')) {
    if (boton.dataset.vista === vista) boton.setAttribute('aria-current', 'page');
    else boton.removeAttribute('aria-current');
  }
  $('contenido').scrollTop = 0;
}

function iniciar() {
  const store = crearStore(localStorage);

  const calculadora = iniciarCalculadora({
    store,
    alGuardar: ({ eraEdicion }) => {
      historial.refrescar();
      // Tras editar, borrar o cancelar se vuelve al lugar desde donde se entró.
      if (eraEdicion) mostrar('historial');
    },
  });

  const historial = iniciarHistorial({
    store,
    alEditar: (registro) => {
      calculadora.editar(registro);
      mostrar('calculadora');
    },
  });

  for (const boton of document.querySelectorAll('.pestanas button')) {
    boton.addEventListener('click', () => mostrar(boton.dataset.vista));
  }
}

iniciarTema();

try {
  iniciar();
} catch (error) {
  // Si los datos guardados no se pueden leer, se avisa en lugar de pisarlos.
  console.error(error);
  document.body.textContent =
    'No se pudieron leer los datos guardados. No se modificó nada; avisá antes de borrar los datos del navegador.';
  document.body.style.padding = '24px';
}

if ('serviceWorker' in navigator) {
  // Si ya había una versión instalada y llega una nueva, se recarga para usarla
  // enseguida en lugar de esperar a la próxima apertura.
  // Solo si todavía no se tocó nada: recargar a mitad de una carga borraría lo
  // escrito. En ese caso la versión nueva se usa en la próxima apertura.
  const habiaVersion = Boolean(navigator.serviceWorker.controller);
  let huboInteraccion = false;
  for (const evento of ['pointerdown', 'keydown']) {
    addEventListener(evento, () => { huboInteraccion = true; }, { once: true, capture: true });
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaVersion && !huboInteraccion) location.reload();
  });
  navigator.serviceWorker.register('./sw.js').catch((error) => console.error(error));
}
