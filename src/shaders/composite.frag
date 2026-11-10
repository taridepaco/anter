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

// Paleta del tema (ver render/palette.ts).
uniform float u_dark;      // 1 = noche: los rastros suman luz; 0 = día: tiñen el suelo
uniform vec3 u_outside;
uniform vec3 u_soil;
uniform vec3 u_homeTrail;
uniform vec3 u_foodTrail;
uniform vec3 u_alarmTrail;
uniform vec3 u_danger;
uniform vec3 u_food;
uniform vec3 u_wall;
uniform vec3 u_nest;
uniform vec3 u_cursorColor;

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
    o_color = vec4(u_outside, 1.0);
    return;
  }

  ivec2 cell = ivec2(wp);
  float grain = hashToUnit(uint(cell.x) * 1973u + uint(cell.y) * 9277u);
  vec3 col = u_soil * mix(0.95 + 0.07 * grain, 0.85 + 0.3 * grain, u_dark);

  vec4 ph = bilinear(u_pher, wp);
  vec3 amount = 1.0 - exp(-ph.rgb * u_gain);
  if (u_dark > 0.5) {
    vec3 glow = u_homeTrail * amount.r + u_foodTrail * amount.g + u_alarmTrail * amount.b;
    col = 1.0 - (1.0 - col) * (1.0 - clamp(glow, 0.0, 1.0));
  } else {
    col *= mix(vec3(1.0), u_homeTrail, amount.r)
         * mix(vec3(1.0), u_foodTrail, amount.g)
         * mix(vec3(1.0), u_alarmTrail, amount.b);
  }

  vec4 w = texelFetch(u_world, cell, 0);
  if (w.b > 0.0) {
    float hatch = step(0.5, fract((wp.x + wp.y) / 8.0));
    col = mix(col, u_danger, w.b * (0.3 + 0.25 * hatch));
  }
  if (w.g > 0.01) {
    // Damero de dos tonos: la comida se distingue del suelo claro sin depender solo del color.
    float checker = float((cell.x + cell.y) & 1);
    col = mix(col, u_food * (0.8 + 0.2 * checker), 0.45 + 0.55 * clamp(w.g / u_foodPerCell, 0.0, 1.0));
  }
  if (w.r > 0.5) col = u_wall * (0.9 + 0.2 * grain);

  float dn = distance(wp, u_nestPos);
  if (dn < u_nestRadius) col = mix(col, u_nest, 0.45);
  if (abs(dn - u_nestRadius) < 1.5 * px + 0.3) col = u_nest * mix(0.85, 1.25, u_dark);

  if (u_cursor.z > 0.0 && abs(distance(wp, u_cursor.xy) - u_cursor.z) < px) {
    col = mix(col, u_cursorColor, 0.75);
  }
  o_color = vec4(col, 1.0);
}
