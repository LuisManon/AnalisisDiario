# Menor presupuesto: costo y cobertura sacrificada

100,000 sorteos uniformes compartidos. Subconjuntos anidados de la cartera guardada 2026-11-14, kino-v13.3. Ningún dato operativo se modifica.

## Subconjuntos por cobertura, sin mirar ganadores

| Jugadas | Costo RD$ | Ahorro | Alguna 7+ | Cobertura 7+ retenida frente a 200 | Alguna 8+ | Neto esperado RD$ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 500.00 | 90.00% | 2.48% | 10.92% | 0.20% | -216.51 |
| 50 | 1250.00 | 75.00% | 6.18% | 27.26% | 0.47% | -541.26 |
| 100 | 2500.00 | 50.00% | 12.11% | 53.41% | 0.98% | -1082.53 |
| 200 | 5000.00 | 0.00% | 22.66% | 100.00% | 1.93% | -2165.06 |

## Tamaño y frecuencia de pérdidas

| Jugadas | Premio menor que costo | Premio cero | Mediana bruto RD$ | Pérdida neta percentil95 RD$ | Exposición por número mín–máx |
| --- | ---: | ---: | ---: | ---: | ---: |
| 20 | 92.04% | 10.01% | 160.00 | 500.00 | 1–4 |
| 50 | 94.75% | 0.22% | 480.00 | 1090.00 | 4–9 |
| 100 | 98.36% | 0.00% | 1020.00 | 1980.00 | 10–15 |
| 200 | 97.99% | 0.00% | 2080.00 | 3700.00 | 23–24 |

Reducir costo baja la pérdida absoluta esperada; no mejora el ROI exacto de -43.30% bajo este modelo y tabla. El percentil95 no es pérdida máxima: la pérdida máxima por sorteo es el costo, si no hay premio. Los premios raros hacen que la esperanza y el resultado típico difieran. Tabla modelada del snapshot, sin certificación oficial ni retenciones.

## Control: mismos presupuestos, subconjuntos aleatorios

| Jugadas | 7+ aleatorio | 7+ cobertura | Diferencia pareada en pp | IC95% Monte Carlo en pp |
| --- | ---: | ---: | ---: | --- |
| 20 | 2.47% | 2.48% | 0.009 | -0.109 a 0.127 |
| 50 | 6.14% | 6.18% | 0.035 | -0.145 a 0.215 |
| 100 | 12.00% | 12.11% | 0.102 | -0.107 a 0.311 |
| 200 | 22.66% | 22.66% | 0.000 | 0.000 a 0.000 |

Error Monte Carlo condicionado a estos subconjuntos; no demuestra superioridad del algoritmo en general. La heurística minimiza una suma de intersecciones de pares; no se afirma optimalidad. No se reajustó después de evaluar. A 200 ambos órdenes representan exactamente la misma cartera y dan resultados idénticos.

Los intervalos Wilson por tasa y diferencias pareadas de 7+/8+ frente a 200 están en report.json. No jugar tiene costo y neto cero, sin cobertura. No se elige presupuesto automáticamente ni se promueve un cambio de producción.

## Lectura para decidir

- Bajar de 200 a 100 reduce el costo 50% y conserva 53.41% de la probabilidad de alguna jugada 7+ en este ensayo. La probabilidad absoluta pasa de 22.66% a 12.11%, aproximadamente 10.56 puntos porcentuales menos usando las cifras sin redondear. No conserva 53% de los premios ni de la rentabilidad.
- Bajar a 50 reduce costo 75% y conserva 27.26% de esa cobertura. Bajar a 20 reduce costo 90% y conserva 10.92%. Ningún recorte conserva la mayor parte de cobertura a una fracción muy pequeña del costo.
- La regla de menor redundancia no mostró mejora clara frente al recorte aleatorio: todos los intervalos pareados de diferencia incluyen cero. No se justifica anunciarla como optimización probada.
- La pérdida absoluta esperada escala con el costo: RD$2,165.06, RD$1,082.53, RD$541.26 y RD$216.51 para 200,100,50 y20. El ROI esperado permanece −43.30% bajo el modelo y tabla. No equivale a pérdida de cada sorteo.
- Con 100 jugadas la probabilidad de perder fue mayor que con 200, aunque el dinero expuesto es menor. Los umbrales discretos de premios/costo hacen que la frecuencia de pérdida no sea monótona. No sustituir un indicador de riesgo por otro.

No se recomienda subir gasto ni se fija un presupuesto sin límite aceptable de exposición definido por el usuario. Se mantiene la cartera operativa. Si se solicita integrar una opción de presupuesto, necesitará decisión explícita y conservar carteras/asignaciones cerradas.

## Reproducción y verificación

[Protocolo congelado](PROTOCOLO.md). Ejecutar `node --experimental-strip-types scripts/audit-kino-budget.ts otra-corrida`. Mismo snapshot, semilla y código reproducen métricas; otra identificación no agrega evidencia independiente. Se rechaza sobrescritura.

Los resultados detallados, snapshot inmutable de entrada e índices de todos los subconjuntos están en `experiments/super-kino/presupuesto-v1/snapshot-2026-11-14/`. Los índices son posiciones base cero de la lista de jugadas del snapshot. No se usaron resultados históricos ni futuros para construir los subconjuntos.

Verificación: cinco pruebas de orden greedy, reproducción, conservación de entradas, evaluación por presupuesto y economía/estructura; TypeScript y build satisfactorios. Durante la corrida se comprobó que ambos órdenes producen exactamente el mismo resultado a 200 jugadas en cada escenario.
