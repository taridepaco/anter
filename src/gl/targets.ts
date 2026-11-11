export type TexFormat = 'rgba32f' | 'rgba16f';

/** Framebuffer con una o varias texturas de color (MRT). */
export interface Target {
  readonly fbo: WebGLFramebuffer;
  readonly textures: WebGLTexture[];
  readonly width: number;
  readonly height: number;
}

export function createTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  format: TexFormat,
): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const internal = format === 'rgba32f' ? gl.RGBA32F : gl.RGBA16F;
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, gl.RGBA, gl.FLOAT, null);
  // Los shaders leen con texelFetch; NEAREST evita depender de OES_texture_float_linear.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

export function uploadTexture(
  gl: WebGL2RenderingContext,
  tex: WebGLTexture,
  width: number,
  height: number,
  data: Float32Array,
): void {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.FLOAT, data);
}

export function createTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  formats: TexFormat[],
): Target {
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  const textures = formats.map((format, i) => {
    const tex = createTexture(gl, width, height, format);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, tex, 0);
    return tex;
  });
  gl.drawBuffers(textures.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`Framebuffer incompleto (0x${status.toString(16)}) para ${formats.join(', ')}`);
  }
  return { fbo, textures, width, height };
}

export function deleteTarget(gl: WebGL2RenderingContext, target: Target): void {
  target.textures.forEach((tex) => gl.deleteTexture(tex));
  gl.deleteFramebuffer(target.fbo);
}

export function bindTarget(gl: WebGL2RenderingContext, target: Target): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
  gl.viewport(0, 0, target.width, target.height);
}

export function clearTarget(gl: WebGL2RenderingContext, target: Target): void {
  bindTarget(gl, target);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

/** Dos targets iguales: se lee de `read`, se escribe en `write` y se intercambian. */
export class PingPong {
  read: Target;
  write: Target;

  constructor(gl: WebGL2RenderingContext, width: number, height: number, formats: TexFormat[]) {
    this.read = createTarget(gl, width, height, formats);
    this.write = createTarget(gl, width, height, formats);
  }

  swap(): void {
    [this.read, this.write] = [this.write, this.read];
  }

  dispose(gl: WebGL2RenderingContext): void {
    deleteTarget(gl, this.read);
    deleteTarget(gl, this.write);
  }
}

/** Dibuja un triángulo que cubre todo el viewport (ver quad.vert). */
export function drawFullscreen(gl: WebGL2RenderingContext): void {
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
