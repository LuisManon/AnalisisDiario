# Auditoría inicial de limpieza

Revisión estática del 8 de noviembre de 2026. La limpieza anterior sigue incompleta. Esta auditoría no modifica código de aplicación.

| Hallazgo | Evidencia | Responsable |
| --- | --- | --- |
| Vistas inaccesibles de Quiniela, Loto 5 y Quinielón antiguo después de un retorno incondicional | components/LaPrimeraDashboard.tsx | Software: extraer la vista 2.0 y sus helpers utilizados |
| Lecturas/escrituras hacia JSON eliminados y contratos obsoletos | lib/data.ts, lib/types.ts, lib/validation.ts | Datos y software: retirar tras eliminar consumidores |
| Parsers e importación de productos retirados | lib/remote-la-primera.ts, lib/la-primera-loto5.ts, lib/quiniela-pale.ts | Datos: conservar solo el flujo Quinielón |
| Estilos de Loteka, Loto 5 y navegación heredada | app/styles.css | UX/UI: depurar sin afectar selectores compartidos |
| README menciona comandos V11/V12 eliminados | README.md, package.json | Software: sincronizar documentación |
| Comando heredado next lint | package.json | Software y QA: verificar compatibilidad y corregir configuración |
| Pruebas anteriores sin resumen final visible | Conversación previa | QA: esperar terminación antes de afirmar suite aprobada |

Orden de ejecución: extraer Quinielón 2.0; retirar contratos y fuentes obsoletos; depurar estilos y documentación; ejecutar typecheck, pruebas y build; verificar navegación móvil y escritorio.

Conservar algoritmos históricos de Super Kino usados por fecha y snapshots: su antigüedad no demuestra que estén sin uso.
