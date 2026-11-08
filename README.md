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

El flujo `.github/workflows/prepare-portfolios.yml` ejecuta `scripts/automate-portfolios.ts` sin depender de visitas a la web. Hay 12 ejecuciones programadas por día en hora dominicana:

- los repartos Día y Noche de Quinielón 2.0;
- las carteras de Super Kino TV según su versión activa;
- las 30 jugadas de Loto Más.

| Operación | Hora dominicana |
| --- | --- |
| Recuperar ganadores anteriores y preparar carteras de los tres productos | 08:37 y 10:37 |
| Consultar ganador Quinielón Día | 12:17, 12:47, 13:17 |
| Verificar/preparar reparto Quinielón Noche | 17:37 |
| Consultar ganador Quinielón Noche | 19:17, 19:47, 20:17 |
| Consultar Super Kino y Loto Más (Loto solo miércoles/sábado) | 21:17, 21:47, 22:17 de lunes a sábado |
| Consultar Super Kino el domingo, en lugar del bloque nocturno | 16:17, 16:47, 17:17 |

Durante los primeros 15 minutos posteriores al sorteo, la web muestra **Sorteo en curso** con minutos restantes y los endpoints no consultan fuentes externas. La primera ventana programada queda después de ese margen. Un resultado no publicado se registra como pendiente en los primeros intentos; en el último se señala como incidencia. Cada llamada tiene un límite de 180 segundos y no hay reintentos HTTP internos; los productos restantes continúan aunque otro falle. El resumen queda en GitHub Actions.

El plan usa `github.event.schedule`, no la hora de arranque, y rechaza ventanas con más de tres horas de retraso. Los cron contemplan el cambio de fecha UTC para las consultas nocturnas. Loto Más conserva el cierre de generación a las 17:00; no se crean carteras retrospectivas para un sorteo cerrado.

Para activarlo hay que publicar el workflow en la rama predeterminada, desplegar los endpoints y tener configurada la persistencia GitHub en Vercel. Opcionalmente configura la variable de repositorio `APP_URL`. La ejecución manual solicita el cron exacto de la ventana que se desea reintentar; tampoco ejecuta todos los intentos del día. GitHub puede retrasar u omitir cron bajo alta carga: los horarios son objetivos de ejecución, no una garantía de puntualidad. Consulta [la documentación de GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Funciones incluidas

- Dashboard con ultimo sorteo.
- Filtro por todos, miercoles o sabado.
- Top 5 por posicion.
- Top 5 del numero Mas.
- Historial visual con bolitas.
- Simulador de minimo 5 jugadas.
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

Con la sección abierta, se consulta cada 60 segundos si falta el sorteo esperado: desde las 21:00 de lunes a sábado y las 16:00 los domingos, hora dominicana. El cierre de generación es cinco minutos antes. Si el resultado sigue pendiente, se conservan sus jugadas y no se generan las del siguiente sorteo hasta recibirlo.

### Rotación inteligente de Quinielón 2.0

`tiers-v4` conserva los niveles del reparto previo de la misma tanda cuando hay un ganador caliente o intermedio y aplica la rotación al sorteo siguiente: caliente ganador → restante, intermedio de Casa → caliente, restante → intermedio; o intermedio ganador → restante y restante → intermedio. Si el ganador no tuvo dueño porque un indicador de hielo lo excluyó, se calcula el nivel que ocuparía al reingresar y se aplica la misma rotación antes de repartirlo. Los reemplazos elegibles siguen el ranking actual. Los cambios quedan registrados en `winnerRotation`, con apuesta mínima de RD$500 para el ganador anterior. Se mantienen los cupos, inversiones y bloqueos de propiedad; si no existe una distribución válida, se conserva el reparto anterior y se informa el impedimento. Los repartos cerrados no se modifican.
