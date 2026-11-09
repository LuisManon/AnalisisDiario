# Evaluación de Super Kino TV

Corte de datos: 8 de noviembre de 2026. Código base: `8c30d10`. Perfiles: ingeniería de datos, análisis de datos y ciencia de datos. Auditoría exploratoria; no se activó ninguna estrategia, no se modificaron históricos ni carteras, y no se publicó a main.

## Conclusión

No encontramos evidencia suficiente para sustituir V13.3 por una selección de números basada en frecuencias o atrasos. Su función actual es distribuir cobertura entre 200 jugadas de 10, no predecir números ganadores. La mejora prioritaria es hacer confiable y comparable el evaluador, registrar procedencia temporal y recoger evidencia prospectiva.

## Calidad del histórico

- 389 sorteos del 6/oct/2025 al 8/nov/2026; 20 números únicos por resultado, sin duplicación de fechas o resultados completos. Sin huecos después de descontar los 10 días documentados sin sorteo.
- 334 resultados anteriores al 15/sep/2026 llegan hasta 80; solo 55 del período posterior presentan el régimen de 84. **No mezclar ambos períodos con la misma referencia aleatoria.** El corte es primera aparición observada, no confirmación oficial de cambio de reglas.
- Fuentes locales: Enlotería 365, Medios 23, Diario Libre 1. El enlace oficial consultado, https://www.leidsa.com/play/draw/leidsa-kinotv, no expuso texto verificable en esta auditoría. Universo y premios se tratan como reglas codificadas pendientes de corroboración oficial.
- 34 snapshots válidos: 33 con resultado congelado y uno pendiente del 9/nov. Cero discrepancias entre resultados congelados e histórico actual; muestras declaradas consistentes y `analysisTo < targetDate`.
- El 27/oct es retrospectivo explícito, aunque `generatedAt` aparente ser previo: manda `simulation.reconstructedAt`. Falta cartera del 21/oct; no inventarla ni contabilizarla como apuesta perdida.
- Falta `fetchedAt`, versionado de correcciones y estado de verificación del resultado. `generatedAt` y fecha de referencia por sí solos no demuestran publicación anterior al sorteo. La migración Git de snapshots tampoco demuestra su creación original.

Riesgos de ingeniería: `remote-super-kino.ts` prioriza una fuente sin guardar discrepancias; el updater reemplaza resultados mientras el importador solo agrega fechas ausentes. Recomendamos un registro de conflictos/versiones antes de cualquier corrección, sin alterar premios congelados.

## Rendimiento de carteras guardadas

No equivale a apuestas efectivamente compradas. El costo se valora a RD$25 por jugada según el código; no está congelado como costo histórico en cada snapshot ni se verificó externamente para todo el período.

| Población | Carteras | Jugadas | Premio congelado | Costo teórico | Neto teórico |
| --- | ---: | ---: | ---: | ---: | ---: |
| No marcadas retrospectivas, 6/oct–8/nov | 32 | 4,700 | RD$52,620 | RD$117,500 | -RD$64,880 |
| V13.3, 2–8/nov | 7 | 1,400 | RD$12,720 | RD$35,000 | -RD$22,280 |

No se afirma trazabilidad prospectiva completa de todas las carteras solo por sus marcas temporales. La retrospectiva del 27/oct queda fuera de estas filas.

V13.3: media 2.3771 aciertos/jugada; mejor jugada de 5 aciertos una fecha y de 6 en seis fechas. Ningún 7–10. Distribución de aciertos 0–10: `[75,266,435,380,180,52,12,0,0,0,0]`. Cada número participa 23–24 veces por cartera; coincidencia media entre pares 1.1465, máxima 6. Este equilibrio casi fija el total de aciertos de la cartera; mejorar su media no es lo mismo que concentrar aciertos altos en alguna jugada.

## Experimento A: elegir una jugada de 10

Solo régimen desde 15/sep; calentamiento de 30 sorteos, evaluación caminante de 25 fechas del 15/oct al 8/nov. Cada selección usa exclusivamente resultados anteriores a su fecha. Semilla 20261108. Empates reproducibles. Candidatas simples exploratorias, sin ajuste posterior para declarar ganadora.

| Selección | Media de aciertos |
| --- | ---: |
| Frecuencia acumulada previa | 2.52 |
| Frecuencia últimos 10 sorteos | 2.56 |
| Frecuencia últimos 30 sorteos | 2.20 |
| Mezcla 80% acumulada / 20% reciente | 2.28 |
| Aleatoria, esperanza matemática | 2.3810 |

