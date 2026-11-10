#version 300 es
// Junta los dos totales de 1x1 en un target de 2x1 para leerlos con un solo readPixels.
precision highp float;
precision highp sampler2D;

uniform sampler2D u_a;
uniform sampler2D u_b;

out vec4 o_color;

void main() {
  o_color = gl_FragCoord.x < 1.0 ? texelFetch(u_a, ivec2(0), 0) : texelFetch(u_b, ivec2(0), 0);
}
