import type { SimParams, Tool } from '../params';
import type { Camera } from '../render/Camera';
import type { Stroke } from '../sim/World';
import type { Vec2 } from '../util';

export interface InputHandlers {
  onNest(pos: Vec2): void;
  onTogglePause(): void;
  onStep(): void;
  onFit(): void;
}

const TOOL_KEYS: Record<string, Tool> = { '1': 'food', '2': 'wall', '3': 'danger', '4': 'erase', '5': 'nest' };

/**
 * Ratón y teclado: botón izquierdo pinta con la herramienta activa, el derecho (o el central)
 * mueve la cámara y la rueda hace zoom. Los trazos se acumulan y se recogen una vez por frame.
 */
export class Input {
  /** Posición del cursor sobre el mundo (para dibujar el pincel), o null si está fuera. */
  hover: Vec2 | null = null;
  private painting = false;
  private strokeFrom: Vec2 | null = null;
  private strokeTo: Vec2 | null = null;
  private panning = false;
  private lastPan = { x: 0, y: 0 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
    private readonly params: SimParams,
    private readonly handlers: InputHandlers,
  ) {
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('pointerleave', () => (this.hover = null));
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKeyDown);
  }

  /** Devuelve el trazo pintado desde la última llamada, si lo hay. */
  takeStroke(): Stroke | null {
    if (!this.strokeFrom || !this.strokeTo) return null;
    const stroke = { from: this.strokeFrom, to: this.strokeTo, tool: this.params.tool };
    this.strokeFrom = this.painting ? this.strokeTo : null;
    if (!this.painting) this.strokeTo = null;
    return stroke;
  }

  /** Posición del puntero en píxeles del canvas (no CSS). */
  private canvasPos(e: PointerEvent | WheelEvent): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * this.canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * this.canvas.height) / rect.height,
    };
  }

  private readonly onPointerDown = (e: PointerEvent) => {
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.canvasPos(e);
    if (e.button === 0) {
      const w = this.camera.toWorld(p.x, p.y);
      if (this.params.tool === 'nest') {
        this.handlers.onNest(w);
        return;
      }
      this.painting = true;
      this.strokeFrom = w;
      this.strokeTo = w;
    } else {
      this.panning = true;
      this.lastPan = p;
    }
  };

  private readonly onPointerMove = (e: PointerEvent) => {
    const p = this.canvasPos(e);
    this.hover = this.camera.toWorld(p.x, p.y);
    if (this.painting) this.strokeTo = this.hover;
    if (this.panning) {
      this.camera.panPixels(p.x - this.lastPan.x, p.y - this.lastPan.y);
      this.lastPan = p;
    }
  };

  private readonly onPointerUp = (e: PointerEvent) => {
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    this.painting = false;
    this.panning = false;
  };

  private readonly onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const p = this.canvasPos(e);
    this.camera.zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
  };

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    const tool = TOOL_KEYS[e.key];
    if (tool) {
      this.params.tool = tool;
    } else if (e.key === ' ') {
      e.preventDefault();
      this.handlers.onTogglePause();
    } else if (e.key === '.') {
      this.handlers.onStep();
    } else if (e.key === 'f' || e.key === 'F') {
      this.handlers.onFit();
    }
  };
}
