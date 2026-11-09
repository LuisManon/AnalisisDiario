# Matemático aplicado: fundamentos y siguiente experimento

El perfil `matematico-aplicado` quedó integrado en `.agents/skills` y en AGENTS.md. Complementa ciencia de datos (experimentos), ingeniería/análisis de datos (procedencia y métricas) y QA (invariantes). No constituye un título humano ni garantiza predicción; es un rol de desarrollo con instrucciones específicas.

## Hallazgos analíticos

Supuesto vigente del repositorio: extracción uniforme de20entre84 y jugadas de10. El cambio de régimen sigue pendiente de corroboración oficial independiente. Si H es el número de aciertos de una jugada:

`P(H >= k) = sum_{h>=k} C(10,h) C(74,20-h) / C(84,20)`.

Para7+, p=0.00126571902555. Para200jugadas, E[Z]=200p=0.2531438051, donde Z cuenta las jugadas con7+. La probabilidad de que alguna cumpla es P(Z>0), distinta de la esperanza. Por unión, P(Z>0)<=25.31438%. **No es una tasa alcanzable garantizada ni prueba de proximidad al óptimo.** La dependencia entre jugadas cambia la unión, no E[Z] bajo estos supuestos.

Si dos jugadas comparten s números, dividir el universo en cuatro regiones: compartidos s, soloA10−s, soloB10−s y exteriores64+s. La probabilidad conjunta de ambos eventos7+ es:

`q(s) = sum_{x,y,z: x+y>=7, x+z>=7} C(s,x) C(10-s,y) C(10-s,z) C(64+s,20-x-y-z) / C(84,20)`.

| Solapamiento s | q(s), probabilidad conjunta7+ |
| --- | ---: |
|0|0.0000001084981|
|1|0.0000005167788|
|2|0.0000020419654|
|3|0.0000067407646|
|4|0.0000187344885|
|5|0.0000445381735|
|6|0.0000933737901|
|7|0.0001792548525|
|8|0.0003256578261|
|9|0.0005907242627|
|10|0.0012657190256|

La penalidad de parejas actual equivale a sumar C(s,2) entre pares de jugadas y añadir una penalidad fuerte a solapamientos altos. La de tríos equivale a sumar C(s,3). Ninguna coincide exactamente con q(s), y mejorar esos objetivos no necesariamente mejora P(Z>0).

Un objetivo mejor fundamentado es `S2=sum_{i<j}q(s_ij)`. Bonferroni da `P(Z>0)>=max(0,200p−S2)`; el segundo momento da `P(Z>0)>=(200p)^2/(200p+2S2)`. Reducir S2 eleva esas cotas inferiores, **pero no garantiza aumentar la unión real**, pues también cambian intersecciones de tres o más eventos.

Ejemplo reproducible de una diversa, semilla `math-foundation-2026-11-08`: S2=0.0238575090630; límite inferior Bonferroni22.92863%, superior de unión25.31438%, segundo momento21.29962%. Esto es análisis de esa cartera fija, no una simulación ni un ranking general del generador.

## Próxima prueba priorizada, todavía no ejecutada

Comparar tres brazos con la misma cartera diversa base y cuotas exactas200×10:

1. Diversa original congelada.
2. Minimización de S2 usando la tabla q(s), sin escenarios de ajuste ni información ganadora.
3. Maximización directa del número de escenarios de ajuste donde alguna jugada alcanza7+.

El matemático fundamenta objetivo y límites; ciencia de datos fija el protocolo; QA revisa fórmulas, separación de información y ejecución. Las dos propuestas pueden sobreoptimizar un objetivo auxiliar o una muestra de ajuste; necesitan evaluación independiente.

Plan fijado para implementación: piloto de costo/QA de4semillas, no utilizable como evidencia de mejora ni para escoger retrospectivamente un método. Después congelar una configuración por mecanismo, con2000propuestas recíprocas por candidata. El método directo usa4096escenarios sintéticos de ajuste por réplica; el matemático usa solo q(s). Se registrarán ganancia de ajuste y ganancia de evaluación para detectar sobreajuste.

Evaluación prevista:32réplicas nuevas,10000escenarios20/84por réplica, compartidos entre brazos y completamente separados del ajuste:320000escenarios por método,32unidades de semilla. Espacios distintos para construcción, piloto, ajuste y evaluación; ningún escenario de reserva actual se consume. Presupuesto fijo, sin extenderlo tras mirar resultados.

Primaria: diferencia7+ frente a diversa. Se conserva el criterio vigente de+1punto porcentual, intervalos bootstrap de bloques con ajuste Bonferroni por las dos candidatas, medias leave-one-out positivas y deterioro8+ no mayor de0.2puntos. Los intervalos solo ajustan esa corrida; no borran la búsqueda adaptativa anterior.

Si ninguna cumple, detener esta familia en vez de buscar semillas favorables. Si una cumple, congelarla y preregistrar una confirmación independiente antes de producción. La reserva histórica ya fue inspeccionada en auditorías anteriores: no presentarla como una prueba verdaderamente ciega. La reserva sintética permanece sin ejecutar.

## Implementación y comprobaciones

`lib/kino-math.ts` calcula combinaciones con BigInt y convierte probabilidades a coma flotante preservando cifras significativas, incluidas probabilidades menores de1e−18. Las fórmulas son analíticas; las salidas numéricas no son intervalos certificados de máquina. Se contrastan con enumeración exhaustiva de universos pequeños, casos límite, jugadas duplicadas y una probabilidad conjunta rara de10+.

```sh
node --test --experimental-strip-types tests/kino-math.test.ts
node --experimental-strip-types scripts/audit-kino-math.ts
npm run typecheck
```

La skill se revisó estructuralmente y mediante revisión independiente de QA. El validador oficial `quick_validate.py` no pudo ejecutarse porque los dos Python disponibles carecen de PyYAML; no se instalaron dependencias ni se declara que ese validador haya aprobado.

No se modificó producción, el histórico, las carteras guardadas ni el código congelado de las corridas anteriores. No se ejecutó una nueva candidata ni se anuncia una nueva mejora porcentual en esta fase. Los archivos siguen locales.
