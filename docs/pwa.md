# PWA de Análisis Diario

La instalación usa `/manifest.webmanifest`, modo standalone e iconos derivados del icono existente. La interfaz móvil tiene cabecera, selector superior de producto, área desplazable y menú inferior del área de trabajo: Resultados, Analizar, Jugadas (Reparto en Quinielón) e Historial. El menú se mueve al pie sin desmontar los paneles ni perder filtros. Los cuatro bordes respetan `safe-area-inset-*`; el teclado usa VisualViewport para ajustar la altura y ocultar temporalmente el menú inferior. En escritorio se conserva la navegación superior.

## Instalación

Tras publicar estos cambios con HTTPS, abrir la dirección de la aplicación en Safari en iPhone. Elegir **Compartir → Agregar a pantalla de inicio → Agregar**. Abrir el nuevo icono. La publicación se realiza mediante la integración de Vercel con la rama `main`.

El service worker solo se registra en producción. Precarga una pantalla genérica de reconexión y los iconos. No guarda HTML de resultados, respuestas de API, carteras, propietarios ni asignaciones. Las funciones de análisis requieren conexión. Una primera visita online es necesaria para preparar la pantalla sin conexión.

El icono Apple se sirve también desde la convención `app/apple-icon.png`, con enlace explícito de 180×180 y versión en la URL. Se conserva `/apple-touch-icon.png` como ruta de respaldo. Si se instaló antes de publicar estos archivos y el icono aparece vacío, quitar el acceso anterior y volver a agregarlo desde Safari después del despliegue.

## Verificación realizada

- `npm run typecheck` y `npm run build` correctos.
- 12 pruebas de caché, navegación, paginación y gestos correctas.
- Iconos PNG verificados: 192×192, 512×512 y Apple 180×180.
- Navegador integrado: 44 combinaciones de producto/área/ancho a 320, 375, 390 y 430 px, sin desbordamiento horizontal del documento ni del área central. Los calendarios y tablas conservan su desplazamiento horizontal interno cuando corresponde.
- Barras separadas del contenido y destinos táctiles de al menos 44×44 px en los cuatro anchos. Revisión visual adicional de escritorio a 1280 px.
- APIs bloqueadas mediante proxy local durante la revisión visual para evitar las escrituras automáticas existentes. Esta revisión no sustituye una prueba funcional de backend.
- Sin cambios finales en los datos del proyecto.

## Verificación pendiente en iPhone físico

El navegador integrado no emula Safari instalado ni los insets de un dispositivo físico. Comprobar en Safari y tras instalar:

1. Cabecera bajo notch/Dynamic Island y menú por encima del indicador inferior, también en horizontal.
2. Recorrer cada sección y llegar al último botón sin que lo cubran las barras.
3. Enfocar campos al final de las vistas, abrir/cerrar teclado y cambiar orientación; confirmar que se puede desplazar hasta el campo y que el menú reaparece al cerrar el teclado.
4. Abrir online, cerrar y volver a abrir sin red: aparece la pantalla de reconexión sin datos de sorteos. Restaurar la red y usar Reintentar.
5. Confirmar apertura standalone desde el icono y navegación normal en Safari.

Referencia de Apple para los metadatos de instalación: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html

## Ajuste del menú y fondo

Se unifica el lienzo de `html`, `body` y el contenedor de los tres productos a `#f3f5f9`, incluidos los bordes de sobre desplazamiento. El selector de producto queda arriba y las cuatro pestañas del área activa quedan abajo, con iconos, texto, estado activo y espacio seguro inferior. En escritorio las pestañas conservan su ubicación en el contenido.

La consulta de la web publicada durante el diagnóstico devolvió 404 para `/apple-touch-icon.png` y `/manifest.webmanifest`: las mejoras locales requieren despliegue para estar disponibles al instalar desde producción.

Verificación del ajuste: 48 combinaciones (tres productos × cuatro áreas × cuatro anchos) sin desbordamiento general, con cuatro destinos al pie de al menos 44×44 px y fondos exteriores uniformes. Escritorio a 1280 px conserva las pestañas dentro del área de trabajo. Se verificó el enlace `apple-touch-icon` del HTML y la descarga local de `/apple-icon.png?v=2`: PNG de 180×180. TypeScript, build y nueve pruebas de navegación/caché/gestos correctos. Safari e instalación física siguen pendientes.
