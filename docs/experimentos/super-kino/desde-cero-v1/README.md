# Algoritmo desde cero: aprendizaje de selecciones10

3,450,000 sorteos sintéticos, sin histórico real ni importación de algoritmos anteriores. Cada predicción contiene10 números; ganador20 de84 sin reemplazo. No son carteras100 ni pools20.

## Aprendizaje y selección

1,000,000 sorteos de entrenamiento,250,000 de validación. Tasas prefijadas 0.002/0.01/0.05; elegida 0.002 por media de validación. Modelo congelado antes de2,000,000 de prueba final. No se eligió un checkpoint ganador ni se reajustó tras el test.

| Tasa | Media de validación |
| --- | ---: |
| 0.002 | 2.384980 |
| 0.01 | 2.379772 |
| 0.05 | 2.380264 |

## Prueba final uniforme, dos millones nuevos

Referencia exacta: media 2.380952, P(10perfectos) 0.00000669157%, aproximadamente1/14944174.

| Método | Media de aciertos | 6+ | 7+ | Máximo | Casos10perfectos |
| --- | ---: | ---: | ---: | ---: | ---: |
| Modelo aprendido | 2.381270 | 1.02935% | 0.12530% | 9 | 0 |
| Aleatorio10 | 2.380912 | 1.00980% | 0.12625% | 9 | 0 |

Diferencia media aprendida−aleatoria: 0.000358, IC95% Monte Carlo -0.002136 a 0.002852. Criterio≥0.01 y límite inferior>0: no superado. Es error condicionado al mundo simulado, no prueba de capacidad del generador físico.

## Control positivo separado: patrón introducido deliberadamente

Diez bolas tienen peso2 y las demás1. El predictor no recibe esas identidades ni pesos: aprende de100,000 ganadores, luego se congela y evalúa100,000 nuevos. Este mundo artificial NO se atribuye al sorteo real.

| Método | Media de aciertos | 6+ | 7+ | Máximo | Casos10perfectos |
| --- | ---: | ---: | ---: | ---: | ---: |
| Modelo aprendido | 2.522550 | 1.39000% | 0.16800% | 8 | 0 |
| Aleatorio10 | 2.383840 | 1.05700% | 0.13500% | 8 | 0 |

Diferencia media en control artificial: 0.138710. No mezclar esta mejora con la prueba uniforme.

## Trazabilidad y decisión

Entrenamiento, validación, prueba final y control usan flujos distintos. Pesos no cambian durante validación/test; contextos solo ven resultados previos. Semilla kino-scratch-learner-v1/20261114, modelo SHA-256 9062174774e075291f8824448e14ac2d35d800c1898dbad5d41110273577c9e1. Curvas, checkpoints, modelo, fuentes, protocolo y agregados guardados. Sin lectura de data/, premios ni cambios operativos. No aumentar presupuesto o cambiar semilla después de ver el resultado.

## Estado y lectura de resultados

Primera versión ejecutada exploratoria, sin adopción. Se construyó desde cero un predictor online que empieza uniforme y selecciona diez números aleatoriamente según pesos aprendidos. Ni el módulo ni el runner importan otros algoritmos del proyecto; no se leen resultados reales, carteras ni pesos anteriores. Las únicas lecturas del runner son su protocolo y sus dos fuentes para trazabilidad. No se incorporan ganancias de otros ensayos como resultados de este.

La validación seleccionó rate0.002 con2.384980 aciertos, pero en prueba nueva bajó a2.381270. Diferencia contra aleatorio0.000358, IC95%[−0.002136,0.002852]: no supera el efecto mínimo0.01. Los pesos distintos de cero que aparecen al aprender frecuencias no bastan para probar un patrón persistente. No se presentan las tasas6+ como si fueran diez aciertos ni como cumplimiento del objetivo anterior de pools20.

Control positivo: con sesgo persistente introducido por el simulador, el predictor aprendió de ganadores sin recibir los pesos verdaderos. La mejora0.138710 aciertos (+5.82% relativo frente al baseline del control) pertenece exclusivamente a ese mundo inventado. La prueba no demuestra sesgo del dispositivo real ni que el predictor detecte todo tipo de patrón posible.

## Base para una siguiente versión

La V1 deja listo el circuito selección→sorteo→feedback→ajuste, con prueba final separada. Para extenderlo, registrar antes una hipótesis nueva sobre qué dependencia pretende aprender, introducir un control sintético independiente que la tenga y compararlo con el nulo uniforme. Si se cambian memoria, interacciones o aprendizaje, usar versión y prueba final nuevas sin reutilizar estos resultados para afirmar validación independiente. No ejecutar hasta encontrar una semilla favorable ni fabricar patrones dentro del nulo. Esta regla permite continuar investigando sin confundir ajuste con generalización.

## Reproducir

[Protocolo previo](PROTOCOLO.md). Comando `node --experimental-strip-types scripts/run-kino-scratch-learner.ts otra-identificacion`. Rechaza sobrescritura. Mismas fuentes y semillas reproducen; repetirlo no agrega información independiente.

Artefactos en `experiments/super-kino/desde-cero-v1/from-zero-2026-11-14/`: modelos iniciales/entrenados, diez checkpoints de entrenamiento más inicial, curvas por bloque, validación completa, selección congelada antes del test, prueba final y control separado. El ejemplo de diez números es sintético, sin fecha de apuesta ni recomendación real. Se conservan semillas del generador y fuentes ejecutadas para reconstrucción, no millones de archivos por sorteo.

Cuatro pruebas afectadas de selección sin repetición, estado inicial uniforme, pesos congelados en evaluación, reproducción y aprendizaje del control artificial; TypeScript y build satisfactorios. Hashes de fuentes y protocolo verificados contra contenido preservado. Sin cambios operativos, publicación ni procesos en segundo plano.
