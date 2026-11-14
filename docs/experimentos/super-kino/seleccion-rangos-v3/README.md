# Super Kino: sesión guiada y selección por rangos V3

Archivado el 14 de noviembre de 2026. Estado: cerrado sin adopción. Los bloques siguientes conservan informes originales; sus comandos y rutas son referencias históricas retiradas, no instrucciones ejecutables disponibles. Los resultados son simulados y no prueban rentabilidad futura.

---

## Fuente histórica: `experiments/super-kino/guided-v1/PROTOCOL.md`

# Retrospectiva guiada por el usuario, v1

Inicio solicitado: 2026-09-15, primer sorteo del tramo observado de 84 números. No se usa información del propio sorteo ni posterior para seleccionar los 20. Es una sesión interactiva descriptiva: el histórico ha estado accesible y no se afirma que sea un ensayo ciego.

1. Proponer y guardar 20 números, fecha, semilla, versión, cantidad y hash del historial previo. No mostrar todavía el ganador.
2. El usuario elige exactamente 10 de esos 20. No se eligen ni evalúan por él.
3. Guardar su selección y construir 200 jugadas únicas: la original, las 100 sustituciones de un número y 99 sustituciones de dos números, equilibradas reproduciblemente. Cada jugada conserva al menos 8 de los 10 del usuario; todas usan el mismo pool de 20.
4. Guardar la cartera antes de consultar el ganador para calcular premios. Costo modelado RD$25 por jugada, RD$5,000 por cartera, con la tabla de premios actual del código para todas las fechas. Son premios simulados, no dinero cobrado.
5. Guardar resultado inmutable por fecha: ganador, aciertos del pool, aciertos de los 10 originales, histograma de la cartera, premios, costo y balance acumulado. No regenerar una fecha terminada. Continuar con los 20 del siguiente sorteo.

## Calentamiento y selección

La primera fecha no tiene historial previo en el régimen de 84: selección neutral por semilla de fecha, sin usar ganadores. De 1 a 29 observaciones previas: puntuar frecuencias de todo el pasado, últimos20 y últimos8 con pesos0.5/0.3/0.2 y contracción de30 observaciones hacia20/84. Entre2,048 candidatos uniformes por fecha se elige el mejor admisible; no se retocan reglas según el resultado.

En ese arranque, admisibilidad estructural fija, no predictiva: 8–12 pares, 8–12 números1–42, hasta4 por decena, hasta3 del1–9 y ninguna secuencia consecutiva de cuatro. La primera fecha toma el primer candidato admisible. Estas restricciones expresan la preferencia de distribución del usuario, sin demostrar ventaja probabilística.

A partir de30 previos se aplica la versión pool20-v1 documentada, con una semilla propia de esta sesión. No se introducen filtros nuevos según los premios observados. El resultado de la sesión describe tanto la propuesta de20 como la decisión humana de10 y el diseño concentrado de cartera; no debe atribuirse solo al predictor.

Los archivos quedan en experiments/, separados de carteras y premios operativos. Un reintento con la misma fecha y elección devuelve lo ya guardado; una elección diferente para una fecha cerrada se rechaza. No se avanza sin recibir los10 del usuario.


---

## Fuente histórica: `experiments/super-kino/guided-v1/sesion-01/SELECTION-REVIEW.md`

# Evaluación separada de los 20 y de los 10

Sorteos cerrados: 8. Media de aciertos dentro de los 20: 4.50. Referencia uniforme: 4.76. Muestra pequeña y retrospectiva: no demuestra ventaja predictiva.

| Fecha | Salieron de mis 20 | Total de20 | Salieron de tus10 | Total de10 | Mejor jugada | Premios RD$ | Neto RD$ |
|---|---|---:|---|---:|---:|---:|---:|
| 2026-09-15 | 04 · 27 · 43 · 56 · 67 · 84 | 6 | 04 · 27 · 56 · 67 | 4 | 6 | 1920 | -3080 |
| 2026-09-16 | 43 · 47 · 50 · 68 | 4 | 43 | 1 | 3 | 1040 | -3960 |
| 2026-09-17 | 12 · 34 · 50 · 55 · 58 · 59 · 72 | 7 | 34 · 50 · 58 · 72 | 4 | 6 | 2880 | -2120 |
| 2026-09-18 | 12 · 21 · 55 · 74 | 4 | 55 · 74 | 2 | 3 | 160 | -4840 |
| 2026-09-19 | 45 | 1 | 45 | 1 | 1 | 2400 | -2600 |
| 2026-09-20 | 12 · 17 · 46 | 3 | 12 · 46 | 2 | 3 | 160 | -4840 |
| 2026-09-21 | 03 · 16 · 46 · 49 · 64 | 5 | 03 · 16 · 46 · 49 | 4 | 5 | 840 | -4160 |
| 2026-09-22 | 33 · 45 · 47 · 61 · 69 · 74 | 6 | 33 | 1 | 3 | 640 | -4360 |

La cartera puede amplificar la concentración de los 10, pero no puede añadir ganadores ausentes del grupo de20. Los premios son simulados con la tabla del protocolo. No se cambian resultados cerrados ni se consulta/publica el ganador de la fecha pendiente.


---

## Fuente histórica: `experiments/super-kino/guided-v1/sesion-01/REPORTING.md`

# Instrucción de seguimiento de la sesión

El usuario pidió evaluar explícitamente la calidad de los 20 propuestos por el asistente, no atribuir el resultado solo a sus 10.

Después de cada `choose`, ejecutar:

`node --experimental-strip-types scripts/report-kino-guided.ts sesion-01`

En la respuesta incluir siempre:

- De los 20 propuestos: lista exacta de los que salieron y cantidad /20.
- De los 10 del usuario: lista exacta de aciertos y cantidad /10.
- Mejor jugada, desglose de premios, costo, balance del día y acumulado, todos simulados.
- Selector de clics para la siguiente fecha, sin revelar su ganador.

Se guardaron `selection-review.json` y `SELECTION-REVIEW.md`, que recuentan solo fechas cerradas sin alterar sus resultados originales.

## Revisión de selección al cierre del 22 de septiembre

Ocho sorteos cerrados: aciertos de los pools = 6,4,7,4,1,3,5,6; media4.50, referencia uniforme4.76. El 19/09 solo el45 estaba en el pool: fue una mala cobertura inicial, independientemente de los10 que eligió el usuario. El22/09 el pool contenía33,45,47,61,69,74; de los10 humanos salió33.

