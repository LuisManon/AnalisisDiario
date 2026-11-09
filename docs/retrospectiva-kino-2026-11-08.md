# Retrospectiva de Super Kino TV: 2–8 noviembre 2026

## Resultado y reconocimiento

Las siete carteras V13.3 estuvieron disponibles antes del cierre y sus premios congelados concuerdan con los resultados locales. Eso es un acierto operativo que debemos conservar. El jueves 5 fue el mejor día por premios: RD$2,400, con tres jugadas de seis aciertos. Celebramos la trazabilidad y el aprendizaje, sin confundir premios con rentabilidad.

En 1,400 jugadas hubo 52 de cinco y 12 de seis, ninguna de siete o más. Premios calculados: RD$12,720. Si se hubieran comprado todas a RD$25, el costo habría sido RD$35,000 y el neto −RD$22,280. No consta que fueran compradas. El detalle diario está en `semana-kino-datos.md`.

## Qué aprendimos

- El promedio observado, 2.37714 aciertos por jugada, está próximo al uniforme 20×10/84 = 2.38095. Una semana no permite identificar números predictivos.
- En 1,000 semanas uniformes de referencia, con 200 jugadas distintas por fecha, 165 no tuvieron ningún 7+. Es una referencia de simulación, no una probabilidad exacta de la cartera V13.3.
- La retrospectiva de siete fechas dio 0/7 días con 7+ en producción, 1/7 en la variante diversa y 2/7 en la conjunta. Pero con 32 semillas por fecha la diversa consiguió 53/224 y la conjunta 51/224. Son las mismas siete fechas repetidas, no 224 sorteos reales independientes. Elegir la conjunta por el 2/7 sería seleccionar a posteriori.
- Los experimentos independientes anteriores tampoco cumplen la mejora mínima predefinida de un punto porcentual: conjunta +0.10656 puntos y cobertura directa −0.32969 puntos. Esta última subió mucho en entrenamiento y empeoró fuera de él: sobreajuste.

## Fallos comprobados y correcciones

1. La vista posterior al sorteo podía recalcular con una fuente modificada mientras el calendario conservaba los premios congelados. Corregido: aciertos, bolas y premios usan el mismo resultado registrado, con aviso si la fuente difiere. La semana auditada no tenía esa discrepancia; no explica su rendimiento.
2. Faltaba una auditoría semanal reutilizable. Añadido `scripts/audit-kino-week.ts`: lee sin escribir, prioriza resultados congelados, distingue pendientes y retrospectivas, rechaza datos inválidos y no cuenta carteras retrospectivas como resultados de producción.
3. El premio del sábado se registró el domingo. Además, los logs del run de GitHub Actions 42544132946 confirman una ventana ejecutada más de tres horas tarde y rechazada por la protección existente. Esto demuestra retraso del scheduler en ese run, no la causa exacta del registro del sábado. No se retiró la protección ni se generaron carteras después del cierre.

## Próxima mejora del algoritmo, sin contaminar la evaluación

La hipótesis prioritaria es medir por separado la construcción inicial, el optimizador y las 40 jugadas dirigidas. El optimizador combina objetivos 7/8/9/10 y las familias se aplican después: pueden contradecir la cobertura objetivo, pero todavía no está demostrado. Compararemos esas tres etapas con iguales semillas, presupuesto y escenarios independientes, fijando antes el criterio de aceptación. Esta semana ya vista será descriptiva, nunca un conjunto de validación nuevo.

No se cambió la selección de producción: no existe evidencia suficiente de una alternativa superior. El avance entregado es una retrospectiva consistente y auditable, no una promesa de predecir números aleatorios.

## Repetir la revisión

`node --experimental-strip-types scripts/audit-kino-week.ts 2026-11-02 2026-11-08`

Las pruebas cubren discrepancias, premios de cero aciertos, ausencia de resultados, simulaciones y generación fuera de plazo. Ningún archivo histórico se modifica.
