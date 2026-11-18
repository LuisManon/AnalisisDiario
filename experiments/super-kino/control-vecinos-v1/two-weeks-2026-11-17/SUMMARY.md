# Comprobaciones de cercanía y variantes±1

14 carteras originales guardadas del4 al17/11,200 jugadas cada una. Dos experimentos distintos, sin cambios de producción.

## A. ¿El12/14 de cercanía es excepcional?

1,000 réplicas de14 fechas por control, mismos ganadores reales y presupuesto200. Observado: 12/14 fechas con9+cercanos, 1/14 con10cercanos.

| Control | Media de fechas9+/14 | Rango central95% | Fracción de réplicas igualando/superando12 | Media fechas10/14 |
| --- | ---: | --- | ---: | ---: |
| uniform | 10.786 | 8–13 | 33.267% | 1.485 |
| labels | 11.000 | 8–14 | 38.062% | 1.515 |

Uniform:200 combinaciones aleatorias únicas; labels: permutación de etiquetas conservando solapamientos de la cartera. Fracciones con corrección+1; las ajustadas por dos controles están en JSON. Este contraste es post hoc/descriptivo, no prueba confirmatoria de predicción.

## B. ¿Mover±1 mejora aciertos EXACTOS?

280,000 sorteos uniformes NUEVOS; carteras modificadas congeladas antes de evaluar, sin usar ganadores históricos para escoger direcciones.

| Cartera | Jugadas | Costo modelado | Alguna7+ exactos | Alguna8+ exactos |
| --- | ---: | ---: | ---: | ---: |
| original | 200 | RD$5,000 | 22.532% | 1.890% |
| half | 200 | RD$5,000 | 22.437% | 1.894% |
| all | 200 | RD$5,000 | 22.424% | 1.894% |

| Variante menos original | Diferencia7+ en pp | IC97.5% Monte Carlo en pp | Fechas positivas | Supera puerta |
| --- | ---: | --- | ---: | --- |
| half | -0.095 | -0.278 a 0.087 | 4/14 | No |
| all | -0.109 | -0.359 a 0.141 | 5/14 | No |

Half conserva100 originales y sustituye100; all sustituye200. Cada sustitución mueve diez números±1, sin duplicados ni circularidad84↔1. No se expandió el costo ni se buscó la dirección ganadora a posteriori. Dos comparaciones primarias, intervalos normales ajustados Bonferroni, condicionados a estas carteras; heterogeneidad por fecha y conteos completos en report.json.

## Límites

Cercanía no es acierto ni premio. No se añade evidencia real al repetir controles de los mismos14 ganadores. La parteB es sintética uniforme, no validación en sorteos físicos nuevos. Misma esperanza marginal de premio a igual presupuesto y tabla bajo uniforme; no se afirma rentabilidad ni óptimo global. No superar puerta significa sin ventaja demostrada, no equivalencia. Carteras y resultados congelados intactos; sin adopción automática.