Revisión del código: durante el arranque (1–29 previos), la regla maximiza frecuencias multiventana dentro de candidatos equilibrados; no identifica patrones predictivos demostrados. La contracción común hacia20/84 reduce las diferencias numéricas, pero no elimina la clasificación por frecuencias al maximizar sobre candidatos. Con pocos sorteos existe riesgo de sobreajuste a la muestra inicial. Las restricciones de forma no prueban poder predictivo.

El pool del23/09 ya fue comunicado y sigue congelado. No ajustar retrospectivamente pesos, semillas ni filtros con sus ganadores. Cualquier nueva regla debe tener versión y fecha de inicio propias, comparación sin fuga temporal y evidencia antes de atribuirle mejora. No se activó una versión nueva en esta revisión ni se tocaron carteras operativas.

## Preferencia adicional: dominancia por rangos

El usuario pidió que el asistente decida qué rango debe dominar los20. Se creó una pauta separada `kino-range-dominance-v2`, todavía de planificación, sin alterar la propuesta ya presentada del23/09. El plan previo usa solo las8 fechas cerradas hasta22/09: `range-plans/2026-09-23.json`.

Se comparan tres rangos de igual ancho28 (01–28,29–56,57–84), evitando comparar sumas brutas de rangos de tamaños distintos. Puntuar frecuencia media con ventanas todo el pasado/últimos20/últimos5, pesos0.5/0.3/0.2 y contracción30 hacia el modelo uniforme. Pauta propuesta con al menos5 previos:8 números del rango primero,7 del segundo y5 del tercero. El liderazgo se recalcula antes de cada fecha, nunca con su ganador. No se afirma ventaja predictiva por tener un rango dominante.

Con información hasta22/09, domina29–56; segundo01–28; tercero57–84. Medias observadas8.25,6.75,5.00. El pool vigente del23/09 ya contiene9 del29–56,5 del01–28 y6 del57–84: no se cambia después de mostrarlo. Antes de aplicar la nueva pauta a una propuesta futura debe identificarse expresamente la versión, fijar sus20 y conservar la trazabilidad del método anterior. No presentar la nueva pauta como si hubiera generado las propuestas históricas de v1.

Después de evaluar cada fecha, añadir la distribución real de los20 ganadores por estos tres rangos y compararla con la distribución propuesta. La distribución de la cartera dependerá además de los10 elegidos por el usuario; la cuota del pool no garantiza una cuota igual en cada jugada.

## Revisión v3 solicitada antes de elegir los10 del23/09

Después del plan v2, el usuario pidió opciones explícitas del1–9. Se reserva exactamente3 dentro del pool de20 (no obliga a elegirlas en los10). Se aplica la dominancia de tres rangos de28 con cuotas8/7/5; el rango01–28 contiene esas3 más los restantes de10–28. Paridad8–12, máximo4 por decena y sin secuencias de4 son preferencias de forma, no predicción demostrada.

Se revisó la propuesta pendiente del23/09 ANTES de recibir sus10 y SIN consultar su ganador. La anterior quedó en `rounds/2026-09-23-proposal-before-ranges-v3.json`. La vigente es `rounds/2026-09-23-proposal.json`, versión `kino-guided-ranges-v3`, semilla propia y hash de código separado. Solo usa las8 fechas cerradas hasta22/09. No se alteraron resultados cerrados ni carteras operativas.

Para continuar:
1. Ejecutar `scripts/kino-guided.ts choose` para la fecha y10 elegidos. El constructor de las200 jugadas se mantiene en v1 y lee el pool vigente; el hash original del constructor no cambió.
2. Ejecutar `scripts/report-kino-guided.ts sesion-01` e informar los aciertos exactos de los20, de los10 y por rango, además de premios y acumulado.
3. ANTES de comunicar los20 de la siguiente fecha, ejecutar `node --experimental-strip-types scripts/propose-kino-guided-ranges.ts sesion-01 --revise-pending`. Archiva la propuesta v1 creada automáticamente y aún no mostrada, y fija la v3 con las nuevas cuotas. Si ya está en v3, comprueba que no cambió y la devuelve sin reescribirla. Rechaza fechas con elección/cartera/resultado.
4. Mostrar únicamente el selector de la propuesta vigente v3, separado por1–9,10–28,29–56,57–84, con la etiqueta de rango dominante correspondiente. Conservar los selectores antiguos para trazabilidad; no usarlos para elegir una fecha revisada.

Esta v3 no ha demostrado mejora de aciertos. Es una nueva hipótesis de distribución solicitada por el usuario y debe compararse separadamente de v1.


---

## Fuente histórica: `experiments/super-kino/selection-benchmark-v1/PROTOCOL.md`

# Banco de precisión de 20 números, v1

Solicitud: evaluar desde el primer sorteo observado de84 números y repetir experimentos para aprender. Perfiles aplicados: ciencia de datos, matemática aplicada, análisis de datos y QA. Se mantiene la sesión guiada sesion-01 sin avanzar ni cambiar sus elecciones.

## Reglas fijadas antes de la ejecución

- Historial desde2026-09-15 hasta2026-11-11, inclusive. Una propuesta de20 distintos para cada fecha, sin calentamiento obligatorio: la referencia aleatoria admite la primera fecha y la candidata usa un arranque neutral.
- Candidata fija: kino-guided-ranges-v3 tal como está guardada, sin tocar sus pesos, filtros, cuotas ni semillas después de conocer este resultado. Reproducida incluso en fechas anteriores a su creación, sin afirmar emisión histórica.
- Referencia principal:20 uniformes de1..84, sin restricciones de rangos, paridad o consecutivos.1,000 semillas prefijadas0..999, independientes por fecha. La semilla0 es la corrida mostrada fecha por fecha: no se elige la más exitosa.
- Control secundario:20 aleatorios con las mismas cuotas dinámicas de v3,3 opciones1–9, paridad8–12, máximo4 por decena y sin secuencia de4; primer candidato admisible, SIN maximizar frecuencias individuales.1,000 semillas0..999. Permite distinguir el ranking individual de las restricciones de distribución.
- En la candidata y el control por rangos, las cuotas se calculan únicamente con sorteos anteriores a la fecha evaluada. Los ganadores del propio sorteo y futuros no entran en ninguna selección o ajuste.

## Métricas y particiones

Primaria: promedio de coincidencias dentro del pool de20. Precisión@20=coincidencias/20; no es probabilidad de premio. Secundarias: mediana, mínimo, máximo, distribución0..20, tasas7+/8+/10+ y coincidencias por rango. No se fabrican premios de una selección de20 ni se confunde con una jugada de10.

