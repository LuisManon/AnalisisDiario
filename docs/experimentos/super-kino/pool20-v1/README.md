# Super Kino: pool de 20 y núcleo de 7

Archivado el 14 de noviembre de 2026. Estado: cerrado sin adopción. Los bloques siguientes conservan informes originales; sus comandos y rutas son referencias históricas retiradas, no instrucciones ejecutables disponibles. Los resultados son simulados y no prueban rentabilidad futura.

---

## Fuente histórica: `experiments/super-kino/pool20-v1/PROTOCOL.md`

# Super Kino: pool dinámico de 20, v1

Protocolo fijado antes de ejecutar la retrospectiva de esta candidata. No activa estrategias ni altera carteras operativas. Perfiles aplicados: ciencia de datos, matemática aplicada, análisis de datos, ingeniería de software y QA.

## Hipótesis y presupuesto

Seleccionar 20 números con frecuencias suavizadas multiventana y coherencia de forma aprendida solo del pasado, y concentrar 200 jugadas de 10 en un núcleo de 7 números, podría elevar la frecuencia de carteras con al menos una jugada de 7+ aciertos. Métrica primaria: tasa de sorteos con alguna jugada 7+; mejora mínima exploratoria: +5 puntos porcentuales frente a V13.3 y a uniforme 84. Secundarias: 8+, máximo, aciertos en el pool, inversión, premios y neto. No se optimiza ROI sobre los resultados.

Cada cartera: 200 jugadas únicas, costo modelado RD$25/jugada (RD$5,000/sorteo). Núcleo fijo de 7 y 3 variables: C(13,3)=286 combinaciones posibles; 200 se eligen reproduciblemente, equilibrando exposición de los 13 variables. Con 8 fijos solo C(12,2)=66 combinaciones únicas: insuficiente para 200.

## Selección congelada

Historial del régimen observado de 84 números desde 2026-09-15, corte 2026-11-11. Calentamiento: primeros 30 sorteos; validación descriptiva: siguientes 10; prueba temporal: restantes. El archivo histórico ha sido examinado en investigaciones anteriores: la prueba temporal NO se presenta como reserva nunca vista. Para confirmar una ventaja se necesitará una prueba prospectiva nueva.

Para cada fecha se descartan el propio ganador y todos los posteriores. Ventanas: todo el pasado, últimos 20 y últimos 8. Frecuencias suavizadas con 8 observaciones equivalentes al modelo 20/84; puntuación individual = 0.50 larga + 0.30 últimos20 + 0.20 últimos8. No se interpreta el atraso como deuda de salida.

Se generan 512 candidatos de 20 mediante muestreo ponderado sin reemplazo (pesos = puntuación individual / (20/84)). Se elige la mayor puntuación individual media más 0.15 veces el soporte medio de parejas, con contracción de 20 sorteos hacia independencia. Coherencia: penalizar desvíos de los percentiles históricos 10–90 de suma, pares, números 1–42, concentración por decena y repetidos del sorteo anterior. Penalizar secuencias consecutivas de cuatro nunca observadas juntas en el pasado. No se prohíben números altos ni se afirma que una secuencia inédita sea imposible. Si no hay candidatos con penalidad cero, usar la menor penalidad y registrar el desvío; nunca adaptar los filtros al ganador.

El núcleo es los 7 números mejor puntuados del pool; selección secundaria del núcleo reproduce la misma puntuación de parejas. Semilla base: `kino-pool20-v1`, fecha y variante. Semillas auxiliares fijas: 0..4 para controles aleatorios. No se escoge la mejor semilla mirando premios. No se retocan parámetros tras inspeccionar resultados; cualquier cambio requiere v2 y una evaluación nueva.

## Controles al mismo presupuesto

1. `pattern-core7`: pool coherente ponderado + 7 comunes/3 variables (candidata).
2. `pattern-spread`: mismo pool de la candidata, sin núcleo común (aísla la concentración).
3. `random20-core7`: pool coherente muestreado uniformemente, sin ranking por frecuencias, núcleo aleatorio (5 semillas; aísla el ranking y parte de la coherencia).
4. `uniform84`: 200 jugadas uniformes en 84 (5 semillas; referencia sin filtros).
5. `v133`: generador actual V13.3 reconstruido con su semilla de fecha, incluso para fechas previas a su activación; NO equivale a apuestas históricas emitidas.

