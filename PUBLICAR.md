# Publicar Flamme Crew con una dirección fija (Render)

Resultado: la app en `https://flamme-crew.onrender.com` (o tu propio dominio), siempre encendida y sin depender de tu ordenador.

| Paso | Quién | Tiempo |
|---|---|---|
| 0. Guardar el proyecto en una carpeta permanente | Claude (con tu OK) | 1 min |
| 1. Instalar Git | Claude (con tu OK) | 2 min |
| 2. Crear cuenta de GitHub y un repositorio **privado** vacío | Tú | 5 min |
| 3. Subir el proyecto a ese repositorio | Claude (tú inicias sesión en GitHub cuando salga la ventana) | 2 min |
| 4. Crear cuenta de Render y desplegar | Tú (te guío pantalla a pantalla) | 10 min |
| 5. Probar la dirección final | Claude | 2 min |

## Paso 2 — GitHub
1. Entra en https://github.com/signup y crea la cuenta (o inicia sesión).
2. Arriba a la derecha: **+ → New repository**.
3. Nombre: `flamme-crew`. Marca **Private**. No marques "Add a README". Pulsa **Create repository**.
4. Copia la dirección que aparece (`https://github.com/TU-USUARIO/flamme-crew.git`) y pásamela.

Lo que **no** se sube (ya está excluido en `.gitignore`): `server/.env` (PIN y clave de IA) y `server/data/` (datos y PIN de los usuarios).

## Paso 4 — Render
1. Entra en https://render.com y regístrate con **Sign in with GitHub**. Autoriza el acceso al repositorio `flamme-crew`.
2. Pulsa **New → Blueprint** y elige `flamme-crew`. Render lee `render.yaml` y propone un servicio llamado `flamme-crew` con un disco de 1 GB.
3. Te pedirá dos valores:
   - `CREW_DEMO_PIN`: el PIN compartido para quien todavía no tenga PIN propio (6 cifras). Puedes dejarlo vacío y dar a cada persona su PIN.
   - `ANTHROPIC_API_KEY`: tu clave de https://console.anthropic.com (o vacío para usar el asistente de demo).
4. Pulsa **Apply**. Render pide un método de pago: el plan **Starter** cuesta unos 7 $/mes y el disco unos 0,25 $/GB/mes.
5. La primera construcción tarda 3–5 minutos. Cuando ponga **Live**, la dirección aparece arriba (`https://flamme-crew.onrender.com`).

¿Por qué no el plan gratuito? No tiene disco: se borrarían los datos (mensajes, turnos, fichajes, PIN) en cada reinicio.

## Paso 6 (opcional) — Tu dominio
En Render: **Settings → Custom Domains → Add**, p. ej. `crew.flammeburger.no`. Render te dice qué registro DNS (CNAME) añadir en tu proveedor de dominio. El certificado HTTPS es automático.

## Actualizar la app más adelante
Cada vez que se suban cambios a GitHub (`git push`), Render reconstruye y publica sola la nueva versión. Los datos del disco se conservan.

## Copias de seguridad
En Render → servicio → **Disks** puedes hacer instantáneas. Haz una antes de cambios grandes.
