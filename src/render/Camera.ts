import { CLASSIC_WORLD, type WorldSize } from '../params';
import { clamp, type Vec2 } from '../util';

/**
 * Cámara 2D: centro en coordenadas de mundo y zoom en píxeles reales (del canvas) por celda.
 * Y crece hacia abajo.
 */
export class Camera {
  center: Vec2 = { x: CLASSIC_WORLD.w / 2, y: CLASSIC_WORLD.h / 2 };
  zoom = 1;
  canvasWidth = 1;
  canvasHeight = 1;
  worldWidth = CLASSIC_WORLD.w;
  worldHeight = CLASSIC_WORLD.h;
  /** Mientras el usuario no haga zoom ni mueva la vista, se vuelve a encajar cuando cambia el tamaño. */
  autoFit = true;

  setCanvas(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setWorld(size: WorldSize): void {
    this.worldWidth = size.w;
    this.worldHeight = size.h;
  }

  /**
   * Encaja el mundo entero. Si cabe a un píxel por celda o más, el zoom es un número entero de
   * píxeles y el mundo empieza en el borde de un píxel: cada celda es un cuadrado exacto, sin
   * muaré (a una escala cercana a 1 pero no exacta se ve una trama de bloques) ni filas de anchos
   * distintos. Con el mundo "Pantalla" siempre es así. Otro mundo conserva el zoom entero solo si
   * aún llena al menos 3/4 del canvas; si no, y si es mayor que el canvas, se encaja al 98% a
   * cualquier escala.
   */
  fit(): void {
    this.autoFit = true;
    const { canvasWidth: cw, canvasHeight: ch, worldWidth: ww, worldHeight: wh } = this;
    const z = Math.min(cw / ww, ch / wh);
    const whole = Math.floor(z);
    if (whole >= 1 && whole / z >= 0.75) {
      const offX = Math.floor((cw - ww * whole) / 2);
      const offY = Math.floor((ch - wh * whole) / 2);
      this.zoom = whole;
      this.center = { x: (cw / 2 - offX) / whole, y: (ch / 2 - offY) / whole };
    } else {
      this.zoom = z * 0.98;
      this.center = { x: ww / 2, y: wh / 2 };
    }
  }

  toWorld(px: number, py: number): Vec2 {
    return {
      x: this.center.x + (px - this.canvasWidth / 2) / this.zoom,
      y: this.center.y + (py - this.canvasHeight / 2) / this.zoom,
    };
  }

  /** Zoom manteniendo fijo el punto del mundo que hay bajo el cursor. */
  zoomAt(px: number, py: number, factor: number): void {
    const before = this.toWorld(px, py);
    this.zoom = clamp(this.zoom * factor, 0.2, 40);
    const after = this.toWorld(px, py);
    this.center.x += before.x - after.x;
    this.center.y += before.y - after.y;
    this.autoFit = false;
  }

  panPixels(dx: number, dy: number): void {
    this.center.x -= dx / this.zoom;
    this.center.y -= dy / this.zoom;
    this.autoFit = false;
  }
}
