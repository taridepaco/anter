import hashChunk from '../shaders/lib/hash.glsl?raw';

/** Trozos de GLSL que los shaders pueden incluir con `#include "nombre"`. */
const CHUNKS: Record<string, string> = { hash: hashChunk };

export type Defines = Record<string, number | string>;

function preprocess(src: string, defines: Defines): string {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  if (!lines[0].startsWith('#version')) throw new Error('Los shaders deben empezar por #version');
  const defineLines = Object.entries(defines).map(([k, v]) => `#define ${k} ${v}`);
  const body = lines.slice(1).map((line) => {
    const m = /^\s*#include\s+"(\w+)"/.exec(line);
    if (!m) return line;
    const chunk = CHUNKS[m[1]];
    if (chunk === undefined) throw new Error(`#include desconocido: "${m[1]}"`);
    return chunk;
  });
  return [lines[0], ...defineLines, ...body].join('\n');
}

function compile(gl: WebGL2RenderingContext, type: number, src: string, name: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? '';
    const numbered = src
      .split('\n')
      .map((l, i) => `${String(i + 1).padStart(4)}| ${l}`)
      .join('\n');
    console.error(`[${name}]\n${log}\n${numbered}`);
    gl.deleteShader(shader);
    throw new Error(`Error compilando ${name}: ${log}`);
  }
  return shader;
}

/** Programa GLSL con caché de uniforms y setters encadenables. */
export class Program {
  readonly handle: WebGLProgram;
  private readonly locations = new Map<string, WebGLUniformLocation | null>();

  constructor(
    private readonly gl: WebGL2RenderingContext,
    name: string,
    vertexSrc: string,
    fragmentSrc: string,
    defines: Defines = {},
  ) {
    const vs = compile(gl, gl.VERTEX_SHADER, preprocess(vertexSrc, defines), `${name}.vert`);
    const fs = compile(gl, gl.FRAGMENT_SHADER, preprocess(fragmentSrc, defines), `${name}.frag`);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? '';
      throw new Error(`Error enlazando ${name}: ${log}`);
    }
    this.handle = program;
  }

  use(): this {
    this.gl.useProgram(this.handle);
    return this;
  }

  private location(name: string): WebGLUniformLocation | null {
    let loc = this.locations.get(name);
    if (loc === undefined) {
      loc = this.gl.getUniformLocation(this.handle, name);
      this.locations.set(name, loc);
    }
    return loc;
  }

  /** Uniform float, vec2, vec3 o vec4 según cuántos valores se pasen. */
  f(name: string, ...v: number[]): this {
    const loc = this.location(name);
    if (!loc) return this;
    const gl = this.gl;
    if (v.length === 1) gl.uniform1f(loc, v[0]);
    else if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
    else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
    else gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
    return this;
  }

  i(name: string, v: number): this {
    const loc = this.location(name);
    if (loc) this.gl.uniform1i(loc, v);
    return this;
  }

  u(name: string, v: number): this {
    const loc = this.location(name);
    if (loc) this.gl.uniform1ui(loc, v >>> 0);
    return this;
  }

  tex(name: string, unit: number, texture: WebGLTexture): this {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    return this.i(name, unit);
  }
}