En los controles con 5 semillas se informa media y rango; la unidad de comparación es el sorteo, no cada jugada o semilla. Intervalos por bootstrap pareado de sorteos (2,000 réplicas, semilla fija); exploratorios, suponen intercambiabilidad y pueden ser inestables con pocos sorteos. Se muestra la comparación primaria completa, validación y prueba temporal, sin elegir ganadora automáticamente.

## Límites y parada

Modelo uniforme 84/20/10: E[aciertos del pool]=20×20/84=4.7619. Cualquier jugada de 7+ necesita al menos 7 aciertos dentro del pool; con núcleo7, su máximo está acotado además por aciertos del núcleo+3. Repetir números concentra ganancias y pérdidas: no aumenta por sí solo la esperanza de premio de una jugada. `P(pool>=7)` es una cota superior para cualquier cartera restringida a ese pool; no una probabilidad lograda de premio.

Se auditan rangos, unicidad, ausencia de fuga temporal, reproducción, núcleo, premios de 0 y 5–10, estabilidad ante futuro y comparación de premios con la función vigente. Tabla de premios: `kinoPrizes` en código; se aplica la misma a todas las fechas, sin afirmar que sea una tabla histórica oficialmente verificada. Los montos son simulados, no dinero ganado.

Presupuesto cerrado: 512 candidatos/fecha, cinco semillas de los dos controles aleatorios y una V13.3 por fecha. Una pasada completa, sin búsqueda adaptativa de variantes ganadoras. Guardar JSON por sorteo con pool, núcleo, 200 jugadas, aciertos, premios, semillas y metadatos; CSV resumen y reporte legible fuera de `data/`. Preparar una cartera experimental para el próximo sorteo abierto con el historial disponible, dejando explícita su cobertura temporal. No sustituir la cartera operativa.


---

## Fuente histórica: `experiments/super-kino/pool20-v1/walkforward-2026-11-11/SUMMARY.md`

# Super Kino TV: experimento de 20 números dinámicos

Simulación retrospectiva; no son apuestas emitidas ni premios cobrados. No se ha activado esta estrategia ni alterado ninguna cartera operativa.

## Protocolo y datos

- Versión: kino-pool20-v1; corte: 2026-11-11; histórico: 2026-09-15 a 2026-11-11.
- 58 sorteos del régimen observado de 84 números; calentamiento de 30, validación de 10, prueba temporal de 18. Se evalúan 28 fechas: 2026-10-15 a 2026-11-11.
- En cada fecha: solo resultados anteriores a esa fecha; elección de20, núcleo7 y200 jugadas únicas de10, con3 números variables. Costo modelado: RD$5,000 por cartera.
- Frecuencias suavizadas de todo el pasado, últimas20 y últimas8; soporte de parejas; forma por suma, paridad, rangos, repetidos y secuencias inéditas de cuatro. Filtros aprendidos del pasado, sin lista de números altos prohibidos.
- El histórico ya se ha inspeccionado en otras investigaciones: la partición final es temporal, pero no una reserva histórica nunca vista. Las reglas no se retocaron después de ver los resultados de esta ejecución.
- ¹Los controles aleatorios promedian cinco semillas prefijadas. No son cinco veces más jugadas o presupuesto. Los intervalos remuestrean sorteos pareados, no jugadas ni semillas.
- Tabla aplicada: importes vigentes en el código para0 y5–10 aciertos, idénticos en todas las fechas. No se verificó una tabla oficial histórica por fecha; el sitio oficial no expuso una tabla legible al consultar. Los resultados monetarios son modelados.

## Resultado agregado

