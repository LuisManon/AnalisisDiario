# Diversa: reducción de tríos repetidos — protocolo previo

Se continúa la candidata diversa v2, no se modifica su implementación congelada ni producción. El23.26%fue una frecuencia observada en una corrida anterior, no una probabilidad garantizada. La variante de rangos se retiró del árbol activo y sus cuatro fuentes quedan archivadas de forma recuperable; su resultado negativo se conserva para no repetir selectivamente experimentos descartados.

Nueva hipótesis: reducir tríos repetidos entre jugadas podría mejorar la cobertura7+ adicional a reducir parejas y solapamientos. Se parte de la misma cartera diversa por semilla, se intentan10,000intercambios recíprocos, se acepta solo una reducción del objetivo fijo de tríos repetidos y se limita la penalidad de diversidad v2 a1.05veces la base. Se preservan exposición23/24,200jugadas únicas y10números únicos por jugada. No se usan frecuencias, atrasos, rangos ni resultados de evaluación para construir.

Tres métodos: uniforme, diversa original y diversa con tríos.12carteras por método×5000resultados20/84, comunes dentro de cada réplica; nuevos espacios de semilla `kino-lab-triples-v1/validation`. Los métodos diversa/tríos comparten semilla base. Misma validación histórica15–24/oct y corte8/nov; no se mira la reserva. El histórico es reconstruido y previamente inspeccionado, no evidencia prospectiva.

Métrica primaria: tasa de cartera con alguna7+. Avance exploratorio exige>=1punto porcentual medio frente a diversa y uniforme, límites inferiores positivos con bootstrap de10,000remuestreos de las12réplicas y Bonferroni por dos comparaciones, medias positivas al excluir una réplica y deterioro8+ frente a diversa no superior a0.2puntos.12semillas siguen siendo pocas; no se presentan60,000escenarios como60,000carteras independientes. No se rebaja el umbral tras ver resultados ni se selecciona por una secundaria favorable.

```sh
node --experimental-strip-types scripts/run-kino-triples.ts --cutoff=2026-11-08 --draws=5000 --replicates=12 --run-id=validation-triples-v1
```

El runner solo admite validación y salida nueva en experiments/super-kino, conserva hashes/semillas/fechas de referencia, y no despliega ni modifica datos operativos. Como el objetivo cambió, no es una continuación transparente de la cartera emitida: es una versión experimental separada.

## Resultado: validation-triples-v1

12carteras por método,5000sorteos sintéticos por cartera:60,000escenarios por método,12unidades de semilla. Comparación dentro de esta corrida, no contra el23.26%de una muestra distinta.

| Método | Alguna7+ | Alguna8+ | Máximo medio |
| --- | ---: | ---: | ---: |
| Uniforme |21.9800%|1.9000%|6.1104|
| Diversa original |22.9317%|1.8067%|6.1528|
| Diversa con tríos |22.9083%|1.8650%|6.1534|

Diferencia tríos frente a diversa: **−0.0233puntos porcentuales en7+**, intervalo bootstrap ajustado[−0.3350,+0.2850]puntos. No hay mejora incremental demostrada ni daño concluyente. Frente a uniforme,+0.9283puntos (intervalo+0.6383a+1.2100), pero esa comparación no demuestra aporte adicional a la diversa, que ya supera la referencia en esta muestra.

La media por jugada de ambas diversas es idéntica,2.38101, por preservar exposición. El objetivo de tríos mejora geométricamente pero no basta para incrementar la métrica primaria. La guarda secundaria8+ no rescata el incumplimiento de7+; no se cambia de métrica tras mirar resultados. La candidata no cumple el criterio de avance.

Decisión: conservar diversa v2 como candidata principal offline, no sustituirla por esta versión de tríos. Mantener V13.3 operativo y la reserva intactos. No buscar nuevas semillas hasta encontrar una muestra favorable. Cualquier otra hipótesis necesitará un protocolo y validación nuevos, no reetiquetar estas corridas como confirmatorias.

Limpieza solicitada: retirados `lib/kino-experiment-ranges.ts`, `scripts/run-kino-ranges.ts` y sus dos archivos de prueba. Se verificó ausencia de consumidores activos. Sus fuentes originales se conservan recuperables en `experiments/super-kino/archive/ranges-v1-source.zip`; el resultado y el informe negativo permanecen para trazabilidad. No se retiraron algoritmos históricos productivos que interpretan snapshots.

Verificación:35pruebas del laboratorio aprobadas, TypeScript y build aprobados. Cambios y artefactos locales; sin publicación a main ni modificación de carteras/resultados.
