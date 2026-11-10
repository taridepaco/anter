// Hash PCG (Jarzynski & Olano, 2020): barato y de buena calidad para ruido en GPU.
uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

uint seed3(uint a, uint b, uint c) {
  return pcg(a ^ pcg(b ^ pcg(c)));
}

// Avanza el estado y devuelve un número en [0, 1).
float rand(inout uint s) {
  s = pcg(s);
  return float(s >> 8u) * (1.0 / 16777216.0);
}

float hashToUnit(uint v) {
  return float(pcg(v) >> 8u) * (1.0 / 16777216.0);
}
