#version 300 es
// Siguientes niveles de la reducción: suma bloques de 4x4 de dos texturas a la vez.
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D u_a;
uniform sampler2D u_b;

layout(location = 0) out vec4 o_a;
layout(location = 1) out vec4 o_b;

void main() {
  ivec2 base = ivec2(gl_FragCoord.xy) * 4;
  vec4 a = vec4(0.0);
  vec4 b = vec4(0.0);
  for (int y = 0; y < 4; y++) {
    for (int x = 0; x < 4; x++) {
      a += texelFetch(u_a, base + ivec2(x, y), 0);
      b += texelFetch(u_b, base + ivec2(x, y), 0);
    }
  }
  o_a = a;
  o_b = b;
}
