# Super Kino TV ±1

Inicio: **18 de noviembre de 2026**, en America/Santo_Domingo. El calendario muestra «Sin Resultados Programados» para el 16 y 17 de noviembre y para días sin sorteo.

La vista conserva una cartera independiente de 200 jugadas. Cada jugada deriva de la misma referencia de Super Kino TV y desplaza cada uno de sus diez números exactamente −1 o +1. Los límites son 1–84, sin vueltas entre extremos, números repetidos ni combinaciones duplicadas. La semilla depende de fecha, versión y huella de la cartera original, por lo que los reintentos reproducen la selección. No usa el resultado para elegir desplazamientos.

Las carteras se guardan antes del cierre (20:55; domingos 15:55). No se reconstruyen carteras para sorteos cerrados. Solo se cuentan **aciertos exactos**; esta variante experimental no acredita una mejora predictiva.

Los registros se almacenan en `data/super-kino-neighbor-portfolios/`, separados de las carteras originales. Se conserva su origen y tabla de premios. Al registrar el resultado se congelan los números ganadores y premios; una corrección posterior no altera ese registro. La generación es idempotente y emplea comparación de versiones para evitar sobrescrituras concurrentes.

`GET /api/super-kino-neighbor/portfolio` es de lectura. El `POST` prepara la cartera permitida y registra resultados disponibles. La automatización existente lo ejecuta después de preparar Super Kino TV desde la fecha de inicio. La interfaz también sincroniza la ventana vigente. Si no se guardó una cartera a tiempo, el calendario muestra «Sin cartera guardada».

La funcionalidad requiere publicar esta versión del aplicativo para que la automatización de producción disponga del nuevo endpoint. Las pruebas usan almacenamiento temporal y resultados ficticios, sin modificar datos operativos.
