import { WORLD_H, WORLD_W } from '../params';
import { clamp, type Vec2 } from '../util';

/** Cámara 2D: centro en coordenadas de mundo y zoom en píxeles por celda. Y crece hacia abajo. */
export class Camera {
  center: Vec2 = { x: WORLD_W / 2, y: WORLD_H / 2 };
  zoom = 1;
  canvasWidth = 1;
  canvasHeight = 1;

  setCanvas(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  fit(): void {
    this.center = { x: WORLD_W / 2, y: WORLD_H / 2 };
    this.zoom = Math.min(this.canvasWidth / WORLD_W, this.canvasHeight / WORLD_H) * 0.96;
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
  }

  panPixels(dx: number, dy: number): void {
    this.center.x -= dx / this.zoom;
    this.center.y -= dy / this.zoom;
  }
}
