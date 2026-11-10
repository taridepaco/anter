#version 300 es
// Una instancia por hueco de hormiga; los huecos vacíos se mandan fuera de pantalla.
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D u_state0; // pos.x, pos.y, rumbo, modo
uniform sampler2D u_state1; // energía, peligro, t, edad
uniform vec2 u_canvas;
uniform vec2 u_center;
uniform float u_zoom;
uniform float u_antSize;

out vec2 v_local;
out vec3 v_color;
flat out float v_carrying;
flat out float v_shaped;

const vec2 CORNERS[6] = vec2[6](
  vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0),
  vec2(-1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, 1.0)
);

uniform vec3 u_ant;
uniform vec3 u_antHungry;
uniform vec3 u_antGiveUp;
uniform vec3 u_antScared;

void main() {
  ivec2 tc = ivec2(gl_InstanceID % ANT_TEX, gl_InstanceID / ANT_TEX);
  vec4 s0 = texelFetch(u_state0, tc, 0);
  if (s0.w < -0.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  vec4 s1 = texelFetch(u_state1, tc, 0);
  int mode = int(floor(s0.w + 0.5));

  vec2 corner = CORNERS[gl_VertexID];
  float lengthPx = max(u_antSize * u_zoom, 2.0);
  float widthPx = max(lengthPx * 0.45, 1.0);
  vec2 dir = vec2(cos(s0.z), sin(s0.z));
  vec2 side = vec2(-dir.y, dir.x);
  vec2 screen = (s0.xy - u_center) * u_zoom + 0.5 * u_canvas
              + dir * corner.x * lengthPx * 0.5 + side * corner.y * widthPx * 0.5;
  gl_Position = vec4(screen.x / u_canvas.x * 2.0 - 1.0, 1.0 - screen.y / u_canvas.y * 2.0, 0.0, 1.0);

  vec3 color = mode == 2 ? u_antHungry : mode == 3 ? u_antGiveUp : u_ant;
  v_color = mix(color, u_antScared, s1.y);
  v_local = corner;
  v_carrying = mode == 1 ? 1.0 : 0.0;
  v_shaped = lengthPx > 5.0 ? 1.0 : 0.0;
}
