# Histórico de experimentos

Cierre documental: 14 de noviembre de 2026, America/Santo_Domingo. Estas líneas no aportaron evidencia suficiente para incorporarlas al producto. No se activan estrategias ni se cambian históricos operativos.

| Sorteo / algoritmo | Resultado que evita repetir trabajo | Registro |
| --- | --- | --- |
| Quinielón V6, filtros y concentración | Quitar atraso: 22/39 frente a 18/39; ROI aún −5.98%, evidencia insuficiente. Concentrar en 10: +2.56% exploratorio, sensible a un acierto y mayor riesgo. | [Informe](quinielon/seleccion-v6/README.md) |
| Super Kino pool20 y núcleo7 | 28 fechas, cero carteras con 7+; ROI −74.1%. Concentración sin ventaja demostrada. | [Informe](super-kino/pool20-v1/README.md) |
| Super Kino guiado / rangos V3 | Ocho fechas guiadas: media 4.50/20. Benchmark V3 de 58 fechas: 5.000 frente a 4.762 uniforme; diferencia con intervalo que incluye cero. | [Informe](super-kino/seleccion-rangos-v3/README.md) |
| Super Kino cuatro jugadas | Construcción equilibrada, sin ensayo de rendimiento concluido. | [Ficha](super-kino/cuatro-jugadas-v1/README.md) |

## Cómo usar este histórico

Antes de proponer una variante, revisar la lógica y las fechas ya exploradas. Repetirlas no crea evidencia independiente. Registrar qué cambia y por qué, congelar reglas y usar resultados nuevos para confirmación. Preferencias de forma, cobertura y predicción son objetivos distintos.

Los informes originales conservan parámetros, presupuestos, cortes, referencias y limitaciones. Las instrucciones de continuación incluidas en ellos son historia de sesiones cerradas. Se retiran código experimental, pruebas asociadas, JSON y CSV; los comandos antiguos dejan de estar disponibles. Este es un archivo documental, no un paquete reproducible. Los hashes del inventario identifican el material retirado, pero no permiten recuperarlo. No se han eliminado archivos previamente versionados ni pruebas de reglas operativas.

[Plantilla para próximas pruebas](PLANTILLA.md) · [Inventario retirado](INVENTARIO.md)

## Nuevos bancos de prueba

- [Bowl lab V1: millones de sorteos y cobertura de 10 dentro de 20](super-kino/bowl-lab-v1/README.md). Implementado el 14 noviembre 2026; dos millones de sorteos sintéticos y retrospectiva de 30 fechas reales. No se activa ninguna estrategia. Esta línea sí conserva código, pruebas y agregados reproducibles; la retirada documental descrita arriba corresponde al archivo anterior.

- [Nuevas fórmulas para objetivo 1%: momentum y parejas residuales](super-kino/formulas-cola-v1/README.md). Dos millones de sorteos uniformes; 0/30 fechas reales con 10+ en ambas candidatas. Sin evidencia para adopción.

- [Cobertura, costo y riesgo de carteras](super-kino/riesgo-carteras-v1/README.md). Auditoría de cartera guardada frente a uniforme y equilibrada en 100,000 escenarios; sin cambio de estrategia.

- [Reducción de presupuesto 20/50/100/200](super-kino/presupuesto-v1/README.md). Subconjuntos anidados de la cartera guardada: costo frente a cobertura y pérdida absoluta. Sin activación ni ventaja clara de la heurística frente al recorte aleatorio.

- [Estabilidad entre siete carteras y tres semillas](super-kino/estabilidad-presupuesto-v1/README.md). Piloto de420,000 sorteos nuevos. Señal exploratoria pequeña a100 jugadas, pendiente de validación con carteras nuevas;20/50 sin ventaja demostrada.

- [Cartera fija de100 V1](super-kino/fija100-v1/README.md).100 jugadas construidas desde cero y congeladas, exposición11–12; evaluación de un millón de sorteos nuevos. Pequeña mejora de7+ frente a dos referencias, con mayor frecuencia de pérdida y misma esperanza. Sin adopción operativa.

- [Aprendizaje desde cero de selecciones10](super-kino/desde-cero-v1/README.md). Módulo autónomo sin histórico ni algoritmos previos;3.45 millones de sorteos separados por fases. Sin mejora final en uniforme; aprendizaje detectado solo en control con sesgo artificial conocido.

- [Cercanía numérica±1 en carteras guardadas](super-kino/cercania-v1/README.md). Auditoría post hoc del4 al17/11,14 carteras y2800 jugadas, con exactos/vecinos separados y ganadores no reutilizados. Sin inferencia de ventaja predictiva.

- [Control de cercanía y sustituciones±1](super-kino/control-vecinos-v1/README.md). Dos controles de1000 réplicas y280,000 sorteos nuevos para variantes al mismo presupuesto. La cercanía observada no es excepcional; ninguna variante demostró mejora exacta. Cerrado sin adopción.
