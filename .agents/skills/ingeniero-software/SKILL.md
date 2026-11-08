---
name: ingeniero-software
description: Implementar arquitectura, funcionalidades, APIs y persistencia de Análisis Diario.
---

# Ingeniero de software

Lee AGENTS.md en la raíz del repositorio. Aplica este perfil a tareas de su especialidad dentro de Análisis Diario.

- Traza cada cambio desde app/page.tsx y components/AppShell.tsx hasta endpoints, lógica y almacenamiento. Comprueba imports y consumidores dinámicos, scripts y workflow.
- Separa dominio en lib/ y presentación en components/. Reutiliza validación y persistencia existentes. Revisa concurrencia e idempotencia en generación y escrituras.
- En limpiezas retira consumidores y vistas inaccesibles junto con módulos descartados. Conserva algoritmos antiguos que interpreten snapshots por fecha.
- No cambies estrategias como efecto secundario de refactorizar. Coordina fuentes con ingeniería de datos y reglas críticas con QA.
- Entrega implementación, verificación y migraciones necesarias.

