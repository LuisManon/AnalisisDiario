# Analisis Diario

App web para analizar Super Kino TV, El Quinielón 2.0 y Loto Más con historiales JSON, frecuencias, carteras y sugerencias estadísticas.

## Requisitos

- Node.js 22 o superior.
- macOS en la misma red Wi-Fi que los equipos que entraran a la app.

Tu Node actual puede verificarse con:

```bash
node --version
```

Si usas `nvm`:

```bash
nvm install
nvm use
```

## Instalar

```bash
npm install
```

## Correr en red local

```bash
npm run dev:lan
```

Desde esta Mac:

```txt
http://localhost:3000
```

Desde otra laptop en tu casa:

```txt
http://10.0.0.49:3000
```

## Datos

Los resultados locales estan en:

```txt
data/results.json
data/la-primera-results.json
data/super-kino-results.json
```

En desarrollo local, los endpoints escriben directamente estos archivos JSON.

En Vercel, el sistema puede guardar cambios permanentemente en GitHub usando variables de entorno.

## Persistencia En Vercel

Para que los endpoints guarden nuevos resultados permanentemente en el repo, agrega estas variables en Vercel:

```txt
GITHUB_TOKEN=token_personal_de_github
GITHUB_REPOSITORY=LuisManon/AnalisisDiario
GITHUB_BRANCH=main
GITHUB_COMMITTER_NAME=Analisis Diario
GITHUB_COMMITTER_EMAIL=tu-email-de-github
```

El token necesita permiso de lectura y escritura sobre Contents del repositorio. Con un Fine-grained personal access token:

```txt
Repository access: AnalisisDiario
Permissions: Contents read and write
```

Despues de guardar las variables, redeploya el proyecto en Vercel.

## Generación automática

El flujo `.github/workflows/prepare-portfolios.yml` ejecuta `scripts/automate-portfolios.ts` sin depender de visitas a la web. Hay 14 ejecuciones programadas por día en hora dominicana:

- los repartos Día y Noche de Quinielón 2.0;
- las carteras de Super Kino TV según su versión activa;
- las 30 jugadas de Loto Más.

| Operación | Hora dominicana |
| --- | --- |
| Recuperar ganadores anteriores y preparar carteras de los tres productos | 08:37 y 10:37 |
| Consultar ganador Quinielón Día | 12:17, 12:47, 13:17 |
| Verificar/preparar reparto Quinielón Noche | 13:37, 15:37 y 17:37 |
| Consultar ganador Quinielón Noche | 19:17, 19:47, 20:17 |
| Consultar Super Kino y Loto Más (Loto solo miércoles/sábado) | 21:17, 21:47, 22:17 de lunes a sábado |
| Consultar Super Kino el domingo, en lugar del bloque nocturno | 16:17, 16:47, 17:17 |

Durante los primeros 15 minutos posteriores al sorteo, la web muestra **Sorteo en curso** con minutos restantes y los endpoints no consultan fuentes externas. La primera ventana programada queda después de ese margen. Un resultado no publicado se registra como pendiente en los primeros intentos; en el último se señala como incidencia. Cada llamada tiene un límite de 180 segundos y no hay reintentos HTTP internos; los productos restantes continúan aunque otro falle. El resumen queda en GitHub Actions.

El plan usa `github.event.schedule`, no la hora de arranque, y convierte ventanas con más de seis horas de retraso en verificaciones de registros guardados. Los cron contemplan el cambio de fecha UTC para las consultas nocturnas. Loto Más conserva el cierre de generación a las 17:00; no se crean carteras retrospectivas para un sorteo cerrado.

Para activarlo hay que publicar el workflow en la rama predeterminada, desplegar los endpoints y tener configurada la persistencia GitHub en Vercel. El workflow instala y compila la aplicación y levanta un servidor temporal en `127.0.0.1:3000` dentro de GitHub Actions: generación, importaciones y congelación de premios consumen CPU del runner, sin llamar a Vercel. Usa el `GITHUB_TOKEN` del workflow con permiso `contents: write` para persistir en la rama predeterminada; el checkout no se usa para sobrescribir datos remotos. No necesita `APP_URL` ni un token personal adicional. Los commits de datos realizados con ese token no disparan otros workflows de GitHub Actions.

