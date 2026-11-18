# Cartera fija de 100 jugadas, V1

Estado planificado, 14 noviembre 2026, antes de construir/evaluar. Objetivo solicitado: 100 combinaciones que se mantengan fijas; principal alguna jugada7+, secundaria8+. No es un pool de20 ni selección predictiva de ganadores. Costo modelado RD$2,500 por sorteo, con tabla del snapshot14/11, sin certificación oficial ni retenciones.

## Novedad y construcción

Se reutiliza el fundamento de intersecciones de `kino-experiment-joint`, antes limitado a200. Aquí se construyen100 desde el principio, no se recortan200 ni se buscan semillas por premios. Una semilla prefijada `kino-fixed100-v1/20261114`. No se usa historial ni escenarios simulados para ajustar.

1. Construcción bipartita por demandas mayores, con desempates pseudoaleatorios.100 filas de10 únicos de1..84. Grados exactos:76 números aparecen12 veces y8 aparecen11 (1000 posiciones). Si hay duplicados, reintentar hasta32 con subsemillas fijas; fallo visible si no completa. No elegir entre construcciones por resultado.
2.20,000 intentos de intercambio recíproco entre dos filas. Preservar exposición exacta y unicidad. Aceptar si disminuye S2(7), suma de probabilidades conjuntas exactas de dos jugadas con7+, y no aumenta S2(8), con tolerancia numérica1e-18. Algoritmo greedy, no prueba de óptimo ni garantía de aumentar la unión de eventos. No imponer formas de números como si fueran predictivas.
3. Congelar las100 combinaciones, semilla, versión y SHA-256 antes de generar el primer ganador de evaluación. Guardar JSON, CSV y lista Markdown. No rotar por fecha ni por resultados ni regenerar una variante al perder. Cambiarla exige versión nueva y autorización para el alcance pedido.

## Comparadores, muestra y parada

Dos referencias100 al mismo costo: la construcción equilibrada antes de optimizar (aísla intercambios) y las primeras100 del generador uniforme existente con semilla `kino-fixed100-v1/uniform-control`. Son carteras fijas, no selecciones por mejor premio. Una candidata, dos comparadores, sin búsqueda de parámetros ni nueva semilla tras resultados.

Un millón de sorteos uniformes nuevos sin reemplazo, semilla `kino-fixed100-v1/evaluation`; los mismos ganadores para las tres carteras. Solo evaluación, sin entrenamiento con escenarios. Tasas7+/8+, histograma del máximo, pérdida, premio cero y percentiles de bruto. Wilson por cartera; diferencias pareadas normales con intervalos97.5% para dos comparaciones principales (Bonferroni, z=2.2414027276). Incertidumbre Monte Carlo condicionada a estas tres carteras, no desempeño de todo el generador ni calibración física. No reutilizar el +0.148pp de recortes como si perteneciera a este diseño.

Efecto mínimo exploratorio contra uniforme: +0.1pp absoluto en7+ y límite inferior ajustado positivo. Informar también comparación con base equilibrada aunque salga nula o negativa. Vigilar8+ con diferencia estimada no peor que−0.02pp y límite inferior descriptivo95% no peor que−0.05pp frente a uniforme; no afirmar no inferioridad confirmatoria a partir de esto. Superar criterios solo informa sobre esta cartera bajo el modelo y no autoriza producción/apuestas.

Piloto con presupuesto de un millón, sin potencia garantizada para0.1pp; no ampliar por resultado favorable. Se ahorra cómputo usando fórmula exacta para esperanza y cotas. Esperanza de premio igual para toda cartera100 bajo uniforme y misma tabla; no ordenar por media simulada contaminada por jackpots raros. Repetir una cartera en sucesivos sorteos no hace que deba acertar ni modifica su probabilidad por sorteo.

## Artefactos y cierre

Guardar entradas/prize snapshot, fuentes ejecutadas, hashes, protocolo, cartera congelada y comparadores, métricas e invariantes. Carpeta experiments/super-kino/fija100-v1/<run-id>, rechazar sobrescritura. Sin endpoints ni escrituras en data/. Esta autorización crea una cartera experimental, no reemplaza la operativa, compras ni seguimiento automático. Cerrar la ficha con resultado, límites, decisión y condición para reabrir sin alterar la V1 congelada.
