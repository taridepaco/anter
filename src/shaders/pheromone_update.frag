#version 300 es
// Difusión + evaporación de las cuatro capas de feromona, más lo depositado en este paso.
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D u_pher;    // home, food, alarm, libre
uniform sampler2D u_deposit; // depósito de este paso (RGBA16F)
uniform sampler2D u_traffic; // G: hormigas sin comida que han pasado por la celda en este paso
uniform sampler2D u_world;
uniform vec4 u_diffusion;    // por capa: 0 = no se expande, 1 = blur completo cada paso
uniform vec4 u_evaporation;  // por capa: fracción que se pierde cada paso
uniform float u_cap;
uniform float u_trailWear;    // fracción del rastro de comida que gasta cada hormiga sin comida

out vec4 o_pher;

void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  ivec2 maxC = textureSize(u_pher, 0) - 1;
  vec4 center = texelFetch(u_pher, c, 0);
  vec4 sum = vec4(0.0);
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      sum += texelFetch(u_pher, clamp(c + ivec2(dx, dy), ivec2(0), maxC), 0);
    }
  }
  vec4 f = mix(center, sum / 9.0, u_diffusion);
  f += texelFetch(u_deposit, c, 0);
  f *= 1.0 - u_evaporation;
  // Desgaste: cada hormiga sin comida que pasa gasta una parte del rastro. En un camino vivo lo
  // compensan las que vuelven cargadas (el rastro se estabiliza); en uno muerto solo queda el
  // desgaste, y cuanto más transitado, antes se borra.
  f.g *= exp(-u_trailWear * texelFetch(u_traffic, c, 0).g);
  if (texelFetch(u_world, c, 0).r > 0.5) f = vec4(0.0); // los muros no guardan olor
  o_pher = clamp(f, 0.0, u_cap);
}
