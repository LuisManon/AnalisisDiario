# Cobertura, costo y riesgo: carteras de Kino

100,000 sorteos uniformes compartidos. Snapshot 2026-11-14, algoritmo kino-v13.3. Comparación condicionada a tres carteras fijas de 200 jugadas; no demuestra superioridad de un generador completo ni predicción.

## Cobertura y pérdidas simuladas

| Cartera | Alguna 7+ | Alguna 8+ | Premio menor que RD$5,000 | Premio cero | Mediana premio bruto |
| --- | ---: | ---: | ---: | ---: | ---: |
| operativa-guardada | 22.729% | 1.936% | 97.983% | 0.000% | RD$2080.00 |
| uniforme | 22.265% | 1.861% | 98.006% | 0.000% | RD$2060.00 |
| equilibrada | 22.393% | 1.976% | 97.938% | 0.000% | RD$2080.00 |

## Diferencia pareada en 7+ frente a la cartera guardada

- uniforme: -0.464% puntos porcentuales; IC95% Monte Carlo -0.830% a -0.098% puntos.
- equilibrada: -0.336% puntos porcentuales; IC95% Monte Carlo -0.703% a 0.031% puntos.

Los intervalos son aproximaciones normales pareadas por escenario. No incluyen variación entre semillas de carteras.

## Concentración estructural

| Cartera | Exposición mínima–máxima | Solapamiento medio | Parejas de jugadas que comparten 7+ números |
| --- | ---: | ---: | ---: |
| operativa-guardada | 23–24 | 1.147 | 0 |
| uniforme | 14–33 | 1.187 | 0 |
| equilibrada | 23–24 | 1.147 | 0 |

Mismo solapamiento medio puede ocultar concentraciones distintas. El reporte JSON contiene histogramas y cotas combinatorias; no son probabilidades alcanzadas.

## Economía exacta bajo uniforme y tabla del snapshot

Todas las carteras tienen el MISMO premio esperado: RD$2834.94 bruto, neto RD$-2165.06 y ROI esperado -43.301% por cartera de 200. No es un ingreso asegurado ni un retorno típico. Tabla modelada del código, sin certificación oficial ni retenciones. No ordenar diseños por premios medios de una simulación corta: el jackpot es raro.

| Jugadas | Costo | Bruto esperado | Neto esperado |
| --- | ---: | ---: | ---: |
| 20 | RD$500.00 | RD$283.49 | RD$-216.51 |
| 50 | RD$1250.00 | RD$708.74 | RD$-541.26 |
| 100 | RD$2500.00 | RD$1417.47 | RD$-1082.53 |
| 200 | RD$5000.00 | RD$2834.94 | RD$-2165.06 |

Escalar presupuesto no cambia el ROI esperado. La tabla no calcula cobertura de subconjuntos ni recomienda apostar.

No se modificaron carteras ni estrategias operativas. La comparación permite estudiar compromisos de cobertura y concentración; no demuestra rentabilidad ni elimina el riesgo.
