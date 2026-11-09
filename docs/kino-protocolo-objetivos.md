# Cobertura7+: objetivos matemático y directo — plan previo

Se implementan las dos propuestas del matemático aplicado sin modificar V2, producción ni reserva. Tres brazos: diversa original; minimización deS2=sumprobabilidades conjuntas de eventos7+según solapamiento; maximización directa de cobertura7+en escenarios de ajuste.

Ambas candidatas parten exactamente de la misma cartera diversa por semilla.200jugadas únicas de10, cuotas23/24 conservadas por intercambios recíprocos.2000propuestas por candidata, fijadas antes de evaluar; no se amplían tras observar resultados. El objetivo conjunto eleva una cota inferior analítica, pero no garantiza mejorar la unión real de eventos; el directo puede sobreajustar su muestra.

Piloto separado de4semillas solo para invariantes y costo, sin generar resultados de evaluación. Si la suma de tiempos de construcción del piloto supera120segundos, detener antes de evaluación; no reducir silenciosamente presupuesto ni buscar configuraciones por tasas. Las ganancias de entrenamiento del piloto no eligen parámetros.

Evaluación:32réplicas nuevas,4096sorteos uniformes20/84de entrenamiento para el método directo y10000sorteos de evaluación independientes por réplica, compartidos entre brazos.320000escenarios por brazo,32unidades de semilla, no320000carteras independientes. Semillas de piloto, construcción, búsqueda, entrenamiento y evaluación en espacios separados `kino-lab-objectives-v1`. El método conjunto no recibe resultados de entrenamiento ni evaluación.

El histórico solo se valida y registra como contexto de procedencia/corte; no se evalúa ni se utiliza para elegir números. La reserva histórica ya fue inspeccionada anteriormente y no sería confirmación ciega; la sintética existente no se consume. Las pruebas actuales son nuevos escenarios de validación, no reetiquetado de escenarios anteriores como nuevos.

Primaria: diferencia de tasa de alguna7+frente a diversa. Cada candidata debe mejorar>=1punto porcentual, con límite inferior positivo del bootstrap de10000remuestreos de las32réplicas, Bonferroni por dos candidatas (intervalos97.5%individuales), medias leave-one-out positivas y deterioro8+no mayor de0.2puntos. Las secundarias no sustituyen la primaria después de ver resultados.

Se publican por separado ganancia de entrenamiento y evaluación para revelar sobreajuste. El ajuste por dos comparaciones no borra la búsqueda adaptativa previa: una señal favorable exige confirmación nueva preregistrada. Si ninguna cumple, detener estas configuraciones; no prolongar buscando semillas favorables. Si alguna cumple, congelarla y confirmar independientemente, sin activar producción ni consumir automáticamente la reserva existente.

```sh
node --experimental-strip-types scripts/run-kino-objectives.ts --cutoff=2026-11-08 --run-id=validation-objectives-v1
```

Opcional `--pilot-only=true` ejecuta únicamente las4semillas de costo/QA. No admite opciones de holdout ni cambios del presupuesto. Toda salida es nueva, no sobrescrita, en experiments/super-kino; registra hashes de código/dataset/lockfile, Node, semillas, carteras y muestras train/eval. No se efectúan compras ni escrituras operativas.

## Resultado: validation-objectives-v1

Se completaron4pilotos solo de costo/QA y32réplicas independientes de validación. Cada réplica tiene4096sorteos de entrenamiento y10000de evaluación, comunes entre métodos pero separados del entrenamiento.320000escenarios de evaluación por brazo y32unidades de semilla. La comparación usa la misma diversa original en los nuevos escenarios, no el23.26%de una corrida anterior.

| Método | Alguna7+ en evaluación | Alguna8+ en evaluación | Alguna7+ en entrenamiento |
| --- | ---: | ---: | ---: |
| Diversa original |23.10469%|1.89469%|23.00034%|
| Objetivo conjunto S2 |23.21125%|1.90219%|23.10562%|
| Cobertura directa de entrenamiento |22.77500%|1.91906%|36.50208%|

### Propuesta matemática

S2 disminuyó en32/32carteras: media0.02381027→0.02350173. La mejora de evaluación frente a diversa fue **+0.10656puntos porcentuales**, intervalo bootstrap ajustado[+0.011875,+0.207813]puntos.19semillas positivas,12negativas y1empate. Es una señal exploratoria pequeña: no alcanza+1punto, no es una confirmación tras la búsqueda adaptativa previa y no justifica producción. La mejora del objetivo analítico no equivale a una mejora grande de cobertura.

### Propuesta directa

La cobertura en entrenamiento aumentó+13.50174puntos, pero en evaluación independiente **disminuyó−0.32969puntos**, intervalo ajustado[−0.52844,−0.13469]. El optimizador explotó escenarios concretos de la muestra finita; el resultado demuestra sobreajuste para esta configuración4096/2000, no que el objetivo general de cobertura sea inválido. La mejora secundaria8+ no rescata el fallo de7+.

Las tres estrategias tienen media idéntica de2.38093aciertos/jugada al preservar exactamente exposición. Las diferencias afectan cómo se concentran los aciertos, no probabilidades marginales predictivas.

### Decisión conjunta de matemático, ciencia de datos y QA

Ninguna cumple el criterio prefijado de avance. Mantener diversa original como referencia experimental y V13.3 operativo; no activar candidatas, no extender esta corrida buscando semillas favorables, no rebajar el umbral y no abrir la reserva. Se cierran estas dos configuraciones conforme la regla de parada. Cualquier nueva hipótesis requiere protocolo distinto y evaluación independiente nueva: los escenarios ya vistos dejaron de ser reserva para ajustar.

Verificación:56pruebas del laboratorio aprobadas, TypeScript y build aprobados. QA recalculó hashes de código/dataset/lockfile, comprobó cuatro pilotos sin evaluación,32semillas con train/eval separados, ausencia de evaluación histórica/reserva y concordancia de la caché directa con el evaluador independiente. Ningún dato operativo ni cartera guardada se modificó. Todo permanece local, sin publicar a main.
