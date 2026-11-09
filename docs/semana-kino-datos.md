# Auditoría de carteras guardadas: Super Kino TV, 2–8 noviembre 2026

## Alcance y fuentes

Siete carteras congeladas `data/super-kino-portfolios/2026-11-02.json` a `2026-11-08.json`, algoritmo `kino-v13.3`, 200 jugadas cada una (1,400 jugadas). Resultados de `data/super-kino-results.json`; reglas de pago conservadas en cada snapshot. Son premios calculados para carteras generadas, **no evidencia de boletos comprados ni dinero cobrado**. Costo hipotético: RD$25 por jugada. No se regeneró ni modificó ninguna cartera o resultado.

## Rendimiento calculado y contrastado con premios congelados

| Fecha | Máximo | Jugadas de 0 | De 5 | De 6 | De 7+ | Premios RD$ | Neto teórico RD$ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-11-02 | 5 | 9 | 12 | 0 | 0 | 1,440 | -3,560 |
| 2026-11-03 | 6 | 15 | 7 | 2 | 0 | 2,220 | -2,780 |
| 2026-11-04 | 6 | 11 | 1 | 2 | 0 | 1,540 | -3,460 |
| 2026-11-05 | 6 | 12 | 9 | 3 | 0 | 2,400 | -2,600 |
| 2026-11-06 | 6 | 7 | 7 | 1 | 0 | 1,280 | -3,720 |
| 2026-11-07 | 6 | 9 | 6 | 2 | 0 | 1,680 | -3,320 |
| 2026-11-08 | 6 | 12 | 10 | 2 | 0 | 2,160 | -2,840 |
| Total | 6 | 75 | 52 | 12 | 0 | 12,720 | -22,280 |

Cada día tiene costo hipotético RD$5,000; total RD$35,000, retorno bruto 36.34%, neto -63.66%. Histograma total de aciertos 0–10: `[75,266,435,380,180,52,12,0,0,0,0]`. Las 139 jugadas premiadas incluyen las 75 de cero aciertos (RD$80), 52 de cinco (RD$60) y 12 de seis (RD$300). Promedio: 2.37714 aciertos/jugada frente a 10×20/84 = 2.38095 bajo selección uniforme. Las jugadas y sorteos no son observaciones independientes entre sí para toda inferencia.

Por posición de construcción V13.3 (no por `profile`, que es exploratoria en las 200): jugadas 1–160 acumularon RD$11,480, 12 de seis y 46 de cinco; jugadas 161–200 acumularon RD$1,240, ninguna de seis y seis de cinco. Denominadores 1,120 y 280; no atribuir causalidad con siete fechas. La comparación es descriptiva, no una prueba suficiente para eliminar familias dirigidas.

## Integridad y trazabilidad

- Las siete carteras tienen 200 combinaciones distintas, cada una con diez enteros únicos entre 1 y 84. Los resultados tienen veinte enteros únicos válidos.
- En las siete fechas `prizeDrawNumbers` coincide exactamente con el resultado local y la suma de pagos recalculada coincide con `prizeSummary.total`, sus grupos y su número de premiadas.
- No existe `simulation` retrospectiva en estos siete snapshots. `analysisTo < targetDate` y `generatedAt` es anterior al cierre aplicable (20:55 RD lunes–sábado, 15:55 domingo según código). Esto es evidencia de consistencia del registro, no prueba criptográfica contra manipulación.
- La historia Git refuerza disponibilidad previa: cartera V13.3 del 2 guardada en `06a33ad` el 1 a las 19:00 RD; para 3–7, guardados iniciales la noche anterior; para 8, `f87996c` el 8 a las 12:01 RD. Versiones actuales/finales conservan el contenido congelado, no reconstrucciones para este análisis.
- El premio del sábado 7 se registra en Git el domingo 8 a las 12:00 RD (`fd648b9`), unas quince horas después de la ventana de resultado del 7. Es un retraso observable de registro; por sí solo no distingue retraso de fuente, scheduler o persistencia. La cartera del 8 estuvo lista antes de cierre. Los registros de premios del 2–6 constan entre 21:07 y 22:54 RD.
- Los `source` de 2–7 apuntan a la página ancla del 8. `parseEnloteriaKino` extrae varias fechas de una página y asigna la URL consultada a todas: esto no demuestra números incorrectos. Conservar esta procedencia; no inventar una URL individual como si hubiera sido consultada. Falta una marca `fetchedAt`/confirmación por fuente para distinguir publicación y observación.
- No hay días sin sorteo declarados dentro de la semana y el índice incluye las siete carteras.

## Qué falló y qué no se puede concluir

No hubo cartera ausente, duplicados de jugadas ni discrepancias de premios dentro de la semana. Sí hubo registro tardío del resultado/premio del 7 y trazabilidad limitada de la fecha de observación de resultados. No alcanzar siete aciertos en siete carteras no demuestra un fallo del algoritmo: siete fechas son una muestra corta y el promedio de aciertos observado es próximo al modelo uniforme. Reoptimizar contra estos mismos siete ganadores produciría una retrospectiva ajustada, no una mejora demostrada.

## Contrato recomendado para auditor reproducible

Por fecha: `date`, `algorithm`, `portfolioGeneratedAt`, `analysisTo`, `simulationKind`, `playCount`, `distinctPlayCount`, `resultStatus` (evaluado/pendiente/no-sorteo/fuente-ausente), `resultSource`, `frozenResultMatches`, `frozenPrizeMatches`, `hitHistogram[11]`, `maximumHits`, `awardedPlays`, `totalPrize`, `theoreticalCost`, `theoreticalNet`, `preClose`, `issues[]`. Los estados sin evaluación no deben convertirse en premios/aciertos cero. Categorías de incidencias: integridad, temporalidad, discrepancia de resultado congelado, discrepancia de premio congelado y procedencia. Distinguir `fetchedAt`/`prizeRecordedAt` si se incorporan a futuro; no inferirlos de `generatedAt`.

Resumen semanal: fechas evaluadas/pendientes, suma de denominadores, tasas de alguna 7+/8+/9+/10+, costos/premios explícitamente teóricos y comparación por bloque con su denominador. Usar siempre los pagos congelados y señalar discrepancias antes de presentar totales como reconciliados.
