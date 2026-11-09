# Banco de pruebas de Super Kino TV — protocolo v1

Laboratorio offline, sin cambios al algoritmo operativo, APIs, datos o carteras cerradas. Construido con ingeniería de datos, análisis de datos, ciencia de datos, software y QA.

## Hipótesis y condiciones fijadas antes de leer la corrida

Buscamos mejorar la distribución de aciertos altos en una cartera, no adivinar números por frecuencias o atrasos. Referencias: `uniform` (aleatoria uniforme), `balanced` (cuotas23/24 sin optimizador) y `v133-production` (llamada directa al mismo `buildKinoV133Numbers` operativo). Todas producen200jugadas únicas de10 entre84. No hay aumento del presupuesto ni selección retrospectiva de una jugada ganadora.

Métrica primaria: proporción de sorteos donde al menos una jugada de la cartera alcanza7+ aciertos. Secundarias: máximo por cartera, tasas6+/8+ y media por jugada. No se elige ganadora automáticamente ni se optimiza ROI con premios mayores escasos.

No se añadieron todavía variantes160/40 contra180/20: primero necesitamos una referencia fiel a producción y comprobar que el laboratorio mide correctamente. Una candidata nueva deberá declarar su versión e hipótesis antes de consumir la prueba final.

## Histórico y particiones

La fecha de inicio es15/sep/2026, primera aparición de81–84 observada en el archivo; no una fecha oficial corroborada. El corte de la primera corrida es8/nov/2026. Se valida el corpus, fechas únicas y cardinalidad20/84 antes de filtrar. Se ordena cronológicamente y se asignan30sorteos a calentamiento, los siguientes10 a validación y el resto a reserva, con mínimo5reservados. El JSON registra las fechas exactas y SHA-256 del dataset canónico.

Para cada fecha se registra el número de sorteos anteriores y su última fecha. Estas tres estrategias solo usan semillas, no resultados previos: es una reconstrucción caminante sin filtración, **no entrenamiento de un modelo predictivo**. V13.3 se reconstruye también en fechas anteriores a su activación; no representa una cartera emitida entonces.

El histórico completo ya se inspeccionó en la auditoría anterior. Por tanto, su reserva sirve como separación descriptiva pero **no se presenta como holdout completamente nuevo**. No se ejecutan sus métricas en fasevalidation. Resultados posteriores deberán evaluarse prospectivamente antes del cierre si queremos una prueba operativa limpia.

## Sorteos sintéticos

Cada réplica usa5000resultados uniformes de20números únicos entre84, comunes a las tres estrategias. Se construye una cartera nueva por estrategia y réplica. Primera corrida:3réplicas,15000escenarios en total por estrategia y tres diseños de cartera por método. Las semillas tienen espacios separados para construcción, escenarios de validación y escenariosholdout; V13.3 conserva además sus escenarios de ajuste internos, sin entrenarse contra los de evaluación.

Se publican diferencias pareadas frente a uniforme para máximo,7+ y8+, con bootstrap de1000remuestreos y semilla fija. Los intervalos de cada réplica miden incertidumbre Monte Carlo **condicional a esas carteras**, no incertidumbre entre todas las semillas posibles del generador. Tres diseños son una primera comparación, no una certificación de superioridad. Hay que examinar variación entre réplicas y no escoger el mejor resultado aislado.

## Ejecución y protección

```sh
npm run experiment:kino -- --cutoff=2026-11-08 --draws=5000 --replicates=3 --run-id=validation-v1
```

El resultado se guarda exclusivamente en `experiments/super-kino/validation-v1.json`. Un nombre ya existente se rechaza; no se sobrescriben corridas. Sin `--run-id`, se imprimeJSON. Nunca se llaman endpoints ni se escriben archivos operativos.

El JSON incluye semillas por cartera/escenarios, hash de código, hash del dataset, particiones, métricas por fecha y por réplica. Conservar el histórico original y el código correspondientes a esos hashes: si cambian resultados importados, una nueva corrida con el mismo corte puede variar. Node y dependencias deben mantenerse para reproducción bit a bit; el generador operativo conserva un desempate aleatorio con `sort` que puede variar entre motores.

`--phase=holdout` está bloqueado salvo `--unlock-holdout` explícito. No ejecutarlo durante ajuste. Abrirlo consume la reserva y debe quedar registrado con un nuevo identificador de corrida. El bloqueo es una protección de flujo, no una bóveda criptográfica; las semillas quedan disponibles en el código.

Antes de esa fase, congelar candidatos, métrica primaria, dataset, semillas y criterio de aceptación. Una mejora deberá ser consistente entre réplicas y superar a las referencias sin empeorar inadvertidamente la cobertura. Si se retoca después de verholdout, harán falta nuevos escenarios no usados y evidencia futura; no llamarholdout a la misma muestra otra vez.

## Pruebas

```sh
node --test --experimental-strip-types tests/kino-experiment-data.test.ts tests/kino-experiment-strategies.test.ts tests/kino-experiment-metrics.test.ts tests/kino-experiment-runner.test.ts
npm run typecheck
```

Las pruebas cubren particiones, corte, ausencia de futuro, hash canónico, cuotas, unicidad200×10, determinismo, duplicados canónicos, unidad de análisis, diferencias pareadas, aislamiento de mutaciones, bloqueoholdout y rutas de salida. El laboratorio no se importa desde la app.

## Primera corrida completada: validation-v1

Artefacto: `experiments/super-kino/validation-v1.json`. Node v26.5.0. TypeScript, build y18pruebas aprobados. QA verificó coincidencia de hashes de código/dataset y ausencia de filas de la reserva en resultados de validación. La corrida no modifica producción.

55sorteos del régimen observado:30de calentamiento (15/sep–14/oct),10de validación (15–24/oct) y15reservados (25/oct–8/nov). No se ejecutó la faseholdout sintética ni histórica del laboratorio.

Promedio de tres réplicas de5000escenarios cada una, con una cartera por método/réplica:

| Construcción | Alguna jugada7+ | Alguna jugada8+ | Máximo medio |
| --- | ---: | ---: | ---: |
| Uniforme |22.2867%|1.9200%|6.1095|
| Equilibrada sin optimizador |22.8800%|2.1400%|6.1317|
| V13.3 de producción |22.5133%|1.9733%|6.1354|

Estos porcentajes son frecuencias empíricas de simulación finita, no probabilidades exactas ni evidencia de mayor precisión de una jugada individual. Solo hay tres diseños por método. Para la métrica primaria7+, todos los intervalos pareados frente a uniforme incluyen0 en las tres réplicas. La diferencia de8+ cambia de signo entre réplicas. No se declara ganador ni se cambia estrategia por las medias de esta tabla.

En las10fechas reconstruidas, la uniforme tuvo7+ en5fechas, equilibrada en3 y V13.3 en2. Esa muestra pequeña y previamente inspeccionada no prueba que uniforme sea superior ni representa apuestas realizadas. La media sintética por jugada de los tres métodos quedó cerca de2.381, la referencia uniforme.

Recomendación conjunta de los perfiles: conservar producción; ampliar el número de carteras/semillas en validación y fijar un efecto mínimo cuantitativo antes de abrir la reserva. Los intervalos secundarios son exploratorios, sin corrección por comparaciones múltiples. Si desarrollamos nuevas variantes después de esta validación, sus pruebas finales deberán usar escenarios no consumidos.
