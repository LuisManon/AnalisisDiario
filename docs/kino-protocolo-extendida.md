# Diversa extendida — protocolo antes de ejecutar

Hipótesis: la candidata diversa original puede beneficiarse de continuar su mismo objetivo combinatorio durante más intentos, sin añadir restricciones de rangos ni sustituirlo por tríos. La versión v2 y sus fuentes permanecen congeladas.

Cada cartera extendida parte exactamente de `balanced-diverse(seed)`, con sus10,000intentos originales. Se aplican50,000intercambios recíprocos adicionales, aceptando solo mejoras de la penalidad v2: parejas repetidas más100×la suma de max(0,solapamiento−4)². Ningún resultado histórico o sintético participa en ese ajuste.200jugadas únicas de10 y exposición por número23/24 preservadas. Los intentos extra tienen costo computacional, no costo de apuestas adicional.

Comparación congelada: uniforme, diversa original y extendida;24carteras por método×5000sorteos sintéticos20/84, comunes dentro de cada réplica.120,000escenarios por método,24unidades independientes de semilla; espacios nuevos `kino-lab-extended-v1/validation`. Se conserva el corte8/nov y las10fechas históricas15–24/oct únicamente como retrospectiva descriptiva ya expuesta. Reserva final no evaluada.

Primaria: alguna jugada7+ por cartera. Avance exploratorio requiere mejora media>=1punto porcentual frente a diversa y uniforme; límites inferiores positivos con bootstrap de10,000remuestreos de las24réplicas, Bonferroni por dos referencias; todas las medias dejando una réplica fuera positivas. Guarda secundaria: deterioro8+ frente a diversa no mayor a0.2puntos. No se cambia el umbral tras ver resultados ni se elige por una métrica secundaria favorable.

Las corridas anteriores y la selección de esta hipótesis son una búsqueda adaptativa; estos intervalos solo ajustan las dos comparaciones de esta corrida, no toda la búsqueda previa. Un resultado favorable seguiría requiriendo confirmación independiente preregistrada y no autoriza producción. El23.26%anterior no es una tasa fija contra la que comparar otra muestra: se compara la misma estrategia original sobre los nuevos escenarios compartidos.

```sh
node --experimental-strip-types scripts/run-kino-extended.ts --cutoff=2026-11-08 --draws=5000 --replicates=24 --run-id=validation-extended-v1
```

Artefacto nuevo en experiments/super-kino, sin sobrescritura, con semillas y hashes de código/dataset/dependencias. No modifica producción ni carteras previas.

## Resultado: validation-extended-v1

Corrida de24semillas y120,000escenarios por método completada. La referencia se vuelve a medir en los mismos escenarios que la candidata; no se compara el23.26%de una muestra anterior con otra distinta.

| Construcción | Alguna7+ | Alguna8+ | Máximo medio |
| --- | ---: | ---: | ---: |
| Uniforme |22.3058%|1.9317%|6.1148|
| Diversa original |23.0392%|1.9158%|6.1559|
| Diversa extendida |23.2392%|1.9550%|6.1630|

La diferencia extendida−original es+0.2000puntos porcentuales, intervalo bootstrap ajustado[−0.0825,+0.4733]puntos. No alcanza el umbral prefijado de1punto y el intervalo incluye0. Frente a uniforme,+0.9333puntos, intervalo[+0.4567,+1.4833], tampoco basta para atribuir una mejora incremental sobre diversa.

La media por jugada es idéntica en ambas diversas (2.38096), por conservar exposición. El objetivo combinatorio mejora en24/24carteras y el máximo medio sube ligeramente, pero esas secundarias no sustituyen la métrica primaria. No se promueve la extendida ni se abre la reserva.

La construcción extendida cuesta aproximadamente3–4veces más CPU que la original en los ejemplos medidos (264–337ms frente a71–121ms); no cambia el costo de las200jugadas. La reducción adicional del objetivo interno no produjo una ganancia7+ concluyente. Recomendación: conservar diversa v2 como referencia y detener la escalada indiscriminada de intentos. Una siguiente hipótesis debería ser mecánicamente distinta, preregistrada y con presupuesto/regla de parada, sin perseguir porcentajes favorables ni bajar el umbral después de mirar resultados.

Verificación:42pruebas aprobadas, TypeScript y build aprobados. QA confirmó hashes de código/dataset/lockfile,24×5000, penalidad decreciente y ausencia de evaluación del período reservado. Todo permanece local y fuera de producción.
