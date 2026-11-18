# Nuevas fórmulas: objetivo 1%

Objetivo fijo: un grupo de 20 que contenga 10+ ganadores. No se ensayaron otras semillas ni se reajustaron pesos después de evaluar.

## Dos millones de sorteos uniformes compartidos

Referencia exacta para TODO pool de 20: 0.3094%.

| Fórmula | Media | Casos 10+ | Tasa | Wilson95% Monte Carlo |
| --- | ---: | ---: | ---: | --- |
| uniform-reference | 4.7620 | 6243 | 0.3122% | 0.3045%–0.3200% |
| momentum7 | 4.7626 | 6232 | 0.3116% | 0.3040%–0.3194% |
| pair-residual | 4.7619 | 6197 | 0.3099% | 0.3022%–0.3176% |

Los pools se fijan con el histórico al corte; el control no mide adaptación a un bowl físico. Ninguna fórmula puede cambiar la probabilidad marginal uniforme por seleccionar otro grupo.

## Retrospectiva de 30 sorteos reales

| Fórmula | Media | Fechas con 10+ | Tasa observada | Wilson95% orientativo |
| --- | ---: | ---: | ---: | --- |
| momentum7 | 4.5667 | 0/30 | 0.0000% | 0.0000%–11.3513% |
| pair-residual | 4.7667 | 0/30 | 0.0000% | 0.0000%–11.3513% |

Historia ya conocida, sin reserva intacta. Los intervalos históricos asumen independencia y no corrigen búsqueda adaptativa ni comparaciones múltiples. No bastan para afirmar rendimiento futuro. Treinta fechas no permiten estimar una tasa rara de 1% con precisión útil.

## Decisión

No se demuestra el objetivo de 1%, no se adopta ninguna regla y no se cambian carteras operativas. La alternativa de ampliar a 23 números tiene probabilidad exacta 1.2215%, pero CAMBIA el objetivo de un grupo de 20; no se presenta como éxito de estas fórmulas ni se activa. Repetir el histórico buscando una fórmula que dé 1% sería selección retrospectiva, no evidencia independiente.
