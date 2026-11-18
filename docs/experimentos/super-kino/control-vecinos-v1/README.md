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

## Cierre y decisión

Ejecutado exploratorio, cerrado sin adopción. El12/14 observado queda dentro del rango central95% de ambos controles. La cercanía9+ aparece frecuentemente al elegir la mejor de200: no se respalda una ventaja predictiva por este dato. No se demuestra equivalencia ni se excluye cualquier otra hipótesis posible.

Las dos variantes concretas no superan el criterio previo de mejora7+: mitad−0.095pp, todas−0.109pp frente a original, y ambos intervalos ajustados incluyen cero. No afirmar que siempre empeoran ni generalizar a toda transformación posible: son dos reglas simétricas prefijadas sobre14 carteras, sin evidencia de mejora. Mover números±1 no se justifica como mejora operativa con estos resultados.

La parteA usa14 ganadores reales conocidos repetidos como referencia en controles; no son28,000 sorteos reales. La parteB sí genera280,000 sorteos sintéticos nuevos pero no es validación física futura. No se evaluaron carteras modificadas contra ganadores históricos para presentarlas como registros emitidos.

Para reabrir: hipótesis previa distinta con información disponible antes del sorteo que permita elegir direcciones, referencia al mismo presupuesto y validación nueva congelada. No expandir hasta hallar una variante ganadora en el historial ni llamar aciertos a vecinos. Se conservan negativos para evitar repetir esta búsqueda.

[Protocolo previo](PROTOCOLO.md) · [Reporte completo](../../../../experiments/super-kino/control-vecinos-v1/two-weeks-2026-11-17/report.json). Las1000 réplicas de cada control,28 carteras variantes con origen de cambios, snapshots originales, fuentes y hashes están en la misma carpeta.

Reproducción: `node --experimental-strip-types scripts/check-kino-neighbor-controls.ts otra-identificacion` con entradas de cercania-v1 intactas. No requiere red y rechaza sobrescritura. Se generan las mismas métricas: repetir no agrega evidencia independiente. Las variantes se guardan y se les calcula hash antes de abrir ambas evaluaciones.

Verificación:12 pruebas afectadas de matching, controles, variantes y métricas; TypeScript y build satisfactorios. Hashes de fuentes, protocolo, auditoría fuente, snapshots y congelación verificados. Conteos de todas las réplicas y histogramas exactos comprobados. Sin cambios de data/, endpoints, premios ni propietarios. Trabajo local sin publicación.
