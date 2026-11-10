#version 300 es
// Pinta el mundo en pantalla: suelo, feromonas, peligro, comida, muros, nido y cursor del pincel.
precision highp float;
precision highp int;
precision highp sampler2D;

#include "hash"

uniform sampler2D u_world;
uniform sampler2D u_pher;
uniform vec2 u_worldSize;
uniform vec2 u_canvas;
uniform vec2 u_center;
uniform float u_zoom;      // píxeles por celda
uniform vec3 u_gain;       // home, food, alarm (0 = capa oculta)
uniform vec2 u_nestPos;
uniform float u_nestRadius;
uniform float u_foodPerCell;
uniform vec3 u_cursor;     // x, y, radio (radio 0 = sin cursor)

out vec4 o_color;

const vec3 SOIL = vec3(0.11, 0.09, 0.07);
const vec3 HOME_TRAIL = vec3(0.25, 0.5, 1.0);
const vec3 FOOD_TRAIL = vec3(0.25, 0.95, 0.4);
const vec3 ALARM_TRAIL = vec3(1.0, 0.25, 0.2);
const vec3 DANGER = vec3(0.55, 0.2, 0.75);
const vec3 FOOD = vec3(0.95, 0.78, 0.2);
const vec3 WALL = vec3(0.42, 0.42, 0.45);
const vec3 NEST = vec3(0.62, 0.4, 0.22);

vec4 bilinear(sampler2D t, vec2 p) {
  p -= 0.5;
  ivec2 i = ivec2(floor(p));
  vec2 f = p - floor(p);
  ivec2 m = textureSize(t, 0) - 1;
  vec4 a = texelFetch(t, clamp(i, ivec2(0), m), 0);
  vec4 b = texelFetch(t, clamp(i + ivec2(1, 0), ivec2(0), m), 0);
  vec4 c = texelFetch(t, clamp(i + ivec2(0, 1), ivec2(0), m), 0);
  vec4 d = texelFetch(t, clamp(i + ivec2(1, 1), ivec2(0), m), 0);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 screen = vec2(gl_FragCoord.x, u_canvas.y - gl_FragCoord.y);
  vec2 wp = u_center + (screen - 0.5 * u_canvas) / u_zoom;
  float px = 1.0 / u_zoom; // tamaño de un píxel en celdas

  if (wp.x < 0.0 || wp.y < 0.0 || wp.x >= u_worldSize.x || wp.y >= u_worldSize.y) {
    o_color = vec4(0.035, 0.035, 0.04, 1.0);
    return;
  }

  ivec2 cell = ivec2(wp);
  float grain = hashToUnit(uint(cell.x) * 1973u + uint(cell.y) * 9277u);
  vec3 col = SOIL * (0.85 + 0.3 * grain);

  vec4 ph = bilinear(u_pher, wp);
  vec3 glow = HOME_TRAIL * (1.0 - exp(-ph.r * u_gain.x))
            + FOOD_TRAIL * (1.0 - exp(-ph.g * u_gain.y))
            + ALARM_TRAIL * (1.0 - exp(-ph.b * u_gain.z));
  col = 1.0 - (1.0 - col) * (1.0 - clamp(glow, 0.0, 1.0));

  vec4 w = texelFetch(u_world, cell, 0);
  if (w.b > 0.0) {
    float hatch = step(0.5, fract((wp.x + wp.y) / 8.0));
    col = mix(col, DANGER, w.b * (0.3 + 0.25 * hatch));
  }
  if (w.g > 0.01) col = mix(col, FOOD, 0.35 + 0.6 * clamp(w.g / u_foodPerCell, 0.0, 1.0));
  if (w.r > 0.5) col = WALL * (0.9 + 0.2 * grain);

  float dn = distance(wp, u_nestPos);
  if (dn < u_nestRadius) col = mix(col, NEST, 0.45);
  if (abs(dn - u_nestRadius) < 1.5 * px + 0.3) col = NEST * 1.4;

  if (u_cursor.z > 0.0 && abs(distance(wp, u_cursor.xy) - u_cursor.z) < px) {
    col = mix(col, vec3(1.0), 0.6);
  }
  o_color = vec4(col, 1.0);
}
