# LICITA PERÚ IA

Plataforma web multiempresa con un agente de IA que prepara expedientes de participación en contrataciones privadas y públicas en Perú: precalificación, homologación, concursos y licitaciones, para cualquier sector.

El comportamiento del agente lo define el prompt maestro (`src/agent/prompt-maestro.ts`, secciones 1 a 18). La plataforma le da lo que un prompt por sí solo no tiene: documentos, memoria estructurada del expediente, herramientas reales, compuertas de aprobación, separación entre empresas y medición de consumo.

Esta carpeta es un proyecto independiente del resto del repositorio.

## Qué hace

| Función del prompt | Dónde vive en la plataforma |
|---|---|
| Diagnóstico, ficha de empresa y de proceso (§4, §18) | Pestaña **Resumen**; herramientas `obtener_contexto`, `actualizar_proceso`, `actualizar_empresa` |
| Régimen y verificación normativa (§5) | Pestaña **Régimen**; búsqueda y lectura web del agente, con fuente, numeral y fecha de consulta |
| Expediente corporativo y evidencias (§6) | Página de la **empresa**: documentos reutilizables y registro de evidencias |
| Ruta privada desde la precalificación y ruta pública (§7, §8) | El agente activa la ruta según los documentos; estados separados para inscrito, presentado y adjudicado |
| Matriz maestra y decisión de participar (§9) | Pestaña **Matriz**, con los 16 campos del prompt y los cinco estados |
| Brechas (§7.D) | Pestaña **Brechas**: evidencia faltante, acción, tipo, responsable, costo, plazo, dependencia |
| Propuesta técnica, anexos, consultas (§10, §12) | Pestañas **Entregables** y **Consultas**; descarga en Word y PDF, con versiones |
| Oferta económica y flujo de caja (§11) | Pestañas **Presupuesto** y **Flujo de caja**; totales por moneda con fórmulas; lo interno no sale en la versión para el cliente |
| Control de cambios y revisión final (§13) | Reapertura automática al subir bases o adendas nuevas; especialista de auditoría final; pestaña **Revisiones** |
| Negociación y formalización (§14) | Pestañas **Negociación** y **Obligaciones** |
| Autonomía y autorizaciones (§15) | Pestaña **Aprobaciones** y compuertas de estado: «listo para presentar» exige aprobación; «presentado» exige constancia |
| Integridad y protección de información (§16) | Aislamiento por organización y por empresa, roles, bitácora, tratamiento del contenido de documentos como datos |
| Entregables e informes (§17) | Excel del expediente con fórmulas, Word, PDF y calendario `.ics` |

Lo que la plataforma **no** hace: entrar a portales (SEACE, Pladicop, portales de compradores), enviar correos, firmar, pagar ni presentar. El agente prepara el paquete y pide una aprobación; la acción la ejecuta una persona.

## Arquitectura

- **Aplicación**: Next.js 16 (App Router, TypeScript), una sola imagen de contenedor.
- **Base de datos**: PostgreSQL 14+ con Drizzle ORM. Las migraciones viajan dentro de la aplicación y se aplican solas al arrancar (`AUTO_MIGRATE=1`).
- **Archivos**: disco local o cualquier almacenamiento compatible con S3. Claves por organización y direccionadas por contenido (SHA-256).
- **Agente**: API de Anthropic (`@anthropic-ai/sdk`), bucle propio con streaming, 18 herramientas, búsqueda web del proveedor, especialistas como pasadas independientes y caché de prompts. Modelo por defecto `claude-opus-5-5`, configurable.
- **Tenencia**: toda consulta filtra por la organización de la sesión; las herramientas del agente reciben el ámbito desde el servidor, nunca del modelo.

```
src/
  agent/        prompt, herramientas, bucle, especialistas, modelo de prueba
  lib/          cuentas, datos (por organización), matrices, compuertas, plazos, planes, exportaciones
  db/           esquema y migraciones empaquetadas
  app/          páginas, acciones de servidor y rutas API
  components/   interfaz
tests/          pruebas con PostgreSQL real y un modelo con guion
```

## Puesta en marcha

### Con Docker (una máquina)

```bash
cp .env.example .env        # complete ANTHROPIC_API_KEY y PLATFORM_ADMIN_EMAILS
docker compose up --build
```

Abra `http://localhost:3000`, regístrese con el correo que puso en `PLATFORM_ADMIN_EMAILS` y entre a **Plataforma** para fijar los precios y límites de los planes.

### Sin Docker

Requiere Node 22 y PostgreSQL.

```bash
npm install
cp .env.example .env.local  # DATABASE_URL, ANTHROPIC_API_KEY, PLATFORM_ADMIN_EMAILS
npm run dev                 # http://localhost:3100
```

