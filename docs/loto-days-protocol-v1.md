# Loto Más: separación por día y retrospectiva V1

Objetivo solicitado: miércoles y sábado independientes, incluido Top 5 del Más. Se conserva presupuesto de 30 jugadas, 10 por perfil, cinco Más utilizados seis veces cada uno y controles de diversidad. No se modifican archivos históricos.

Variantes fijas:

1. Reconstrucción de V4: mitad por día y mitad global, Más global.
2. Mismas combinaciones principales que V4, cambiando solo Más a Top 5 del día.
3. V5: toda información de selección del día objetivo, Más por día. Rangos y cercanía P1–P3 siguen influyendo en la puntuación, pero no se excluye automáticamente por menos de tres antecedentes cercanos o cinco meses sin aparecer en una posición. Es un paquete de cambios: no permite atribuir causalidad exclusivamente a separar días.
4. Referencia aleatoria: 30 jugadas, 20 réplicas por fecha, semilla fija 20261109 y el mismo Top 5 del Más por día. Las réplicas no son sorteos reales adicionales.

V5 conserva combinaciones únicas, límites de exposición (máximo nueve apariciones por número y seis por número/posición) y máximo cuatro números compartidos entre dos jugadas. La versión separada con los antiguos descartes duros solo produjo 29 jugadas para el 10 de octubre en la prueba de regresión: no se relaja el requisito de 30 ni se completa con información del otro día.

Últimas 24 fechas hasta 7 noviembre 2026: primeras 16 exploración, últimas 8 comprobación temporal. En cada objetivo se excluye su resultado y todos los posteriores. Los datos actuales ya han sido examinados: ninguna partición se presenta como una reserva intacta. Métrica primaria exploratoria: fechas con al menos una jugada de 4+ principales; secundarias 3+, histograma, coincidencias del Más y premios con la tabla de referencia del aplicativo. Sin inferencia de ROI mientras no se auditen costo y pagos históricos oficiales. Fallos de generación se informan, no se convierten en cero aciertos; comparación sobre fechas comunes.

No se optimizan pesos después de observar resultados de este experimento. Obtener el mejor resultado retrospectivo no autoriza afirmar mejor predicción ni rentabilidad. La separación por día cumple una decisión funcional del usuario; la eliminación de descartes duros permite producir 30 jugadas en el modelo separado, pero su ventaja necesita pruebas adicionales.

El generador predeterminado usa V5 para nuevas carteras; las cerradas conservan su versión y números. El almacenamiento existente solo puede regenerar una cartera abierta si cambia la versión, antes de su cierre de generación; esta investigación no llama esos endpoints ni escribe `data/`.

Reproducción: `node --experimental-strip-types scripts/test-loto-days.ts`. El resultado corregido se escribe con creación exclusiva en `experiments/loto-mas/days-v2.json`, sin sobrescribir corridas previas. La huella de la fuente acompaña al resultado. La corrida `days-v1.json` queda conservada solo para auditoría: sus comparaciones de Más por día y aleatoria tenían un desempate dependiente del orden de entrada y no deben usarse. `buildPlusOrder` ahora ordena internamente por fecha descendente antes de resolver empates. No se despliega ni publica automáticamente.

La referencia V4 se reconstruye con la lógica base disponible; no se presenta como reproducción exacta de los números archivados de todas las versiones históricas. Las carteras originales siguen intactas.
