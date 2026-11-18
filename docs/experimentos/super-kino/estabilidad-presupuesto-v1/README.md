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

## Estado y conclusión

Ejecutado exploratorio, pendiente de validación con carteras nuevas. La selección de100 jugadas supera el criterio previo: mejora media0.148 puntos porcentuales de probabilidad7+ frente al recorte aleatorio del mismo tamaño, con diferencias positivas en7/7 snapshots. Esto NO es una mejora de0.148 en ROI, no permite predecir números y no demuestra beneficio económico. El presupuesto20 no mejora y el50 queda inconcluso. No se afirma equivalencia.

Para100 jugadas, costo modelado RD$2,500, tasa7+12.072% y cobertura retenida frente a200 de53.392%. Sigue existiendo pérdida esperada de RD$1,082.53 y frecuencia de pérdida modelada98.397%; mejorar la cobertura de7 no implica recuperar costo. No se recomienda gastar más ni se activa el recorte.

La señal se obtuvo bajo modelo uniforme sobre carteras fijas. Siete fechas relacionadas de una misma versión del generador no son una muestra aleatoria de todos los diseños. El bootstrap con pocos grupos puede dar precisión optimista; los intervalos se consideran exploratorios y no se presentan como prueba final. No se reajustó el criterio después de conocer el resultado.

## Reabrir esta línea

Solo con validación congelada sobre carteras no utilizadas aquí, con muestra justificada por efecto mínimo y variabilidad entre carteras, no por aumentar sorteos del mismo snapshot. Mantener presupuesto, heurística y comparación pareada; registrar todas las carteras, sin elegir las mejores. Si cambia el constructor, abrir versión nueva. Ningún ensayo autoriza adopción automática.

## Reproducir y auditar

[Protocolo previo](PROTOCOLO.md). Comando: `node --experimental-strip-types scripts/audit-kino-budget-stability.ts nueva-identificacion`. Misma entrada/semilla/código reproduce, no agrega evidencia. No se permite sobrescribir.

Entradas completas, fuente ejecutada, hashes y resultados por fecha/semilla: `experiments/super-kino/estabilidad-presupuesto-v1/verified-reproduction-2026-11-14/`. También se conserva la primera corrida `seven-snapshots-2026-11-14`. Tras corregir una anotación de tipo y añadir captura automática del código fuente, la reproducción confirmó igualdad exacta de todas las métricas, órdenes y decisiones. Son los mismos420,000 escenarios reproducidos; no840,000 escenarios independientes. Los hashes de ambas fuentes y de entradas se comprobaron contra el contenido guardado.

Verificación final: ocho pruebas del análisis por grupos, construcción de subconjuntos y economía; `npm run typecheck` y `npm run build` satisfactorios. No hay llamadas a endpoints ni cambios de data/.