Referencia analítica uniforme: distribución hipergeométrica N84,K20,n20; media400/84=4.7619. Se compara la distribución de medias de las1,000 semillas, sin elegir semillas ganadoras. La frecuencia de corridas aleatorias que igualan o superan a la candidata se informa descriptivamente, no como prueba definitiva de predicción.

Particiones temporales previamente fijadas: primeros20 sorteos calibración descriptiva, siguientes20 desarrollo descriptivo, restantes prueba temporal descriptiva. El histórico completo ya ha estado disponible durante otras investigaciones: NO es una reserva virgen. Reajustar sobre él no convierte la retrospectiva en confirmación independiente.

Comparación candidata menos media del control por fecha: bootstrap pareado por bloques circulares de7 sorteos,2,000 réplicas, semilla20261112. Intervalos exploratorios para datos dependientes, no garantía de generalización. Umbral exploratorio de interés: al menos+0.5 coincidencias por sorteo y límite inferior del IC95% mayor que0 frente a ambas referencias. No activar estrategias automáticamente aunque pase.

## Presupuesto y política de iteración

Una candidata congelada, dos controles con1,000 semillas cada uno y una pasada completa. Cada variante nueva debe tener versión, justificación, hipótesis, parámetros y costo registrados ANTES de evaluarla. No se retocan parámetros de esta versión ni se busca una semilla ganadora después de mirar aciertos. El runner rechaza sobrescribir un run-id.

Tras esta comparación, congelar una propuesta de la candidata para el próximo sorteo abierto, con fecha/hora, hash de datos y números anteriores al resultado, fuera de data/. La confirmación requiere sorteos nuevos no usados para ajustar; objetivo inicial30 sorteos prospectivos con reglas estables. Si se cambia la regla, empieza otra serie identificada. Repetir los mismos sorteos no añade evidencia independiente.

Guardar protocolo, hashes, histórico, métricas por cada semilla, CSV con los20 y sus coincidencias de cada fecha para la corrida0 y la candidata, auditoría y resumen legible. No modificar datos operativos, carteras cerradas o algoritmos de la aplicación.


---

## Fuente histórica: `experiments/super-kino/selection-benchmark-v1/baseline-2026-11-12/SUMMARY.md`

# Prueba de precisión:20 números por fecha desde15/09

Corte: 2026-11-11. 58 sorteos, 1000 semillas por control. Candidata congelada: kino-guided-ranges-v3. No hay jugadas de10, costos ni premios en esta comparación: se mide la selección de20.

## Comparación principal

| Método | Media de coincidencias | Precisión@20 | Sorteos con7+ |
|---|---:|---:|---:|
| Aleatorio uniforme, media de1000 semillas | 4.762 | 23.81% | 14.69% |
| Aleatorio con las mismas cuotas y filtros | 4.785 | 23.92% | 15.28% |
| Selección v3 por rangos y frecuencias | 5.000 | 25.00% | 20.69% |

Referencia matemática: 4.7619 coincidencias. En las1000 corridas uniformes, el95% central de medias estuvo entre 4.345 y 5.173; no es un intervalo de confianza del predictor.
La corrida uniforme0, fijada antes de mirar resultados, obtuvo media 4.931, mínimo 2, máximo 9. Se muestran sus20 elegidos en cada fecha abajo. No se escogió la semilla más exitosa.
El 14.7% de las corridas uniformes y el 17.7% de los controles por rangos igualaron o superaron la media de v3. Cifra descriptiva, no prueba definitiva de capacidad predictiva.

## Particiones y diferencias

| Período | v3 | Uniforme | Control por rangos | Diferencia v3−uniforme e IC95% |
|---|---:|---:|---:|---|
| Todos los sorteos | 5.000 | 4.762 | 4.785 | 0.238 [-0.115, 0.583] |
| Primeros20 | 4.900 | 4.760 | 4.722 | 0.140 [-0.621, 1.053] |
| Siguientes20 | 4.950 | 4.767 | 4.799 | 0.183 [-0.218, 0.533] |
| Últimos18 (temporal, ya conocido) | 5.167 | 4.758 | 4.839 | 0.409 [-0.310, 1.021] |

Intervalos exploratorios mediante bloques pareados de7 sorteos,2000 réplicas. El histórico ya fue observado: las particiones NO aportan una prueba final nunca vista. La regla v3 se reconstruye antes de su creación sin presentarla como una emisión real.

## Aleatorio uniforme:20 elegidos y aciertos por fecha (semilla0)

