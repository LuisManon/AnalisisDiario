# Aprendizaje sintético desde cero, V1

Fijado antes de ejecutar, 14 noviembre 2026. Pedido: iniciar con una selección aleatoria de10, simular sorteos y mejorar un algoritmo nuevo. No usar históricos reales, carteras, semillas, reglas ni pesos de experimentos previos. El módulo nuevo solo importa node:crypto; el runner solo módulo nuevo y bibliotecas estándar. Las skills y el registro organizan el ensayo, no aportan señales al predictor.

## Nuevo algoritmo

Bowl de84, extracción20 sin reemplazo; una selección de10 únicos antes de cada ganador. Selecciones iniciales uniformes. PRNG xoshiro128** con estado derivado por SHA-256 y flujos separados para bowl/selecciones/baseline/particiones.

Modelo logístico online:84 sesgos individuales y dos coeficientes compartidos, indicador de aparición anterior centrado en20/84 y atraso truncado30 dividido30. Intercepto fijo log(20/64). Aprende después de ver cada ganador simulado mediante gradiente de error observado−probabilidad, regularización L2=0.01, paso decreciente rate/sqrt(1+t/10000), parámetros/puntaje limitados a[−2,2]. Las marginales logísticas son una aproximación de aprendizaje, no una distribución independiente válida del sorteo20.

Selección aleatoria ponderada sin reemplazo con peso0.2+0.8*exp(score), manteniendo exploración. Tres tasas previas0.002/0.01/0.05; no se agregan variantes tras ver resultados. El feedback de entrenamiento usa todo el ganador20, no solo aciertos de los10. El contexto se actualiza después de puntuar; nunca ve el ganador objetivo antes de seleccionar.

## Particiones y presupuesto cerrado

- Entrenamiento:1,000,000 sorteos uniformes comunes a tres modelos, diez bloques de100,000. Selecciones hechas antes de generar ganador; actualizar modelos después. Guardar curva por bloque y checkpoints. No elegir checkpoint por resultado, usar siempre el último.
- Validación:250,000 sorteos uniformes nuevos, parámetros congelados. Elegir tasa por mayor promedio de aciertos; empate por orden0.002/0.01/0.05. La validación es selección adaptativa explícita, no evidencia final. No actualizar pesos con sus ganadores.
- Congelar el modelo ganador, hash y elección antes de abrir prueba final.
- Prueba final:2,000,000 sorteos uniformes nuevos, única tasa seleccionada y baseline aleatorio10 sobre mismos ganadores. No retocar modelo, tasa, presupuesto ni semilla después de evaluar. Contexto ve únicamente sorteos anteriores de esa partición; pesos quedan congelados. No repetir prueba final para buscar una corrida favorable.

Métrica primaria: media de aciertos de una sola selección10. Secundarias histogramas0..10,6+/7+ y10perfectos; no son probabilidades de alguna entre100 jugadas. Referencia exacta hipergeométrica(84,20,10), media200/84≈2.38095. Un10perfecto es demasiado raro para garantizar su observación con esta muestra. Bajo uniforme independiente, ninguna selección previa de10 mejora su distribución marginal; el ensayo mide si patrones de entrenamiento sobreviven a resultados nuevos.

Diferencia pareada contra baseline y CI95% normal Monte Carlo. Puerta exploratoria: mejora final≥0.01 aciertos por selección y límite inferior>0. Se interpreta solo bajo el modelo simulado. Dos millones dan orden de precisión~0.002 aciertos para diferencia, pero no potencia garantizada para colas raras; no ampliar cómputo después de resultados. Una mejor media de entrenamiento no demuestra mejor predicción.

## Control positivo de aprendizaje

Escenario adicional aislado:10 bolas elegidas aleatoriamente por el generador tienen peso2, el resto1. Verdad oculta al predictor; solo aprende de ganadores. Modelo nuevo rate0.01,100,000 de entrenamiento y100,000 de evaluación congelada frente a aleatorio. Sirve para comprobar que aprende un sesgo persistente cuando se introduce deliberadamente; no es evidencia del bowl real ni se mezcla con resultados uniformes. Guardar pesos verdaderos para auditoría, nunca pasarlos al predictor.

Total3,450,000 sorteos sintéticos distintos (incluye ambos del control). Parada por presupuesto, no por encontrar patrones. Sin datos reales, premios, activación, apuestas ni escrituras en data/. Guardar protocolo, fuentes ejecutadas, checkpoints, selección de tasa, modelos congelados, hashes, curvas y agregados. Rechazar sobrescritura; cerrar con resultado, límites y condición para una V2. Si no aparece mejora final, decirlo sin inventar un patrón ni llamar éxito al ajuste de entrenamiento.
