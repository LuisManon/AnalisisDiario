# Ventanas automáticas vencidas

El correo del run 42512740415 (ca17403) se debió a que la ventana de las 10:37 RD se ejecutó aproximadamente a las 14:59 RD del 8 de noviembre de 2026. El planificador lanzaba una excepción antes de verificar los datos.

Ahora, una ventana con más de tres horas de retraso reconstruye sus objetivos originales y consulta exclusivamente `/api/automation/status`. No llama importadores, generadores ni repartidores. No cambia fechas a la siguiente tanda ni toca registros cerrados.

- Todos los registros presentes: advertencia de retraso y ejecución satisfactoria.
- Falta algún registro, resultado confirmado o falla el almacenamiento: ejecución fallida, con detalle por operación, incluso si era un intento temprano.
- Ventanas vigentes: conservan generación, intentos, comprobaciones y fallos existentes.
- Una preparación que llegó después del cierre dentro de las tres horas sigue señalándose como fallo. No se oculta una tanda perdida.

El endpoint devuelve solo fecha, tanda y disponibilidad; usa los lectores del almacenamiento configurado sin fallback local para archivos individuales de Kino/Quinielón cuando GitHub está habilitado. Las carteras Kino se validan con el esquema existente y se excluyen retrospectivas; los repartos se validan y también se excluyen simulaciones.

Esto no corrige los retrasos externos del scheduler ni recupera automáticamente datos ausentes. No se eliminan las notificaciones de GitHub. Para activar la corrección deben publicarse tanto el endpoint de la app como el script del workflow; un endpoint aún no desplegado dará un fallo visible, no una falsa verificación exitosa.

Pruebas: reproducción de la hora del correo con fetch simulado, métodos GET exclusivamente, conservación de objetivos, faltantes, errores HTTP, frontera de tres horas, medianoche dominicana, cron inválido y resultados provisionales. Ningún test escribe producción.
