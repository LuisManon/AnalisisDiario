# Quinielón: selección V6, filtros y concentración

Archivado el 14 de noviembre de 2026. Estado: cerrado sin adopción. Los bloques siguientes conservan informes originales; sus comandos y rutas son referencias históricas retiradas, no instrucciones ejecutables disponibles. Los resultados son simulados y no prueban rentabilidad futura.

---

## Fuente histórica: `docs/quinielon-rentabilidad-grupo.md`

# Quinielón: selección de números y rentabilidad del grupo

Corte: 8 de noviembre de 2026. Objetivo confirmado por el usuario: grupo completo de cuatro inversionistas, no seleccionar retrospectivamente al inversionista que ganó más. Perfiles aplicados: matemático, análisis de datos, ingeniería de datos y ciencia de datos. Esta es una auditoría y propuesta de pruebas, no una modificación de estrategia ni recomendación de apostar dinero.

## Conclusión

Con los datos disponibles no hay una ventaja rentable demostrada. Los 39 repartos cerrados evaluables de la versión vigente, `tiers-v6`, acertaron 18 veces: 46.15%. El punto de equilibrio del conjunto actual es 60%. Costo teórico RD$1,591,200; premios brutos calculados RD$1,224,000; neto −RD$367,200 (−23.08%). Son importes asignados en archivos, no constancias de boletos comprados ni dinero cobrado. No se incluyen comisiones ni posibles retenciones.

## Qué hace realmente el aplicativo

1. Calcula frecuencias acumuladas por separado para Día y Noche; desempata por número ascendente (`lib/la-primera.ts`).
2. Forma La Casa con 40 números activos; reserva 20 para Banca y asigna los otros a Inversionistas. La exclusión de seis meses define parte de esta clasificación (`lib/quinielon-rankings.ts`).
3. En modo inteligente elimina números con insignias de más de tres meses de atraso, ordena por frecuencia de la misma tanda y toma 48 elegibles. Puede proteger al ganador anterior para conservarlo al rotar (`app/api/quinielon/distributor/route.ts`).
4. Reparte esos 48 números sin duplicados entre cuatro personas: 12 por persona, con cuatro calientes, cuatro intermedios y cuatro restantes. Bloqueos de propiedad y rotaciones buscan una asignación válida (`lib/quinielon-distributor.ts`).
5. En la rama actual de 48 números, **todos tienen RD$850**, independientemente de caliente/intermedio/restante. Esas etiquetas no aumentan el pago. Cada inversionista tiene RD$10,200 asignados; el grupo, RD$40,800 por tanda.

La Casa/Inversionistas describe el origen del número. Caliente/intermedio/restante es otro atributo y no debe interpretarse como probabilidad calibrada. La rotación entre propietarios del mismo conjunto, con iguales importes, no cambia ni costo ni premio total del grupo. La protección de un número que cambia el conjunto sí merece una prueba separada.

## Fundamento matemático

