# Auditoría retrospectiva de cercanía ±1

Solicitud: revisar por lo menos dos semanas de carteras pasadas. Ventana fijada4–17 noviembre2026 inclusive,14 fechas. Métrica definida después de observar el ejemplo de la jugada54 del17/11; análisis descriptivo post hoc, no prueba predictiva ni criterio de premio.

Para cada jugada original de10: contar exactos primero. Eliminar esos ganadores del conjunto disponible; emparejar números restantes con ganadores a distancia exactamente1 mediante matching bipartito máximo. Cada número y cada ganador se usan una sola vez. Sin circularidad84↔1, sin ampliar a±2 ni modificar números originales. Cercanía total=exactos+vecinos. Priorizar mayor total, luego más exactos y menor id; conservar todos los empates y todas las filas. El máximo de exactos del día puede pertenecer a otra jugada y se informa por separado.

Usar snapshots guardados, no reconstruir ni regenerar carteras cerradas. Fuente remota fijada a un commit, guardar contenido completo/hash. Validar schema, targetDate y generación anterior al cierre según snapshot. Eso no certifica por sí solo existencia en Git antes del cierre ni compra real. Excluir retrospectivas explícitas. Informar ausencias, errores de validación y resultados pendientes, sin suplirlos con simulaciones.

Preferir prizeDrawNumbers congelados del snapshot cuando existan; si el histórico actual difiere, registrar ambos y advertir sin sobrescribir. Si no hay resultado congelado, usar el histórico de la misma fecha indicando procedencia. No inferir confirmación oficial de metadatos ausentes ni recalcular premios para este análisis. Sin llamadas a endpoints ni escrituras de data/.

Por fecha: mejor jugada±1 con sus exactos/vecinos, id, máximo exacto independiente, número de jugadas9+/10 cercanas e histogramas. Conservar desgloses y reglas suficientes para reproducción. Es la mejor entre200 donde aplique: seleccionar un máximo aumenta coincidencias aparentes. El rango numérico de una bola no implica similitud física con sus vecinas ni mayor probabilidad futura. Este estudio no declara avance estadístico ni modifica algoritmos, premios, propietarios o carteras.

Guardar entradas/fuentes/protocolo/commit/hashes e informe en experiments/super-kino/cercania-v1/<run-id>; rechazar sobrescritura. Cierre documental en esta carpeta con limitaciones y decisión. No iniciar búsquedas de variantes o simulaciones adicionales por el resultado de esta auditoría.
