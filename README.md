# Analisis Diario

App web para analizar resultados de Loto Mas, La Primera y Loteka Repartidera con historiales JSON, frecuencias, diagramas y sugerencias estadisticas.

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
