# Loto Más: resultados de la retrospectiva por día

Se aplicaron los perfiles matemático, ciencia/ingeniería de datos y software. Resultado válido: `experiments/loto-mas/days-v2.json`; sustituye la comparación preliminar V1 por corrección del desempate temporal del Más. No se ajustaron pesos para mejorar los resultados observados.

24 fechas del 19 agosto al 7 noviembre 2026: doce miércoles y doce sábados. Cada objetivo usa solo el historial anterior, con 30 jugadas. No hubo fallos de generación en la corrida válida. Se evalúan reconstrucciones, no compras reales ni necesariamente las mismas carteras históricas archivadas. Las réplicas aleatorias no son 480 sorteos independientes adicionales.

| Variante | Fechas con alguna jugada 3+ | Fechas con alguna jugada 4+ | Premios brutos de referencia |
| --- | ---: | ---: | ---: |
| Base anterior, reconstruida | 15/24 | 0/24 | RD$3,800 |
| Base con solo Más por día | 15/24 | 0/24 | RD$4,700 |
| V5: días separados y descartes suavizados | 16/24 | 1/24 | RD$5,000 |
| Aleatoria con Más por día, media de 20 réplicas | 15.1/24 | 1.3/24 | RD$5,455 |

Los importes usan la tabla del aplicativo, sin validación de pagos históricos, costo ni retenciones: no son beneficio neto ni prueba de rentabilidad. La nueva variante tuvo 22 jugadas de tres principales y una de cuatro; ninguna de cinco o seis. Su única fecha de cuatro fue el miércoles 2 de septiembre. En las últimas ocho fechas no hubo cuatro principales en ninguna de las tres variantes deterministas; V5 logró 3+ en seis, la base en cinco. No existe ventaja predictiva demostrada frente a la referencia aleatoria.

Por día, V5 obtuvo RD$3,200 de referencia los miércoles y RD$1,800 los sábados; la base, RD$1,300 y RD$2,500. Los miércoles tuvieron nueve fechas 3+ y una 4+; los sábados, siete fechas 3+ y ninguna 4+. No se debe concluir que un día es más predecible con doce observaciones.

## El Más

El Top 5 global cubrió el Más ganador en 11/24 fechas; el Top 5 por día en 10/24. Miércoles mejora de 4/12 a 6/12; sábado baja de 7/12 a 4/12. El cambio cumple la independencia solicitada, pero no demuestra mejora general de cobertura. Cinco Más asignados seis veces mantienen la misma exposición; acertar el Más por sí solo no alcanza necesariamente premio.

`buildPlusOrder` ordena internamente por fecha antes de desempatar frecuencias. Esto evita resultados distintos según el orden del llamador. La versión V5 usa solo el día objetivo para principales, rangos, puntuaciones y Más, y conserva diversidad y cuotas 10/10/10. Los dos antiguos descartes duros (cercanía P1–P3 y atraso posicional) se sustituyen por indicadores/puntuación; la variante estrictamente separada con esos filtros solo logró 29 jugadas en una regresión. Como se modifican varias piezas, esta corrida no identifica cuál aporta la diferencia.

## Decisión y mejoras siguientes

- Se implementó localmente `v5-independent-days` para respetar la separación funcional pedida; no se publica ni se declara estrategia rentable.
- Se mantienen las carteras cerradas. No se ejecutaron endpoints ni se escribieron datos operativos; las nuevas generaciones aplicarán la versión nueva. Una cartera abierta puede regenerarse por versión antes del cierre mediante el almacenamiento existente.
- Rangos de P1–P6 son distribuciones de seis números ordenados: no son, por sí mismos, una señal predictiva. Se usan como puntuación, no como garantía de exclusión.
- Próximas ablaciones independientes: contribución de parejas/tríos y frecuencia frente a azar; comparar amplitud del Más sin concentración exclusiva en cinco, manteniendo presupuesto; medir solapamiento y cobertura sin perseguir la mejor fecha del pasado. No lanzar búsquedas ilimitadas de pesos.
- La siguiente validación debe congelar carteras antes de nuevos sorteos y mantener reglas fijas. La comparación temporal de estas ocho fechas ya conocidas no equivale a prueba prospectiva.

Ejemplo calculado con el historial local hasta 7 noviembre: para el miércoles 11, el Top 5 histórico del Más es 12, 10, 04, 01, 09; para el sábado 14 es 01, 05, 03, 10, 12. Son rankings históricos, no probabilidades calibradas ni predicciones garantizadas; pueden actualizarse con nuevos resultados disponibles antes del objetivo.

Reproducción y limitaciones: `docs/loto-days-protocol-v1.md`. El runner conserva la corrida corregida y rechaza sobrescribirla.