La regla oficial describe un número ganador entre 00–99 y un premio de RD$80 por peso: [La Primera, El Quinielón](https://laprimera.do/el-quinielon/). Los bloques de quiniela de 60/8/4 que también aparecen en la página no se aplican aquí.

Con apuestas `b_i` y probabilidades verdaderas `p_i`, la esperanza neta del grupo es `80 × Σ(p_i b_i) − Σb_i`. Si el sorteo es uniforme e independiente del pasado, cada `p_i = 0.01`, de modo que la esperanza es `−0.20 × inversión`, sea cual sea la selección o redistribución basada en el pasado. Esto es una conclusión condicionada al modelo uniforme, no una certificación del mecanismo físico.

Para 48 números distintos con igual importe:

- Costo: 48 × 850 = RD$40,800.
- Si alguno acierta: premio bruto RD$68,000; neto conjunto +RD$27,200.
- Si no acierta ninguno: neto −RD$40,800.
- Equilibrio: `P(acierto del conjunto) = 40,800 / 68,000 = 60%`.
- Referencia uniforme: 48% de aciertos y pérdida esperada de RD$8,160 por tanda.

Por tanto, no basta con mejorar de 46% a 50% o 54%. Haría falta superar de manera reproducible el 60%, antes de otros costos. Para un número aislado, el umbral es `p_i > 1/80 = 1.25%`, no meramente aparecer en un ranking de frecuencias. Para `k` números equiponderados, el umbral del conjunto es `k/80`. Concentrar en menos números modifica varianza y frecuencia de acierto; por sí solo no elimina el margen negativo. Duplicar importes después de pérdidas no mejora esa esperanza y aumenta la exposición.

## Auditoría de datos y trazabilidad

- 989 resultados locales desde 2025-07-01: 46 con confirmación explícita y 943 heredados sin ese campo. Sin metadatos no significa necesariamente incorrecto, pero limita la evidencia verificable.
- Faltan las claves 2026-01-01 Noche y 2026-04-03 Día/Noche. Son ausencias de archivo, no afirmaciones de sorteos celebrados o cancelados: necesitan confirmación de fuente.
- 82 repartos: 81 hasta el corte y uno futuro. Los 81 pasan el validador actual; tres son simulaciones explícitas. Falta el reparto 2026-11-03 Día. No se reconstruyó.
- 43 repartos tienen resultados confirmados, precios completos y no son retrospectivos: cuatro `tiers-v4` y 39 `tiers-v6`. Las versiones no se mezclan para afirmar rendimiento actual.
- Los 39 `tiers-v6`, del 19 de octubre al 8 de noviembre, tienen una versión Git anterior al cierre cuyos números, propietarios, niveles, importes y multiplicador coinciden con los actuales. Es trazabilidad más fuerte que `createdAt` por sí solo, pero no prueba de compra.
- Se excluyen las simulaciones 2026-10-09 Día y 2026-11-01 Día/Noche. El script de reconstrucción recibe explícitamente el ganador deseado; usarlo para medir capacidad predictiva sería fuga de información.
- Los premios se recalculan contra el resultado local confirmado y las apuestas guardadas; no existe aquí una prueba de cobro real.

Huella SHA-256 conjunta de resultados y archivos de reparto consultados: `1265f915984f4bd110cafabbb310b6986dae7b0d326b3c08012057aa8281bf81`.

## Resultados del conjunto

| Población | Evaluados | Aciertos | Costo teórico | Premio bruto | Neto teórico |
| --- | ---: | ---: | ---: | ---: | ---: |
| V6 Día | 19 | 9 (47.37%) | RD$775,200 | RD$612,000 | −RD$163,200 |
| V6 Noche | 20 | 9 (45.00%) | RD$816,000 | RD$612,000 | −RD$204,000 |
| V6 total | 39 | 18 (46.15%) | RD$1,591,200 | RD$1,224,000 | −RD$367,200 |
| Semana 2–8 noviembre | 13 | 7 (53.85%) | RD$530,400 | RD$476,000 | −RD$54,400 |

El intervalo Wilson orientativo de los 18/39 aciertos es 31.57%–61.43%. Asume observaciones independientes y no incorpora cambios adaptativos ni selección de estrategias. La muestra es corta: no demuestra una ventaja y tampoco permite una estimación precisa del porcentaje futuro. No se debe seleccionar un inversionista por sus ganancias pasadas para resolver un objetivo conjunto.

## Diagnóstico caminante de selección, no estrategia nueva

Se evaluaron dos reglas fijas: top 48 por frecuencia de la misma tanda, y esa selección con exclusión por última aparición anterior a tres meses. Cada fecha usa únicamente registros de fechas anteriores. Estas pruebas no recrean las restricciones de propiedad y protección del ganador de V6; son una ablación de la idea de selección. Las reglas se eligieron después de conocer el historial: no hay reserva intacta y no se presentan como validación final. Tampoco se puede reconstruir con estos archivos la información exacta publicada en cada instante histórico.

| Resultados evaluados | Frecuencia 48 sin exclusión | Frecuencia 48 con exclusión |
| --- | ---: | ---: |
| 46 confirmados explícitamente | 24/46 = 52.17%; ROI −13.04% | 21/46 = 45.65%; ROI −23.91% |
| 442 desde abril, incluidos heredados sin marca | 206/442 = 46.61%; ROI −22.32% | 205/442 = 46.38%; ROI −22.70% |

En los 442, el filtro obtiene 42.08% en Día y 50.68% en Noche: ninguno alcanza equilibrio. Antes de agosto, ambas variantes rondan 44%; desde agosto, 48.5%–49.5%. No hay mejora estable suficiente ni argumento para activar automáticamente la variante sin filtro. La referencia uniforme exacta es ROI esperado −20%; no es un rendimiento observado de una simulación específica.

## Próximas pruebas priorizadas para el grupo

1. **Auditoría económica visible**, separada del marcador de aciertos: costo total, premio bruto, neto, ROI, días de pérdidas y caída máxima acumulada. Pendientes y retrospectivas aparte. Antes de automatizar apuestas, conciliar los importes con compras reales si existen.
2. **Ablación de selección**, a presupuesto y fechas idénticos: V6 completo, sin exclusión por atraso y sin protección/reingreso del ganador anterior. La rotación de propietarios se mantiene fija o se neutraliza; no puede atribuirse ventaja grupal a mover al dueño.
3. **Probabilidades calibradas y opción de abstenerse**: contrastar un modelo con fuerte contracción hacia 1% frente al uniforme. La probabilidad estimada de superar 1.25% debe sustentarse fuera de muestra, no en el conteo bruto ni en elegir el mejor de cien a posteriori. Si no hay ventaja creíble, la referencia de no apostar tiene neto cero frente a la pérdida esperada.
4. **Protocolo previo antes de buscar variantes**: objetivo primario ROI neto conjunto; secundarios cobertura, caída máxima y variación por tanda. Reservar sorteos futuros sin compras para prueba final; los 989 ya revisados no son holdout. Particiones cronológicas, comparación pareada, incertidumbre por bloques de día y control de comparaciones múltiples. Umbral económico: superar cero neto, además de superar a V6; mejorar una estrategia perdedora no basta. Un número de observaciones fijo sin análisis de potencia no garantiza validación.

No se recomienda aumentar apuestas, usar progresiones ni presentar el juego como fuente de ingresos. Primero debe demostrarse una ventaja; con lo auditado, esa ventaja no está.

## Reproducción

`node --experimental-strip-types scripts/audit-quinielon-economics.ts 2026-11-08`

El script solo lee archivos y Git, emite JSON y no llama endpoints. Tests: `node --test --experimental-strip-types tests/quinielon-economics.test.ts`. Ninguna estrategia, cartera histórica o dato de producción se ha modificado.


---

## Fuente histórica: `docs/quinielon-ablacion-v1.md`

# Ablación de selección Quinielón: grupo completo

Prueba exploratoria sobre las 39 tandas V6 con resultado confirmado y reparto no retrospectivo, hasta el 8 de noviembre de 2026. Sin apuestas, cambios de producción ni reescrituras históricas.

Se conserva el roster preexistente de cada sorteo y su frontera de Banca, el presupuesto de 48 números distintos y el importe de RD$850 por número. La frecuencia se calcula solo con fechas anteriores para esa tanda. No se reconstruyen nuevos propietarios: no afecta al premio conjunto con importes iguales. Las reglas se evalúan sobre historia ya conocida; no es una prueba prospectiva ni una reserva intacta.

La selección original se reproduce a partir del roster guardado, ranking previo, exclusión por atraso y protección del anterior ganador caliente/intermedio cuando es elegible. Coincide con los 39 conjuntos de producción. La elegibilidad del ganador protegido se mantiene como en la regla original al aislar la eliminación del filtro.

| Variante | Aciertos | Tasa | Costo teórico | Premios brutos | Neto | ROI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Producción | 18/39 | 46.15% | RD$1,591,200 | RD$1,224,000 | −RD$367,200 | −23.08% |
| Sin filtro de atraso | 22/39 | 56.41% | RD$1,591,200 | RD$1,496,000 | −RD$95,200 | −5.98% |
| Sin protección del ganador anterior | 18/39 | 46.15% | RD$1,591,200 | RD$1,224,000 | −RD$367,200 | −23.08% |
| Sin ambas reglas | 22/39 | 56.41% | RD$1,591,200 | RD$1,496,000 | −RD$95,200 | −5.98% |

Quitar el filtro recupera seis aciertos y pierde dos: mejora neta de cuatro aciertos y RD$272,000 teóricos, no una ganancia de ese importe. Recuperados: 20, 23, 25 y 28 de octubre Noche, 29 de octubre Día y 7 de noviembre Noche. Perdidos: 3 de noviembre Noche y 8 de noviembre Día.

La prueba pareada exacta de los ocho resultados discordantes (6 frente a 2), bajo simetría independiente, da p bilateral = 2×(1+8+28)/256 = 0.2891. No aporta evidencia estadística suficiente; además es exploratoria y no corrige búsqueda adaptativa ni dependencia por día. El filtro es una hipótesis que merece seguimiento, no una mejora demostrada.

Quitar la protección no cambia ningún conjunto en estas 39 fechas: su efecto predictivo no es identificable aquí. Esto no demuestra que nunca tenga efecto.

La variante menos perdedora sigue por debajo del equilibrio del 60%; necesitaría al menos 24 aciertos en 39 para terminar con neto positivo con estos importes. No hay justificación para activarla como rentable. Siguiente paso: congelar ambas selecciones en modo sombra antes de sorteos futuros y evaluar neto conjunto y caída máxima, sin ajustes a los resultados que vayan llegando. No se creó automatización ni se consumieron nuevos resultados.

Reproducción: `node --experimental-strip-types scripts/test-quinielon-ablations.ts`. Test: `node --test --experimental-strip-types tests/quinielon-ablations.test.ts`. La auditoría económica previa detalla procedencia y limitaciones de los datos.


---

## Fuente histórica: `docs/quinielon-concentracion-v1.md`

# Concentración 10/20/48: grupo completo

Retrospectiva exploratoria hasta 8 noviembre 2026. Las mismas 39 tandas V6 confirmadas, sin simulaciones. Dentro de los 48 números realmente guardados se toman los primeros 10 o 20 por frecuencia acumulada anterior de la misma tanda; los empates siguen el orden numérico del ranking existente. No se usan los ganadores objetivo para seleccionar. Es historia ya conocida y comparaciones múltiples: no es validación prospectiva.

Se fija RD$40,800 teóricos por tanda para aislar la concentración. Esto NO es una recomendación de apostar esa cantidad ni subir apuestas individuales: el reparto simulado por número resulta RD$4,080 para 10, RD$2,040 para 20 y RD$850 para 48. Los premios suponen multiplicador 80 sin comisiones, retenciones ni límites de aceptación de la banca.

| Números | Aciertos | Neto teórico | ROI | Mayor racha perdedora | Caída máxima desde máximo previo |
| --- | ---: | ---: | ---: | ---: | ---: |
| 10 | 5/39 | +RD$40,800 | +2.56% | 12 | RD$530,400 |
| 20 | 7/39 | −RD$448,800 | −28.21% | 12 | RD$856,800 |
| 48 | 18/39 | −RD$367,200 | −23.08% | 5 | RD$503,200 |

Cada acierto bruto cubre 8, 4 y 1.67 presupuestos por tanda, respectivamente. El umbral de equilibrio es 12.5%, 25% y 60%. El caso de 10 obtuvo 12.82%, apenas por encima del umbral; con un acierto menos habría terminado −RD$285,600 (−17.95%). No es evidencia suficiente de ventaja estable. Día aportó tres aciertos de 19 y Noche dos de 20: no seleccionar Día a posteriori como si fuera una estrategia validada.

La caída máxima se calcula sobre la curva acumulada de neto, partiendo de cero y manteniendo su máximo histórico; no es solo la peor racha. Los resultados omiten la tanda sin reparto del 3 noviembre Día y otras observaciones no elegibles: las rachas cuentan tandas evaluadas consecutivas, no garantizan una trayectoria de calendario completa. Ni las rachas ni las caídas observadas limitan el riesgo futuro.

Conclusión: concentrar permitió que premios mayores amortiguaran más pérdidas, pero no satisfizo el objetivo de menor riesgo. No se activa ningún cambio ni se modifica la sombra de 48 números ya congelada. Antes de considerar 10 números se requiere una prueba prospectiva nueva y separada, con presupuesto reducido definido por pérdida máxima aceptable. Reducir el presupuesto escala premios y pérdidas por igual: no aumenta el ROI esperado.

Reproducción: `node --experimental-strip-types scripts/test-quinielon-concentration.ts`. Pruebas: `node --test --experimental-strip-types tests/quinielon-concentration.test.ts`. El script no escribe históricos, no llama endpoints ni apuesta dinero.


---

## Fuente histórica: `docs/quinielon-descartes-v1.md`

# Auditoría de descartes y prueba Banca/atraso

Perfiles aplicados: ingeniería y ciencia de datos; objetivo: rentabilidad teórica del grupo completo. Corte fijo 8 noviembre 2026, anterior al 38 reportado para Noche del día 9. Ese caso motivó la revisión, pero no se usa como dato de evaluación ni se pretende incluirlo a posteriori.

Por cada una de las 39 tandas V6 evaluables, se reconstruye la selección original y se auditan los 100 números: ranking previo de la misma tanda, grupo Banca, insignia de atraso, última aparición y pertenencia a la cartera. Para los no seleccionados, Banca y atraso se informan como motivos potenciales superpuestos; si no aplica ninguno, se indica ranking/reparto. Esto no prueba causalidad individual y no pretende reconstruir logs de ejecución que no existían.

Se mantienen 48 números distintos, RD$850 por número y costo conjunto RD$40,800 por tanda. La reconstrucción coincide en las 39 carteras. Se mantienen roster y clasificación guardados, salvo la puerta de exclusión de Banca de la variante correspondiente. Quitar Banca permite que los 100 números compitan, no apuesta a los 100. La protección se mantiene para el ganador previo presente en la selección operativa; no se rediseña por variante.

| Variante | Aciertos | Neto teórico | ROI | Caída máxima | Mayor racha de pérdidas |
| --- | ---: | ---: | ---: | ---: | ---: |
| Producción | 18/39 | −RD$367,200 | −23.08% | RD$503,200 | 5 |
| Sin filtro de atraso | 22/39 | −RD$95,200 | −5.98% | RD$272,000 | 3 |
| Sin excluir Banca, manteniendo atraso | 18/39 | −RD$367,200 | −23.08% | RD$503,200 | 5 |
| Sin ambas exclusiones | 21/39 | −RD$163,200 | −10.26% | RD$340,000 | 3 |

Al quitar solo Banca, el filtro de atraso aún puede dejar fuera sus números. No mejorar no demuestra que la clasificación Banca tenga capacidad predictiva. Quitar ambos filtros tampoco domina a quitar solo atraso: entra un conjunto distinto y sale un acierto neto en esta muestra.

Desglose exploratorio: sin filtro de atraso, Día queda 9/19 y −RD$163,200; Noche 13/20 y +RD$68,000. Son solo veinte observaciones nocturnas ya conocidas. No se debe seleccionar Noche a posteriori como ventaja validada ni apostar más por ese resultado. Sin ambas exclusiones, Noche queda 12/20 y neto cero.

Todos los importes son simulados a partir de asignaciones, no dinero realmente apostado o cobrado; no incluyen otros costos. No existe aquí una variante con rentabilidad conjunta positiva. Menor caída histórica no es límite del riesgo futuro. Se conservan las limitaciones de procedencia y cambios de reglas documentados en la auditoría económica.

Decisión: no cambiar producción, no retirar todos los filtros y no modificar sombra V1. La prueba prospectiva existente sigue midiendo solo atraso. La hipótesis Banca requiere otro protocolo antes de nuevos resultados; esta retrospectiva no es holdout. La auditoría implementada es un comando offline, no una nueva función visible ni un registro automático en producción.

Repetir: `node --experimental-strip-types scripts/audit-quinielon-discards.ts`. Emite JSON detallado sin escribir datos. Tests: `node --test --experimental-strip-types tests/quinielon-discards.test.ts`.


---

## Fuente histórica: `experiments/quinielon/shadow-v1/PROTOCOL.md`

# Quinielón: sombra V1

Inicio: 9 noviembre 2026, Noche. Primera pareja congelada a las 14:25:21 RD, antes del cierre a las 19:00 RD. Día del 9 no se incluye: ya había cerrado. No hay apuestas ni activación de estrategia.

Hipótesis: quitar la exclusión por atraso mejora el ROI teórico conjunto respecto a la selección operativa V6. Misma cobertura de 48 números, RD$850 por número y multiplicador 80. El roster/Banca queda fijo al del reparto operativo de esa tanda; se mantiene protección del ganador anterior cuando está evidenciada en la selección operativa. No se optimizan hiperparámetros durante la prueba.

Plan de observación: 60 tandas consecutivas desde 9 noviembre Noche hasta 9 diciembre Día. Cada pareja deberá guardarse antes de su cierre; faltantes se informan como faltantes y nunca se reconstruyen después. Las fuentes/rankings pueden actualizarse con resultados publicados anteriores a cada tanda, sin modificar la regla. Las parejas cerradas no se reemplazan. Congelar estas dos selecciones no genera propietarios ni apuestas alternativas.

Métrica primaria: diferencia pareada de neto conjunto; secundarias ROI absoluto, aciertos y máxima caída acumulada. Se informarán incertidumbre por bloques de día y pares discordantes. Sesenta observaciones son un piloto, no un tamaño que garantice potencia. Una mejora relativa sin neto positivo no es rentabilidad. No se activará una variante por una racha ni por el primer acierto; cualquier extensión exige un protocolo nuevo.

Los resultados de la muestra retrospectiva anterior no forman parte de este piloto. Los números observados después de la congelación se evalúan solo cuando el resultado está confirmado. Sin resultado o provisional es pendiente, no pérdida. El importe de referencia es hipotético y no incluye otros gastos o retenciones.

Comandos:

- Congelar una tanda abierta con reparto operativo existente: `node --experimental-strip-types scripts/quinielon-shadow.ts freeze YYYY-MM-DD dia|noche`.
- Consultar parejas congeladas: `node --experimental-strip-types scripts/quinielon-shadow.ts evaluate`.

Estado inicial: primera pareja guardada localmente, resultado pendiente. No hay un proceso periódico instalado: las siguientes congelaciones y la actualización de resultados requieren ejecución de los comandos o una integración futura autorizada. Los archivos solo se escriben en este directorio experimental; nunca se actualiza `data/` desde estos comandos.


## Cierre de sombra V1

Solo se encontró una pareja congelada, del 9 de noviembre Noche. No se completaron las 60 tandas propuestas ni había proceso periódico instalado. No presentar el protocolo como ensayo concluido. Se suspende esta línea; no se reconstruirán parejas pasadas para completar la muestra.
