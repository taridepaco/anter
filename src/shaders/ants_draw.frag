#version 300 es
precision highp float;
precision highp int;

in vec2 v_local;
in vec3 v_color;
flat in float v_carrying;
flat in float v_shaped;

out vec4 o_color;

uniform vec3 u_food;

void main() {
  // Con zoom suficiente la hormiga es una elipse; de lejos, un rectángulo para que no parpadee.
  if (v_shaped > 0.5 && dot(v_local, v_local) > 1.0) discard;
  vec3 color = v_color;
  if (v_carrying > 0.5 && v_local.x > 0.2) color = u_food; // la comida va en las mandíbulas
  o_color = vec4(color, 1.0);
}
