#version 300 es
// Un paso de vida de cada hormiga. Cada fragmento es una hormiga (texel de las texturas de estado).
precision highp float;
precision highp int;
precision highp sampler2D;

#include "hash"

uniform sampler2D u_state0; // pos.x, pos.y, rumbo, modo
uniform sampler2D u_state1; // energía, peligro, t desde la última fuente, edad
uniform sampler2D u_state2; // vector al nido (xy), comida recordada respecto al nido (zw)
uniform sampler2D u_state3; // lado por el que bordea (0 = libre), ticks bordeando, búsqueda local, -
uniform sampler2D u_events; // entregada, muerte, nacimiento, comido (acumulado)
uniform sampler2D u_world;  // muro, comida, peligro, -
uniform sampler2D u_pher;   // home, food, alarm, -

uniform vec2 u_worldSize;
uniform uint u_tick;
uniform uint u_seed;
uniform vec2 u_nestPos;
uniform float u_nestRadius;
uniform float u_nestHasFood;
uniform uint u_spawnStart;
uniform uint u_spawnCount;
uniform float u_resetEvents;

uniform float u_speed;
uniform float u_sensorAngle;
uniform float u_sensorDist;
uniform float u_turnRate;
uniform float u_wander;
uniform float u_sensitivity;
uniform float u_scoutFraction;
uniform float u_homing;        // giro máx. hacia el nido estimado al volver (rad/tick)
uniform float u_returnWander;  // factor del deambular al volver
uniform float u_memoryPull;    // giro máx. hacia la comida recordada (rad/tick)
uniform float u_trailPolarity; // 0 = el rastro no tiene sentido, 1 = muy marcado
uniform float u_trailTrust;    // 0..1: cuánto deja de lado su vector cuando huele su rastro
uniform float u_searchTicks;   // duración de la búsqueda local antes de rendirse

uniform float u_metabolism;
uniform float u_hungerThreshold;
uniform float u_mealCost;
uniform float u_maxAge;

uniform float u_dangerDamage;
uniform float u_dangerGain;
uniform float u_alarmAvoid;
uniform float u_alarmContagion;
uniform float u_contagionCap;
uniform float u_dangerDecay;
uniform float u_fleeBoost;

layout(location = 0) out vec4 o_state0;
layout(location = 1) out vec4 o_state1;
layout(location = 2) out vec4 o_state2;
layout(location = 3) out vec4 o_state3;
layout(location = 4) out vec4 o_events;

const float PI = 3.14159265;
const float TAU = 6.28318531;
const float BLOCKED = -1e9;
// Un sensor que toca su objetivo (comida o nido) gana siempre.
const float GOAL = 1e6;
// Si llega a menos de esto de donde recordaba la comida y no la encuentra, la olvida.
const float FORGET_RADIUS = 10.0;
// Seguimiento de muros (algoritmo Bug).
const float HUG = 0.25;          // giro hacia la pared en cada paso para no despegarse (rad)
const float SCAN = 0.3;          // paso de giro buscando hueco (rad)
const int SCAN_STEPS = 22;       // 22 × 0,3 rad: más de una vuelta completa
const float LOOKAHEAD = 64.0;    // hasta dónde comprueba que el camino a su objetivo está libre
const float SIGHT = 192.0;       // hasta dónde ve que un obstáculo le tapa el objetivo
const float MAX_FOLLOW = 3000.0; // ticks bordeando antes de rendirse
// Búsqueda local: bucles de radio creciente (R0 + GROWTH · ticks buscando) alrededor del sitio.
const float SEARCH_R0 = 2.5;
const float SEARCH_GROWTH = 0.035;
// Rastro de comida bajo las patas a partir del cual, si ninguna antena lo huele delante, es el final.
const float TRAIL_END = 3.0;

const int DEAD = -1;    // hueco libre
const int SEARCH = 0;   // busca comida: sigue el rastro food (y su memoria, si la tiene)
const int RETURN = 1;   // lleva comida al nido: integración de caminos + rastro home
const int HUNGRY = 2;   // vuelve al nido a comer: igual que RETURN, sin carga
const int GIVE_UP = 3;  // vuelve sin nada tras no encontrar comida

