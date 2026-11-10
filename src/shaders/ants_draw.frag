#version 300 es
precision highp float;

in vec2 v_local;
in vec3 v_color;
flat in float v_carrying;
flat in float v_shaped;

out vec4 o_color;

const vec3 FOOD = vec3(0.95, 0.78, 0.2);

void main() {
  // Con zoom suficiente la hormiga es una elipse; de lejos, un rectángulo para que no parpadee.
  if (v_shaped > 0.5 && dot(v_local, v_local) > 1.0) discard;
  vec3 color = v_color;
  if (v_carrying > 0.5 && v_local.x > 0.2) color = FOOD; // la comida va en las mandíbulas
  o_color = vec4(color, 1.0);
}
