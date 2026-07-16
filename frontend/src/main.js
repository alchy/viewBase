import { Connection } from './core/connection.js';
import { GraphStore } from './core/store.js';
import { StatusOverlay } from './core/status.js';
import { WindowManager } from './render/windows.js';
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
  let activeTheme = null;            // poslední rozpuštěné téma (pro WindowManager)
  const windowManager = new WindowManager(
    document.getElementById('app'), store, () => activeTheme);

  function applyHighlight(nodeId, depth) {
    const levels = depth ?? store.config.highlight_neighbors ?? 1;
    const ids = neighborhood(store, nodeId, levels);
    // Neznámý uzel = prázdná množina: radši nic nezvýraznit než ztlumit vše
    renderer.setHighlight(ids.size > 0 ? ids : null);
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
            if (store.config.detail_window?.open_on_click) {
              windowManager.openFor(id);
            }
          },
          onBackgroundClick: () => {
            renderer.setHighlight(null);
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
    activeTheme = theme;
    renderer.applyTheme(theme);
    applyCssVars(theme);
    windowManager.applyTheme();
  }

  const degrade = (step) => {
    if (step === 1) renderer.disableBloom();
    if (step === 2) renderer.setPixelRatio(1);
  };
  const watchdog = new FpsWatchdog(degrade);

  store.subscribe((event) => {
    if (event.kind !== 'patch') return;
    windowManager.onPatch(event.patch);
  });

  store.subscribe((event) => {
    if (event.kind !== 'init') return;
    renderer.flowController.replayInit(store.flows ?? []);
    applyTheme(store.config.theme);   // téma (i CSS proměnné oken) nastav dřív
    renderer.setEdgeStyle(store.config.edge_style ?? { style: 'line', elasticity: 0 });
    for (const spec of store.windows ?? []) {
      if (spec.kind === 'terminal') windowManager.openTerminal(spec, submitTerminal);
      else windowManager.openControl(spec, submitWindow);
    }
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

  function submitWindow(payload) {
    connection.send(buildEvent('window_submit', payload));
  }

  function submitTerminal(payload) {
    connection.send(buildEvent('terminal_input', payload));
  }

  const actions = {
    show_detail: (msg) => windowManager.openFor(msg.node_id),
    focus: (msg) => renderer.focusOn(msg.node_id),
    highlight: (msg) => applyHighlight(msg.node_id, msg.depth),
    flow: (msg) => renderer.flowController.applyFlow(msg),
    stop_flow: (msg) => renderer.flowController.stopFlow(msg.flow_id),
    set_theme: (msg) => {
      store.config.theme = msg.theme;     // reconnect → init už ponese nové téma
      applyTheme(msg.theme);
    },
    open_window: (msg) => (msg.kind === 'terminal'
      ? windowManager.openTerminal(msg, submitTerminal)
      : windowManager.openControl(msg, submitWindow)),
    close_window: (msg) => windowManager.closeControl(msg.window_id),
    terminal_append: (msg) => windowManager.terminalAppend(msg.window_id, msg.text),
    set_edge_style: (msg) => renderer.setEdgeStyle(msg),
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
  window.__viewbase = {
    store, engine, renderer, connection, watchdog, windowManager,
    flowController: renderer.flowController, flowLayer: renderer.flows,
  };
}

if (webglAvailable()) {
  bootstrap();
} else {
  status.show('Tento prohlížeč nemá dostupné WebGL – vizualizaci nelze spustit. '
    + 'Zkus jiný prohlížeč nebo zapni hardwarovou akceleraci.');
}
