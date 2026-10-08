# Analisis Diario

App web para analizar resultados de Loto Mas, Quiniela Pale de LEIDSA, La Primera y Loteka Repartidera con historiales JSON, frecuencias, diagramas y sugerencias estadisticas.

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
data/loteka-repartidera-results.json
data/quiniela-pale-results.json
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

## Funciones incluidas

- Dashboard con ultimo sorteo.
- Filtro por todos, miercoles o sabado.
- Top 5 por posicion.
- Top 5 del numero Mas.
- Historial visual con bolitas.
- Simulador de minimo 5 jugadas.
- Pestañas para La Primera y Loteka.
- API para resultados, simulacion, actualizacion y persistencia.

### Super Kino TV

LEIDSA abre en Super Kino TV. El historial muestra el último año, con días sin sorteo documentados por separado. Para volver a importar el archivo histórico:

```sh
node --experimental-strip-types scripts/import-super-kino.ts
```

Las 120 jugadas diarias se guardan en `data/super-kino-portfolio-history.json` como exploratorias: cada una combina 3 calientes, 3 intermedios y 4 fríos. La página muestra una muestra de 30 y permite descargar la cartera completa en TXT. El análisis mantiene el corte conservador del 15/09/2026 para no mezclar el antiguo universo de 80 números. Antes de cada nueva cartera, `kino-v5` excluye los números cuya última salida sea anterior a un mes calendario antes del sorteo objetivo; después reclasifica los números elegibles en tres grupos equilibrados. Al menos 30 jugadas se refuerzan usando en sus tres posiciones calientes números del grupo caliente cuyo promedio de los tres intervalos de aparición más recientes sea de 1 a 2 sorteos. El corte, los excluidos y los calientes rápidos quedan guardados en la cartera. Las jugadas usan los últimos 30 sorteos disponibles anteriores al objetivo y quedan fijas; los filtros solo cambian las estadísticas. Los premios se evalúan exclusivamente sobre jugadas guardadas antes del cierre, con su tabla de pagos guardada. No se crean evaluaciones retrospectivas. Las carteras antiguas conservan sus perfiles originales.

Sobre las jugadas guardadas se muestra un calendario de lunes a domingo. Cada día agrupa cuántas jugadas cobraron cada monto y el total ganado, sin repetir los números del sorteo ni las combinaciones. Los días pasados sin cartera guardada aparecen como `Sin registro`; los días sin resultado aparecen como `Pendiente`.

Con la sección abierta, se consulta cada 60 segundos si falta el sorteo esperado: desde las 21:00 de lunes a sábado y las 16:00 los domingos, hora dominicana. El cierre de generación es cinco minutos antes. Si el resultado sigue pendiente, se conservan sus jugadas y no se generan las del siguiente sorteo hasta recibirlo.

### Rotación inteligente de Quinielón 2.0

`tiers-v4` conserva los niveles del reparto previo de la misma tanda cuando hay un ganador caliente o intermedio y aplica la rotación al sorteo siguiente: caliente ganador → restante, intermedio de Casa → caliente, restante → intermedio; o intermedio ganador → restante y restante → intermedio. Si el ganador no tuvo dueño porque un indicador de hielo lo excluyó, se calcula el nivel que ocuparía al reingresar y se aplica la misma rotación antes de repartirlo. Los reemplazos elegibles siguen el ranking actual. Los cambios quedan registrados en `winnerRotation`, con apuesta mínima de RD$500 para el ganador anterior. Se mantienen los cupos, inversiones y bloqueos de propiedad; si no existe una distribución válida, se conserva el reparto anterior y se informa el impedimento. Los repartos cerrados no se modifican.
