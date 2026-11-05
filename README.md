# Crew — plataforma de app para empleados (marca blanca)

Primer cliente: **Flamme Burger → "Flamme Crew"**. Versión demo navegable (v0.2).
**Todos los datos son de demostración.** No hay mensajes reales, ni pagos, ni modelo de IA conectado.

## Cómo arrancarla (con servidor: datos compartidos entre todos)
Necesita Node.js 20 o superior. Doble clic en **`start-server.cmd`**, o en una terminal:

```
npm install
npm start
```
- En este ordenador: http://localhost:8090
- Móviles en la misma wifi: la dirección "Same Wi-Fi" que muestra el servidor al arrancar (p. ej. http://192.168.1.15:8090). Si el móvil no conecta, permite Node.js cuando Windows pregunte por el firewall.
- Acceso: toca tu nombre y escribe el PIN. Quien aún no tenga PIN propio usa el **PIN compartido** de `server/.env` (`CREW_DEMO_PIN`; el ejemplo trae 1234, cámbialo antes de publicarla). Cada persona puede cambiarlo en Perfil → Cambiar PIN, y el encargado puede poner uno nuevo en Encargado → Usuarios y roles.

**Activar la IA real (Claude):** abre `server/.env`, pega tu clave en `ANTHROPIC_API_KEY=` (se crea en console.anthropic.com; cada pregunta tiene un coste) y reinicia el servidor. Sin clave, el asistente usa la búsqueda de demo. Emergencias y alérgenos se responden siempre con datos fijos y verificados, nunca los inventa la IA.

**Sin servidor** (solo demo, los datos se quedan en cada dispositivo): `powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8091`.

## Ponerla en internet
**Enlace temporal (gratis, sin cuenta):** con el servidor en marcha, ejecuta
`cloudflared tunnel --url http://localhost:8090`. Te da un enlace `https://….trycloudflare.com` que funciona desde cualquier móvil mientras este ordenador esté encendido con el servidor y el túnel abiertos. Cada vez que lo arrancas el enlace cambia. Sirve para demos y pruebas, no para el uso diario.

**Alojamiento permanente (recomendado para clientes):** el proyecto incluye `Dockerfile` y `render.yaml`.
1. Sube el proyecto a un repositorio de GitHub (sin `server/.env` ni `server/data/`, ya están en `.gitignore`).
2. En render.com: New → Blueprint → elige el repositorio. Se crea el servicio con un disco de 1 GB para los datos (plan Starter, de pago).
3. En el panel de Render rellena `ANTHROPIC_API_KEY` y `CREW_DEMO_PIN` (o déjalo vacío y da un PIN a cada persona).
4. Render te da una dirección `https://….onrender.com`; puedes ponerle tu dominio (p. ej. `crew.flammeburger.no`).
La misma imagen Docker funciona en Railway, Fly.io o un servidor propio: monta un disco persistente en `/data`.

**PIN compartido:** el valor está en `server/.env` (`CREW_DEMO_PIN`). Lo usa quien aún no tenga PIN propio. No lo publiques; cuando cada persona tenga el suyo, déjalo vacío.

## Qué hace el servidor (`server/`)
| Archivo | Función |
|---|---|
| `server.mjs` | Sirve la app, acceso con PIN (guardado cifrado), sesiones, recibe las acciones y avisa en tiempo real a todos los móviles abiertos |
| `engine.mjs` | Ejecuta en el servidor **el mismo código** de la app como el usuario que ha iniciado sesión, así los permisos se comprueban en el servidor. Solo admite una lista cerrada de acciones |
| `scope.mjs` | Decide qué datos descarga cada persona: un empleado no recibe sueldos, fichajes ni mensajes privados de otros, ni las respuestas individuales de las encuestas |
| `assistant.mjs` | Asistente con Claude: le pasa las guías aprobadas, el manual, la carta verificada y los turnos del trabajador; responde citando fuentes. La clave nunca llega al móvil |
| `data/` | Los datos (`<cliente>.db.json`) y los PIN y sesiones (`<cliente>.auth.json`). **Haz copia de seguridad de esta carpeta** |

Para otro cliente: crea su carpeta en `tenants/` y arranca el servidor con `CREW_TENANT=<carpeta>` en `server/.env` (un servidor por empresa).

## Los 3 apartados
| Apartado | Qué incluye |
|---|---|
| **En tienda** (rojo) | Resumen del turno · informe de preparación/descongelado · checklists apertura/cierre · conteo de cierre · guías paso a paso · **Carta y alérgenos** (tarjetas + matriz de 14 alérgenos) · **Asistente IA** con fuentes · Emergencias/SOS · validar recompensas |
| **Turnos** (azul, tipo Planday) | Mis turnos · cuadrante semanal y vista por día · fichaje (entrada/pausa/salida con cronómetro) · turnos libres · intercambios y cesión de turnos (compañero acepta → encargado aprueba) · ausencias y vacaciones con saldo · disponibilidad semanal · horas y sueldo estimado (pluses de tarde/sábado/domingo, horas extra) · **encargado:** crear/editar/copiar/publicar cuadrante, avisos de conflictos (doble turno, ausencia, descanso de 11 h, horas semanales), coste laboral vs. ventas, aprobaciones, validación de fichajes, **exportación de nóminas CSV**, exportar turnos al calendario (.ics) |
| **Comunidad** (verde, tipo Monotree) | Noticias por tienda o para toda la empresa (fotos, me gusta, comentarios, encuestas, "lectura obligatoria" con confirmación y % de lectura) · **chat** con canales por tienda/departamento, grupos y mensajes directos · eventos con asistencia · formación con lecciones, test y certificado (+ matriz de progreso del equipo) · manual del empleado con confirmación de lectura · encuestas anónimas (eNPS) · reconocimientos (kudos) · directorio de compañeros (quién está trabajando, llamar, escribir) |

Además: **Inicio** con "Para ti" (tareas pendientes de las 3 áreas), notificaciones, perfil, y una zona **Encargado** (resumen, carta/alérgenos, guías y fuentes de la IA, usuarios y roles, **Ajustes de la app**).

## Cómo crear la app para otra empresa
Todo lo específico del cliente está en **`tenants/<cliente>/`**; el código de `src/` no se toca.

1. Copia `tenants/flamme-burger/` → `tenants/nuevo-cliente/`.
2. Edita `tenant.js`: nombre de la app, logo y colores, nombres/colores de los 3 apartados, **módulos activados/desactivados**, puestos de trabajo, reglas de RR. HH. (pluses, horas extra, vacaciones), terminología.
3. Sustituye los datos: `catalog.js` (carta, alérgenos, locales), `content.js` (guías, checklists, emergencias), `workforce.js` (plantilla y turnos), `community.js` (canales, cursos, manual), `brand/` (logos, iconos, fotos) y `manifest.webmanifest`.
4. En `index.html` cambia las rutas `tenants/flamme-burger/` por la nueva carpeta.

El encargado también puede, desde **Encargado → Ajustes de la app**, cambiar nombre, color de marca, nombres y colores de los apartados y activar/desactivar funciones en directo — útil para enseñárselo a un cliente en una reunión.

## Estructura
| Carpeta | Contenido |
|---|---|
| `tenants/flamme-burger/` | Configuración y datos del cliente |
| `src/services/api.js` | Backend simulado (carta, guías, checklists, prep, inventario) con control de roles |
| `src/services/workforce.js` | Turnos, fichajes, ausencias, intercambios, nóminas |
| `src/services/community.js` | Chat, noticias, eventos, formación, documentos, encuestas, kudos |
| `src/services/ai.js` | Asistente: respuestas desde documentos aprobados, reglas de seguridad para alérgenos; proveedor `remote` preparado para conectar un LLM en el servidor |
| `src/views/` | `shell.js` (navegación, inicio, tienda, carta), `staff.js` (pantallas de tienda), `schedule.js`, `community.js`, `admin.js` |
| `assets/` | `app.css` (base) + `crew.css` (plataforma) |

## Qué falta para ponerla en producción
Ya hay: servidor, datos compartidos, tiempo real, acceso con PIN, permisos en el servidor e IA lista para activar. Falta:
- **Publicarla en internet** con HTTPS (Render, Railway, Fly.io o un VPS) para que se pueda usar fuera de la wifi y se pueda instalar en el móvil. Con `http://` en la wifi funciona, pero el móvil no la instala como app.
- **Base de datos** (PostgreSQL) en lugar del archivo JSON cuando haya muchos usuarios o varias empresas, y copias de seguridad automáticas.
- **Quitar el PIN de demo** (`CREW_DEMO_PIN=` vacío) y dar a cada trabajador su PIN, o conectar el login de la empresa (SSO).
- **Notificaciones push** al móvil con la app cerrada.
- Validar con cada cliente: reglas de nómina/convenio, guías y alérgenos verificados, y protección de datos (RGPD, contrato de encargado del tratamiento).
- Opcional: publicar en App Store / Google Play envolviendo esta web (p. ej. Capacitor).
