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