| Método | Sorteos | Alguna7+ | Alguna8+ | Máximo medio | Premios RD$ | Inversión RD$ | Neto RD$ | ROI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 20 históricos + núcleo7 | 28 | 0.0% | 0.0% | 3.82 | 36,320 | 140,000 | -103,680 | -74.1% |
| Mismos20 sin núcleo | 28 | 7.1% | 3.6% | 4.46 | 66,360 | 140,000 | -73,640 | -52.6% |
| 20 aleatorios coherentes + núcleo7¹ | 28 | 1.4% | 0.0% | 3.94 | 40,944 | 140,000 | -99,056 | -70.8% |
| Uniforme84¹ | 28 | 25.7% | 2.1% | 6.15 | 66,444 | 140,000 | -73,556 | -52.5% |
| V13.3 reconstruida | 28 | 14.3% | 0.0% | 6.11 | 64,120 | 140,000 | -75,880 | -54.2% |

En la candidata: 0/28 sorteos con7+, 0/28 con8+, y 2/28 con premio total mayor que el costo.
Del premio simulado RD$36,320, RD$18,800 provienen de0 aciertos y RD$17,520 de5–10. No confundir recuperar dinero con acertar muchos números.
Aciertos del pool: media 4.57, mínimo 2, máximo 9. Entre fechas consecutivas se conservaron 7.37 de20 en promedio; se recalcula el pool cada fecha.

## Validación descriptiva

| Método | Sorteos | Alguna7+ | Alguna8+ | Máximo medio | Premios RD$ | Inversión RD$ | Neto RD$ | ROI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 20 históricos + núcleo7 | 10 | 0.0% | 0.0% | 3.60 | 11,080 | 50,000 | -38,920 | -77.8% |
| Mismos20 sin núcleo | 10 | 0.0% | 0.0% | 4.30 | 10,700 | 50,000 | -39,300 | -78.6% |
| 20 aleatorios coherentes + núcleo7¹ | 10 | 0.0% | 0.0% | 3.92 | 10,144 | 50,000 | -39,856 | -79.7% |
| Uniforme84¹ | 10 | 20.0% | 4.0% | 6.04 | 24,924 | 50,000 | -25,076 | -50.2% |
| V13.3 reconstruida | 10 | 20.0% | 0.0% | 6.20 | 26,340 | 50,000 | -23,660 | -47.3% |

## Prueba temporal descriptiva

| Método | Sorteos | Alguna7+ | Alguna8+ | Máximo medio | Premios RD$ | Inversión RD$ | Neto RD$ | ROI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 20 históricos + núcleo7 | 18 | 0.0% | 0.0% | 3.94 | 25,240 | 90,000 | -64,760 | -72.0% |
| Mismos20 sin núcleo | 18 | 11.1% | 5.6% | 4.56 | 55,660 | 90,000 | -34,340 | -38.2% |
| 20 aleatorios coherentes + núcleo7¹ | 18 | 2.2% | 0.0% | 3.94 | 30,800 | 90,000 | -59,200 | -65.8% |
| Uniforme84¹ | 18 | 28.9% | 1.1% | 6.21 | 41,520 | 90,000 | -48,480 | -53.9% |
| V13.3 reconstruida | 18 | 11.1% | 0.0% | 6.06 | 37,780 | 90,000 | -52,220 | -58.0% |

## Diferencia pareada de la candidata en tasa7+

Puntos porcentuales; IC95% bootstrap exploratorio de2,000 remuestreos de sorteos. El umbral de interés predefinido es +5 puntos. Un intervalo que incluye cero no demuestra mejora.

| Período | Comparador | Diferencia | IC95% |
|---|---|---:|---:|
| all | Mismos20 sin núcleo | -7.1 pp | [-17.9, 0.0] pp |
| all | 20 aleatorios coherentes + núcleo7¹ | -1.4 pp | [-3.6, 0.0] pp |
| all | Uniforme84¹ | -25.7 pp | [-33.6, -18.6] pp |
| all | V13.3 reconstruida | -14.3 pp | [-28.6, -3.6] pp |
| validation | Mismos20 sin núcleo | 0.0 pp | [0.0, 0.0] pp |
| validation | 20 aleatorios coherentes + núcleo7¹ | 0.0 pp | [0.0, 0.0] pp |
| validation | Uniforme84¹ | -20.0 pp | [-34.0, -8.0] pp |
| validation | V13.3 reconstruida | -20.0 pp | [-50.0, 0.0] pp |
| temporal-test | Mismos20 sin núcleo | -11.1 pp | [-27.8, 0.0] pp |
| temporal-test | 20 aleatorios coherentes + núcleo7¹ | -2.2 pp | [-5.6, 0.0] pp |
| temporal-test | Uniforme84¹ | -28.9 pp | [-38.9, -20.0] pp |
| temporal-test | V13.3 reconstruida | -11.1 pp | [-27.8, 0.0] pp |

