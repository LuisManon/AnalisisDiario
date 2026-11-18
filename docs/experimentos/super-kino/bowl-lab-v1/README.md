# Bowl lab V1: primera evaluación

Ejecutado el 14 noviembre 2026. Objetivo confirmado: al menos 10 ganadores dentro de un pool de 20. Estado: banco disponible; ninguna estrategia adoptada.

## Resultado de dos millones de sorteos

Un millón uniformes y un millón con sesgo artificial; las tres políticas comparten los ganadores de cada escenario. Cada fecha genera una selección aleatoria nueva de 20 únicos antes de extraer las bolas ganadoras sin reemplazo.

| Selector | Tasa 10+ en bowl uniforme | Tasa 10+ con rango artificialmente favorecido |
| --- | ---: | ---: |
| Uniforme | 0.3034% | 0.3185% |
| Rango dominante 10/5/5 | 0.3106% | 0.3925% |
| Frecuencias suavizadas | 0.3043% | 0.3234% |

Bajo uniforme, las tres tasas son compatibles con la probabilidad exacta 0.309427%. No hay una ventaja de inclinarse por un rango. La simulación permite estimar el resultado de una regla; no aprende información del próximo ganador.

El segundo escenario sube artificialmente 20% el peso de extracción de las 28 bolas de un rango. El selector de rangos conoce ese rango, así que es un control favorable deliberado. Detectar esa mejora confirma sensibilidad del banco bajo un supuesto fabricado; NO demuestra sesgo en el dispositivo real. Incluso así, la tasa queda muy lejos de una garantía de 10 aciertos.

## Qué aporta el histórico

Se usaron los 60 sorteos locales del régimen observado 84, del 15 septiembre al 13 noviembre 2026. Treinta de calentamiento y treinta evaluados con datos exclusivamente anteriores a cada fecha. Se promediaron 100 pools por selector y fecha, sin escoger la mejor semilla ni el mejor pool.

| Selector | Media de aciertos | Tasa media 10+ |
| --- | ---: | ---: |
| Uniforme simulado | 4.7120 | 0.1667% |
| Rangos 10/5/5 | 4.8607 | 0.4333% |
| Frecuencias suavizadas | 4.7763 | 0.4000% |

Son solo 30 ganadores distintos: las 100 selecciones por fecha no son 100 sorteos nuevos. La referencia uniforme exacta sigue siendo media 4.7619 y tasa 0.309427%, no el valor particular inferior de estas 3,000 selecciones aleatorias. No comparar contra ese ruido como si fuera una mejora probada. Esta historia ya se exploró en otras investigaciones; no constituye prueba final independiente. No hay evidencia suficiente para recomendar rangos o frecuencias como ventaja estable.

Provecho concreto del archivo: identificar regímenes y calidad del dato, formular hipótesis de sesgo, estimar pesos con contracción y evaluar antes/después de cada fecha. No permite reconstruir masas, aire, posiciones ni el mecanismo de succión. Harían falta metadatos físicos y/o persistencia fuera de muestra para sustentar un modelo de ese tipo.

## Siguiente experimento que sí añadiría evidencia

Congelar una única regla, semilla y criterio de éxito antes de nuevos sorteos; medirla frente a uniforme exacto y comparaciones pareadas, registrar todas las fechas y cambios de equipos si se conocen. Antes de iniciarlo, calcular el tamaño necesario para una mejora de interés, por ejemplo +0.1 puntos porcentuales absolutos en 10+, y controlar comparaciones múltiples. No está instalado ningún proceso de seguimiento ni se ha reservado una muestra futura automáticamente.

Repetir millones de sorteos sintéticos solo reduce incertidumbre Monte Carlo. No reducir el presupuesto por encontrar una corrida favorable. Usar fórmulas exactas para el nulo y detener búsquedas sin hipótesis nueva ahorra más que buscar semillas afortunadas.

## Reproducir y revisar

[Protocolo congelado](PROTOCOLO.md). [Resultados y límites Monte Carlo](../../../../experiments/super-kino/bowl-lab-v1/baseline-2026-11-13/SUMMARY.md).

`node --experimental-strip-types scripts/run-kino-bowl-lab.ts --iterations=1000000 --cutoff=2026-11-13 --run-id=otra-corrida`

Misma semilla, corte y código producen las mismas métricas; cambiar el identificador evita sobrescribir la corrida original. El snapshot de historia permite comprobar el hash de datos si el histórico operativo cambia; usar exactamente el mismo corte y verificar el hash antes de comparar. Se conservan solo agregados, metadatos y snapshot, no millones de sorteos individuales. No hay premios ni carteras operativas en este banco.

Validación inicial: fórmula contra enumeración completa en bowl pequeño, selección sin duplicados, extracción ponderada sin reemplazo, ausencia de fuga temporal y reproducción. Typecheck, pruebas del banco y build satisfactorios.
