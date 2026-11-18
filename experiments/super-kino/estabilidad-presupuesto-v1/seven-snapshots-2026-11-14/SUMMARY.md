# Estabilidad entre carteras y presupuestos

7 snapshots V13.3, tres semillas por snapshot: 21 parejas y 420,000 sorteos sintéticos uniformes nuevos. Ningún resultado real se usa para diseñar o evaluar predicción.

## Diferencia de cobertura 7+ al mismo costo

| Jugadas | Aleatorio | Heurística cobertura | Diferencia en pp | Intervalo cluster ajustado, pp | Fechas positivas | Supera puerta exploratoria |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| 20 | 2.505% | 2.486% | -0.018 | -0.068 a 0.033 | 2/7 | No |
| 50 | 6.117% | 6.180% | 0.064 | -0.036 a 0.122 | 6/7 | No |
| 100 | 11.924% | 12.072% | 0.148 | 0.093 a 0.201 | 7/7 | Sí |

Bootstrap exploratorio por siete fechas, agrupando semillas antes del remuestreo. Intervalos nominales98.333% por presupuesto, ajuste Bonferroni de tres comparaciones. Pocos clusters y selección fija de snapshots: no es una garantía de generalización ni precisión certificada. Error Monte Carlo pareado por réplica y diferencias por fecha están en report.json.

## Presupuesto: promedio de estas carteras

| Jugadas | Costo RD$ | Alguna7+ con heurística | Cobertura7+ retenida | Alguna8+ | Frecuencia de pérdida | Neto esperado RD$ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 500 | 2.486% | 10.999% | 0.193% | 92.169% | -216.51 |
| 50 | 1250 | 6.180% | 27.335% | 0.480% | 94.729% | -541.26 |
| 100 | 2500 | 12.072% | 53.392% | 0.962% | 98.397% | -1082.53 |
| 200 | 5000 | 22.609% | 100.000% | 1.914% | 97.993% | -2165.06 |

## Decisión

Exploratory gate passed in at least one budget; requires new portfolio validation, no adoption.

La puerta exige +0.1pp medio, límite inferior ajustado positivo, al menos5/7 fechas positivas y ninguna fecha peor que−0.1pp. Ningún resultado autoriza adopción automática. Reducir costo baja pérdida absoluta esperada, no el ROI uniforme modelado (-43.301%). Tabla del snapshot, sin certificación oficial ni retenciones.

No se cambió la heurística, las semillas ni la muestra después de evaluar. A200 ambos métodos son idénticos en todos los escenarios. Snapshot y órdenes exactos preservados; sin cambios operativos.