Para revisar la interfaz sin gastar tokens, use `AGENT_FAKE=1`: el agente se reemplaza por un guion fijo que ejercita las herramientas y lo dice en pantalla. No es IA y no debe usarse en producción.

## Despliegue en la nube

Necesita tres cosas: la imagen de la aplicación, un PostgreSQL gestionado y, si el servicio no tiene disco persistente, un bucket S3.

**Contenedor (recomendado).** Cloud Run, Railway, Render, Fly.io, ECS o una VM. Construya con el `Dockerfile`, defina las variables de `.env.example` y apunte el chequeo de salud a `/api/salud`. Con `STORAGE_DRIVER=local` monte un volumen en `/data`; con varias instancias use `STORAGE_DRIVER=s3`. Sirva siempre por HTTPS: la cookie de sesión es `Secure` en producción. Dé al servicio un tiempo máximo de solicitud de al menos 5 minutos, porque un turno del agente puede durar varios.

**Vercel.** Funciona con *Root Directory* `licita-peru`, un PostgreSQL externo (Supabase, Neon) y `STORAGE_DRIVER=s3`. Dos límites propios de esa plataforma: las funciones no aceptan cuerpos de más de unos 4,5 MB, así que la carga de documentos grandes requiere el despliegue en contenedor; y la duración máxima de una función depende del plan (la ruta del agente declara 300 s).

## Operación

- **Operador**: los correos de `PLATFORM_ADMIN_EMAILS` ven **Plataforma**: organizaciones, plan de cada una, suspensión y consumo de IA del mes. No ven los expedientes de los clientes.
- **Planes**: los tres iniciales son una propuesta editable. El precio es un texto que usted define; los límites (empresas, procesos activos, miembros, almacenamiento, consumo de IA por mes) se aplican de verdad.
- **Consumo de IA**: cada llamada registra tokens y costo estimado con precios de lista (`src/lib/planes.ts`, sustituibles con `PRECIOS_MODELOS_JSON`). Al llegar al tope del plan, el agente se detiene.
- **Roles**: propietario, administrador, editor, revisor/aprobador y solo lectura.
- **Datos que salen**: para analizar, el contenido de los documentos se envía a la API de Anthropic. Defina con ese proveedor la retención y la región, y declárelo en sus condiciones de uso.

## Pruebas

```bash
createdb licita_test        # una vez
npm test                    # usa TEST_DATABASE_URL o postgres://licita:licita_dev@127.0.0.1:5432/licita_test
npm run typecheck
```

Cubren: aislamiento entre organizaciones y entre empresas, compuertas de estado, validación de matrices, cálculo de plazos, el bucle del agente con un modelo con guion (herramientas, historial reproducido byte a byte, `pause_turn`, rechazos, especialistas de solo lectura, tope de consumo), cuentas e invitaciones, y exportaciones.

### Prueba en vivo del agente

Las pruebas anteriores usan un modelo con guion y no llaman a la API. Para confirmar que su clave, el modelo y las herramientas funcionan de verdad:

```bash
npm run prueba:modelo       # lee .env.local o .env; gasta tokens reales (normalmente menos de 2 USD)
```

Crea una organización temporal con unas bases de ejemplo, ejecuta dos turnos (diagnóstico y auditoría final con un especialista), muestra lo que el agente guardó y el consumo, y borra todo. **Ejecútela antes de abrir el servicio a clientes**: durante el desarrollo no se pudo llamar al modelo real, así que esta es la primera comprobación de extremo a extremo con IA.

Si la cuenta del proveedor no tiene habilitada la búsqueda web, el agente lo avisa y sigue sin ella; habilítela en la consola del proveedor y reinicie la aplicación, o defina `AGENT_WEB=0`.


## Antes de vender: pendientes conocidos

Esto es una primera versión funcional. Para operar con clientes de pago falta decidir o construir:

- **Cobro**: no hay pasarela de pagos. Los planes se asignan a mano desde **Plataforma**.
- **Correo transaccional**: las invitaciones generan un enlace que el administrador copia y envía. No hay recuperación de contraseña por correo ni verificación de correo al registrarse.
- **Segundo factor** y límite de tasa por IP (hoy solo hay bloqueo de cuenta tras seis intentos fallidos).
- **Cargas grandes en entornos sin servidor**: falta la subida directa al bucket con URL prefirmada.
- **Documentos legales**: términos de uso y política de privacidad conforme a la Ley N.° 29733 y su reglamento, con los datos del operador.
- **Operación**: copias de seguridad de la base y del bucket, monitoreo, antivirus sobre los archivos subidos y, como defensa adicional, seguridad a nivel de fila en PostgreSQL.
- **Conectores**: portales, correo y calendario externos no están integrados (el calendario se exporta como `.ics`).
- **Feriados**: el cálculo en días hábiles usa los feriados nacionales de referencia; no incluye días no laborables decretados ni feriados regionales.
