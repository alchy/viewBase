import { PhysicsCore } from './core.js';

const TICK_MS = 16;
let core = null;

setInterval(() => {
  if (!core) return;
  const positions = core.tick();
  if (positions) self.postMessage({ type: 'tick', positions }, [positions.buffer]);
}, TICK_MS);

self.onmessage = ({ data }) => {
  if (data.type === 'init') {
    core = new PhysicsCore({ dimensions: data.dimensions });
    core.applyInit(data);
  } else if (data.type === 'patch') {
    core.applyPatch(data);
  } else {
    return;
  }
  self.postMessage({ type: 'index', ids: core.ids() });
  const positions = core.positions();
  self.postMessage({ type: 'tick', positions }, [positions.buffer]);
};
