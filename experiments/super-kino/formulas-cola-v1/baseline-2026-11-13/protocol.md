# Nuevas fórmulas para cobertura 10+, V1

Fijado 14 noviembre 2026 antes de evaluar. Objetivo del usuario: al menos 1% de sorteos con 10+ ganadores dentro de UN grupo de 20. No sustituirlo por más grupos ni más números.

Dos hipótesis exploratorias nuevas; parámetros fijos, sin búsqueda de pesos, ventanas ni semillas:

- `momentum7`: probabilidad marginal suavizada con 30 sorteos uniformes equivalentes, más 0.5 veces la diferencia de frecuencias suavizadas entre últimos 7 y toda la historia anterior a esos 7. Ventanas disjuntas. Se eligen los 20 mejores puntajes; empates por número ascendente. Hipótesis: persistencia de cambios recientes. No presupone que números atrasados deban salir.
- `pair-residual`: construcción greedy de 20, score marginal suavizado + 0.5 por el residuo medio de coaparición con los ya elegidos. Pares suavizados con 30 sorteos hacia 20*19/(84*83). Residuo resta producto de marginales suavizadas por factor 84*19/(83*20), para corregir la dependencia uniforme por extracción sin reemplazo. Primero entra la mejor marginal, empate por número menor. Hipótesis: coapariciones persistentes más allá de frecuencia individual. Es una heurística; no optimiza de forma demostrada la probabilidad de 10+ ni convierte el score en probabilidad calibrada.

Ambas fórmulas son deterministas a partir de historia previa: cada fecha se recalcula un pool, que podría coincidir con el anterior. No se fuerza cambiar números para aparentar aprendizaje. Difieren del muestreo ponderado aleatorio del banco anterior.

## Evaluación congelada

Histórico local del régimen observado desde 15/09/2026 al 13/11/2026. Primeros 30 calentamiento, evaluar fechas restantes con exclusión estricta del objetivo y futuro. Toda la muestra ya se ha explorado: descriptiva, no holdout intacto. Un acierto en 30 fechas daría 3.33%; no declararlo validación del 1%. Informar fechas, pools, histogramas, media, tasa y Wilson95% orientativo por fecha (no corrige dependencia ni selección de hipótesis). No cambiar reglas con estos resultados.

Control de dos millones de sorteos uniformes nuevos: fijar los pools de ambas fórmulas usando solo el corte histórico. Compartir ganadores y comparar contra un pool de referencia fijado por semilla. No actualizar modelos con sorteos inventados. En este control todos los pools de 20 tienen exactamente la misma distribución marginal hipergeométrica. Semilla fija `kino-tail-formulas-v1/20261114`; no buscar otra si sale mal. Simular verifica el código, no añade evidencia predictiva real. No tiene sentido ampliar búsqueda bajo un nulo con respuesta exacta.

Umbral deseado 1%; nulo exacto ≈0.309427%. No se puede alcanzar 1% sostenido por una fórmula que solo ve el pasado si el sorteo es uniforme e independiente. Para adopción, una futura regla congelada necesitaría muestra nueva con análisis de potencia, control de comparaciones y evidencia fuera de muestra frente a uniforme; superar 1% en este tramo conocido no basta. No ejecutar seguimiento automáticamente.

Presupuesto: una pasada histórica, dos fórmulas y dos millones de sorteos uniformes, sin ajustes posteriores. No calcular premios de un pool, escribir data/ ni cambiar producción. Guardar protocolo, snapshot, código hash, parámetros, semilla y resultados en experiments/. No sobrescribir corridas.
