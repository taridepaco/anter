#version 300 es
// Primer nivel de la reducción: suma bloques de 4x4 hormigas (256 -> 64).
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D u_events; // entregada, muerte, nacimiento, comido
uniform sampler2D u_state0; // pos.x, pos.y, rumbo, modo
uniform sampler2D u_state1; // energía, peligro, t, edad

layout(location = 0) out vec4 o_events;
layout(location = 1) out vec4 o_population; // vivas, cargando comida, suma energía, suma peligro

void main() {
  ivec2 base = ivec2(gl_FragCoord.xy) * 4;
  vec4 events = vec4(0.0);
  vec4 population = vec4(0.0);
  for (int y = 0; y < 4; y++) {
    for (int x = 0; x < 4; x++) {
      ivec2 c = base + ivec2(x, y);
      events += texelFetch(u_events, c, 0);
      float mode = texelFetch(u_state0, c, 0).w;
      float alive = mode > -0.5 ? 1.0 : 0.0;
      float carrying = abs(mode - 1.0) < 0.5 ? 1.0 : 0.0;
      vec4 s1 = texelFetch(u_state1, c, 0);
      population += alive * vec4(1.0, carrying, s1.x, s1.y);
    }
  }
  o_events = events;
  o_population = population;
}