vec2 dirOf(float a) {
  return vec2(cos(a), sin(a));
}

bool inWorld(vec2 p) {
  return p.x >= 0.0 && p.y >= 0.0 && p.x < u_worldSize.x && p.y < u_worldSize.y;
}

// Giro (acotado a [-1, 1] rad) que alinearía el rumbo con el vector v.
float steerToward(vec2 v, float heading) {
  float delta = mod(atan(v.y, v.x) - heading + PI, TAU) - PI;
  return clamp(delta, -1.0, 1.0);
}

// Valor de una antena orientada en `angle`. Por debajo de u_sensitivity un olor no se nota, así la
// neblina difusa no arrastra (ni espanta) a todas las hormigas; trailWeight = 0 ignora el rastro
// (exploradoras). La polaridad da más peso al rastro en las antenas que apuntan hacia fuera del
// nido al buscar, y hacia el nido al volver: la hormiga sabe dónde queda gracias a su vector.
// `trailSeen` acumula el rastro más fuerte que ha notado alguna antena.
float sense(vec2 pos, float angle, bool searching, float trailWeight, vec2 homeDir, inout float trailSeen) {
  vec2 dir = dirOf(angle);
  vec2 p = pos + dir * u_sensorDist;
  if (!inWorld(p)) return BLOCKED;
  ivec2 c = ivec2(p);
  vec4 w = texelFetch(u_world, c, 0);
  if (w.r > 0.5) return BLOCKED;
  vec4 ph = texelFetch(u_pher, c, 0);
  float trail = searching ? ph.g : ph.r;
  float polarity = 1.0 + u_trailPolarity * dot(dir, homeDir) * (searching ? -1.0 : 1.0);
  bool goal = searching ? w.g > 0.01 : distance(p, u_nestPos) < u_nestRadius;
  float smell = trailWeight * max(trail - u_sensitivity, 0.0);
  trailSeen = max(trailSeen, smell);
  return polarity * smell + (goal ? GOAL : 0.0) - u_alarmAvoid * max(ph.b - u_sensitivity, 0.0);
}

bool isFree(vec2 p) {
  return inWorld(p) && texelFetch(u_world, ivec2(p), 0).r < 0.5;
}

// ¿Está libre la línea recta hacia su objetivo? Mira hasta `range` celdas, con una muestra cada 2.
bool pathClearWithin(vec2 pos, vec2 toGoal, float range) {
  float dist = length(toGoal);
  if (dist < 1.0) return true;
  vec2 dir = toGoal / dist;
  float len = min(dist, range);
  int samples = int(ceil(len / 2.0));
  for (int i = 1; i <= samples; i++) {
    if (!isFree(pos + dir * (len * float(i) / float(samples)))) return false;
  }
  return true;
}

bool pathClear(vec2 pos, vec2 toGoal) {
  return pathClearWithin(pos, toGoal, LOOKAHEAD);
}

float trailAt(vec2 p, bool searching) {
  if (!inWorld(p)) return 0.0;
  vec4 ph = texelFetch(u_pher, ivec2(p), 0);
  return searching ? ph.g : ph.r;
}

// Lado por el que bordear (+1 girando a la izquierda, -1 a la derecha): hacia donde huela claramente
// más su rastro, que es por donde ya pasaron otras; si no, su mano de siempre (rasgo fijo del hueco).
// Así, como en el experimento del doble puente, el rodeo más corto acaba ganando.
float chooseSide(vec2 pos, float heading, bool searching, uint idx) {
  float left = trailAt(pos + dirOf(heading + 0.5 * PI) * u_sensorDist, searching);
  float right = trailAt(pos + dirOf(heading - 0.5 * PI) * u_sensorDist, searching);
  if (left > 1.2 * right + u_sensitivity) return 1.0;
  if (right > 1.2 * left + u_sensitivity) return -1.0;
  return hashToUnit(idx ^ 0x1b873593u) < 0.5 ? -1.0 : 1.0;
}