| Fecha |20 elegidos | Coincidieron | Total |
|---|---|---|---:|
| 2026-09-15 | 02 · 04 · 08 · 09 · 17 · 21 · 22 · 28 · 29 · 30 · 32 · 36 · 39 · 42 · 43 · 46 · 55 · 71 · 78 · 84 | 04 · 09 · 17 · 29 · 30 · 36 · 43 · 84 | 8 |
| 2026-09-16 | 06 · 13 · 14 · 19 · 28 · 35 · 36 · 39 · 41 · 42 · 46 · 49 · 58 · 61 · 62 · 72 · 78 · 79 · 82 · 83 | 13 · 42 | 2 |
| 2026-09-17 | 02 · 09 · 11 · 13 · 15 · 16 · 20 · 35 · 42 · 45 · 46 · 47 · 51 · 52 · 58 · 62 · 72 · 77 · 78 · 83 | 45 · 46 · 58 · 72 | 4 |
| 2026-09-18 | 15 · 17 · 20 · 23 · 29 · 30 · 34 · 35 · 39 · 40 · 42 · 55 · 57 · 59 · 64 · 66 · 69 · 74 · 77 · 82 | 20 · 35 · 42 · 55 · 64 · 74 | 6 |
| 2026-09-19 | 03 · 05 · 09 · 16 · 18 · 26 · 32 · 36 · 37 · 40 · 46 · 54 · 56 · 61 · 62 · 69 · 73 · 79 · 82 · 84 | 09 · 37 · 61 · 73 | 4 |
| 2026-09-20 | 01 · 06 · 16 · 22 · 25 · 27 · 28 · 31 · 37 · 43 · 50 · 54 · 55 · 58 · 62 · 64 · 65 · 70 · 78 · 82 | 01 · 27 · 54 · 55 · 62 · 65 · 78 · 82 | 8 |
| 2026-09-21 | 08 · 10 · 12 · 16 · 24 · 25 · 27 · 36 · 37 · 38 · 39 · 44 · 47 · 51 · 58 · 59 · 64 · 70 · 73 · 78 | 16 · 24 · 36 · 64 | 4 |
| 2026-09-22 | 02 · 05 · 11 · 14 · 18 · 25 · 26 · 30 · 32 · 35 · 40 · 41 · 53 · 60 · 63 · 70 · 73 · 76 · 82 · 84 | 05 · 40 · 84 | 3 |
| 2026-09-23 | 01 · 06 · 08 · 20 · 26 · 27 · 31 · 32 · 33 · 35 · 53 · 59 · 61 · 63 · 66 · 67 · 68 · 78 · 79 · 80 | 01 · 53 · 63 · 66 · 67 · 78 | 6 |
| 2026-09-24 | 02 · 07 · 10 · 15 · 18 · 19 · 21 · 22 · 30 · 31 · 33 · 34 · 37 · 45 · 50 · 67 · 73 · 79 · 80 · 81 | 19 · 31 · 37 | 3 |
| 2026-09-25 | 21 · 22 · 23 · 30 · 32 · 37 · 38 · 43 · 45 · 46 · 47 · 48 · 49 · 56 · 68 · 70 · 73 · 79 · 80 · 84 | 30 · 38 · 43 · 84 | 4 |
| 2026-09-26 | 13 · 21 · 22 · 26 · 32 · 37 · 38 · 42 · 45 · 48 · 49 · 56 · 58 · 63 · 67 · 69 · 71 · 74 · 81 · 84 | 13 · 21 · 22 · 26 · 32 · 58 · 69 · 71 | 8 |
| 2026-09-27 | 03 · 04 · 12 · 17 · 18 · 20 · 26 · 31 · 36 · 39 · 41 · 44 · 48 · 49 · 55 · 60 · 63 · 68 · 82 · 83 | 18 · 31 · 41 · 55 | 4 |
| 2026-09-28 | 03 · 10 · 12 · 14 · 16 · 20 · 25 · 26 · 27 · 29 · 38 · 41 · 42 · 50 · 56 · 67 · 70 · 73 · 75 · 82 | 16 · 25 · 27 · 41 · 56 · 70 · 75 | 7 |
| 2026-09-29 | 07 · 10 · 12 · 13 · 18 · 32 · 34 · 35 · 36 · 41 · 44 · 50 · 60 · 62 · 64 · 65 · 69 · 70 · 73 · 82 | 36 · 41 · 64 | 3 |
| 2026-09-30 | 10 · 11 · 12 · 22 · 23 · 29 · 34 · 38 · 45 · 51 · 52 · 54 · 55 · 59 · 62 · 64 · 66 · 67 · 71 · 76 | 12 · 38 · 51 · 59 · 62 · 64 | 6 |
| 2026-10-01 | 01 · 12 · 13 · 14 · 16 · 17 · 18 · 20 · 23 · 26 · 27 · 29 · 31 · 34 · 41 · 63 · 69 · 72 · 74 · 77 | 72 · 74 | 2 |
| 2026-10-02 | 02 · 03 · 04 · 05 · 07 · 12 · 15 · 21 · 25 · 27 · 30 · 33 · 34 · 35 · 40 · 48 · 50 · 54 · 61 · 64 | 03 · 05 · 40 | 3 |
| 2026-10-03 | 01 · 03 · 05 · 06 · 09 · 11 · 16 · 17 · 18 · 26 · 34 · 36 · 40 · 47 · 50 · 53 · 56 · 65 · 82 · 84 | 05 · 17 · 53 · 56 · 65 · 84 | 6 |
| 2026-10-04 | 04 · 05 · 09 · 12 · 16 · 23 · 26 · 29 · 31 · 32 · 33 · 34 · 39 · 45 · 46 · 59 · 61 · 62 · 77 · 83 | 09 · 23 · 32 · 46 | 4 |
| 2026-10-05 | 04 · 06 · 11 · 13 · 17 · 20 · 21 · 26 · 37 · 40 · 50 · 54 · 55 · 57 · 60 · 70 · 72 · 77 · 78 · 80 | 21 · 37 · 50 | 3 |
| 2026-10-06 | 06 · 09 · 14 · 17 · 18 · 19 · 25 · 30 · 40 · 42 · 46 · 56 · 57 · 59 · 61 · 68 · 69 · 71 · 72 · 77 | 17 · 40 · 46 · 57 · 69 | 5 |
| 2026-10-07 | 04 · 08 · 11 · 12 · 21 · 22 · 25 · 30 · 34 · 37 · 40 · 55 · 56 · 60 · 64 · 65 · 70 · 71 · 73 · 82 | 11 · 12 · 25 · 64 · 65 · 71 · 82 | 7 |
| 2026-10-08 | 03 · 06 · 15 · 18 · 20 · 27 · 28 · 33 · 42 · 44 · 50 · 53 · 54 · 55 · 59 · 62 · 67 · 74 · 76 · 77 | 06 · 27 · 28 · 44 · 77 | 5 |
| 2026-10-09 | 01 · 10 · 15 · 17 · 20 · 21 · 23 · 29 · 36 · 38 · 40 · 45 · 46 · 54 · 63 · 69 · 78 · 79 · 80 · 84 | 15 · 23 · 45 · 46 · 79 · 80 | 6 |
| 2026-10-10 | 02 · 04 · 08 · 10 · 14 · 22 · 24 · 29 · 42 · 43 · 50 · 52 · 60 · 67 · 69 · 70 · 75 · 78 · 79 · 80 | 10 · 75 | 2 |
| 2026-10-11 | 01 · 02 · 06 · 11 · 14 · 28 · 30 · 38 · 40 · 45 · 49 · 51 · 53 · 56 · 59 · 71 · 72 · 78 · 82 · 84 | 02 · 28 · 53 · 82 · 84 | 5 |
| 2026-10-12 | 04 · 08 · 12 · 14 · 15 · 21 · 24 · 26 · 30 · 31 · 37 · 41 · 50 · 52 · 61 · 62 · 63 · 78 · 81 · 82 | 04 · 24 · 41 · 52 · 78 | 5 |
| 2026-10-13 | 01 · 03 · 07 · 09 · 10 · 11 · 13 · 14 · 21 · 27 · 29 · 30 · 45 · 56 · 58 · 59 · 76 · 79 · 80 · 83 | 10 · 27 · 59 · 80 | 4 |
| 2026-10-14 | 08 · 19 · 24 · 25 · 27 · 28 · 29 · 30 · 31 · 35 · 36 · 49 · 50 · 61 · 65 · 70 · 72 · 79 · 80 · 81 | 28 · 31 · 36 · 70 · 72 · 80 · 81 | 7 |
| 2026-10-15 | 03 · 05 · 06 · 10 · 14 · 17 · 31 · 33 · 35 · 38 · 42 · 43 · 46 · 58 · 63 · 67 · 72 · 74 · 75 · 78 | 33 · 35 · 42 · 46 · 75 | 5 |
| 2026-10-16 | 01 · 03 · 04 · 07 · 17 · 21 · 24 · 33 · 39 · 40 · 42 · 46 · 51 · 53 · 59 · 69 · 73 · 79 · 80 · 81 | 07 · 17 · 33 · 40 · 46 · 51 · 69 · 73 | 8 |
| 2026-10-17 | 09 · 10 · 11 · 12 · 13 · 24 · 25 · 26 · 27 · 28 · 29 · 32 · 47 · 48 · 52 · 56 · 59 · 61 · 67 · 68 | 11 · 25 · 26 · 47 | 4 |
| 2026-10-18 | 01 · 04 · 10 · 11 · 12 · 13 · 16 · 27 · 34 · 36 · 42 · 44 · 53 · 55 · 56 · 59 · 67 · 76 · 79 · 82 | 01 · 12 · 44 · 67 | 4 |
| 2026-10-19 | 01 · 07 · 09 · 10 · 11 · 16 · 19 · 23 · 30 · 34 · 35 · 36 · 39 · 45 · 46 · 52 · 61 · 62 · 83 · 84 | 07 · 52 · 62 | 3 |
| 2026-10-20 | 11 · 14 · 16 · 22 · 24 · 29 · 32 · 35 · 37 · 38 · 42 · 44 · 46 · 48 · 51 · 54 · 58 · 67 · 71 · 79 | 14 · 29 · 38 · 44 · 46 · 48 · 67 | 7 |
| 2026-10-21 | 08 · 10 · 20 · 23 · 29 · 38 · 44 · 45 · 54 · 57 · 58 · 64 · 65 · 66 · 68 · 70 · 72 · 74 · 77 · 81 | 10 · 29 · 57 · 77 | 4 |
| 2026-10-22 | 01 · 03 · 13 · 15 · 18 · 19 · 38 · 44 · 49 · 51 · 52 · 54 · 57 · 63 · 66 · 68 · 69 · 74 · 76 · 84 | 01 · 18 · 57 · 63 · 68 · 76 | 6 |
| 2026-10-23 | 04 · 07 · 14 · 17 · 22 · 26 · 27 · 32 · 39 · 40 · 48 · 55 · 56 · 57 · 62 · 70 · 74 · 77 · 78 · 83 | 07 · 22 · 26 · 39 · 40 · 55 · 70 · 74 · 77 | 9 |
| 2026-10-24 | 13 · 18 · 23 · 24 · 30 · 31 · 35 · 38 · 48 · 49 · 50 · 56 · 57 · 58 · 60 · 62 · 65 · 74 · 77 · 78 | 13 · 50 | 2 |
| 2026-10-25 | 05 · 06 · 09 · 11 · 22 · 23 · 27 · 32 · 34 · 35 · 39 · 48 · 57 · 61 · 63 · 67 · 70 · 74 · 82 · 83 | 35 · 39 · 48 | 3 |
| 2026-10-26 | 19 · 21 · 25 · 26 · 28 · 31 · 33 · 36 · 37 · 42 · 50 · 51 · 57 · 58 · 66 · 69 · 76 · 78 · 79 · 81 | 19 · 28 · 31 · 33 · 42 · 58 · 66 · 69 | 8 |
| 2026-10-27 | 01 · 06 · 11 · 20 · 25 · 28 · 31 · 34 · 38 · 39 · 40 · 44 · 46 · 48 · 51 · 55 · 58 · 70 · 71 · 80 | 25 · 31 · 44 | 3 |
| 2026-10-28 | 06 · 13 · 14 · 15 · 17 · 18 · 28 · 29 · 36 · 39 · 41 · 42 · 48 · 55 · 65 · 66 · 69 · 70 · 78 · 80 | 15 · 55 · 78 | 3 |
| 2026-10-29 | 02 · 14 · 15 · 16 · 19 · 25 · 28 · 35 · 36 · 38 · 46 · 47 · 50 · 56 · 60 · 69 · 70 · 74 · 76 · 80 | 02 · 15 · 16 · 19 · 25 · 28 · 56 | 7 |
| 2026-10-30 | 01 · 11 · 16 · 17 · 22 · 30 · 32 · 37 · 40 · 41 · 45 · 54 · 55 · 59 · 60 · 62 · 66 · 70 · 74 · 81 | 01 · 16 · 74 · 81 | 4 |
| 2026-10-31 | 04 · 08 · 13 · 16 · 20 · 26 · 27 · 30 · 31 · 36 · 44 · 46 · 49 · 50 · 54 · 55 · 61 · 76 · 78 · 80 | 08 · 20 · 26 · 36 · 61 · 76 · 78 · 80 | 8 |
| 2026-11-01 | 04 · 10 · 11 · 13 · 14 · 20 · 24 · 32 · 35 · 39 · 40 · 42 · 54 · 62 · 63 · 71 · 75 · 77 · 83 · 84 | 04 · 10 · 11 · 20 · 71 · 77 | 6 |
| 2026-11-02 | 01 · 12 · 16 · 17 · 24 · 28 · 30 · 33 · 35 · 38 · 39 · 44 · 49 · 50 · 58 · 63 · 70 · 74 · 75 · 76 | 01 · 16 | 2 |
| 2026-11-03 | 06 · 10 · 11 · 18 · 28 · 36 · 39 · 40 · 44 · 46 · 52 · 55 · 56 · 57 · 63 · 64 · 65 · 67 · 71 · 80 | 18 · 28 · 57 · 64 · 67 · 80 | 6 |
| 2026-11-04 | 03 · 06 · 07 · 08 · 11 · 17 · 26 · 34 · 39 · 40 · 41 · 43 · 46 · 47 · 49 · 50 · 52 · 62 · 70 · 76 | 03 · 07 · 39 · 40 · 41 · 49 | 6 |
| 2026-11-05 | 04 · 08 · 13 · 20 · 21 · 32 · 35 · 38 · 39 · 43 · 45 · 46 · 47 · 56 · 57 · 59 · 63 · 71 · 72 · 77 | 08 · 20 · 32 · 46 · 63 · 71 | 6 |
| 2026-11-06 | 01 · 02 · 03 · 07 · 08 · 09 · 10 · 34 · 37 · 39 · 46 · 47 · 48 · 50 · 51 · 59 · 65 · 66 · 72 · 82 | 01 · 03 · 07 · 50 · 51 · 82 | 6 |
| 2026-11-07 | 01 · 07 · 10 · 12 · 14 · 28 · 36 · 38 · 39 · 44 · 45 · 46 · 47 · 52 · 63 · 66 · 68 · 70 · 72 · 83 | 07 · 10 · 28 · 36 · 44 · 52 · 68 | 7 |
| 2026-11-08 | 02 · 07 · 17 · 25 · 31 · 39 · 41 · 43 · 50 · 52 · 54 · 57 · 60 · 62 · 63 · 69 · 72 · 73 · 75 · 80 | 02 · 07 · 39 · 69 | 4 |
| 2026-11-09 | 06 · 10 · 13 · 15 · 20 · 25 · 26 · 28 · 30 · 32 · 36 · 38 · 41 · 44 · 46 · 49 · 54 · 64 · 77 · 79 | 10 · 15 · 26 · 41 · 49 | 5 |
| 2026-11-10 | 03 · 04 · 07 · 10 · 12 · 13 · 16 · 18 · 25 · 33 · 37 · 38 · 44 · 53 · 64 · 74 · 76 · 77 · 78 · 81 | 04 · 76 | 2 |
| 2026-11-11 | 06 · 11 · 13 · 14 · 19 · 20 · 24 · 26 · 31 · 33 · 34 · 42 · 45 · 51 · 54 · 55 · 70 · 74 · 75 · 79 | 06 · 13 · 19 · 45 | 4 |

