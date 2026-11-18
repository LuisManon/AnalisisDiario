---
name: gestion-experimentos
description: Registrar, planificar y cerrar líneas experimentales de Análisis Diario para reutilizar evidencia, evitar búsquedas repetidas y preservar trazabilidad. Usar al abrir, comparar o archivar experimentos; no para consultas ordinarias de resultados.
---

# Gestión de experimentos

Lee AGENTS.md. Coordina el registro de evidencia; la evaluación estadística y los diseños combinatorios corresponden a sus perfiles existentes. Esta skill no inicia subagentes ni seguimientos automáticos.

- Consulta `docs/experimentos/README.md` y la ficha del sorteo/algoritmo antes de proponer una variante. Explica qué cambia respecto a lo ya probado y qué evidencia nueva aportará. No reabrir una hipótesis solo cambiando semilla o nombre.
- Guarda la ficha en `docs/experimentos/<sorteo>/<algoritmo-version>/`. Reutiliza `docs/experimentos/PLANTILLA.md`: hipótesis, baseline, evento/unidad, efecto mínimo, datos ya explorados, muestra/presupuesto de cómputo, semillas, particiones, comparaciones y parada deben estar fijados antes de evaluar. Marca el protocolo como prospectivo o retrospectivo según lo realmente ocurrido.
- Distingue estados: planificado, ejecutado exploratorio, pendiente de validación nueva, cerrado sin adopción y adoptado con autorización explícita. No convertir un resultado exploratorio positivo en adopción ni uno inconcluso en equivalencia.
- Conserva corrida inmutable con identificador, snapshot o procedencia recuperable, hashes de datos/código/protocolo, parámetros, semillas, entorno y agregados suficientes para auditar la conclusión. Un hash sin contenido recuperable no permite reproducir. Rechaza sobrescrituras; identifica corridas incompletas sin presentarlas como terminadas.
- Al cerrar, informa resultados completos, incertidumbre, heterogeneidad, limitaciones, decisión y condición concreta para reabrir. Actualiza el índice, incluidos resultados negativos. Una nueva versión mantiene la ficha y conclusiones anteriores.
- No guardes millones de escenarios individuales si bastan agregados, semilla y generador. No retires artefactos o scripts por iniciativa de archivar: si el usuario pide limpieza, comprueba consumidores y conserva reglas operativas; documenta si la retirada impide reproducción exacta.
- Registrar o evaluar no autoriza producción, apuestas, publicaciones ni cambios de carteras cerradas. Respeta la autorización de la sesión sin añadir confirmaciones para trabajo offline ya solicitado.
