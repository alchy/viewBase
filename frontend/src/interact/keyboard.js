import * as THREE from 'three';

const ORBIT_STEP = 0.06;    // rad na krok (auto-repeat klávesy = plynulost)
const ZOOM_FACTOR = 0.92;   // násobek vzdálenosti (3D) / zoomu (2D) na krok
const PAN_STEP = 40;        // světové jednotky na krok (2D pan)
const MIN_POLAR = 0.05;     // rad – nepřeklápět kameru přes póly

/** Klávesy: W/S = orbit nahoru/dolů (polar), A/D = vlevo/vpravo (azimut),
 *  Q/E = zoom in/out, mezerník = reset na výchozí pohled.
 *  Ve 2D režimu WASD = pan, Q/E = zoom (ortografická kamera). */
export class KeyboardControls {
  constructor(camera, controls, { is2d = false, target = window } = {}) {
    this.camera = camera;
    this.controls = controls;
    this.is2d = is2d;
    this._spherical = new THREE.Spherical();
    this._offset = new THREE.Vector3();
    this.home = {                       // výchozí stav pro reset mezerníkem
      position: camera.position.clone(),
      target: controls.target.clone(),
      zoom: camera.zoom,
    };
    target.addEventListener('keydown', (e) => {
      if (this.handleKey(e.code)) e.preventDefault();
    });
  }

  /** Vrací true, když byla klávesa obsloužená. */
  handleKey(code) {
    if (this.is2d) {
      switch (code) {
        case 'KeyW': this._pan(0, PAN_STEP); return true;
        case 'KeyS': this._pan(0, -PAN_STEP); return true;
        case 'KeyA': this._pan(-PAN_STEP, 0); return true;
        case 'KeyD': this._pan(PAN_STEP, 0); return true;
        case 'KeyQ': this._zoom(ZOOM_FACTOR); return true;
        case 'KeyE': this._zoom(1 / ZOOM_FACTOR); return true;
        case 'Space': this.reset(); return true;
        default: return false;
      }
    }
    switch (code) {
      case 'KeyW': this._orbit(0, -ORBIT_STEP); return true;
      case 'KeyS': this._orbit(0, ORBIT_STEP); return true;
      case 'KeyA': this._orbit(ORBIT_STEP, 0); return true;
      case 'KeyD': this._orbit(-ORBIT_STEP, 0); return true;
      case 'KeyQ': this._zoom(ZOOM_FACTOR); return true;
      case 'KeyE': this._zoom(1 / ZOOM_FACTOR); return true;
      case 'Space': this.reset(); return true;
      default: return false;
    }
  }

  /** Orbit kolem controls.target přes sférické souřadnice. */
  _orbit(deltaAzimuth, deltaPolar) {
    this._offset.copy(this.camera.position).sub(this.controls.target);
    this._spherical.setFromVector3(this._offset);
    this._spherical.theta += deltaAzimuth;
    this._spherical.phi = Math.min(Math.PI - MIN_POLAR,
      Math.max(MIN_POLAR, this._spherical.phi + deltaPolar));
    this._offset.setFromSpherical(this._spherical);
    this.camera.position.copy(this.controls.target).add(this._offset);
    this.camera.lookAt(this.controls.target);
    this._changed();
  }

  /** factor < 1 přibližuje: 3D zmenší vzdálenost, 2D zvětší camera.zoom. */
  _zoom(factor) {
    if (this.is2d) {
      this.camera.zoom = Math.min(20, Math.max(0.05, this.camera.zoom / factor));
      this.camera.updateProjectionMatrix();
    } else {
      this._offset.copy(this.camera.position).sub(this.controls.target);
      this._offset.multiplyScalar(factor);
      this.camera.position.copy(this.controls.target).add(this._offset);
    }
    this._changed();
  }

  /** Posun kamery i targetu v rovině XY (2D režim). */
  _pan(dx, dy) {
    this.camera.position.x += dx;
    this.camera.position.y += dy;
    this.controls.target.x += dx;
    this.controls.target.y += dy;
    this._changed();
  }

  reset() {
    this.camera.position.copy(this.home.position);
    this.controls.target.copy(this.home.target);
    this.camera.zoom = this.home.zoom;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.controls.target);
    this._changed();
  }

  _changed() {
    this.controls.update();
    // OrbitControls 'change' event => view_change odejde i pro klávesnici
    this.controls.dispatchEvent({ type: 'change' });
  }
}
