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

Referencia exacta: media 2.380952, P(10perfectos) 0.00001%, aproximadamente1/14944174.

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
