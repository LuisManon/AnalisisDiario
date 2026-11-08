# Equipo de desarrollo de Análisis Diario

## Alcance del producto

Los productos vigentes son Super Kino TV, El Quinielón 2.0 y Loto Más, en ese orden en el menú principal. La Primera sigue siendo la fuente de Quinielón; los nombres internos `la-primera` no implican que sus demás productos estén habilitados.

Aplicación Next.js/React/TypeScript. La interfaz está en `components/`, los endpoints en `app/api/`, la lógica en `lib/` y los históricos en `data/`. La persistencia usa archivos locales o GitHub según el entorno. Las ventanas automáticas están en `.github/workflows/prepare-portfolios.yml`.

## Selección de especialista

Lee la skill del perfil que corresponda antes de trabajar. El perfil principal se responsabiliza del resultado; combina perfiles cuando la tarea cruce sus áreas.

| Tarea | Skill del proyecto |
| --- | --- |
| Arquitectura, funcionalidades, APIs y almacenamiento | `.agents/skills/ingeniero-software/SKILL.md` |
| Fuentes, importaciones y calidad del historial | `.agents/skills/ingeniero-datos/SKILL.md` |
| Métricas, consultas e interpretación de resultados | `.agents/skills/analista-datos/SKILL.md` |
| Estrategias, simulaciones y experimentos estadísticos | `.agents/skills/cientifico-datos/SKILL.md` |
| Regresiones y verificación de reglas | `.agents/skills/ingeniero-qa/SKILL.md` |
| Navegación, dashboards y experiencia móvil | `.agents/skills/disenador-ux-ui/SKILL.md` |

Los perfiles son capacidades de desarrollo, no funciones visibles del aplicativo. No se ejecutan todos para cada cambio. Pueden aplicarse en el agente actual; su configuración no inicia procesos ni tareas en segundo plano. Usa subagentes únicamente cuando el usuario solicite delegación o trabajo paralelo, con archivos y entregables delimitados.

## Reglas compartidas

- Usa `America/Santo_Domingo` para ventanas y cierres. Evita depender de la zona horaria del servidor.
- Conserva carteras, asignaciones, propietarios, premios y versiones congeladas de sorteos cerrados. Una corrección del resultado no autoriza regenerar su cartera.
- Calcula decisiones previas a un sorteo solo con información disponible antes de ese sorteo. Distingue retrospectivas de registros reales.
- Mantén reproducibilidad por fecha, semilla y versión. Inspecciona las reglas vigentes en código y snapshots antes de fijar cantidades o versiones en documentación.
- Los reintentos de generación deben ser idempotentes. Distingue resultado pendiente, fallo de fuente y resultado provisional.
- Preserva cambios existentes del usuario. Antes de eliminar un archivo, comprueba consumidores en imports, scripts, workflow, documentación y lectura dinámica de JSON. Conserva pruebas de reglas vigentes.
- Un diagnóstico o revisión entrega hallazgos; implementa cambios cuando la solicitud los incluya. Publicar, desplegar o cambiar datos de producción requiere estar dentro de la autorización del usuario.

## Verificación y entrega

Para cambios de código ejecuta `npm run typecheck` y las pruebas afectadas con `node --test --experimental-strip-types tests/<archivo>.test.ts`. Para cambios de rutas, imports, dependencias o interfaz ejecuta también `npm run build`. La suite completa usa `node --test --experimental-strip-types tests/*.test.ts`; Super Kino puede tardar por sus generadores.

`npm run lint` conserva un comando heredado (`next lint`): comprueba su compatibilidad antes de presentarlo como una validación disponible. El build puede regenerar `next-env.d.ts`; distingue esos cambios de los intencionales.

No uses endpoints que escriben datos para hacer una comprobación de lectura. Prueba escrituras con fixtures o almacenamiento temporal.

Entrega cambios o hallazgos, evidencia de verificación y limitaciones concretas. No declares completa una limpieza si solo ocultaste navegación o si quedan consumidores de los módulos retirados.
