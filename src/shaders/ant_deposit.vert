#version 300 es
// Cada hormiga es un punto de 1 px sobre la rejilla del mundo y suma (blending aditivo) lo que emite.
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D u_state0; // pos.x, pos.y, rumbo, modo
uniform sampler2D u_state1; // energía, peligro, t desde la última fuente (o desde que se rindió), edad
uniform vec2 u_worldSize;
uniform vec2 u_nestPos;
uniform float u_nestRadius;
uniform float u_emitTauHome;
uniform float u_emitTauFood;
uniform float u_depositHome;
uniform float u_depositFood;
uniform float u_depositAlarm;
uniform float u_alarmThreshold;
// Dentro del nido no se desgasta nada. El margen es solo el nido: uno mayor deja sin desgastar el
// arranque de los rastros muertos, y las hormigas se quedan dando vueltas al final de ese muñón.
const float NEST_TRAFFIC_MARGIN = 1.0;

out vec4 v_pher;
out vec2 v_consume; // comida recogida en la celda, hormigas sin comida pasando por ella

// El rastro es más fuerte cerca de su origen (el nido o la comida). Pasadas ~3τ deja de marcar:
// si no, un rastro sin fuente (p.ej. un molino de hormigas) se realimenta para siempre.
float emission(float t, float tau) {
  float e = exp(-t / tau);
  return e < 0.05 ? 0.0 : e;
}

void main() {
  ivec2 tc = ivec2(gl_VertexID % ANT_TEX, gl_VertexID / ANT_TEX);
  gl_PointSize = 1.0;
  gl_Position = vec4(2.0, 2.0, 0.0, 1.0); // fuera del viewport: no deposita nada
  v_pher = vec4(0.0);
  v_consume = vec2(0.0);

  vec4 s0 = texelFetch(u_state0, tc, 0);
  if (s0.w < -0.5) return; // hueco libre
  vec4 s1 = texelFetch(u_state1, tc, 0);
  int mode = int(floor(s0.w + 0.5));
  float t = s1.z;

  if (mode == 0) v_pher.r = u_depositHome * emission(t, u_emitTauHome);
  else if (mode == 1) v_pher.g = u_depositFood * emission(t, u_emitTauFood);
  if (s1.y > u_alarmThreshold) v_pher.b = u_depositAlarm * s1.y;
  // t == 0 con carga: acaba de recoger comida en esta celda.
  if (mode == 1 && t < 0.5) v_consume.x = 1.0;
  // Toda hormiga que no lleva comida desgasta un poco el rastro de comida por el que pasa.
  if (mode != 1 && distance(s0.xy, u_nestPos) > NEST_TRAFFIC_MARGIN * u_nestRadius) v_consume.y = 1.0;

  if (max(v_pher.r, max(v_pher.g, v_pher.b)) < 1e-4 && max(v_consume.x, v_consume.y) < 0.5) return;
  gl_Position = vec4(s0.xy / u_worldSize * 2.0 - 1.0, 0.0, 1.0);
}
