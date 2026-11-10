/** Crea el contexto WebGL2 y comprueba lo que la simulación necesita sí o sí. */
export function createContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('Este navegador no soporta WebGL2.');

  // Renderizar a texturas float (RGBA32F/RGBA16F). Sin esto no hay simulación en GPU.
  if (!gl.getExtension('EXT_color_buffer_float')) {
    throw new Error('Falta la extensión EXT_color_buffer_float: la GPU no puede renderizar a texturas float.');
  }

  // El estado de las hormigas se escribe en 5 texturas a la vez (WebGL2 solo garantiza 4,
  // pero cualquier GPU de escritorio admite 8).
  const maxDrawBuffers = Math.min(
    gl.getParameter(gl.MAX_DRAW_BUFFERS) as number,
    gl.getParameter(gl.MAX_COLOR_ATTACHMENTS) as number,
  );
  if (maxDrawBuffers < 5) {
    throw new Error(`La GPU solo admite ${maxDrawBuffers} render targets simultáneos y hacen falta 5.`);
  }
  return gl;
}