## Sensibilidad a las semillas de control

- 20 aleatorios coherentes + núcleo7¹: tasa7+ entre 0.0% y 3.6%; premios acumulados entre RD$25,880 y RD$50,360.
- Uniforme84¹: tasa7+ entre 25.0% y 28.6%; premios acumulados entre RD$60,500 y RD$69,480.

## Detalle de la candidata por sorteo

Cada enlace contiene el pool, núcleo,200 jugadas, ganador, conteos y las carteras de los controles.

| Fecha | Aciertos de20 | Aciertos del núcleo7 | Mejor jugada | Premios RD$ | Neto RD$ |
|---|---:|---:|---:|---:|---:|
| [2026-10-15](draws/2026-10-15.json) | 5 | 1 | 4 | 0 | -5,000 |
| [2026-10-16](draws/2026-10-16.json) | 4 | 1 | 3 | 0 | -5,000 |
| [2026-10-17](draws/2026-10-17.json) | 3 | 3 | 3 | 0 | -5,000 |
| [2026-10-18](draws/2026-10-18.json) | 4 | 1 | 3 | 0 | -5,000 |
| [2026-10-19](draws/2026-10-19.json) | 4 | 0 | 3 | 4,960 | -40 |
| [2026-10-20](draws/2026-10-20.json) | 3 | 2 | 3 | 0 | -5,000 |
| [2026-10-21](draws/2026-10-21.json) | 4 | 1 | 4 | 0 | -5,000 |
| [2026-10-22](draws/2026-10-22.json) | 4 | 0 | 3 | 4,560 | -440 |
| [2026-10-23](draws/2026-10-23.json) | 6 | 1 | 4 | 0 | -5,000 |
| [2026-10-24](draws/2026-10-24.json) | 6 | 3 | 6 | 1,560 | -3,440 |
| [2026-10-25](draws/2026-10-25.json) | 9 | 3 | 6 | 8,460 | 3,460 |
| [2026-10-26](draws/2026-10-26.json) | 4 | 2 | 4 | 0 | -5,000 |
| [2026-10-27](draws/2026-10-27.json) | 5 | 2 | 4 | 0 | -5,000 |
| [2026-10-28](draws/2026-10-28.json) | 4 | 0 | 3 | 4,400 | -600 |
| [2026-10-29](draws/2026-10-29.json) | 6 | 4 | 6 | 6,780 | 1,780 |
| [2026-10-30](draws/2026-10-30.json) | 4 | 1 | 4 | 0 | -5,000 |
| [2026-10-31](draws/2026-10-31.json) | 3 | 1 | 3 | 0 | -5,000 |
| [2026-11-01](draws/2026-11-01.json) | 4 | 2 | 4 | 0 | -5,000 |
| [2026-11-02](draws/2026-11-02.json) | 5 | 1 | 4 | 0 | -5,000 |
| [2026-11-03](draws/2026-11-03.json) | 6 | 2 | 5 | 180 | -4,820 |
| [2026-11-04](draws/2026-11-04.json) | 4 | 1 | 3 | 0 | -5,000 |
| [2026-11-05](draws/2026-11-05.json) | 7 | 1 | 4 | 0 | -5,000 |
| [2026-11-06](draws/2026-11-06.json) | 2 | 1 | 2 | 0 | -5,000 |
| [2026-11-07](draws/2026-11-07.json) | 4 | 2 | 4 | 0 | -5,000 |
| [2026-11-08](draws/2026-11-08.json) | 3 | 1 | 3 | 0 | -5,000 |
| [2026-11-09](draws/2026-11-09.json) | 4 | 0 | 3 | 4,880 | -120 |
| [2026-11-10](draws/2026-11-10.json) | 7 | 2 | 5 | 540 | -4,460 |
| [2026-11-11](draws/2026-11-11.json) | 4 | 3 | 4 | 0 | -5,000 |

## Límite matemático y lectura

