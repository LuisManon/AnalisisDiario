# Loto Mas Lab

App web local para analizar resultados de Loto Mas, comparar frecuencia por dia y simular 5 jugadas contra el ultimo sorteo cargado.

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

Los resultados estan en:

```txt
data/results.json
```

Actualmente contiene 100 sorteos entre `2025-06-04` y `2026-05-30`, tomados de LotteryTexts Past Results para Loto Mas. El endpoint `/api/update` queda preparado para conectar una fuente oficial o confiable y agregar nuevos sorteos sin duplicar fechas.

## Funciones incluidas

- Dashboard con ultimo sorteo.
- Filtro por todos, miercoles o sabado.
- Top 5 por posicion.
- Top 5 del numero Mas.
- Historial visual con bolitas.
- Simulador de minimo 5 jugadas.
- API local para resultados, simulacion y actualizacion.
