import { Connection } from './core/connection.js';
import { GraphStore } from './core/store.js';
import { PhysicsEngine } from './physics/engine.js';
import { Renderer } from './render/renderer.js';

const store = new GraphStore();
const engine = new PhysicsEngine(store);
const renderer = new Renderer(document.getElementById('app'), store, engine);

store.subscribe((event) => {
  if (event.kind === 'init' && store.config.title) {
    document.title = `${store.config.title} – viewbase`;
  }
});

new Connection(`ws://${location.host}/ws`, store).connect();
renderer.start();
