# Anter

Simulador de colonia de hormigas en WebGL2. Toda la simulación por hormiga corre en la GPU (hasta 65.536 a la vez). Los caminos a la comida emergen de tres feromonas: **home** (rastro al nido), **food** (rastro a la comida) y **alarm**. Queda un cuarto canal libre para otra hormona.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests de la contabilidad de la colonia
npm run build
```

Requiere un navegador con WebGL2, `EXT_color_buffer_float` y 5 render targets simultáneos (cualquier Chrome, Edge o Firefox de escritorio).

## Controles

| | |
|---|---|
| Clic izquierdo | Pintar con la herramienta activa |
| Clic derecho / central + arrastrar | Mover la cámara |
| Rueda | Zoom |
| `1` `2` `3` `4` `5` | Comida, muro, peligro, borrar, mover el nido |
| `Espacio` / `.` / `F` | Pausa / avanzar un paso / encuadrar |

El panel de la derecha cambia todos los parámetros en vivo.

## Cómo funciona

Cada hormiga es un texel de cinco texturas RGBA32F de 256×256 (ver `src/sim/AntSystem.ts`):

| Textura | R | G | B | A |
|---|---|---|---|---|
| 0 | pos.x | pos.y | rumbo | modo (−1 hueco libre, 0 busca, 1 lleva comida, 2 hambre, 3 vuelve sin nada) |
| 1 | energía | peligro | ticks desde el nido/la comida | edad |
| 2 | vector al nido x | vector al nido y | comida recordada x | comida recordada y |
| 3 | lado por el que bordea un obstáculo (0 = libre, ±1) | ticks bordeando | ticks de búsqueda local que le quedan | libre |
| 4 | eventos: entregada | muerte | nacimiento | comido |

La velocidad y los rasgos fijos (exploradora, lado preferido al bordear, esperanza de vida) salen de un hash del hueco.

### Navegación

Imita cómo lo hacen las hormigas reales:

- **Integración de caminos.** Cada hormiga va sumando sus pasos y así sabe en qué dirección queda el nido (el *vector al nido*). Al ver el nido, el vector vuelve a ser exacto. Las que llevan comida o tienen hambre giran hacia el nido y deambulan menos, así que vuelven casi en línea recta.
- **Rastro de reclutamiento.** El rastro de comida (food) solo se pone a la vuelta. Evapora despacio, así que dura más que un viaje de ida y vuelta.
- **Rutas que se acortan.** Los rastros tienen algo de anchura (difusión 0,25). En una curva se acumula más feromona por el lado de dentro, las hormigas la siguen y en cada pasada recortan un poco. Al rodear un muro, el camino empieza pegado a su cara y acaba tensándose en la punta, en dos tramos casi rectos.
- **Desgaste del rastro.** Cada hormiga que pasa sin comida por el rastro de comida gasta una pequeña parte (un 1 % por paso). En un camino vivo lo compensan las que vuelven cargadas. Cuando la fuente se agota, solo queda el desgaste, y el rastro se borra tanto más rápido cuanto más transitado está. Así las hormigas dejan de ir a una fuente muerta.
- **Memoria de la fuente.** Al recoger comida, la hormiga guarda dónde está como un vector desde el nido. Después de entregar, vuelve hacia ella.
- **Polaridad.** Las antenas que apuntan hacia el lado correcto del rastro (hacia fuera del nido al buscar, hacia el nido al volver) le dan más peso.
- **Confianza en el rastro.** Sobre su rastro, si un obstáculo le tapa el objetivo (lo ve hasta 192 celdas), la hormiga sigue el rastro y no el vector: por ahí ya han rodeado otras. Si no hay obstáculo, el vector pesa menos mientras el rastro la lleve más o menos hacia su objetivo. Si el rastro la aleja (un bucle, un gancho), el vector vuelve a pesar entero y la saca de ahí.
- **Búsqueda local.** Si la comida no está donde la esperaba, la hormiga la busca alrededor en bucles cada vez más amplios durante 200 ticks, como *Cataglyphis*. Lo hace solo en dos sitios: donde ella misma recogió comida, y al final de un rastro.
- **Retirada.** Si la búsqueda no da nada, vuelve al nido "sin nada" (modo 3, gris azulado), en vez de quedarse dando vueltas hasta tener hambre. Por el camino desgasta el rastro de comida, como cualquier hormiga sin comida.
- **Obstáculos (algoritmo Bug).** Si una hormiga con objetivo (el nido o una comida recordada) choca con algo que le tapa ese objetivo, bordea el obstáculo pegada a la pared. Si solo roza una pared y el objetivo sigue a la vista, se aparta hacia el lado del objetivo y sigue. En cada paso se arrima un poco a la pared y, si eso la bloquea, se aparta lo justo. Deja de bordear en cuanto la línea recta hacia su objetivo queda libre (lo comprueba hasta 64 celdas por delante). El lado por el que bordea lo decide el rastro, si huele claramente más por un lado; si no, su lado preferido. Las hormigas sin objetivo simplemente se dan la vuelta.

Cada tick:

1. `ant_update.frag`: cada hormiga mueve sus tres antenas, gira, avanza, recoge o entrega comida, come y envejece.
2. `ant_deposit.*`: cada hormiga se dibuja como un punto con blending aditivo para depositar feromona. La intensidad es `exp(-t/τ)`, con una τ para cada rastro, así que el rastro es más fuerte cerca de su origen.
3. `pheromone_update.frag`: aplica difusión y evaporación a cada capa, y el desgaste del rastro de comida por el tráfico sin comida.
4. `world_update.frag`: resta la comida recogida y aplica el pincel.

Cada pocos frames, la GPU suma los eventos y la población con una reducción (`Stats.ts`) que se lee de forma asíncrona. Con esos datos, `Colony.ts` lleva en CPU la comida del nido y decide los nacimientos.

En `npm run dev` hay un gancho de depuración en la consola: `anter.run(ticks)`, `anter.benchmark()`, `anter.probe(x, y)`, `anter.paint(herramienta, x, y, radio)`, `anter.antsIn(x0, y0, x1, y1)`, `anter.snapshot()`, `anter.flush()`, `anter.params` y `anter.colony`.
