# Estabilidad de recortes por cobertura, V1

Estado: planificado, 14 noviembre 2026, antes de ejecutar. Gestión aplicada: `.agents/skills/gestion-experimentos/SKILL.md`. Extiende presupuesto-v1, que solo estudió una cartera y una semilla y no mostró diferencia clara. No se cambian fórmula ni parámetros con este nuevo ensayo.

Hipótesis: el orden greedy existente para recortar una cartera conserva una mejora práctica y estable de alguna jugada 7+ frente a un recorte aleatorio al mismo costo, entre varias carteras V13.3. No es una hipótesis de predicción de números ni de rentabilidad.

## Diseño congelado

Siete snapshots guardados: 2,4,6,8,10,12,14 noviembre 2026. Selección por fechas alternas prefijadas desde activación V13.3, no por premios. Verificar schema, algoritmo y 200 jugadas; fallar si falta una fecha, sin sustituirla por una más favorable. No usar ganadores históricos ni generadores para reemplazar carteras. Es cobertura sintética condicionada a snapshots ya existentes, no emisiones históricas nuevas ni holdout prospectivo de apuestas.

Tres semillas de orden por snapshot: `kino-budget-stability-v1/subset/<fecha>/<0|1|2>`, usadas por ambos modos random/coverage del constructor existente. Presupuestos anidados 20,50,100 y referencia200; costo RD$25/jugada. Tabla de premios idéntica entre snapshots como invariante. La suma de intersecciones de pares 7+ es un objetivo auxiliar, no certificado de cobertura óptima.

20,000 sorteos uniformes nuevos por pareja snapshot/semilla, flujo independiente `kino-budget-stability-v1/draws/<fecha>/<semilla>`. Mismos ganadores en ambos métodos y todos los presupuestos de una pareja. Total 21 parejas y 420,000 sorteos sintéticos. No inspeccionar resultados parciales para detener o ampliar. No entrenar con estos escenarios ni retocar reglas.

## Métricas e inferencia

Primaria: diferencia coverage−random de tasa 7+ por presupuesto. Agrupar primero las tres semillas dentro de cada fecha, luego promediar las siete fechas con igual peso. Semillas no cuentan como fechas independientes. Informar además todas las réplicas, tasas7+/8+, cobertura retenida ante200, frecuencia de pérdida y exposición; intervalos normales Monte Carlo pareados dentro de cada réplica.

Heterogeneidad: diferencias por fecha, mínimo/máximo y número de fechas positivas. Bootstrap exploratorio por clusters de snapshot/fecha con 6,000 réplicas, misma muestra de clusters para tres presupuestos. Ajuste Bonferroni de cuantiles para familia de tres comparaciones (intervalos nominales98.333% cada uno). No son intervalos certificados: siete clusters y selección fija de fechas limitan su interpretación; no prueban generalización a toda cartera ni corrigen exploraciones anteriores. Mostrar separadamente error Monte Carlo por réplica y variación por snapshot.

Puerta exploratoria previa por presupuesto: diferencia media al menos +0.1 puntos porcentuales absolutos, límite inferior del intervalo ajustado >0, al menos 5/7 fechas positivas y ninguna fecha peor que −0.1 puntos porcentuales. Superarla solo justifica validación con carteras nuevas; no adopción. Si no se supera, declarar sin ventaja demostrada, no equivalencia. 200 es identidad de control, excluida de las tres pruebas.

Es un piloto de heterogeneidad, sin potencia garantizada para0.1pp. No se ajusta presupuesto de cómputo después de observarlo. Para confirmación se fijará muestra según varianza entre carteras observada aquí y potencia/efecto antes de nuevas carteras. Más sorteos de una cartera no suplen más carteras.

## Trazabilidad y parada

Una corrida, sin búsqueda de semillas; guardar snapshot completo de entradas, índices de subconjuntos, hash de código/protocolo/datos, entorno y agregados por réplica. Carpeta experiments/super-kino/estabilidad-presupuesto-v1/<run-id>; rechazar sobrescritura. Cerrar con decisión y condición para reabrir en docs/experimentos. No escribir data/, activar estrategias, modificar carteras cerradas ni publicar. Reproducción con mismo contenido/semillas no es evidencia nueva.
