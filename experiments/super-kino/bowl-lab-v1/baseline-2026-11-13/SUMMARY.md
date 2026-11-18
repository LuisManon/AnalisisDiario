# Bowl lab V1

Dos escenarios de 1,000,000 sorteos cada uno. Objetivo: 10+ ganadores dentro del grupo de 20, no una jugada ganadora de 10.

## Bowl uniforme

Referencia exacta: 0.309427%; media 4.7619.

| Selector | Media | Sorteos 10+ | Tasa | Wilson95% Monte Carlo |
| --- | ---: | ---: | ---: | --- |
| uniform | 4.7603 | 3034 | 0.3034% | 0.2928–0.3144% |
| range10 | 4.7638 | 3106 | 0.3106% | 0.2999–0.3217% |
| frequency | 4.7628 | 3043 | 0.3043% | 0.2937–0.3153% |

## Sesgo artificial de 20% en peso de un rango

Escenario inventado para sensibilidad: el selector conoce el rango favorecido. No describe ni estima la física real ni evidencia ventaja predictiva.

| Selector | Media | Sorteos 10+ | Tasa | Wilson95% Monte Carlo |
| --- | ---: | ---: | ---: | --- |
| uniform | 4.7629 | 3185 | 0.3185% | 0.3076–0.3297% |
| range10 | 4.8907 | 3925 | 0.3925% | 0.3804–0.4049% |
| frequency | 4.7742 | 3234 | 0.3234% | 0.3125–0.3347% |

## Histórico real, retrospectiva caminante

60 registros del régimen observado, 30 fechas evaluadas tras 30 de calentamiento. Cien selecciones por fecha promedian la aleatoriedad; NO son cien sorteos reales nuevos. Historia ya explorada, sin reserva intacta.

| Selector | Media de aciertos | Tasa media 10+ |
| --- | ---: | ---: |
| uniform | 4.7120 | 0.1667% |
| range10 | 4.8607 | 0.4333% |
| frequency | 4.7763 | 0.4000% |

No se activa ninguna candidata. Más simulaciones reducen error Monte Carlo bajo el modelo elegido; no crean información sobre sorteos reales. No reducir el presupuesto por encontrar una corrida favorable. Se necesita validación futura con reglas congeladas para afirmar mejora.
