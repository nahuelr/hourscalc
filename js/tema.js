// Interruptor de modo claro / oscuro. Sin elección guardada se sigue al sistema.
// (index.html aplica la elección guardada antes de dibujar, para que no parpadee.)

const CLAVE = 'hourscalc.tema';
const COLOR_BARRA = { claro: '#f4f6f5', oscuro: '#0f1514' };

const ICONOS = `
  <span class="tema-pista">
    <span class="tema-perilla"></span>
    <svg class="tema-luna" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 14.2A8 8 0 0 1 9.8 4 8 8 0 1 0 20 14.2z"/>
    </svg>
    <svg class="tema-sol" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>
    </svg>
  </span>`;

function leerElegido() {
  try {
    const tema = localStorage.getItem(CLAVE);
    return tema === 'claro' || tema === 'oscuro' ? tema : null;
  } catch {
    return null;
  }
}

export function iniciarTema() {
  const sistema = matchMedia('(prefers-color-scheme: dark)');
  let elegido = leerElegido();
  const actual = () => elegido ?? (sistema.matches ? 'oscuro' : 'claro');

  function aplicar() {
    const tema = actual();
    if (elegido) document.documentElement.dataset.tema = elegido;
    else delete document.documentElement.dataset.tema;
    for (const boton of interruptores) {
      boton.setAttribute('aria-checked', String(tema === 'oscuro'));
    }
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.content = COLOR_BARRA[tema];
    }
  }

  function alternar() {
    elegido = actual() === 'oscuro' ? 'claro' : 'oscuro';
    try {
      localStorage.setItem(CLAVE, elegido);
    } catch {
      // Sin almacenamiento, la elección dura mientras la app esté abierta.
    }
    aplicar();
  }

  // Un interruptor por pantalla, a la derecha del título.
  const interruptores = [...document.querySelectorAll('.encabezado')].map((encabezado) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'tema';
    boton.setAttribute('role', 'switch');
    boton.setAttribute('aria-label', 'Modo oscuro');
    boton.innerHTML = ICONOS; // marcado fijo, sin datos del usuario
    boton.addEventListener('click', alternar);
    encabezado.append(boton);
    return boton;
  });

  sistema.addEventListener('change', aplicar);
  aplicar();
}
