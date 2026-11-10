import type { Target } from './targets';

/**
 * Lee píxeles de la GPU sin bloquear: readPixels a un PBO, una fence y, unos
 * frames después, getBufferSubData cuando la fence ya se ha cumplido.
 */
export class AsyncReader {
  private readonly buffer: WebGLBuffer;
  private sync: WebGLSync | null = null;
  private readonly data: Float32Array;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    floats: number,
  ) {
    this.data = new Float32Array(floats);
    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.buffer);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, floats * 4, gl.STREAM_READ);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  }

  get busy(): boolean {
    return this.sync !== null;
  }

  /** Encola la lectura de un rectángulo de cada attachment del target, uno tras otro. */
  request(target: Target, width: number, height: number): boolean {
    if (this.sync) return false;
    const gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, target.fbo);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.buffer);
    let offset = 0;
    for (let i = 0; i < target.textures.length; i++) {
      gl.readBuffer(gl.COLOR_ATTACHMENT0 + i);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, offset);
      offset += width * height * 16;
    }
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    this.sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    return true;
  }

  /** Devuelve los datos si ya han llegado. El array se reutiliza: cópialo si lo guardas. */
  poll(): Float32Array | null {
    if (!this.sync) return null;
    const gl = this.gl;
    const status = gl.clientWaitSync(this.sync, 0, 0);
    if (status === gl.TIMEOUT_EXPIRED) return null;
    const ok = status !== gl.WAIT_FAILED;
    if (ok) {
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.buffer);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.data);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    }
    gl.deleteSync(this.sync);
    this.sync = null;
    return ok ? this.data : null;
  }
}
