# Automatización gratuita de carteras

cron-job.org inicia el workflow mediante `workflow_dispatch`. GitHub sigue
ejecutando el trabajo; se sustituye el disparador `schedule` que llegó varias
horas tarde. El cron de Actions permanece como respaldo. No se requiere Vercel Pro.
El repositorio es público y utiliza runners estándar `ubuntu-latest`.

La llamada externa solo solicita el inicio del workflow, evitando el límite
gratuito de 30 segundos de cron-job.org. Un HTTP 204 confirma que GitHub aceptó
el inicio, **no** que las carteras estén listas: el resultado real se consulta
en Actions y conserva sus notificaciones de fallo. Los runners aún pueden
retrasarse; esta solución reduce la dependencia del cron de Actions, no garantiza
una hora exacta de ejecución.

## Activación

1. Publicar estos cambios en `main` antes de instalar los horarios. Las nuevas
   ventanas de Quinielón Noche son 13:37, 15:37 y 17:37, hora dominicana.
2. Crear una cuenta gratuita en <https://console.cron-job.org/signup>, verificar
   el correo y generar una API key en Settings. Configurar las notificaciones
   de la cuenta para recibir errores de disparo.
3. Crear un token GitHub **fine-grained**, limitado a `LuisManon/AnalisisDiario`,
   con permiso de repositorio **Actions: Read and write**. No necesita permiso
   de escritura de código ni acceso a los datos de Vercel. Elegir una caducidad
   y renovar el token antes de que venza.
4. Introducir las credenciales en la terminal local sin guardarlas en el
   repositorio ni pegarlas en el chat:

   ```zsh
   read -rs 'CRON_JOB_API_KEY?API key de cron-job.org: '
   export CRON_JOB_API_KEY
   read -rs 'SCHEDULER_GITHUB_TOKEN?Token GitHub Actions: '
   export SCHEDULER_GITHUB_TOKEN
   node --experimental-strip-types scripts/setup-free-scheduler.ts --apply
   unset CRON_JOB_API_KEY SCHEDULER_GITHUB_TOKEN
   ```

   El instalador tarda unos cuatro minutos para respetar el límite de la API
   gratuita. Puede reintentarse: actualiza los jobs con el mismo título, sin
   duplicarlos. No elimina jobs ajenos ni ejecuta sorteos. No iniciar dos
   instalaciones simultáneas. El token se guarda en los encabezados del job en
   cron-job.org; se limita a Actions para ese repositorio.

5. Revisar los horarios y próximas ejecuciones en la consola. En una ventana
   vigente, usar Run now y comprobar la ejecución `workflow_dispatch` en Actions
   hasta que termine. Mantener el respaldo de GitHub habilitado.

Sin `--apply`, el script solo muestra la configuración, con el token redactado:

```sh
node --experimental-strip-types scripts/setup-free-scheduler.ts
```

Los horarios externos se derivan de `automationWindows`, incluidos domingos y
cambio de fecha UTC. Al cambiar ventanas en código hay que volver a ejecutar el
instalador y desactivar en la consola los horarios retirados, si los hubiera.

## Protección de registros

Antes de generar una cartera o reparto, el runner consulta el estado persistido.
Si ya existe un registro válido, lo conserva. Si vence el cierre durante otras
operaciones, pasa a verificación de lectura. Un registro cerrado ausente sigue
siendo un fallo; no se reconstruye retrospectivamente. Un fallo de almacenamiento
impide generar a ciegas y se muestra como error.

Fuentes: [servicio gratuito](https://cron-job.org/en/),
[API y límites](https://docs.cron-job.org/rest-api.html),
[límite de ejecución](https://cron-job.org/en/faq/).
