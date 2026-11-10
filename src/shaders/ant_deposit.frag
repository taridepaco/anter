#version 300 es
precision highp float;

in vec4 v_pher;
in vec2 v_consume;

layout(location = 0) out vec4 o_pher;    // home, food, alarm, -
layout(location = 1) out vec4 o_consume; // comida recogida en la celda, tráfico sin comida, -, -

void main() {
  o_pher = v_pher;
  o_consume = vec4(v_consume, 0.0, 0.0);
}
