import { Connection } from './core/connection.js';
import { GraphStore } from './core/store.js';
import { StatusOverlay } from './core/status.js';
import { DetailBox } from './interact/detail.js';
import { neighborhood } from './interact/highlight.js';
import { KeyboardControls } from './interact/keyboard.js';
import { Picker, buildEvent } from './interact/picking.js';
import { throttle } from './interact/throttle.js';
import { PhysicsEngine } from './physics/engine.js';
import { FpsWatchdog } from './render/quality.js';
import { Renderer } from './render/renderer.js';
import { applyCssVars, resolveTheme } from './themes/manager.js';

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
  const detail = new DetailBox();

  function applyHighlight(nodeId, depth) {
    const levels = depth ?? store.config.highlight_neighbors ?? 1;
    const ids = neighborhood(store, nodeId, levels);
    // Neznámý uzel = prázdná množina: radši nic nezvýraznit než ztlumit vše
    renderer.setHighlight(ids.size > 0 ? ids : null);
  }

  function showDetail(nodeId) {
    const node = store.nodes.get(nodeId);
    if (node) detail.show({ label: node.label, meta: node.meta });
  }

  const renderer = new Renderer(document.getElementById('app'), store, engine, {
    onCameraReady: () => {
      new Picker(renderer.webgl.domElement,
        (x, y) => renderer.pick(x, y),
        (message) => connection.send(message), {
          onNodeClick: (id) => {              // okamžitá lokální odezva
            const levels = store.config.highlight_neighbors ?? 1;
            if (levels > 0) applyHighlight(id, levels);
            renderer.focusOn(id);
          },
          onBackgroundClick: () => {
            renderer.setHighlight(null);
            detail.hide();
          },
        });
      new KeyboardControls(renderer.camera, renderer.controls,
        { is2d: store.config.dimensions === 2 });
      const sendViewChange = throttle(() => {
        const state = renderer.viewState();
        if (state) connection.send(buildEvent('view_change', state));
      }, 100);
      renderer.controls.addEventListener('change', sendViewChange);
    },
  });

  function applyTheme(nameOrDict) {
    const theme = resolveTheme(nameOrDict);
    renderer.applyTheme(theme);
    applyCssVars(theme);
  }

  const degrade = (step) => {
    if (step === 1) renderer.disableBloom();
    if (step === 2) renderer.setPixelRatio(1);
  };
  const watchdog = new FpsWatchdog(degrade);

  store.subscribe((event) => {
    if (event.kind !== 'init') return;
    applyTheme(store.config.theme);
    if (store.config.title) {
      document.title = `${store.config.title} – viewbase`;
    }
    const quality = store.config.quality ?? 'auto';
    if (quality === 'low') {
      degrade(1);                                  // hned a natrvalo
      degrade(2);
    } else if (quality === 'auto') {
      renderer.onFrame = (dt) => watchdog.frame(dt);
    }
    // 'high': žádný watchdog, nikdy nedegradovat
  });

  const actions = {
    show_detail: (msg) => showDetail(msg.node_id),
    focus: (msg) => renderer.focusOn(msg.node_id),
    highlight: (msg) => applyHighlight(msg.node_id, msg.depth),
    set_theme: (msg) => {
      store.config.theme = msg.theme;     // reconnect → init už ponese nové téma
      applyTheme(msg.theme);
    },
  };

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
    onAction: (msg) => {
      const handler = actions[msg.action];
      if (handler) handler(msg);
      else console.warn('viewbase: neznámá akce', msg.action);
    },
  });

  connection.connect();
  renderer.start();
  window.__viewbase = { store, engine, renderer, connection, watchdog };
}

if (webglAvailable()) {
  bootstrap();
} else {
  status.show('Tento prohlížeč nemá dostupné WebGL – vizualizaci nelze spustit. '
    + 'Zkus jiný prohlížeč nebo zapni hardwarovou akceleraci.');
}