En Vercel (`VERCEL`), Super Kino y Loto Más consultan carteras guardadas y los endpoints de actualización consultan resultados guardados, sin importar fuentes ni generar carteras. La vista ±1 solo consulta registros; sus evaluaciones y guardados ocurren en Actions. Las lecturas remotas y las vistas calculadas comparten ventanas de vencimiento alineadas de hasta 60 segundos por instancia. Las APIs declaran `no-store` al navegador y a la CDN para evitar que otra capa renueve datos antiguos. La página inicial estática conserva su caché de despliegue. Las carteras Kino ya validadas se reutilizan si el contenido no cambió. El reparto Quinielón existente se devuelve sin reconstruir rankings y Vercel rechaza cambios de modo que requieran generarlo. Las consultas automáticas de Kino, Loto y Quinielón se espacian a cinco minutos y se omiten cuando la pestaña está oculta. Una pausa de Vercel por cuota ya acumulada requiere que Vercel restablezca el servicio: este cambio reduce consumo futuro, no borra el uso previo. La ejecución manual solicita el cron exacto de la ventana que se desea reintentar; tampoco ejecuta todos los intentos del día. GitHub puede retrasar u omitir cron bajo alta carga: los horarios son objetivos de ejecución, no una garantía de puntualidad. Consulta [la documentación de GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

La página principal se genera estáticamente: cada producto carga su histórico al abrirse mediante `/api/results?product=kino|loto|quinielon`, sin recalcular estadísticas en ese endpoint. Las vistas públicas de carteras (`?view=compact`, también predeterminadas en Vercel) devuelven la cartera actual y resúmenes del calendario; Kino incluye además la última cartera evaluable para su postgame. El detalle histórico se consulta con `?date=YYYY-MM-DD`, leyendo exclusivamente el archivo de esa fecha. Los resúmenes respetan premios congelados; estas lecturas no crean ni modifican carteras. Las validaciones ±1 se reutilizan mientras no cambie el contenido y las vistas públicas comparten las mismas ventanas de caché de un minuto.

Actions publica al terminar cada ejecución los índices derivados `data/public-portfolios/kino.json` y `neighbor.json`, incluso si una fuente de resultados falló: solo proyecta carteras ya guardadas, sin generarlas ni modificar premios. Los índices incluyen una versión de sus fuentes. Vercel lee el índice y únicamente las carteras actual y de postgame; no recorre el archivo histórico para preparar el calendario. Si falta un índice, informa fallo de lectura en lugar de reconstruirlo dentro de Vercel. El bootstrap inicial se realiza con `node --experimental-strip-types scripts/build-public-portfolio-indexes.ts` sobre los archivos locales existentes. No requiere regenerar jugadas.

`POST /api/update`, `POST /api/super-kino-neighbor/portfolio` y `POST /api/automation/publish` devuelven 405 en Vercel antes de leer el cuerpo o tocar almacenamiento. La preparación e importación quedan en el trabajador local de Actions. Quinielón reintenta cada minuto mientras falte el reparto, sin solapar consultas del temporizador y sin consultar con la pestaña oculta. Loto usa una sola lectura de resultados y otra del historial de carteras para construir su vista; la generación del trabajador recibe ese mismo historial y las lecturas de Vercel nunca generan jugadas.

Se retiraron los endpoints antiguos `/api/virtual-ticket` y `/api/simulate`, sus almacenes sin consumidores y el esquema exclusivo de la petición de simulación. Se conservan los datos históricos y las funciones de dominio utilizadas por premios y pruebas.

## Consultas y despliegues de datos

`vercel.json` configura `node scripts/ignore-data-deployment.mjs` como Ignored Build Step. Solo omite builds de producción cuando todos los cambios desde el último despliegue correcto son resultados, carteras, asignaciones o índices leídos en GitHub y la persistencia remota está configurada. Un cambio de código, configuración, `data/super-kino-no-draws.json` (importado al compilar), una eliminación o una base Git no disponible exige build. En clones poco profundos puede faltar esa base: el script conserva el build como opción segura. Referencias: [ignoreCommand](https://vercel.com/docs/project-configuration/vercel-json#ignorecommand), [variable del despliegue previo](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_git_previous_sha).

La consulta de `/api/results` calcula un ETag del texto guardado antes de validar el histórico. Si `If-None-Match` coincide, responde 304 sin cuerpo ni validación completa. `?version=1` permite consultar únicamente la versión; una corrección del resultado también la cambia aunque la fecha y cantidad de sorteos permanezcan iguales. El contenedor mantiene una sola copia de resultados por producto y comparte peticiones concurrentes; los dashboards no vuelven a consultar los endpoints de importación. El coordinador común suspende consultas ocultas, actualiza al volver a una vista desactualizada, evita solapamientos y reintenta con espera creciente. Las carteras se consultan por separado porque pueden guardarse después del resultado sin que el histórico cambie.

Los detalles históricos se conservan en memoria del navegador por fecha y versión del índice; elegir otra fecha y volver no repite la descarga. Una nueva versión invalida esa copia. Las carteras inexistentes se vuelven a comprobar después de un minuto, sin guardarse indefinidamente. Esta memoria está limitada y no utiliza almacenamiento persistente del navegador.

## Medición de rendimiento

La CPU facturable se mide en Vercel Usage/Observability. `Server-Timing: results` y los eventos JSON `results-read` registran **tiempo transcurrido**, producto, estado 200/304 y versión: no representan CPU facturable. Los 304 permiten comprobar cuántas descargas completas se evitaron. No se registran resultados, credenciales ni datos personales.

La muestra observada antes de este cambio está en `docs/performance/baseline-2026-11-23.json`. Su período es de cinco minutos y no demuestra ahorro mensual. Para medir CPU por ruta y por día, guardar lecturas reales de Vercel con `date` en America/Santo_Domingo, `windowMinutes: 1440`, el mismo `environment` y filas `{route, invocations, cpuMs}`. Comparar dos días completos de duración y entorno iguales con:

```bash
node --experimental-strip-types scripts/compare-performance-samples.ts antes.json despues.json
```

En Hobby, el panel observado permite ventanas de hasta 12 horas por función. Para obtener un día sin contratar más retención, se pueden guardar dos ventanas exactas de 12 horas (o más ventanas menores) con `from`, `to` en ISO y `complete: true` solo después de capturar todas las filas. El agregador valida que cubran las 00:00–24:00 de America/Santo_Domingo sin huecos ni solapamientos:

```bash
node --experimental-strip-types scripts/aggregate-performance-day.ts 2026-11-23 manana.json tarde.json
```

La comparación usa CPU / invocaciones por ruta, informa datos ausentes y rechaza ventanas incompatibles. No proyecta una muestra corta a todo el mes ni atribuye causalidad a diferencias de tráfico. No se ha creado una automatización ni contratado observabilidad adicional.

## Funciones incluidas

- Dashboard con ultimo sorteo.
- Filtro por todos, miercoles o sabado.
- Top 5 por posicion.
- Top 5 del numero Mas.
- Historial visual con bolitas.
- Menú directo para Super Kino TV, El Quinielón 2.0 y Loto Más.
- API para resultados, simulacion, actualizacion y persistencia.

### Super Kino TV

LEIDSA abre en Super Kino TV. El historial muestra el último año, con días sin sorteo documentados por separado. Para volver a importar el archivo histórico:

```sh
node --experimental-strip-types scripts/import-super-kino.ts
```

Las carteras diarias se guardan por fecha en `data/super-kino-portfolios/`, con un índice pequeño en `index.json`. Esta estructura evita que el historial completo dependa de un único archivo y permite que crezca sin superar los límites de lectura de GitHub. La página muestra una muestra de 30 jugadas y permite descargar la cartera completa en TXT. Las jugadas quedan fijas antes del cierre y los premios se evalúan exclusivamente sobre esas carteras guardadas, con su tabla de pagos y seguimiento congelados. No se crean evaluaciones retrospectivas y las carteras antiguas conservan la estrategia con la que fueron generadas.

Sobre las jugadas guardadas se muestra un calendario de lunes a domingo. Cada día agrupa cuántas jugadas cobraron cada monto y el total ganado, sin repetir los números del sorteo ni las combinaciones. Al llegar un resultado, el resumen y los 20 números usados para evaluarlo quedan grabados en la cartera de ese día; el calendario y el detalle reutilizan ese registro para conservar el seguimiento aunque cambien después el resultado importado o el generador. Los días pasados sin cartera guardada aparecen como `Sin registro`; los días sin resultado aparecen como `Pendiente`.

La candidata experimental Kino V11 se compara con V10 mediante una retrospectiva caminante que nunca usa el resultado del día evaluado. No se activa automáticamente en producción. Para repetir la evaluación y separar entrenamiento de validación:

```bash
npm run evaluate:kino-v11
```

Desde el 01/11/2026, Kino V12 genera 200 jugadas con cobertura global 100/0: los 84 números aparecen 23 o 24 veces y no se utiliza la señal de V10. Ningún número se excluye; el constructor equilibra cuotas, parejas repetidas y similitud entre jugadas. La comparación retrospectiva de pesos se reproduce con `npm run evaluate:kino-v12`.

Con la sección abierta y visible, se consulta cada cinco minutos si falta el sorteo esperado: desde las 21:00 de lunes a sábado y las 16:00 los domingos, hora dominicana. El cierre de generación es cinco minutos antes. Si el resultado sigue pendiente, se conservan sus jugadas y no se generan las del siguiente sorteo hasta recibirlo.

### Rotación inteligente de Quinielón 2.0

`tiers-v4` conserva los niveles del reparto previo de la misma tanda cuando hay un ganador caliente o intermedio y aplica la rotación al sorteo siguiente: caliente ganador → restante, intermedio de Casa → caliente, restante → intermedio; o intermedio ganador → restante y restante → intermedio. Si el ganador no tuvo dueño porque un indicador de hielo lo excluyó, se calcula el nivel que ocuparía al reingresar y se aplica la misma rotación antes de repartirlo. Los reemplazos elegibles siguen el ranking actual. Los cambios quedan registrados en `winnerRotation`, con apuesta mínima de RD$500 para el ganador anterior. Se mantienen los cupos, inversiones y bloqueos de propiedad; si no existe una distribución válida, se conserva el reparto anterior y se informa el impedimento. Los repartos cerrados no se modifican.