Bajo sorteos uniformes e independientes, un pool preseleccionado de20 espera 4.7619 aciertos y tiene probabilidad 14.8% de contener7 o más. Esto es una cota de oportunidad, no la tasa de premios de la cartera. Con núcleo7, máximo≤mínimo(aciertos del pool, aciertos del núcleo+3). La repetición concentra resultados favorables y desfavorables; no aumenta por sí sola la esperanza marginal de una jugada.

La candidata no satisface una mejora exploratoria de al menos5 puntos con intervalo favorable frente a ambas referencias en la partición temporal. No hay base para sustituir la cartera vigente. No se ajustan las reglas para mejorar retrospectivamente este resultado.

## Cartera experimental del 2026-11-12

Generada: 2026-11-12T01:57:32.911Z; historial disponible hasta 2026-11-11. Archivo: [200 jugadas](experimental-2026-11-12.json).

Pool20: **01 · 04 · 06 · 07 · 12 · 19 · 21 · 24 · 27 · 28 · 33 · 42 · 44 · 51 · 54 · 56 · 63 · 69 · 71 · 76**.

Núcleo común7: **01 · 07 · 19 · 27 · 42 · 44 · 69**.

Es una propuesta experimental separada, anterior a su sorteo objetivo; no sustituye la cartera guardada de la aplicación.

## Reproducción

```sh
node --experimental-strip-types scripts/run-kino-pool20.ts --cutoff=2026-11-11 --run-id=otro-id
node --experimental-strip-types scripts/report-kino-pool20.ts experiments/super-kino/pool20-v1/otro-id
```

SHA256 de datos: `2a6d48c6c039d25e055261e5950052030e3ff956ea386895eb7bd323ea36f27d`. SHA256 del código y protocolo: `7cb33edf613527029c1a9755b002ea245b05966f0005a0f8a6a4330931591b2f`. Ver history.json y protocol.json. El script rechaza sobrescribir un run-id existente.


---

## Fuente histórica: `experiments/super-kino/pool20-v1/walkforward-2026-11-11/SELECTION-ONLY.md`

# Retrospectiva directa: 20 elegidos por sorteo

Período evaluado: **2026-10-15 a 2026-11-11**, 28 sorteos. Se eligieron 20 números para cada fecha usando únicamente el historial anterior; 28 selecciones diferentes.

Se reutiliza sin ajustes la regla pool20-v1 ya documentada: frecuencias suavizadas, parejas y coherencia de forma histórica. No es una nueva estrategia escogida después de mirar los ganadores. Los primeros 30 sorteos del régimen de 84 números se usan como calentamiento; por eso la evaluación comienza el 15 de octubre. No se rellenan fechas sin historia suficiente.

**Resultado:** 128 coincidencias sobre 560 números elegidos; promedio **4.57 de 20**, mínimo **2**, máximo **9**.

Referencia uniforme de 20 entre 84: **4.76** coincidencias esperadas por sorteo. Repetir exactamente los 20 del sorteo anterior habría dado **4.75** en este mismo período. Esta selección no supera la referencia uniforme en promedio.

Hubo **3/28** selecciones con 7 o más coincidencias y **1/28** con 8 o más. Estos son aciertos dentro de un grupo de 20, no premios ni aciertos de una jugada de 10.

## Distribución

| Aciertos dentro de los 20 | Sorteos |
|---:|---:|
| 2 | 1 |
| 3 | 4 |
| 4 | 13 |
| 5 | 3 |
| 6 | 4 |
| 7 | 2 |
| 9 | 1 |

## Los 20 seleccionados para cada fecha

Los números de la columna «Acertados» se marcan después de generar la selección. El JSON y CSV incluyen también los 20 ganadores y los ganadores que quedaron fuera.

