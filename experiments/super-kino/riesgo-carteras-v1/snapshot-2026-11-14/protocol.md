# Cobertura y riesgo de carteras V1

Protocolo del 14 noviembre 2026, antes de ejecutar. Ya no se busca predecir números ni alcanzar 1% de cobertura 10-en-20. Objetivo: comparar propiedades combinatorias y distribución del premio de carteras al mismo presupuesto, bajo un modelo uniforme 84/20/10.

Tres carteras fijas de 200 jugadas únicas: snapshot operativo guardado del 14/11, referencia uniforme y referencia equilibrada existentes en `buildExperimentPortfolio`. Semillas fijas `kino-risk-v1/uniform` y `kino-risk-v1/balanced`. No generar variantes ni seleccionar semillas después de evaluar. Todos se enfrentan a los mismos 100,000 sorteos sintéticos, semilla `kino-risk-v1/draws`. No se usan ganadores reales ni resultados futuros. No se recalcula ni escribe la cartera operativa.

Métrica primaria: probabilidad de al menos una jugada 7+. Secundarias: 8+, distribución del máximo, frecuencia de premio bruto menor que costo, cero premio, percentiles del bruto. Comparación pareada de indicadores con intervalo normal Monte Carlo95% y cobertura Wilson por cartera. Incertidumbre condicionada a estas carteras fijas, no generalización del generador ni garantía física. Muestra exploratoria única; no selección automática de ganadora.

Inspeccionar exposición y solapamiento de las 19,900 parejas. Calcular cotas combinatorias existentes para 7+/8+, distinguiendo cotas de probabilidades logradas. No afirmar que menor solapamiento medio o mejor cota demuestra mejor cobertura. La cartera actual ya equilibra exposición 23–24.

Costo modelado RD$25 por jugada, conforme a `evaluateKinoSnapshot`; tabla de premios del snapshot validado. No se certifica aquí vigencia oficial, impuestos ni cobros. Valor esperado exacto por linealidad: suma marginal de premios por jugada con distribución hipergeométrica(84,20,10); igual para todos los diseños bajo uniforme y la misma tabla. Diversificar no mejora ese valor esperado. Mostrar costos y esperanza para 20/50/100/200 jugadas como escalamiento, no como recomendación de compra ni comparación de cobertura de subconjuntos.

No ordenar estrategias por premio medio de simulación: jackpot raro y varianza alta. Las tasas de pérdida y percentiles son Monte Carlo; no promesas. Máxima caída histórica no se evalúa: los escenarios sintéticos no son trayectoria real ni predicción temporal. No concluir que algún diseño domina todos los riesgos.

Guardar carteras exactas evaluadas, hash de snapshot/código/protocolo, semilla, Node y agregados en experiments/super-kino/riesgo-carteras-v1. Rechazar sobrescritura. Sin cambios de producción. Cualquier decisión posterior requerirá replicar con otras semillas de carteras fijadas antes de una nueva evaluación, sin borrar este resultado.
