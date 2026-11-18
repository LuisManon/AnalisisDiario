# Controles de cercanía y variantes±1, V1

Fijado antes de ejecutar. Las14 fechas4–17 noviembre2026 y sus resultados ya se conocen: el12/14 con9+cercanos es una observación post hoc, no validación prospectiva. Se reutilizan las entradas inmutables de cercania-v1 sin nueva descarga ni modificación. La métrica conserva exactos primero y matching±1 máximo sin reutilizar ganadores.

## A. Controles históricos condicionales

1,000 réplicas completas de14 fechas por cada control, con200 jugadas únicas de10 por fecha y los mismos ganadores reales congelados. Control1: carteras uniformes independientes. Control2: permutación global de etiquetas1..84 de cada cartera original, preservando todos sus solapamientos. Semillas `kino-neighbor-controls-v1/<uniform|labels>/<replica>/<fecha>`; no buscar otra tras resultados.

Primaria: número de fechas con máximo cercano≥9, observado12. Secundarias: fechas con máximo10 y media de máximo cercano. Guardar todos los máximos por fecha/réplica, medias y rango central95% entre réplicas. Probabilidad empírica unilateral de igualar/superar el observado `(1+casos)/(1001)`; corregir descriptivamente dos controles con Bonferroni. No tratarlo como p confirmatorio: elección post hoc, pocos sorteos reales y modelo condicional de etiquetas/números. No interpretar valores grandes como prueba de equivalencia. El total de jugadas simuladas de control no aumenta la muestra de14 ganadores reales.

## B. Sustituciones antes de evaluación sintética

Tres carteras por fecha: original200; mitad100 originales+100 variantes; toda200 variantes. Orden original de fuentes barajado por semilla prefijada; en mitad se conservan las primeras100 y se sustituyen las restantes100, en toda se sustituye cada una. En cada variante los diez números se mueven exactamente−1 o+1, simétricamente;1solo→2,84solo→83, sin circularidad. Reintentar hasta256 si se repiten números dentro del boleto o combinaciones ya existentes, incluyendo las originales, sin usar ganador. Fallar visiblemente si no completa. Guardar origen y dirección de cada sustitución. Esto no explora las3^10 posibilidades ni elige las direcciones retrospectivamente.

Congelar las28 carteras modificadas antes de generar resultados de evaluación. Semillas `kino-neighbor-variants-v1/<half|all>/<fecha>`. Precio modelado25 por jugada, costo5000 en todos los métodos; no subir a400/600 jugadas para aparentar ventaja.

20,000 sorteos uniformes nuevos por fecha, flujo `kino-neighbor-variants-v1/evaluation/<fecha>` compartido por las tres carteras. Total280,000 escenarios distintos. No entrenamiento, selección de semillas ni ajuste con los resultados. Primaria: probabilidad de alguna jugada con7+ EXACTOS; secundarias8+, máximo y número medio de jugadas7+. La cercanía no puntúa en esta etapa.

Diferencias pareadas por fecha y agregadas, intervalos normales Monte Carlo97.5% para dos comparaciones primarias (Bonferroni,z2.2414027276). Son intervalos condicionados a las14 carteras, no generalización del generador; informar heterogeneidad por fecha. Puerta exploratoria: mejora media≥0.1pp absoluto, límite inferior ajustado positivo y al menos10/14 fechas con diferencia positiva. No garantizar potencia con este piloto ni ampliar presupuesto al ver resultados. Un fallo de puerta es ausencia de ventaja demostrada, no equivalencia.

Esperanza marginal de premio igual a costo/tablas idénticos bajo uniforme por linealidad; no se afirma rentabilidad ni se optimizan premios. No evaluar variantes contra los ganadores ya conocidos como si fueran apuestas emitidas. Esta es prueba sintética nueva, no sorteo real futuro; confirmación real requeriría registro previo y fechas nuevas.

## Registro y parada

Una corrida de ambos controles, sin activar variantes aunque alguna mejore. Conservar entradas originales y reporte previo completos, protocolo, fuentes, hashes, semillas, carteras variantes congeladas y agregados. Rechazar sobrescritura. Estado incompleto si se interrumpe. Archivar conclusión separando la parte histórica de la sintética. No escribir data/, endpoints, premios, propietarios ni snapshots cerrados.