En 1,000 réplicas aleatorias para esas mismas fechas, el intervalo central del 95% de las medias fue 1.88–2.92. No es un intervalo de confianza de ventaja predictiva. Las candidatas están dentro de esa variación; 25 fechas y varias comparaciones no permiten seleccionar una ganadora. La partición 17/8 que imprime el script es descriptiva, no un holdout confirmatorio. Una corrida inicial con 389 sorteos fue invalidada por mezclar regímenes 80/84 y no se usa como evidencia.

## Experimento B: cartera completa, 200 × 10

Una cartera V13.3 guardada del 2/nov frente a una cartera uniforme de 200 jugadas, sobre los mismos 20,000 sorteos sintéticos independientes de la construcción. Semilla 20261108. **Solo una cartera por modo**: mide esos diseños fijos, no la variabilidad entre fechas/semillas del generador. No es rendimiento histórico ni predicción.

| Métrica | V13.3 | Uniforme |
| --- | ---: | ---: |
| Media aciertos por jugada | 2.3810 | 2.3817 |
| Cartera con alguna jugada 7+ | 22.520% | 22.475% |
| Cartera con alguna jugada 8+ | 1.840% | 1.910% |
| Cartera con alguna jugada 9+ | 0.070% | 0.095% |

No hay ventaja clara. Los eventos 9–10 son escasos: 0 frente a 1 evento de 10 en esta simulación no permite concluir que una estrategia sea mejor, ni comparar retorno con estabilidad. No se presentan las medias de premios sintéticos como estimaciones fiables: un solo premio mayor las domina.

## Referencia matemática y límites

Bajo sorteo uniforme independiente 84/20 y selección de 10:

`P(H=k) = C(20,k) C(64,10-k) / C(84,10)`.

Media 2.38095; probabilidad de 10 ≈ 1 entre 14,944,174 por jugada. Con 200 jugadas, el límite superior por unión para 8+ es 1.9188% por cartera, **no la probabilidad exacta**. Ninguna frecuencia histórica cambia estas probabilidades bajo ese supuesto. La dependencia entre jugadas puede cambiar la distribución del máximo de la cartera, no la probabilidad marginal de una jugada fija.

El optimizador usa 2,000 escenarios de ajuste y utilidad del máximo 7+, no el premio total. En 2,000 × 200 jugadas, bajo el modelo uniforme se esperan apenas 1.584 jugadas de 9+ y 0.0268 de 10 antes de optimizar: muy poca información para estabilizar esa cola. Optimizar y evaluar en los mismos escenarios sobreajusta; las pruebas deben ser independientes.

## Problemas concretos del evaluador vigente

1. `scripts/evaluate-super-kino-v13.ts`: `v133` usa 150/50 por defecto, distinto del 160/40 de producción; `v133_160` coincide en proporción pero mantiene implementación y semillas separadas.
2. El modo `final` omite el baseline uniforme. `roi` representa devolución bruta, no ROI neto.
3. `lib/super-kino-v133.ts`: un desempate mediante `sort` con `random()-.5` no es un comparador transitivo; conviene asignar prioridades aleatorias una sola vez. Cambiarlo alteraría carteras futuras y requiere versionar el algoritmo, no reparar snapshots cerrados.

## Siguiente fase recomendada, todavía no activada

1. Corroborar reglas/fecha de régimen y congelar dataset versionado con procedencia, conflictos y fecha de disponibilidad.
2. Unificar evaluador para invocar exactamente el generador operativo; baseline uniforme y cobertura equilibrada sin optimizador. Comparar 160/40, 180/20 y 200/0 como variantes explícitas, no reemplazos de V13.3.
3. Fijar objetivos separados: media/aciertos de una única jugada elegida previamente, y probabilidad de alguna jugada 7+/8+ por cartera al mismo costo. No elegir retrospectivamente la mejor jugada y presentarla como selección previa.
4. Escenarios de ajuste/validación/prueba con semillas separadas; varios diseños por variante, intervalos pareados por sorteo y sensibilidad al presupuesto. No optimizar por premio máximo aislado. Registrar el plan antes de revisar la prueba final.
5. Evaluación prospectiva en sombra, guardada antes del cierre, sin comprar más jugadas ni alterar carteras existentes. Decidir cantidad de sorteos según efecto mínimo/potencia; no prometer detectar mejoras de 9–10 con unas pocas semanas.

## Reproducción

Desde la raíz del proyecto, sobre el corte de datos indicado:

```sh
node --experimental-strip-types scripts/audit-kino-baseline.ts
node scripts/audit-kino-walkforward.cjs
node scripts/audit-kino-portfolio.cjs
node --test --experimental-strip-types --test-name-pattern='archive dates|parser rejects|full year' tests/super-kino.test.ts
npm run typecheck
```

Los tres scripts solo leen archivos y escriben resultados a stdout. No llaman endpoints ni regeneran carteras. Si cambia el dataset, las cifras históricas pueden variar: conservar el corte antes de comparar ejecuciones.
