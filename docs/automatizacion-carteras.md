# Automatización de carteras y ganadores

Implementación del 8 de noviembre de 2026. Perfiles: ingeniería de software, datos y QA.

## Horarios y publicación

Todo se expresa en `America/Santo_Domingo`. Quinielón se sortea a las 12:00 y 19:00, según [La Primera](https://laprimera.do/el-quinielon/). Para Super Kino se usa 20:55 de lunes a sábado y 15:55 el domingo; Loto Más, miércoles y sábados a las 20:55. Las páginas oficiales de LEIDSA son dinámicas y no ofrecieron horarios legibles en esta revisión; los horarios publicados se contrastaron con [el directorio de resultados](https://enloteria.com/loterias/leidsa). El código preexistente de Kino conserva sus fronteras de cierre/consulta (20:55/21:00 y 15:55/16:00); el nuevo margen de publicación cuenta desde 20:55/15:55 y no cambia estrategias ni fechas de carteras históricas.

Se reservan 15 minutos tras cada sorteo sin consultar fuentes externas desde los endpoints de actualización. El contador del mensaje visible se recalcula cada 15 segundos. Pasado el margen, si falta el ganador, se muestra espera de publicación: transcurrir 15 minutos no equivale a un resultado confirmado.

## Plan y límites

Hay 12 ventanas diarias, documentadas en README.md. El bloque dominical de Kino reemplaza el bloque nocturno. Cada publicación tiene tres consultas separadas por 30 minutos; las preparaciones generales se realizan a las 08:37 y 10:37 y el reparto noche se verifica de nuevo a las 17:37. Las ventanas matutinas recuperan resultados previos, incluidas publicaciones tardías del día anterior.

El workflow pasa su cron original al planificador. Un retraso de GitHub no cambia la operación elegida. A partir de tres horas de retraso se rechaza el plan; una preparación cuyo cierre ya pasó no intenta preparar la tanda siguiente como si fuera la original.

Cada petición tiene un límite de 180 segundos sin reintentos HTTP automáticos; el job completo tiene 20 minutos. No instala dependencias: el ejecutor usa Node 22 y módulos del repositorio que no dependen de Next. Se mantienen las ejecuciones en serie para reducir conflictos de persistencia. Las ejecuciones manuales y los reintentos manuales son adicionales a las 12 ventanas programadas.

El estado de publicación inicial es `pending`; al tercer intento pendiente se marca `failed`. Los fallos de transporte sí se registran como incidencias desde el primer intento, sin impedir que se procesen los otros productos. El resultado Quinielón provisional se conserva, pero no se cuenta como confirmación oficial del job.

Una cartera solo cuenta como preparada si la respuesta corresponde a la fecha requerida y contiene jugadas. Los ganadores deben coincidir con fecha y tanda. El seguimiento Kino congela los premios de snapshots existentes y prepara la siguiente cartera cuando el resultado requerido está disponible.

## Protección y activación

Los generadores de Loto Más no crean carteras tras las 17:00 ni después de conocer el resultado; las carteras ya guardadas siguen consultables. La comparación anterior reutiliza un snapshot guardado. Los errores de lectura no se transforman en un historial vacío que pueda sobrescribirse.

Los cálculos de estrategias no cambiaron. La persistencia Vercel depende de las variables GitHub descritas en README.md. Estos cambios deben llegar a la rama predeterminada y desplegarse para operar en producción; esta implementación no dispara llamadas de prueba hacia producción.

## Verificación realizada

La suite completa terminó con 86 pruebas aprobadas, incluido el planificador, las cantidades de Loto Más, conservación histórica de Kino, asignaciones Quinielón y gestos semanales. Typecheck y build aprobados. Se verificó visualmente el mensaje con un reloj fijo en una copia temporal: a las 12:07 del domingo 8 de noviembre indica ocho minutos restantes para Quinielón Día. El reloj fijo y la página de prueba no forman parte del repositorio ni de producción.

[GitHub documenta](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) que sus cron pueden retrasarse o descartarse bajo carga. Las ventanas redundantes reducen el impacto, pero este proveedor no garantiza una hora exacta.