## Candidata v3:20 elegidos y aciertos por fecha

| Fecha |20 elegidos | Coincidieron | Total |
|---|---|---|---:|
| 2026-09-15 | 05 · 07 · 09 · 17 · 18 · 23 · 26 · 30 · 31 · 38 · 40 · 41 · 48 · 52 · 57 · 66 · 67 · 72 · 73 · 82 | 07 · 09 · 17 · 30 · 40 · 67 | 6 |
| 2026-09-16 | 04 · 05 · 09 · 12 · 23 · 24 · 27 · 34 · 36 · 39 · 42 · 43 · 47 · 50 · 62 · 67 · 69 · 73 · 74 · 75 | 05 · 27 · 42 · 43 · 47 · 50 · 69 · 74 | 8 |
| 2026-09-17 | 01 · 08 · 09 · 11 · 22 · 25 · 27 · 29 · 32 · 36 · 40 · 42 · 47 · 53 · 59 · 60 · 62 · 65 · 74 · 75 | 22 · 40 · 59 · 74 | 4 |
| 2026-09-18 | 04 · 06 · 07 · 11 · 13 · 16 · 17 · 29 · 40 · 43 · 50 · 52 · 53 · 55 · 59 · 62 · 68 · 69 · 75 · 82 | 04 · 06 · 11 · 55 | 4 |
| 2026-09-19 | 04 · 05 · 09 · 12 · 19 · 21 · 24 · 29 · 32 · 34 · 45 · 50 · 54 · 55 · 59 · 67 · 72 · 74 · 81 · 83 | 09 · 21 · 34 · 45 · 72 | 5 |
| 2026-09-20 | 02 · 07 · 09 · 11 · 12 · 22 · 24 · 30 · 33 · 35 · 36 · 47 · 50 · 55 · 56 · 60 · 63 · 73 · 74 · 84 | 12 · 24 · 55 · 56 · 63 | 5 |
| 2026-09-21 | 02 · 06 · 09 · 10 · 11 · 17 · 27 · 32 · 34 · 38 · 42 · 46 · 49 · 53 · 55 · 60 · 69 · 74 · 78 · 82 | 11 · 17 · 46 · 49 | 4 |
| 2026-09-22 | 01 · 04 · 09 · 12 · 21 · 23 · 27 · 30 · 33 · 36 · 37 · 38 · 41 · 49 · 56 · 64 · 66 · 74 · 79 · 83 | 12 · 27 · 33 · 49 · 64 · 74 | 6 |
| 2026-09-23 | 06 · 07 · 09 · 12 · 13 · 15 · 16 · 33 · 34 · 35 · 37 · 49 · 50 · 55 · 56 · 64 · 69 · 70 · 74 · 84 | 12 · 49 | 2 |
| 2026-09-24 | 01 · 05 · 09 · 12 · 13 · 17 · 20 · 29 · 35 · 40 · 43 · 46 · 49 · 52 · 55 · 58 · 64 · 66 · 72 · 78 | 09 · 12 · 43 · 64 | 4 |
| 2026-09-25 | 01 · 03 · 09 · 11 · 16 · 24 · 27 · 29 · 30 · 32 · 35 · 36 · 41 · 46 · 49 · 62 · 63 · 67 · 74 · 80 | 03 · 09 · 11 · 16 · 27 · 30 | 6 |
| 2026-09-26 | 01 · 05 · 06 · 12 · 16 · 21 · 27 · 29 · 31 · 33 · 34 · 42 · 43 · 44 · 50 · 65 · 69 · 79 · 82 · 84 | 21 · 31 · 69 | 3 |
| 2026-09-27 | 06 · 07 · 09 · 11 · 12 · 21 · 22 · 30 · 31 · 32 · 43 · 50 · 53 · 55 · 56 · 61 · 64 · 72 · 74 · 79 | 31 · 43 · 55 | 3 |
| 2026-09-28 | 02 · 03 · 09 · 12 · 17 · 23 · 27 · 29 · 31 · 35 · 41 · 44 · 46 · 54 · 55 · 59 · 62 · 64 · 67 · 72 | 02 · 17 · 27 · 41 · 46 · 59 · 64 | 7 |
| 2026-09-29 | 02 · 07 · 09 · 12 · 17 · 18 · 19 · 29 · 30 · 38 · 43 · 46 · 47 · 53 · 55 · 62 · 69 · 71 · 82 · 83 | 02 · 38 · 55 · 83 | 4 |
| 2026-09-30 | 01 · 04 · 07 · 12 · 16 · 19 · 27 · 30 · 33 · 36 · 42 · 43 · 47 · 49 · 56 · 59 · 61 · 63 · 68 · 71 | 12 · 19 · 43 · 59 | 4 |
| 2026-10-01 | 02 · 03 · 06 · 12 · 17 · 22 · 24 · 31 · 32 · 33 · 37 · 41 · 50 · 51 · 55 · 58 · 61 · 64 · 69 · 83 | 02 · 22 · 55 · 58 | 4 |
| 2026-10-02 | 02 · 04 · 08 · 12 · 16 · 19 · 21 · 29 · 33 · 35 · 43 · 46 · 47 · 49 · 54 · 58 · 64 · 72 · 75 · 77 | 19 · 49 | 2 |
| 2026-10-03 | 02 · 05 · 07 · 19 · 22 · 23 · 27 · 30 · 33 · 35 · 43 · 46 · 47 · 55 · 56 · 58 · 61 · 74 · 76 · 84 | 05 · 07 · 23 · 27 · 30 · 56 · 58 · 61 · 74 · 84 | 10 |
| 2026-10-04 | 02 · 05 · 09 · 12 · 13 · 14 · 18 · 24 · 31 · 42 · 45 · 49 · 51 · 54 · 55 · 59 · 71 · 74 · 79 · 84 | 09 · 42 · 49 · 51 · 71 · 74 · 84 | 7 |
| 2026-10-05 | 03 · 04 · 05 · 11 · 12 · 16 · 19 · 22 · 29 · 32 · 33 · 42 · 47 · 49 · 55 · 65 · 73 · 74 · 78 · 84 | 12 · 16 · 22 | 3 |
| 2026-10-06 | 03 · 04 · 05 · 12 · 17 · 24 · 25 · 27 · 29 · 36 · 39 · 41 · 45 · 49 · 54 · 61 · 64 · 71 · 74 · 84 | 17 · 27 | 2 |
| 2026-10-07 | 01 · 02 · 09 · 17 · 19 · 23 · 27 · 28 · 29 · 38 · 40 · 43 · 44 · 46 · 54 · 59 · 64 · 71 · 74 · 79 | 01 · 17 · 29 · 46 · 54 · 64 · 71 · 79 | 8 |
| 2026-10-08 | 02 · 08 · 09 · 11 · 17 · 19 · 22 · 25 · 30 · 31 · 39 · 42 · 46 · 49 · 53 · 58 · 59 · 61 · 64 · 69 | 30 · 39 · 46 · 64 · 69 | 5 |
| 2026-10-09 | 01 · 02 · 07 · 11 · 19 · 24 · 27 · 28 · 31 · 35 · 38 · 46 · 47 · 49 · 54 · 59 · 69 · 70 · 71 · 84 | 07 · 27 · 31 · 46 · 59 · 71 | 6 |
| 2026-10-10 | 02 · 03 · 04 · 12 · 13 · 15 · 25 · 27 · 32 · 33 · 38 · 39 · 46 · 47 · 54 · 59 · 69 · 71 · 81 · 84 | 12 · 33 · 39 · 59 · 84 | 5 |
| 2026-10-11 | 02 · 05 · 09 · 12 · 17 · 18 · 24 · 26 · 31 · 33 · 39 · 45 · 46 · 47 · 49 · 59 · 64 · 75 · 77 · 82 | 02 · 05 · 12 · 26 · 46 · 82 | 6 |
| 2026-10-12 | 03 · 05 · 08 · 11 · 12 · 13 · 19 · 27 · 31 · 39 · 42 · 45 · 46 · 51 · 55 · 58 · 62 · 64 · 71 · 84 | 19 | 1 |
| 2026-10-13 | 04 · 05 · 07 · 11 · 12 · 23 · 24 · 28 · 29 · 31 · 33 · 41 · 46 · 48 · 49 · 58 · 59 · 60 · 67 · 84 | 04 · 05 · 23 · 46 · 59 | 5 |
| 2026-10-14 | 05 · 07 · 09 · 17 · 20 · 22 · 24 · 27 · 31 · 38 · 42 · 44 · 46 · 52 · 54 · 59 · 71 · 73 · 80 · 84 | 07 · 31 · 42 · 46 · 52 · 80 | 6 |
| 2026-10-15 | 02 · 05 · 07 · 19 · 22 · 25 · 27 · 28 · 36 · 40 · 41 · 43 · 46 · 55 · 56 · 58 · 64 · 68 · 73 · 81 | 02 · 07 · 40 · 46 | 4 |
| 2026-10-16 | 02 · 05 · 07 · 12 · 22 · 24 · 27 · 30 · 31 · 34 · 40 · 41 · 46 · 47 · 55 · 62 · 64 · 68 · 71 · 82 | 07 · 40 · 41 · 46 · 55 · 64 | 6 |
| 2026-10-17 | 02 · 05 · 07 · 14 · 19 · 21 · 24 · 30 · 33 · 38 · 41 · 46 · 49 · 51 · 54 · 59 · 71 · 79 · 81 · 84 | 14 · 41 · 49 | 3 |
| 2026-10-18 | 02 · 04 · 06 · 12 · 22 · 24 · 25 · 31 · 39 · 41 · 45 · 46 · 49 · 51 · 53 · 60 · 68 · 69 · 72 · 84 | 06 · 12 · 25 · 41 · 49 · 60 · 69 · 72 | 8 |
| 2026-10-19 | 05 · 06 · 07 · 11 · 12 · 21 · 27 · 35 · 38 · 40 · 42 · 46 · 49 · 51 · 52 · 64 · 65 · 73 · 81 · 84 | 07 · 21 · 42 · 52 · 73 | 5 |
| 2026-10-20 | 04 · 07 · 09 · 12 · 21 · 23 · 24 · 31 · 32 · 33 · 39 · 43 · 46 · 47 · 49 · 59 · 60 · 64 · 74 · 79 | 07 · 12 · 33 · 46 · 59 · 60 · 64 | 7 |
| 2026-10-21 | 02 · 05 · 06 · 12 · 17 · 25 · 26 · 29 · 33 · 35 · 36 · 43 · 44 · 46 · 49 · 64 · 65 · 69 · 70 · 82 | 17 · 29 | 2 |
| 2026-10-22 | 04 · 05 · 07 · 22 · 24 · 27 · 28 · 33 · 36 · 40 · 41 · 44 · 46 · 49 · 51 · 60 · 63 · 64 · 68 · 75 | 05 · 27 · 28 · 36 · 63 · 68 · 75 | 7 |
| 2026-10-23 | 01 · 06 · 07 · 10 · 12 · 17 · 21 · 31 · 34 · 36 · 38 · 41 · 42 · 46 · 55 · 61 · 74 · 75 · 76 · 82 | 06 · 07 · 55 · 74 | 4 |
| 2026-10-24 | 02 · 07 · 09 · 11 · 17 · 21 · 28 · 29 · 30 · 33 · 36 · 40 · 46 · 51 · 55 · 59 · 69 · 72 · 78 · 80 | 11 · 17 · 46 · 55 · 69 · 72 | 6 |
| 2026-10-25 | 01 · 06 · 07 · 10 · 12 · 16 · 24 · 27 · 39 · 41 · 43 · 44 · 51 · 54 · 55 · 69 · 75 · 78 · 81 · 82 | 01 · 12 · 39 · 41 · 43 | 5 |
| 2026-10-26 | 02 · 06 · 07 · 11 · 12 · 13 · 19 · 31 · 32 · 33 · 40 · 42 · 44 · 46 · 50 · 64 · 69 · 76 · 79 · 83 | 02 · 19 · 31 · 33 · 42 · 44 · 46 · 69 | 8 |
| 2026-10-27 | 01 · 04 · 07 · 11 · 12 · 17 · 23 · 30 · 31 · 32 · 42 · 44 · 46 · 53 · 54 · 64 · 68 · 69 · 72 · 79 | 04 · 12 · 23 · 31 · 44 · 79 | 6 |
| 2026-10-28 | 01 · 05 · 07 · 14 · 17 · 19 · 21 · 35 · 37 · 38 · 40 · 42 · 44 · 46 · 52 · 58 · 68 · 76 · 81 · 84 | 01 · 38 · 52 · 81 · 84 | 5 |
| 2026-10-29 | 04 · 07 · 09 · 11 · 12 · 17 · 28 · 29 · 32 · 34 · 35 · 37 · 42 · 44 · 55 · 63 · 69 · 73 · 79 · 84 | 04 · 12 · 28 · 29 · 32 · 84 | 6 |
| 2026-10-30 | 02 · 05 · 09 · 11 · 12 · 17 · 25 · 27 · 33 · 34 · 38 · 44 · 46 · 48 · 52 · 64 · 67 · 74 · 82 · 84 | 33 · 48 · 52 · 74 | 4 |
| 2026-10-31 | 02 · 05 · 06 · 10 · 11 · 12 · 21 · 27 · 32 · 33 · 34 · 41 · 44 · 46 · 53 · 59 · 63 · 69 · 79 · 82 | 11 · 21 | 2 |
| 2026-11-01 | 02 · 05 · 06 · 13 · 14 · 19 · 22 · 27 · 33 · 36 · 43 · 44 · 46 · 49 · 53 · 61 · 63 · 77 · 78 · 81 | 19 · 46 · 77 | 3 |
| 2026-11-02 | 01 · 05 · 09 · 12 · 16 · 19 · 21 · 23 · 42 · 43 · 46 · 49 · 51 · 55 · 56 · 60 · 63 · 68 · 81 · 82 | 01 · 09 · 16 · 23 · 42 | 5 |
| 2026-11-03 | 01 · 04 · 07 · 10 · 12 · 16 · 20 · 23 · 29 · 33 · 40 · 44 · 45 · 46 · 55 · 59 · 61 · 71 · 72 · 84 | 12 · 29 · 33 · 61 | 4 |
| 2026-11-04 | 01 · 04 · 06 · 16 · 19 · 23 · 27 · 28 · 32 · 33 · 37 · 40 · 41 · 43 · 46 · 60 · 64 · 71 · 81 · 84 | 19 · 23 · 27 · 40 · 41 · 64 · 81 · 84 | 8 |
| 2026-11-05 | 06 · 07 · 09 · 11 · 12 · 14 · 22 · 27 · 33 · 40 · 41 · 46 · 49 · 55 · 56 · 65 · 67 · 71 · 79 · 84 | 07 · 46 · 49 · 65 · 71 · 79 | 6 |
| 2026-11-06 | 01 · 02 · 09 · 10 · 16 · 19 · 23 · 26 · 29 · 32 · 42 · 46 · 47 · 50 · 51 · 63 · 64 · 68 · 69 · 84 | 01 · 23 · 26 · 42 · 50 · 51 | 6 |
| 2026-11-07 | 01 · 02 · 06 · 11 · 16 · 19 · 24 · 27 · 29 · 37 · 39 · 40 · 42 · 46 · 49 · 61 · 64 · 65 · 69 · 81 | 02 · 37 · 42 · 49 | 4 |
| 2026-11-08 | 02 · 08 · 09 · 11 · 12 · 19 · 27 · 28 · 32 · 36 · 37 · 40 · 42 · 49 · 51 · 57 · 60 · 63 · 65 · 71 | 02 · 08 · 11 · 12 · 27 · 32 · 37 · 49 · 51 | 9 |
| 2026-11-09 | 01 · 02 · 07 · 11 · 19 · 23 · 25 · 28 · 32 · 37 · 38 · 42 · 49 · 50 · 51 · 57 · 60 · 63 · 71 · 82 | 49 · 60 | 2 |
| 2026-11-10 | 02 · 04 · 07 · 10 · 11 · 12 · 20 · 21 · 33 · 36 · 37 · 42 · 44 · 48 · 55 · 59 · 63 · 72 · 74 · 84 | 04 · 63 · 84 | 3 |
| 2026-11-11 | 01 · 02 · 05 · 15 · 17 · 18 · 27 · 28 · 38 · 40 · 44 · 45 · 49 · 51 · 56 · 57 · 69 · 74 · 81 · 84 | 01 · 28 · 38 · 40 · 44 · 45 · 84 | 7 |

## Repetir para aprender

Cada variante nueva necesita una hipótesis previa y versión propia. No retocar esta corrida. Primero validar estabilidad en controles y fechas de desarrollo; después congelar y evaluar sorteos nuevos. Repetir históricos hasta encontrar un buen resultado crea sobreajuste. No se activa ninguna candidata por este informe.

La propuesta prospectiva para 2026-11-12 se congeló por separado antes de su ganador, si esa fecha es posterior al corte. No modifica la sesión guiada ni la cartera operativa.

Reproducir: node --experimental-strip-types scripts/run-kino-selection-benchmark.ts --cutoff=2026-11-11 --run-id=otro-id

SHA256 datos: 2a6d48c6c039d25e055261e5950052030e3ff956ea386895eb7bd323ea36f27d. Código/protocolo: c66649967d240d63b1fbce6ea7f2fb5cdc6d259e2afebb34d5e7f78bac9f40d4.

