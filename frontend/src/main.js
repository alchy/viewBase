import { Connection } from './core/connection.js';
import { GraphStore } from './core/store.js';
import { StatusOverlay } from './core/status.js';
import { Picker, buildEvent } from './interact/picking.js';
import { throttle } from './interact/throttle.js';
import { PhysicsEngine } from './physics/engine.js';
import { Renderer } from './render/renderer.js';

const status = new StatusOverlay();

function webglAvailable() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext
      && (probe.getContext('webgl2') || probe.getContext('webgl')));
  } catch {
    return false;
  }
}

function bootstrap() {
  const store = new GraphStore();
  const engine = new PhysicsEngine(store);
  const renderer = new Renderer(document.getElementById('app'), store, engine);

  store.subscribe((event) => {
    if (event.kind === 'init' && store.config.title) {
      document.title = `${store.config.title} – viewbase`;
    }
  });

  const wsScheme = location.protocol === 'https:' ? 'wss' : 'ws';
  const connection = new Connection(`${wsScheme}://${location.host}/ws`, store, {
    onStatus: (state) => {
      if (state === 'init') {
        status.hide();
      } else if (state === 'close') {
        status.show('Spojení se serverem vypadlo – zkouším se znovu připojit…');
      } else if (state === 'protocol_mismatch') {
        status.show('Server běží s jinou verzí protokolu – obnovte stránku (F5).');
      }
    },
  });

  new Picker(renderer.webgl.domElement,
    (x, y) => renderer.pick(x, y),
    (message) => connection.send(message));

  const sendViewChange = throttle(() => {
    const state = renderer.viewState();
    if (state) connection.send(buildEvent('view_change', state));
  }, 100);
  renderer.controls.addEventListener('change', sendViewChange);

  connection.connect();
  renderer.start();
  window.__viewbase = { store, engine, renderer, connection };
}

if (webglAvailable()) {
  bootstrap();
} else {
  status.show('Tento prohlížeč nemá dostupné WebGL – vizualizaci nelze spustit. '
    + 'Zkus jiný prohlížeč nebo zapni hardwarovou akceleraci.');
}
