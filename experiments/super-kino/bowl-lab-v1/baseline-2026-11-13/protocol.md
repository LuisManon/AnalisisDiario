# Bowl lab V1: cobertura de 10 ganadores dentro de 20

Fijado el 14 noviembre 2026 antes de la primera corrida. Estado: experimento offline, sin activación. El usuario confirmó que el objetivo es contener al menos 10 ganadores en el pool de 20; no seleccionar una jugada de 10 perfecta.

## Hipótesis y modelo

Un bowl ideal bien mezclado extrae 20 números de 84 sin reemplazo. Se modela la probabilidad de extracción, no posiciones, colisiones ni succión física. No disponemos de masas, diámetros, flujo de aire, mantenimiento, identificadores de juegos de bolas ni orden de extracción certificado. Inventar esos parámetros no mejora la predicción. Cada sorteo repone las 84 bolas y usa una fuente pseudoaleatoria reproducible separada del selector.

Modelo nulo: todas las bolas tienen igual peso. Para cualquier pool de 20 elegido sin conocer el ganador, X sigue hipergeométrica(84,20,20):

`P(X=k)=C(20,k) C(64,20-k) / C(84,20)`.

Media 400/84 = 4.7619; P(X>=10) = 0.0030942673, aproximadamente uno de cada 323. No existe un pool que garantice 10: hay 64 bolas fuera del pool, suficientes para que salgan 20 sin ningún acierto. La fórmula exacta evita gastar simulaciones para estimar algo que ya se conoce.

Segundo escenario: peso 1.20 para las 28 bolas de un rango y 1 para las demás. Es una desviación INVENTADA, favorable a un selector que conoce ese rango de antemano; sirve como control positivo/sensibilidad, no como estimación del bowl real ni hallazgo histórico. Se extrae proporcionalmente al peso entre las bolas restantes, no con reemplazo. No extrapolar resultados de este mundo al real.

## Selectores congelados

Cada sorteo produce un nuevo pool aleatorio de 20 únicos ANTES de generar su ganador. Se comparan sobre los mismos ganadores, con flujos aleatorios propios:

1. `uniform`: muestreo uniforme de 20/84, referencia primaria.
2. `range10`: rangos iguales 1–28,29–56,57–84; 10 números aleatorios del rango de mayor frecuencia previa acumulada, 5 de cada otro. Empates: rango inferior. Se prueba concentración 10/5/5, distinta de la antigua 8/7/5; no se reivindica que inclinar rangos sea una idea nueva.
3. `frequency`: muestreo secuencial ponderado sin reemplazo. Peso de cada número `(conteo previo + 30*20/84)/(sorteos previos + 30)`. Contracción fija de 30 sorteos hacia uniforme. Sin filtros de paridad, decenas ni secuencias, sin búsqueda del mejor pool.

En escenarios sintéticos se fija el modelo aprendido al corte; no se aprende de resultados inventados ni se usan para modificar el histórico. En retrospectiva se recalculan pesos y rango usando exclusivamente fechas anteriores al objetivo.

## Datos y evaluación

Reutilizar `prepareKinoExperimentData`: esquema completo, fechas únicas, corte explícito y régimen observado desde 15 septiembre 2026. Esa fecha es el primer 81–84 observado en el archivo; no certifica un cambio oficial. Se excluye historia anterior para no mezclar regímenes.

Corte inicial 13 noviembre 2026. Los 30 primeros registros son calentamiento; se informa todo lo posterior mediante retrospectiva caminante. Se conserva el diagnóstico temporal del cargador, pero NO se denomina holdout independiente: el archivo ya fue examinado en otros experimentos. No ajustar sobre las últimas fechas ni elegir una semilla por premios. Conservar snapshot, hash de datos, protocolo, código, semilla, versión y Node.

Cien selecciones por fecha real solo promedian el ruido del selector. No aumentan el número de resultados reales ni justifican intervalos binomiales sobre fechas*100. Informar fechas reales y métricas por fecha; los resultados reales son descriptivos, sin selección automática de ganadora ni afirmación de significancia.

Métrica primaria: proporción de sorteos con X>=10. Secundarias: media e histograma 0..20. No calcular premios para un pool de 20: no es un boleto. Bajo el modelo nulo, las tres políticas tienen la misma distribución marginal exacta. Wilson95% informa incertidumbre Monte Carlo de cada tasa sintética, no incertidumbre física ni un intervalo pareado de diferencias.

## Presupuesto, parada y decisión

Primera corrida: 1,000,000 sorteos por escenario, 2,000,000 en total, semilla `kino-bowl-lab-v1/20261114`, sin buscar semillas alternativas. Generar y descartar cada sorteo en memoria; guardar agregados, no millones de archivos. CLI permite hasta 100 millones por escenario con otra identificación; rechaza sobrescritura. No hay procesos programados.

No reducir simulaciones a medida que una corrida parezca mejor. Para p≈0.00309, un millón produce unos 3,094 eventos y semiancho Monte Carlo95% ≈0.000109 absoluto (0.0109 puntos porcentuales). Menos simulaciones empeora la precisión; datos reales nuevos y fórmulas exactas pueden ahorrar cálculo. No confundir fineza de estimación con capacidad predictiva.

Para reabrir una candidata: definir y congelar otra versión; hipótesis de sesgo estable, tamaño de efecto económico/práctico (inicialmente +0.1 puntos porcentuales absolutos en 10+), análisis de potencia y fechas futuras reservadas antes de evaluar. Exigir intervalo pareado por bloques que excluya cero frente a uniforme y estabilidad temporal antes de considerar mejora, con control de comparaciones. Esta primera corrida no satisface esa validación. No usar un tamaño corto arbitrario como garantía.

## Ejecución

`node --experimental-strip-types scripts/run-kino-bowl-lab.ts --iterations=1000000 --cutoff=2026-11-13 --run-id=baseline-2026-11-13`

Salida exclusiva: `experiments/super-kino/bowl-lab-v1/<run-id>/`. No toca data/, endpoints, carteras, propietarios ni algoritmos operativos. `report.json` conserva resultados por fecha y parámetros; `SUMMARY.md` es el informe legible.

Fuentes de diseño: histórico local y [experimentos previos](../seleccion-rangos-v3/README.md). La simulación de bowl no pretende reconstruir el dispositivo físico a partir de resultados publicados.