// Gira hacia `side` en pasos de SCAN hasta que el siguiente paso quede libre.
float turnUntilFree(vec2 pos, float heading, float speed, float side) {
  for (int k = 0; k < SCAN_STEPS; k++) {
    if (isFree(pos + dirOf(heading) * speed)) break;
    heading += side * SCAN;
  }
  return heading;
}

void main() {
  ivec2 tc = ivec2(gl_FragCoord.xy);
  uint idx = uint(tc.y * ANT_TEX + tc.x);
  vec4 s0 = texelFetch(u_state0, tc, 0);
  vec4 s1 = texelFetch(u_state1, tc, 0);
  vec4 s2 = texelFetch(u_state2, tc, 0);
  vec4 s3 = texelFetch(u_state3, tc, 0);
  vec4 ev = texelFetch(u_events, tc, 0) * (1.0 - u_resetEvents);
  uint rng = seed3(idx, u_tick, u_seed);
  int mode = int(floor(s0.w + 0.5));

  // Hueco libre: nace si cae dentro de la ventana de nacimientos de este paso.
  if (mode == DEAD) {
    uint rel = (idx + uint(ANT_CAPACITY) - u_spawnStart) % uint(ANT_CAPACITY);
    if (rel < u_spawnCount) {
      float a = rand(rng) * TAU;
      vec2 p = u_nestPos + dirOf(a) * sqrt(rand(rng)) * u_nestRadius * 0.8;
      s0 = vec4(p, a, float(SEARCH));
      s1 = vec4(1.0, 0.0, 0.0, 0.0);
      s2 = vec4(u_nestPos - p, 0.0, 0.0);
      s3 = vec4(0.0);
      ev.z += 1.0;
    }
    o_state0 = s0;
    o_state1 = s1;
    o_state2 = s2;
    o_state3 = s3;
    o_events = ev;
    return;
  }

  vec2 pos = s0.xy;
  float heading = s0.z;
  float energy = s1.x;
  float danger = s1.y;
  float t = s1.z;
  float age = s1.w;
  vec2 homeVec = s2.xy; // hacia dónde cree que está el nido (integración de caminos)
  vec2 foodVec = s2.zw; // dónde recuerda la comida, medido desde el nido (0 = no recuerda nada)
  float wallSide = s3.x;    // 0: va libre; ±1: bordea un obstáculo girando hacia ese lado
  float followTicks = s3.y; // ticks que lleva bordeándolo
  float searchLeft = s3.z;  // > 0: búsqueda local en curso, ticks que le quedan
  bool searching = mode == SEARCH;
  bool remembers = dot(foodVec, foodVec) > 1.0;
  bool localSearch = searching && searchLeft > 0.0;
  // Su objetivo: el nido al volver; al buscar, la comida que recuerda (si recuerda alguna).
  bool hasGoal = !searching || remembers;
  vec2 toGoal = searching ? foodVec + homeVec : homeVec;
  vec2 homeDir = dot(homeVec, homeVec) > 1.0 ? normalize(homeVec) : vec2(0.0);
  // Rasgo fijo de cada hueco: una fracción de hormigas son exploradoras y no siguen el rastro de
  // comida mientras no tengan una fuente propia. Durante la búsqueda local nadie lo sigue.
  bool scout = hashToUnit(idx ^ 0x5bd1e995u) < u_scoutFraction;
  float trailWeight = searching && ((scout && !remembers) || localSearch) ? 0.0 : 1.0;
  // Otro rasgo fijo: hacia qué lado gira al bordear o al buscar en bucles.
  float hand = hashToUnit(idx ^ 0x1b873593u) < 0.5 ? -1.0 : 1.0;
  float speedFactor = 0.85 + 0.3 * hashToUnit(idx ^ 0x68e31da4u);
  float speed = u_speed * speedFactor * (1.0 + u_fleeBoost * danger);

  // 1. Bordear un obstáculo (algoritmo Bug): pegada a la pared hasta que vea libre la línea recta
  // hacia su objetivo. Mientras bordea, ni el rastro ni el vector deciden el rumbo.
  if (wallSide != 0.0) {
    followTicks += 1.0;
    if (!hasGoal || followTicks > MAX_FOLLOW || pathClear(pos, toGoal)) {
      if (hasGoal) heading = atan(toGoal.y, toGoal.x);
      wallSide = 0.0;
    } else {
      // Se arrima un poco a la pared y, si eso la bloquea, se aparta lo justo.
      heading = turnUntilFree(pos, heading - wallSide * HUG, speed, wallSide);
    }
  }

  float trailSeen = 0.0;
  if (wallSide == 0.0) {
    // 2. Sentir: tres antenas por delante (derecha, centro, izquierda).
    float sR = sense(pos, heading - u_sensorAngle, searching, trailWeight, homeDir, trailSeen);
    float sC = sense(pos, heading, searching, trailWeight, homeDir, trailSeen);
    float sL = sense(pos, heading + u_sensorAngle, searching, trailWeight, homeDir, trailSeen);
    bool goalSeen = max(sC, max(sL, sR)) > 0.5 * GOAL;

    // 3. Girar hacia la antena más fuerte.
    float turn = 0.0;
    if (localSearch && !goalSeen) {
      // Búsqueda local: bucles cada vez más amplios alrededor de donde esperaba la comida,
      // como las vueltas de búsqueda de Cataglyphis cuando su vector se agota.
      float elapsed = u_searchTicks - searchLeft;
      turn = hand * speed / (SEARCH_R0 + SEARCH_GROWTH * elapsed);
    } else if (sC < sL || sC < sR) {
      if (sL > sR) turn = u_turnRate;
      else if (sR > sL) turn = -u_turnRate;
      else turn = rand(rng) < 0.5 ? u_turnRate : -u_turnRate;
    }
    // Además se guía por su vector. Sobre un rastro:
    //  - si un obstáculo le tapa el objetivo, sigue el rastro y no el vector: por ahí ya lo han
    //    rodeado otras (en una ruta conocida las hormigas reales se fían del rastro, no de la recta);
    //  - si no, se fía más del rastro (u_trailTrust) mientras la lleve más o menos hacia su objetivo;
    //    si la aleja (un bucle, un gancho), el vector vuelve a pesar entero y la saca de ahí.
    if (hasGoal && dot(toGoal, toGoal) > 1.0) {
      float pull = searching ? u_memoryPull : u_homing;
      float vectorWeight = 1.0;
      if (trailSeen > 0.0) {
        float agreement = max(dot(dirOf(heading), normalize(toGoal)), 0.0);
        vectorWeight = pathClearWithin(pos, toGoal, SIGHT) ? 1.0 - u_trailTrust * agreement : 0.0;
      }
      turn += steerToward(toGoal, heading) * pull * vectorWeight;
    }
    // Ruido: menos al volver (va decidida) o al buscar en bucles, y más cuanto más asustada.
    float wander = u_wander * (searching && !localSearch ? 1.0 : u_returnWander) * (1.0 + 2.0 * danger);
    turn += (rand(rng) * 2.0 - 1.0) * wander;
    heading += turn;
  }

  // 4. Avanzar.
  vec2 next = pos + dirOf(heading) * speed;
  if (isFree(next)) {
    homeVec -= next - pos; // integración de caminos: descuenta cada paso de su vector al nido
    pos = next;
  } else if (wallSide == 0.0 && hasGoal && !pathClear(pos, toGoal)) {
    // Un obstáculo entre ella y su objetivo: empieza a bordearlo.
    wallSide = chooseSide(pos, heading, searching, idx);
    followTicks = 0.0;
    heading = turnUntilFree(pos, heading, speed, wallSide);
  } else if (wallSide == 0.0 && hasGoal) {
    // Solo ha rozado una pared y su objetivo sigue a la vista: se aparta hacia el lado del
    // objetivo y sigue (si se pusiera a bordear, al pasar una esquina entraría y saldría sin parar).
    vec2 d = dirOf(heading);
    float side = d.x * toGoal.y - d.y * toGoal.x >= 0.0 ? 1.0 : -1.0;
    heading = turnUntilFree(pos, heading, speed, side);
  } else if (wallSide == 0.0) {
    heading += PI + (rand(rng) - 0.5) * 1.5; // sin objetivo, simplemente se da la vuelta
  }

  // 5. Interactuar con lo que tiene bajo las patas. Cada cambio de objetivo deja de bordear.
  vec4 here = texelFetch(u_world, ivec2(pos), 0);
  vec4 pherHere = texelFetch(u_pher, ivec2(pos), 0);
  bool atNest = distance(pos, u_nestPos) < u_nestRadius;
  t += 1.0;
  age += 1.0;

  if (atNest) {
    homeVec = u_nestPos - pos; // ve el nido: su vector vuelve a ser exacto
    if (mode == RETURN) ev.x += 1.0;
    // Comen al volver de un viaje, o si ya pasaban por el nido con hambre.
    bool wantsMeal = mode == RETURN || mode == HUNGRY || energy < u_hungerThreshold;
    if (u_nestHasFood > 0.5 && wantsMeal && energy < 1.0) {
      ev.w += (1.0 - energy) * u_mealCost;
      energy = 1.0;
    }
    if (!searching) heading += PI; // vuelve a salir por donde vino
    mode = SEARCH;
    t = 0.0;
    wallSide = 0.0;
    searchLeft = 0.0;
  } else if (searching && here.g > 0.01) {
    mode = RETURN;
    t = 0.0;
    heading += PI;
    foodVec = -homeVec; // recuerda la fuente como un vector desde el nido
    wallSide = 0.0;
    searchLeft = 0.0;
  } else if (searching) {
    bool giveUp = false;
    // La comida no está donde la esperaba, y solo en esos sitios la busca alrededor un rato:
    //  - llegó al sitio donde ella misma recogió comida y no queda;
    //  - está al final de un rastro: mucho rastro bajo las patas y ninguna antena lo huele delante.
    // (Los rastros que ya no llevan a nada los borra el desgaste, así que no hace falta más.)
    bool atMemory = remembers && length(foodVec + homeVec) < FORGET_RADIUS;
    bool trailEnd = !remembers && !localSearch && trailWeight > 0.0 && wallSide == 0.0
                 && trailSeen == 0.0 && pherHere.g > TRAIL_END;
    if (atMemory || trailEnd) {
      foodVec = vec2(0.0);
      wallSide = 0.0;
      searchLeft = u_searchTicks;
      giveUp = u_searchTicks <= 0.0;
    } else if (localSearch) {
      searchLeft -= 1.0;
      giveUp = searchLeft <= 0.0; // la búsqueda no ha dado nada: se rinde
    }
    if (giveUp) {
      // Vuelve al nido sin nada. Por el camino desgasta el rastro de comida (ant_deposit.vert).
      mode = GIVE_UP;
      t = 0.0;
      heading += PI;
      foodVec = vec2(0.0);
      wallSide = 0.0;
      searchLeft = 0.0;
    }
  }
  float alarmHere = pherHere.b;

  // 6. Metabolismo y peligro.
  energy -= u_metabolism + u_dangerDamage * here.b;
  danger += u_dangerGain * here.b;
  // Oler alarma pone nerviosa a la hormiga, pero solo hasta contagionCap: si el tope queda
  // por debajo del umbral de emisión, la alarma no se propaga en cadena.
  if (danger < u_contagionCap) danger = min(danger + u_alarmContagion * alarmHere, u_contagionCap);
  danger = clamp(danger * (1.0 - u_dangerDecay), 0.0, 1.0);

  if (mode == SEARCH && energy < u_hungerThreshold && u_nestHasFood > 0.5) {
    mode = HUNGRY;
    wallSide = 0.0;
  }

  float lifespan = u_maxAge * (0.7 + 0.6 * hashToUnit(idx ^ 0x9e3779b9u));
  if (energy <= 0.0 || age > lifespan) {
    mode = DEAD;
    ev.y += 1.0;
  }

  heading = mod(heading + PI, TAU) - PI;
  o_state0 = vec4(pos, heading, float(mode));
  o_state1 = vec4(energy, danger, t, age);
  o_state2 = vec4(homeVec, foodVec);
  o_state3 = vec4(wallSide, followTicks, searchLeft, 0.0);
  o_events = ev;
}