| Fecha | 20 seleccionados | Acertados | Total |
|---|---|---|---:|
| 2026-10-15 | 09 · 11 · 12 · 19 · 27 · 31 · 38 · 40 · 41 · 43 · 46 · 49 · 58 · 59 · 64 · 65 · 68 · 71 · 80 · 82 | 11 · 40 · 46 · 65 · 71 | **5** |
| 2026-10-16 | 05 · 06 · 11 · 12 · 23 · 28 · 31 · 37 · 41 · 45 · 46 · 48 · 54 · 59 · 64 · 68 · 71 · 81 · 82 · 83 | 06 · 41 · 46 · 64 | **4** |
| 2026-10-17 | 02 · 04 · 05 · 09 · 13 · 16 · 17 · 21 · 27 · 32 · 40 · 43 · 49 · 58 · 61 · 68 · 69 · 71 · 75 · 82 | 40 · 49 · 82 | **3** |
| 2026-10-18 | 02 · 06 · 13 · 16 · 19 · 20 · 27 · 31 · 42 · 44 · 46 · 51 · 52 · 60 · 64 · 65 · 69 · 71 · 74 · 82 | 06 · 44 · 60 · 69 | **4** |
| 2026-10-19 | 02 · 07 · 11 · 14 · 19 · 20 · 25 · 29 · 34 · 40 · 46 · 49 · 51 · 52 · 61 · 69 · 73 · 74 · 82 · 84 | 07 · 14 · 52 · 73 | **4** |
| 2026-10-20 | 02 · 04 · 05 · 09 · 21 · 26 · 28 · 35 · 43 · 44 · 46 · 49 · 51 · 55 · 59 · 69 · 71 · 72 · 75 · 78 | 44 · 46 · 59 | **3** |
| 2026-10-21 | 02 · 12 · 14 · 22 · 24 · 28 · 30 · 32 · 35 · 41 · 43 · 44 · 47 · 49 · 64 · 65 · 69 · 73 · 78 · 84 | 24 · 30 · 41 · 78 | **4** |
| 2026-10-22 | 06 · 07 · 12 · 16 · 17 · 21 · 23 · 27 · 30 · 32 · 33 · 36 · 46 · 49 · 58 · 68 · 69 · 71 · 81 · 82 | 27 · 36 · 68 · 82 | **4** |
| 2026-10-23 | 07 · 09 · 10 · 12 · 13 · 14 · 36 · 38 · 41 · 43 · 46 · 48 · 49 · 53 · 55 · 60 · 64 · 68 · 74 · 81 | 07 · 09 · 13 · 55 · 74 · 81 | **6** |
| 2026-10-24 | 02 · 04 · 06 · 07 · 11 · 12 · 17 · 21 · 26 · 33 · 41 · 46 · 51 · 55 · 60 · 65 · 69 · 74 · 81 · 82 | 06 · 11 · 17 · 46 · 55 · 69 | **6** |
| 2026-10-25 | 07 · 11 · 12 · 29 · 32 · 35 · 37 · 38 · 41 · 42 · 46 · 48 · 49 · 59 · 63 · 64 · 69 · 71 · 76 · 78 | 12 · 35 · 37 · 38 · 41 · 42 · 46 · 48 · 64 | **9** |
| 2026-10-26 | 05 · 07 · 12 · 13 · 21 · 27 · 32 · 33 · 36 · 39 · 40 · 44 · 46 · 63 · 67 · 68 · 71 · 72 · 79 · 84 | 33 · 44 · 46 · 71 | **4** |
| 2026-10-27 | 03 · 06 · 08 · 13 · 17 · 24 · 33 · 35 · 37 · 41 · 44 · 46 · 54 · 55 · 64 · 69 · 72 · 74 · 81 · 82 | 33 · 35 · 44 · 74 · 81 | **5** |
| 2026-10-28 | 01 · 11 · 16 · 24 · 25 · 28 · 35 · 38 · 41 · 42 · 44 · 46 · 50 · 56 · 60 · 67 · 68 · 69 · 71 · 75 | 01 · 38 · 56 · 60 | **4** |
| 2026-10-29 | 01 · 09 · 13 · 25 · 27 · 28 · 35 · 36 · 38 · 42 · 46 · 52 · 59 · 63 · 64 · 68 · 71 · 74 · 76 · 84 | 01 · 25 · 27 · 28 · 59 · 84 | **6** |
| 2026-10-30 | 01 · 13 · 17 · 19 · 21 · 24 · 27 · 28 · 35 · 42 · 46 · 57 · 62 · 69 · 71 · 72 · 73 · 76 · 81 · 84 | 01 · 13 · 57 · 81 | **4** |
| 2026-10-31 | 01 · 05 · 06 · 07 · 12 · 19 · 24 · 27 · 40 · 42 · 44 · 47 · 49 · 55 · 56 · 63 · 68 · 75 · 82 · 84 | 19 · 40 · 56 | **3** |
| 2026-11-01 | 01 · 07 · 10 · 12 · 14 · 16 · 19 · 28 · 36 · 46 · 49 · 51 · 55 · 57 · 63 · 67 · 69 · 72 · 74 · 84 | 10 · 19 · 46 · 72 | **4** |
| 2026-11-02 | 04 · 12 · 15 · 19 · 21 · 22 · 28 · 29 · 33 · 40 · 46 · 49 · 55 · 61 · 63 · 69 · 71 · 72 · 79 · 81 | 04 · 22 · 71 · 72 · 79 | **5** |
| 2026-11-03 | 01 · 02 · 04 · 11 · 15 · 19 · 23 · 29 · 41 · 42 · 51 · 56 · 58 · 63 · 68 · 72 · 74 · 79 · 81 · 84 | 15 · 29 · 42 · 51 · 68 · 74 | **6** |
| 2026-11-04 | 01 · 02 · 04 · 07 · 09 · 11 · 12 · 18 · 29 · 37 · 41 · 42 · 44 · 46 · 74 · 76 · 79 · 80 · 83 · 84 | 07 · 41 · 42 · 84 | **4** |
| 2026-11-05 | 02 · 07 · 08 · 12 · 17 · 19 · 27 · 31 · 43 · 46 · 50 · 54 · 59 · 61 · 65 · 68 · 69 · 74 · 81 · 84 | 02 · 07 · 08 · 46 · 50 · 65 · 69 | **7** |
| 2026-11-06 | 02 · 04 · 08 · 09 · 11 · 16 · 19 · 27 · 28 · 38 · 41 · 45 · 46 · 48 · 49 · 55 · 74 · 80 · 81 · 84 | 49 · 74 | **2** |
| 2026-11-07 | 01 · 02 · 03 · 13 · 14 · 16 · 18 · 19 · 23 · 26 · 33 · 42 · 46 · 47 · 58 · 67 · 71 · 74 · 75 · 84 | 02 · 33 · 42 · 75 | **4** |
| 2026-11-08 | 04 · 05 · 14 · 16 · 19 · 21 · 23 · 28 · 36 · 40 · 45 · 46 · 47 · 49 · 57 · 64 · 71 · 74 · 77 · 84 | 14 · 49 · 64 | **3** |
| 2026-11-09 | 02 · 04 · 07 · 09 · 12 · 17 · 19 · 28 · 33 · 42 · 44 · 46 · 47 · 50 · 51 · 60 · 66 · 78 · 81 · 84 | 04 · 09 · 17 · 60 | **4** |
| 2026-11-10 | 01 · 02 · 05 · 07 · 11 · 12 · 17 · 26 · 27 · 28 · 40 · 42 · 46 · 47 · 51 · 52 · 65 · 74 · 75 · 81 | 05 · 17 · 26 · 27 · 28 · 46 · 75 | **7** |
| 2026-11-11 | 07 · 15 · 17 · 23 · 24 · 28 · 35 · 39 · 42 · 44 · 46 · 48 · 49 · 51 · 64 · 68 · 74 · 79 · 81 · 84 | 28 · 39 · 44 · 84 | **4** |

## Trazabilidad

- En cada fecha se verificó que recalcular con todo el archivo o solo con fechas anteriores produce exactamente la misma selección.
- Cada selección se contrastó con el archivo congelado del experimento anterior; no se cambiaron pesos, filtros ni semillas después de observar premios.
- La partición final es temporal, pero el histórico ya se ha inspeccionado en otros análisis; no representa una reserva completamente desconocida.
- No se modificó ninguna cartera de producción. Se evalúan los 20, sin fijar un núcleo ni generar jugadas adicionales.
- SHA256 de datos: `2a6d48c6c039d25e055261e5950052030e3ff956ea386895eb7bd323ea36f27d`.

Reproducir: `node --experimental-strip-types scripts/audit-kino-pool20-selection.ts experiments/super-kino/pool20-v1/walkforward-2026-11-11`

