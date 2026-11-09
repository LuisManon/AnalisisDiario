# Validación v2 — definido antes de ejecutar

Se mantiene el corte8/nov/2026 y las mismas10fechas de validación15–24/oct. No se usa la reserva histórica ni sintética. El objetivo sigue siendo cobertura de200jugadas de10, no predicción de números.

Nueva candidata: `balanced-diverse`, cartera equilibrada con cuotas23/24 que reduce parejas repetidas y solapamientos altos mediante10,000intercambios deterministas. Se construye desde la misma semilla base que `balanced`, sin utilizar resultados. El objetivo geométrico se fija antes de evaluar sorteos. No se modifican V13.3 ni los módulos/artefactos v1.

Comparación: uniforme, equilibrada original, equilibrada diversa y V13.3 exacto.12carteras por método, cada una evaluada contra5000sorteos20/84; escenarios comunes por réplica, nuevos espacios de semilla `kino-lab-v2/validation`.60,000escenarios por método, **12unidades independientes de semilla**, no60,000carteras independientes.

Métrica primaria: tasa de cartera con alguna jugada7+. Secundarias descriptivas:6+,8+, máximo y media. No se seleccionará por la métrica secundaria más favorable.

Criterio exploratorio de avance fijado antes de ver resultados: mejora media7+ de al menos1punto porcentual frente a V13.3 y equilibrada; intervalos bootstrap con ajuste Bonferroni por tres referencias (uniforme, equilibrada, V13.3) con límite inferior positivo; medias positivas al excluir cualquier réplica; deterioro medio8+ frente a V13.3 no mayor de0.2puntos porcentuales. Es un criterio provisional para justificar más pruebas, no autorización de producción ni prueba de potencia suficiente.

Los intervalos remuestrean réplicas completas de cartera+escenarios con10,000remuestreos. Doce semillas siguen siendo pocas para conclusiones fuertes; los intervalos son aproximados. No se juntan todos los escenarios como si fueran semillas independientes. Los resultados históricos son reconstruidos y previamente expuestos, no prueba prospectiva.

Comando de primera corrida:

```sh
node --experimental-strip-types scripts/run-kino-experiment-v2.ts --cutoff=2026-11-08 --draws=5000 --replicates=12 --run-id=validation-v2
```

El runner solo admite validación, rechaza sobrescritura y registra hashes de código/dataset/lockfile, versión Node, semillas y huellas de las carteras. Ninguna API ni archivo operativo se modifica. La fase final seguirá reservada.

## Resultado de validation-v2

Corrida completada y revisada por ciencia de datos, análisis/ingeniería de datos y QA. Artefacto: `experiments/super-kino/validation-v2.json`. Mismo dataset55sorteos que v1 y mismas10fechas15–24/oct.12carteras por método,5000sorteos por cartera;60,000evaluaciones por método, no60,000carteras independientes.

| Método | Alguna7+ | Alguna8+ | Máximo medio |
| --- | ---: | ---: | ---: |
| Uniforme |22.1433%|1.9483%|6.1134|
| Equilibrada |22.6067%|1.9433%|6.1302|
| Equilibrada diversa |23.2583%|1.8950%|6.1577|
| V13.3 |22.4083%|1.8550%|6.1347|

La diversa mejora la tasa7+ frente a V13.3 en **0.8500puntos porcentuales**, con intervalo bootstrap ajustado de+0.3067 a+1.3483puntos; frente a equilibrada,+0.6517puntos (intervalo+0.2700 a+1.0217). Frente a uniforme,+1.1150puntos (intervalo+0.6150 a+1.7767). Son intervalos aproximados a partir de12bloques, con ajuste Bonferroni por tres comparaciones; no prueba confirmatoria definitiva.

La media de aciertos de diversa y equilibrada es idéntica (2.38094 por jugada): los intercambios preservan exactamente la exposición de cada número. La señal observada corresponde a distribuir mejor la cobertura entre jugadas, no a elegir números con mayor probabilidad marginal. La penalidad geométrica bajó en las12carteras, pero mejorar ese objetivo por sí solo no prueba mejoras en sorteos.

**No cumple el criterio de avance**: aunque las diferencias medias y sus límites inferiores son positivos, no alcanzan1punto porcentual frente a V13.3 y equilibrada. No se rebaja el criterio tras observar resultados. La guarda8+ se cumple frente a V13.3, pero esa métrica es secundaria y no demuestra ventaja estable en8–10.

Recomendación: mantener V13.3 y la reserva sin consumir. La variante merece seguir estudiándose en validación con nuevos planes/semillas preregistrados; cualquier ajuste basado en esta corrida requiere escenarios finales no utilizados. No activar una cartera nueva ni sustituir snapshots existentes.

Verificación:27pruebas, TypeScript y build aprobados; QA recalculó hashes de código/dataset/lockfile, criterios y particiones, confirmó nombres de semilla de validación y ausencia de filas de reserva. No se modificaron algoritmos operativos ni resultados. Cambios locales, sin publicar.

Nota de procedencia: algunas URLs locales apuntan a una página-ancla posterior que contiene múltiples resultados históricos; el parser usa la fecha textual de cada resultado. Ese desfase deURL no demuestra una fecha de resultado incorrecta, aunque limita la trazabilidad a la ubicación exacta dentro de la página. No hubo correcciones de datos ni cotejo externo nuevo en esta fase.
