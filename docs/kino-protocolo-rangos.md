# Rangos históricos — protocolo antes de ejecutar

**Estado: descartada del laboratorio activo por solicitud del usuario.** Se retiraron módulo, ejecutor y sus dos pruebas específicas. El resultado JSON y este informe se conservan como evidencia negativa; las cuatro fuentes originales exactas están recuperables en `experiments/super-kino/archive/ranges-v1-source.zip`. Para reproducir el experimento retirado, extraer primero ese archivo en un directorio de investigación con las demás dependencias del laboratorio. El comando siguiente es histórico, no una acción disponible en el árbol activo. Producción y algoritmos de versiones antiguas que interpretan snapshots no se eliminaron.

Objetivo: comprobar si cubrir perfiles de concentración por rangos aporta algo a la cartera diversa, sin asignar probabilidades mayores a números frecuentes o atrasados. Esta fase no prueba por sí sola que exista un patrón predictivo.

Cuatro variantes de200jugadas de10: uniforme, diversa v2 sin restricciones, diversa con objetivos de rangos uniformes y diversa con objetivos50%uniformes/50%históricos. El control de rangos uniformes separa el aporte del histórico del aporte de un optimizador adicional. Se conserva la misma exposición23/24 por número mediante intercambios recíprocos; nunca se fuerza el mismo reparto por decena a todas las jugadas.

Rangos1–10 hasta71–80 y81–84. El último tiene ancho4: los escenarios uniformes se generan entre los84números, no entre nueve grupos equiprobables. Para el componente histórico, cada perfil de20se submuestrea a10categorías y se descartan las identidades concretas de los números. El objetivo ajusta histogramas de concentración por rango, no resultados futuros. El peso50/50 y los10,000intentos de intercambio quedan fijos; la penalidad de diversidad no puede exceder1.05veces la de la cartera base.

Histórico: mismo corte8/nov y validación15–24/oct; cada fecha usa solo los30sorteos anteriores. Sintéticos: solo30sorteos iniciales15/sep–14/oct como entrenamiento,12carteras por método×5000escenarios nuevos20/84comunes por réplica. La reserva final no se evalúa. Las semillas tienen espacio propio `kino-lab-ranges-v1/validation`. No se reutilizan escenarios de v1/v2 para seleccionar esta candidata.

Métrica primaria7+ por cartera. Comparaciones primarias: mezcla histórica contra diversa y contra control de rangos uniforme. Criterio exploratorio de avance: ventaja media de al menos1punto porcentual frente a ambas, límites inferiores positivos con bootstrap por12réplicas y ajuste Bonferroni por dos comparaciones, medias positivas al excluir una réplica; deterioro8+ frente a diversa no superior a0.2puntos. Máximo,6+ y8+ son secundarios descriptivos. No se rebaja el criterio después de ver resultados.

La muestra histórica es pequeña y ya fue inspeccionada; no es evidencia prospectiva.12semillas no son60,000carteras independientes. Si el histórico tiene concentraciones accidentales, la mezcla puede empeorar cobertura bajo azar uniforme. Es un resultado posible, no un fallo que deba ocultarse.

```sh
node --experimental-strip-types scripts/run-kino-ranges.ts --cutoff=2026-11-08 --draws=5000 --replicates=12 --run-id=validation-ranges-v1
```

El runner registra hashes de código/dataset/lockfile, Node, semillas, fechas de entrenamiento, penalidades y métricas. Solo escribe un artefacto nuevo en `experiments/super-kino`, sin sobrescribir ni modificar producción.

## Resultado: validation-ranges-v1

Corrida completada:12carteras por método,5000sorteos por cartera (60,000escenarios por método), con los mismos escenarios dentro de cada réplica. No son60,000carteras independientes.

| Construcción | Alguna jugada7+ | Alguna jugada8+ | Máximo medio |
| --- | ---: | ---: | ---: |
| Uniforme |22.3800%|1.9017%|6.1178|
| Diversa sin rangos |22.9733%|1.9783%|6.1563|
| Rangos con objetivo uniforme |23.0167%|1.8983%|6.1513|
| Rangos50%histórico/50%uniforme |22.8133%|1.9600%|6.1481|

La mezcla histórica cambia7+ en **−0.1600puntos porcentuales frente a diversa**, intervalo bootstrap ajustado[−0.5350,+0.2017]puntos. Frente al control de rangos uniformes:−0.2033puntos, intervalo[−0.6350,+0.2100]. Ambos intervalos incluyen0. No hay evidencia de mejora incremental ni cumple el criterio de avance; tampoco prueba una pérdida concluyente.

Las tres construcciones con cuotas tienen idéntica media2.38093aciertos/jugada, porque conservan la exposición por número. Cubrir rangos de otra manera no está aumentando la probabilidad marginal de un número. Los objetivos de rangos son **histogramas marginales por grupo**, no un ajuste de todas las correlaciones conjuntas entre los nueve grupos.

En las10fechas históricas reconstruidas, diversa y mezcla histórica tuvieron alguna7+ en1/10, y el control de rangos uniforme en2/10. La muestra es pequeña y previamente inspeccionada; no corresponde a apuestas emitidas ni confirma capacidad predictiva. No se usan esos resultados para cambiar el peso50/50 a posteriori.

Conclusión: no añadir esta restricción de rangos a producción ni a la candidata diversa por ahora. La prueba descarta el avance de **esta implementación concreta**, no todos los modelos posibles de rangos ni toda señal temporal. Mantener la diversidad combinatoria como candidata investigable, sin afirmar que las concentraciones pasadas predicen las futuras. Producción sigue en V13.3; reserva histórica/sintética sin evaluar en esta fase.

Verificación:37pruebas del laboratorio aprobadas, TypeScript y build aprobados. Experimento local reproducible; no se publica a main ni se altera historial operativo.
