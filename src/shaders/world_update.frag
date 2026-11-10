#version 300 es
// Mundo: resta la comida que se han llevado y aplica el trazo de pincel (si lo hay).
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D u_world;   // muro, comida, peligro, -
uniform sampler2D u_consume; // comida recogida en este paso
uniform int u_brushMode;     // 0 nada, 1 comida, 2 muro, 3 peligro, 4 borrar
uniform vec2 u_brushFrom;
uniform vec2 u_brushTo;
uniform float u_brushRadius;
uniform float u_foodPerCell;
uniform float u_dangerIntensity;

out vec4 o_world;

float segmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  return length(p - a - ab * h);
}

void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 w = texelFetch(u_world, c, 0);
  w.g = max(w.g - texelFetch(u_consume, c, 0).r, 0.0);

  if (u_brushMode > 0 && segmentDistance(vec2(c) + 0.5, u_brushFrom, u_brushTo) < u_brushRadius) {
    if (u_brushMode == 1) {
      if (w.r < 0.5) w.g = max(w.g, u_foodPerCell);
    } else if (u_brushMode == 2) {
      w = vec4(1.0, 0.0, 0.0, 0.0);
    } else if (u_brushMode == 3) {
      if (w.r < 0.5) w.b = max(w.b, u_dangerIntensity);
    } else {
      w = vec4(0.0);
    }
  }
  o_world = w;
}
