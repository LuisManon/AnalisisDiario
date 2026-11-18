# Cartera fija100 V1

100 jugadas únicas de10. Semilla fija, sin historial ni escenarios de entrenamiento, sin rotación por fecha. Costo modelado RD$2500 por sorteo. Candidata congelada antes de un millón de sorteos uniformes de evaluación nuevos.

## Cobertura medida

| Cartera | Alguna7+ | Alguna8+ | Premio menor que costo | Mediana bruto RD$ |
| --- | ---: | ---: | ---: | ---: |
| fija100-optimizada | 12.1836% | 0.9532% | 98.5483% | 1020 |
| equilibrada-inicial | 11.9114% | 0.9556% | 97.6057% | 1000 |
| uniforme100 | 11.8773% | 0.9521% | 97.7626% | 1000 |

## Candidata menos referencia: diferencias pareadas

| Referencia | Diferencia7+ en pp | IC97.5% ajustado, pp | Diferencia8+ en pp | IC95% descriptivo, pp |
| --- | ---: | --- | ---: | --- |
| equilibrada-inicial | 0.2722 | 0.1705 a 0.3739 | -0.0024 | -0.0292 a 0.0244 |
| uniforme100 | 0.3063 | 0.2033 a 0.4093 | 0.0011 | -0.0258 a 0.0280 |

Dos comparaciones primarias, ajuste Bonferroni. Intervalos Monte Carlo condicionados a tres carteras fijas; no garantizan capacidad del generador ni física real. Puerta exploratoria frente a uniforme: superada; no autoriza adopción.

## Fundamento matemático

76 números aparecen12 veces y8 aparecen11. Se aceptaron 424 de20,000 intentos de intercambio preservando exposición. Suma de intersecciones7+ inicial 0.00756712, final 0.00468128. Una menor suma mejora una cota, no prueba cobertura óptima.

Cota de unión7+ candidata: 12.1891% a 12.6572%, evaluada numéricamente con combinatoria exacta. Cota8+: 0.9579% a 0.9594%. No confundir cotas con probabilidad alcanzada.

Todas las carteras100 tienen igual premio bruto esperado RD$1417.47, neto RD$-1082.53 y ROI esperado -43.3011% bajo uniforme y tabla del snapshot. No son retornos típicos ni garantizados; no se certificó tabla oficial ni retenciones.

## Cartera congelada

SHA-256: f59491ed67a2e44ea113d906b7a1ea5ee5c07ff4288ea85a72d72fe54b32a461. Archivos CARTERA.md, cartera-fija-100.csv y cartera-fija-100.json preservan exactamente las100 jugadas. No se rotan al ganar/perder y no se activan en producción. Repetirlas no cambia su probabilidad por sorteo ni vuelve más probable un premio después de pérdidas. No se garantiza10,7 ni8 aciertos.

## Estado y decisión

Cartera fija construida, congelada y evaluada; disponible para seguimiento experimental. La candidata supera el umbral exploratorio de7+ frente a uniforme para estas carteras y esta simulación, incluida la vigilancia descriptiva de8+. No se adopta en producción ni se declara superioridad de todo un generador a partir de una semilla.

La mejora7+ respecto a uniforme es0.3063 puntos porcentuales (aproximadamente2.58% relativo), no30.63% ni0.3063 de ROI. Frente a la misma base equilibrada antes de intercambiar números es0.2722pp. No se traslada a este experimento la mejora0.148pp de recortes de200.

Contrapartida: frecuencia de pérdida de98.5483% en candidata frente a97.7626% en uniforme y97.6057% en base equilibrada. Mediana de bruto1020 frente a1000, con costo2500. Mejorar alguna jugada7+ no es recuperar inversión; el score optimizado no buscaba minimizar la frecuencia de pérdida. El premio esperado sigue igual en los tres diseños por linealidad. No se promueve mayor gasto ni recuperación de pérdidas.

Las cotas numéricas combinatorias son evidencia distinta de la simulación. El estimador Monte Carlo puede caer levemente fuera de una cota exacta por error de muestreo: aquí7+12.1836% frente a cota inferior12.1891%, y8+0.9532% frente a inferior0.9579%. Las diferencias son pequeñas frente al error Monte Carlo y no se interpreta el punto estimado como probabilidad exacta. No hay certificado de optimalidad global.

## Usar siempre las mismas100

[Lista de100 combinaciones](../../../../experiments/super-kino/fija100-v1/frozen-2026-11-14/CARTERA.md) · [CSV](../../../../experiments/super-kino/fija100-v1/frozen-2026-11-14/cartera-fija-100.csv) · [JSON congelado](../../../../experiments/super-kino/fija100-v1/frozen-2026-11-14/cartera-fija-100.json).

Leer el artefacto congelado para futuras evaluaciones; no reconstruirlo según el ganador, cambiar semilla ni sustituir números después de pérdidas. Esta versión no tiene regla temporal ni rotación. Para un cambio de objetivo (por ejemplo reducir frecuencia de pérdidas), abrir otro protocolo y versión manteniendo esta cartera intacta. No hay proceso de apuestas ni seguimiento automático instalado.

## Reproducción y validación

[Protocolo previo](PROTOCOLO.md). `node --experimental-strip-types scripts/run-kino-fixed100.ts otra-identificacion` reproduce las combinaciones y métricas con mismo código/semilla/tabla; no añade evidencia independiente. Se rechaza sobrescritura y los tres conjuntos se guardan antes de generar el primer ganador. No se usa historia para elegir números.

Se conservan fuentes ejecutadas, protocolo, snapshot de tabla, comparadores y agregados en la carpeta experimental. Verificados hashes del contenido congelado, fuentes, protocolo y entrada; las100 filas CSV coinciden exactamente con JSON. La exposición exacta y ausencia de duplicados se verificaron en tests y construcción.

Nueve pruebas afectadas de construcción, evaluación, combinatoria y economía; TypeScript y build satisfactorios. Sin cambios en app/, componentes, data/ ni asignaciones. Trabajo local sin publicación.
