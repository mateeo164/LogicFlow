# LogicFlow · Base de datos y backend — Guía completa

> Documento de referencia para entender **cómo funciona el backend de LogicFlow desde cero**:
> qué tecnología usa, qué tablas existen, qué guarda cada una, cómo se protegen los datos y
> cómo el frontend conversa con ellas. Sirve tanto para levantar la base desde cero como para
> mantenerla.

---

## 1. Panorama: ¿dónde está el "backend"?

LogicFlow **no tiene un servidor de aplicación propio con base de datos**. El archivo
[`server.cjs`](../server.cjs) es únicamente un servidor **Express que sirve archivos estáticos**
(HTML, CSS, JS, modelos 3D) y aplica cabeceras de seguridad (CSP, compresión). No toca datos de
usuario.

Todo el backend real —autenticación, base de datos y almacenamiento de archivos— vive en
**Supabase**, una plataforma _Backend-as-a-Service_ construida sobre **PostgreSQL**. El navegador
del estudiante habla **directamente** con Supabase por HTTPS.

```
┌─────────────┐        estáticos          ┌──────────────────┐
│  Navegador  │ ◀───────────────────────  │  server.cjs      │
│  (cliente)  │   HTML/CSS/JS/modelos 3D   │  (Express)       │
│             │                            └──────────────────┘
│             │
│  js/*.js    │        REST + Auth + Storage (HTTPS, JWT)
│             │ ◀──────────────────────────────────────────▶ ┌───────────────────────┐
└─────────────┘                                               │       SUPABASE        │
                                                              │ ┌───────────────────┐ │
                                                              │ │ Auth (GoTrue)     │ │
                                                              │ │ PostgREST (REST)  │ │
                                                              │ │ Storage (buckets) │ │
                                                              │ │ PostgreSQL + RLS  │ │
                                                              │ └───────────────────┘ │
                                                              └───────────────────────┘
```

**Consecuencia clave de seguridad:** como el cliente habla directo con la base, la única barrera
que impide que un usuario lea/escriba datos ajenos es **Row Level Security (RLS)** dentro de
PostgreSQL. Toda la seguridad del proyecto depende de que RLS esté bien configurado. Ver
[§6 Seguridad](#6-seguridad-rls-anon-key-y-security-definer).

### Las tres "APIs" de Supabase que usa el cliente

| API | URL base | Para qué | Archivo cliente |
|-----|----------|----------|-----------------|
| **Auth** (GoTrue) | `/auth/v1` | Registro, login, recuperar contraseña, refresh token | [`supabase-config.js`](../js/supabase-config.js), [`auth.js`](../js/auth.js) |
| **REST** (PostgREST) | `/rest/v1` | Leer/escribir tablas y llamar funciones (`/rpc/...`) | [`progreso.js`](../js/progreso.js), [`retos-api.js`](../js/retos-api.js), [`tutor-api.js`](../js/tutor-api.js), [`academia-api.js`](../js/academia-api.js) |
| **Storage** | `/storage/v1` | Subir/descargar fotos y archivos de entregas | [`progreso.js`](../js/progreso.js), [`tutor-api.js`](../js/tutor-api.js) |

---

## 2. Cómo se conecta el cliente

### 2.1 Credenciales

En [`js/supabase-config.js`](../js/supabase-config.js) hay dos constantes públicas:

```js
const SUPABASE_URL      = 'https://kgyhbimpwwtnkiozymyr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOi...'   // JWT con rol "anon"
```

La **`anon key` es pública por diseño**: identifica al proyecto y otorga el rol `anon`. No es un
secreto; se puede versionar y exponer en el navegador **porque RLS decide qué puede hacer cada
quien**. Nunca debe usarse aquí la `service_role key` (esa sí es secreta y salta RLS).

### 2.2 Sesión y JWT

- Al iniciar sesión, Supabase devuelve un **`access_token` (JWT)** y un **`refresh_token`**.
- Se guardan en **`sessionStorage`** (no `localStorage`): la sesión se borra al cerrar la pestaña,
  para no dejar sesiones abiertas indefinidamente. Las **preferencias** (tema, progreso local de la
  Academia) sí van en `localStorage`.
- Cada petición a REST/Storage envía dos cabeceras:
  ```
  apikey:        <ANON_KEY>
  Authorization: Bearer <access_token del usuario>
  ```
  Dentro de PostgreSQL, `auth.uid()` extrae el `sub` (id de usuario) de ese JWT — es la pieza sobre
  la que se apoyan todas las políticas RLS.
- El `id` del usuario se obtiene en el cliente decodificando el `sub` del JWT (`getUserId()` en cada
  archivo de API).
- Si un token expira, `supabaseAuthRequest` intenta **refrescarlo** automáticamente una vez
  (`refreshSession`) y reintenta la petición; si falla, limpia la sesión y manda a `login.html`.
- [`protegerRuta()`](../js/auth.js) protege las páginas privadas (menú, juego, retos…): sin sesión
  válida, redirige a login.

### 2.3 El patrón `dataRequest`

Los cuatro archivos de API (`progreso.js`, `retos-api.js`, `tutor-api.js`, `academia-api.js`)
repiten el mismo helper: arma cabeceras con el JWT, hace `fetch` a `/rest/v1<path>`, aborta a los
12 s (timeout) y normaliza errores. Sobre él se construyen dos formas de hablar con la base:

1. **Acceso directo a tablas** (estilo PostgREST):
   `GET /rest/v1/progreso_usuario?select=*&limit=1`,
   `PATCH /rest/v1/progreso_usuario?user_id=eq.<id>`, etc.
2. **Llamadas a funciones (RPC)**:
   `POST /rest/v1/rpc/lf_crear_clase` con `{ p_nombre: "..." }`.
   Se usan para operaciones que requieren lógica de servidor o saltar RLS de forma controlada
   (ver [§5 Funciones RPC](#5-funciones-rpc-catálogo)).

---

## 3. Modelo de datos (tabla por tabla)

Todas las tablas viven en el esquema `public`. Hay dos grandes grupos:

- **Progreso del estudiante** (sin prefijo): `progreso_usuario`, `eventos_simulacion`,
  `retos_resultados`, `logros_usuario`, `certificados`.
- **Aula del docente** (prefijo `lf_`): `lf_clases`, `lf_inscripciones`, `lf_tareas`,
  `lf_entregas`, `lf_notificaciones`.

```
auth.users (gestionada por Supabase)
   │  id (uuid)
   ├──────────────┬───────────────┬───────────────┬──────────────┐
   ▼              ▼               ▼               ▼              ▼
progreso_usuario  eventos_       retos_          logros_        certificados
(1 fila/usuario)  simulacion     resultados      usuario        (1 fila/usuario)
                  (bitácora)     (1/intento)     (1/logro)

Aula:
lf_clases ──1:N── lf_inscripciones ──N:1── auth.users(estudiante)
   │
   └──1:N── lf_tareas ──1:N── lf_entregas ──N:1── auth.users(estudiante)

lf_notificaciones (1/aviso, por estudiante)
Storage buckets: "ensambles" (fotos), "entregas" (archivos de tareas)
```

### 3.1 `progreso_usuario` — el expediente del estudiante

**Una sola fila por usuario** (`user_id` es único/PK). Web y móvil escriben sobre la **misma
fila**. Concentra todo el resumen del avance. Sus columnas se fueron agregando en varias
migraciones:

| Columna | Tipo | Origen (SQL) | Significado |
|---|---|---|---|
| `user_id` | uuid (PK) | base | Dueño de la fila (= `auth.users.id`). |
| `componentes_instalados` | text[] | base | IDs de los componentes ya montados en el laboratorio. |
| `total_componentes` | integer | base | Nº de piezas del reto de ensamblaje (normalmente 6–8). |
| `paso_actual` | integer | base | Paso en el que va la simulación. |
| `ultimo_componente` | text | base | Última pieza instalada. |
| `simulaciones_completadas` | integer | base | Cuántas veces completó el ensamble. |
| `tiempo_total_segundos` | integer | base | Tiempo acumulado ensamblando. |
| `completed_at` | timestamptz | base | Cuándo terminó el ensamble por primera vez. |
| `updated_at` | timestamptz | base | Última modificación. |
| `nota_web` | numeric(4,1) | `logros-certificado.sql` | Nota final del laboratorio web (0–10). |
| `web_aprobado_at` | timestamptz | `logros-certificado.sql` | Marca de aprobación **web**. |
| `movil_completado_at` | timestamptz | `logros-certificado.sql` | Marca de finalización en la **app móvil**. |
| `foto_simulador_path` | text | `logros-certificado.sql` | Ruta (en Storage) de la captura del ensamble 3D. |
| `comprension_pct` | numeric(5,2) | `pedagogia-coherencia.sql` | % de micro-preguntas conceptuales acertadas. |
| `pre_test` / `post_test` | integer | `pedagogia-coherencia.sql` | Aciertos en el test diagnóstico / final. |
| `eval_total` | integer | `pedagogia-coherencia.sql` | Nº de preguntas del pre/post-test. |
| `ganancia` | numeric(4,3) | `pedagogia-coherencia.sql` | Ganancia de aprendizaje de Hake (0–1). |
| `academia_lecciones` | jsonb `[]` | `academia.sql` | IDs de lecciones de teoría completadas. |
| `academia_completadas` | integer | `academia.sql` | Nº de lecciones (derivado, para consultas rápidas). |
| `academia_actualizado_at` | timestamptz | `academia.sql` | Último avance en la Academia. |
| `prueba_arranque_at` | timestamptz | `prueba-arranque.sql` | Cuándo probó el arranque (POST) en el banco. |
| `arranque_exitoso` | boolean | `prueba-arranque.sql` | Si el primer arranque fue correcto. |

> **Nota:** la tabla base (`user_id`, `componentes_instalados`, tiempos, etc.) se creó en Supabase
> **antes** de versionar el SQL, por lo que su `CREATE TABLE` original no está en el repo; las
> migraciones posteriores solo hacen `add column if not exists`. [`seguridad-rls.sql`](../supabase/seguridad-rls.sql)
> garantiza que la tabla tenga RLS activo.

### 3.2 `eventos_simulacion` — bitácora de acciones

Registro **append-only** (solo insertar): cada acción relevante durante el laboratorio deja una
fila. Alimenta las estadísticas del alumno y el diagnóstico del docente ("qué concepto le cuesta a
la clase").

| Columna | Tipo | Significado |
|---|---|---|
| `user_id` | uuid | Autor del evento. |
| `tipo` | text (con CHECK) | Categoría del evento (ver abajo). |
| `componente` | text | Componente involucrado. |
| `componente_esperado` | text | Qué componente correspondía (para errores de pieza). |
| `segundos` | integer | Duración/tiempo asociado. |
| `detalle` | text | Sub-paso concreto (p. ej. "Conectar cable EPS 8-pin"). |
| `created_at` | timestamptz | Momento del evento. |

**Tipos permitidos** (el `CHECK` se fue ampliando en las migraciones):

`acierto`, `error_pieza`, `demora`, `error_ensamble`, `acierto_ensamble`,
`quiz_acierto`, `quiz_error` (micro-preguntas por componente),
`prueba_arranque_ok`, `prueba_arranque_fallo` (banco de pruebas / POST).

### 3.3 `retos_resultados` — calificaciones del Modo Retos

Una fila **por intento** de reto (diagnóstico/reparación). Definida en
[`retos.sql`](../supabase/retos.sql).

| Columna | Tipo | Significado |
|---|---|---|
| `id` | bigint identity (PK) | — |
| `user_id` | uuid | Estudiante. |
| `reto_id` | text | Identificador del reto (definido en `js/retos-data.js`). |
| `nota` | numeric(4,1) | Calificación 0–10. |
| `exito` | boolean | Si superó el reto. |
| `errores_diagnostico` | integer | Errores al diagnosticar. |
| `pistas_usadas` | integer | Pistas consumidas. |
| `inspecciones` | integer | Componentes inspeccionados. |
| `segundos` | integer | Tiempo empleado. |
| `created_at` | timestamptz | — |

Índice `retos_resultados_user_idx (user_id, reto_id, created_at desc)` para consultar rápido el
historial. El cliente resume varios intentos con `resumirResultados()` (mejor nota, si alguna vez
tuvo éxito, nº de intentos).

### 3.4 `logros_usuario` — insignias

Un registro **por logro obtenido**. PK compuesta `(user_id, logro_id)` → no se duplica. Definida en
[`retos.sql`](../supabase/retos.sql).

| Columna | Tipo | Significado |
|---|---|---|
| `user_id` | uuid | Estudiante. |
| `logro_id` | text | ID del logro (web, móvil o reto). |
| `contexto` | text | Dónde/ cómo se ganó (opcional). |
| `created_at` | timestamptz | — |

El cliente inserta con `Prefer: resolution=ignore-duplicates` y `on_conflict=user_id,logro_id`, así
volver a otorgar un logro ya ganado es un no-op silencioso.

### 3.5 `certificados` — cierre del ciclo

Una fila por usuario, registra la emisión del certificado final (montaje simulado + foto real).
Definida en [`logros-certificado.sql`](../supabase/logros-certificado.sql).

| Columna | Tipo | Significado |
|---|---|---|
| `user_id` | uuid (PK) | Estudiante. |
| `emitido_at` | timestamptz | Fecha de emisión. |
| `tiempo_total_segundos` | integer | Tiempo total invertido. |
| `nota_web` | numeric(4,1) | Nota del laboratorio. |
| `foto_simulador_path` | text | Captura del ensamble 3D (Storage). |
| `foto_real_path` | text | Foto del ensamble real (Storage). |
| `logros_total` | integer | Nº de insignias al emitir. |

### 3.6 Aula del docente (`lf_*`)

Definidas en [`tutor-setup.sql`](../supabase/tutor-setup.sql) (setup completo y auto-suficiente).

**`lf_clases`** — una clase creada por un tutor.

| Columna | Tipo | Significado |
|---|---|---|
| `id` | uuid (PK) | — |
| `tutor_id` | uuid | Dueño/docente de la clase. |
| `nombre` | text | Nombre visible. |
| `codigo` | text (único) | Código de 6 caracteres para que los alumnos se unan (sin caracteres ambiguos). |
| `created_at` | timestamptz | — |

**`lf_inscripciones`** — qué estudiante pertenece a qué clase. PK `(clase_id, estudiante_id)`.

**`lf_tareas`** — tareas de una clase (`titulo`, `descripcion`, `puntaje_max`, `vence_at`).

**`lf_entregas`** — entrega de un estudiante para una tarea. PK `(tarea_id, estudiante_id)`.

| Columna | Tipo | Significado |
|---|---|---|
| `entregada` / `entregada_at` | boolean / timestamptz | Estado de entrega. |
| `nota` / `comentario` / `calificada_at` | numeric / text / timestamptz | Calificación del tutor. |
| `archivo_path` / `archivo_nombre` | text | Adjunto en el bucket `entregas` (ver [`entregas-archivos.sql`](../supabase/entregas-archivos.sql)). |

**`lf_notificaciones`** — avisos al estudiante (`tarea_nueva`, `tarea_calificada`). Se llenan
mediante **triggers** cuando el tutor crea una tarea o califica una entrega.

### 3.7 Storage (archivos)

Dos **buckets privados** (no públicos); el acceso se controla con políticas RLS sobre
`storage.objects`:

| Bucket | Contenido | Estructura de ruta | Quién accede |
|---|---|---|---|
| `ensambles` | Fotos del simulador y del ensamble real | `{user_id}/simulador.png`, `{user_id}/real.jpg` | Solo el dueño (`foldername[1] = auth.uid()`). |
| `entregas` | Archivos de tareas (PDF/Word/imagen) | `{tarea_id}/{estudiante_id}/{archivo}` | El estudiante dueño **y** el tutor de la tarea. |

Para **descargar** un archivo privado se genera una **URL firmada temporal** (`urlArchivoEntrega`,
1 h por defecto). El cliente valida tipo/tamaño (≤10 MB, PDF/Word/imagen) antes de subir.

---

## 4. Flujos de datos de punta a punta

### 4.1 Registro y confirmación de correo

```
registro.html → auth.js: registrarUsuario()
   POST /auth/v1/signup?redirect_to=<.../confirmar-cuenta.html>
   body: { email, password, data: { full_name, institucion, rol } }
→ Supabase envía correo de confirmación con el redirect
→ el usuario hace clic → confirmar-cuenta.html
```

El `rol` (`Estudiante`/`Tutor`) y el nombre viajan en `data` y quedan en
`auth.users.raw_user_meta_data`, de donde luego lo leen las funciones del panel docente.

> **Requisito de configuración:** el dominio de producción debe estar en la **allowlist de
> Redirect URLs** de Supabase (Auth → URL Configuration), o los enlaces de confirmación y
> recuperación fallarán. Ver [§8](#8-poner-la-base-en-marcha-desde-cero).

### 4.2 Login y sesión

```
login.html → auth.js: iniciarSesion()
   POST /auth/v1/token?grant_type=password
→ guardarSesion(): access_token + refresh_token en sessionStorage
→ redirección a menu.html
```

En cada carga de página privada, `protegerRuta()` valida la sesión y, si el token venció, lo
refresca en silencio.

### 4.3 Laboratorio de ensamblaje (`juego.html`)

- Cada componente montado → `guardarProgreso()`:
  1. **Camino preferido (atómico):** `POST /rpc/lf_instalar_componente`. El servidor hace
     `array_append` con **lock de fila**, así usar web y móvil a la vez **no pierde componentes**
     (evita el _last-write-wins_). Requiere haber corrido [`progreso-merge.sql`](../supabase/progreso-merge.sql).
  2. **Fallback:** si esa RPC no está desplegada o falla, cae al clásico _read-modify-write_ sobre
     `progreso_usuario`. **La app funciona con o sin ese SQL.**
- Cada acción (acierto, error, demora, quiz, cableado) → `registrarEvento()` inserta en
  `eventos_simulacion`.
- Al terminar: `marcarAprobacionWeb()` (nota + foto), `guardarComprension()` (pre/post-test,
  ganancia) y `marcarPruebaArranque()` (POST en el banco).
- La captura del ensamble se sube con `subirFotoSimulador()` al bucket `ensambles`.

### 4.4 Modo Retos (`retos.html`)

Diagnóstico/reparación. Al terminar un reto: `guardarResultadoReto()` inserta en
`retos_resultados`, y `otorgarLogros()` registra insignias en `logros_usuario`. La nota se calcula
en el cliente (`js/retos-data.js`, con tests en `test/retos-data.test.js`).

### 4.5 Academia (teoría, `academia.html` / `leccion.html`)

Estrategia **offline-first** ([`academia-api.js`](../js/academia-api.js)):

- `localStorage` es la fuente instantánea → la teoría funciona **sin sesión y sin red**.
- Con sesión, `sincronizar()` hace la **unión** (merge) de lo local con
  `progreso_usuario.academia_lecciones`, sin perder nada (migra el progreso local a la nube la
  primera vez). `completar(id)` guarda local al instante y empuja al servidor en segundo plano.

### 4.6 Aula: clases, tareas y entregas

```
Tutor:  crearClase() ─ POST /rpc/lf_crear_clase  → código de 6 chars
Alumno: unirseAClase(codigo) ─ POST /rpc/lf_unirse_a_clase → lf_inscripciones
Tutor:  crearTarea() ─ INSERT lf_tareas  → trigger → lf_notificaciones (a cada alumno)
Alumno: subirArchivoEntrega() → bucket "entregas"; entregarTarea() → lf_entregas
Tutor:  resumenTarea() / calificarEntrega() → trigger → lf_notificaciones (al alumno)
```

### 4.7 Panel docente y ranking

- `resumenClase(claseId)` → `lf_tutor_resumen_clase`: una fila por alumno con nota web, aprobación
  web/móvil, tiempo, componentes, retos superados, mejor nota, logros, **comprensión y ganancia** y
  **lecciones de Academia**. Solo el tutor de la clase.
- `conceptosDificilesClase(claseId)` → agrega `quiz_acierto/quiz_error` por componente: dice **qué
  re-enseñar**.
- `rankingClase(claseId)` → leaderboard entre pares. Lo puede pedir cualquier miembro de la clase;
  **no expone correos**, solo el nombre. Fórmula transparente:
  `retos·100 + logros·25 + mejor_nota·10 + componentes·10`.

---

## 5. Funciones RPC (catálogo)

Las funciones se llaman con `POST /rest/v1/rpc/<nombre>` y parámetros `{ p_... }`. Casi todas son
`SECURITY DEFINER` (corren como dueño, saltando RLS) y **verifican permisos dentro** antes de
actuar.

| Función | Quién puede llamarla | Qué hace | SQL |
|---|---|---|---|
| `lf_instalar_componente(comp, seg, total)` | El propio usuario | Append atómico de un componente a `progreso_usuario` (con dedup). | `progreso-merge.sql` |
| `lf_crear_clase(nombre)` | Autenticado | Crea clase con código único de 6 chars. | `tutor-setup.sql` |
| `lf_unirse_a_clase(codigo)` | Autenticado | Inscribe al usuario en la clase del código. | `tutor-setup.sql` |
| `lf_tutor_resumen_clase(clase_id)` | Tutor de la clase | Resumen de calificaciones de todos sus alumnos. | `tutor-setup.sql` → ampliada en `pedagogia-coherencia.sql` y `academia.sql` |
| `lf_conceptos_dificiles_clase(clase_id)` | Tutor de la clase | Conceptos con más errores en la clase. | `pedagogia-coherencia.sql` |
| `lf_ranking_clase(clase_id)` | Miembro de la clase | Leaderboard entre pares (sin correos). | `ranking.sql` |
| `lf_entregar_tarea(tarea_id, path, nombre)` | Alumno inscrito | Marca/entrega una tarea con archivo. | `tutor-setup.sql` → `entregas-archivos.sql` |
| `lf_calificar_entrega(tarea, alumno, nota, coment)` | Tutor de la tarea | Califica una entrega. | `tutor-setup.sql` |
| `lf_resumen_tarea(tarea_id)` | Tutor de la tarea | Estado por alumno de una tarea. | `tutor-setup.sql` → `entregas-archivos.sql` |
| `lf_mis_tareas()` | Autenticado | Tareas del alumno (todas sus clases) con su estado. | `tutor-setup.sql` → `entregas-archivos.sql` |
| Helpers: `lf_es_tutor_de`, `lf_esta_inscrito`, `lf_es_tutor_de_tarea`, `lf_puede_entregar_tarea` | (internas) | Comprueban pertenencia sin caer en recursión de RLS. | `tutor-setup.sql`, `entregas-archivos.sql` |

---

## 6. Seguridad: RLS, anon key y `SECURITY DEFINER`

1. **RLS es la única defensa.** Como el cliente usa la `anon key` pública, cada tabla con datos
   personales tiene RLS activo y políticas **"cada quien ve/edita solo lo suyo"**
   (`auth.uid() = user_id`). Ver [`seguridad-rls.sql`](../supabase/seguridad-rls.sql).

2. **`eventos_simulacion` es append-only:** hay política de `insert` y `select` propias, pero **no**
   de `update`/`delete` → con RLS activo, esas acciones quedan denegadas desde el cliente.

3. **El docente NO lee datos de alumnos vía políticas RLS**, sino vía **funciones `SECURITY
   DEFINER`** (el panel llama `lf_tutor_resumen_clase`, etc.). Esto evita políticas con `EXISTS`
   cruzados que en este proyecto causaban _"infinite recursion detected in policy"_. Los helpers
   (`lf_es_tutor_de`, `lf_esta_inscrito`…) están en **plpgsql** a propósito, para que Postgres
   **nunca los "inline"** y siempre corran como owner.

4. **Storage privado:** los buckets `ensambles` y `entregas` no son públicos; las políticas sobre
   `storage.objects` usan el path (`storage.foldername(name)`) para atar cada archivo a su dueño (y,
   en entregas, también al tutor de la tarea). Descargas vía URL firmada temporal.

5. **Nunca** poner la `service_role key` en el cliente: saltaría todo RLS.

---

## 7. Orden de dependencias de los scripts SQL

Los archivos están en [`supabase/`](../supabase/). Casi todos son **idempotentes** (se pueden
re-ejecutar) y terminan con `notify pgrst, 'reload schema'` para que PostgREST publique los cambios
al instante. Hay dependencias:

```
seguridad-rls.sql        (RLS de progreso_usuario y eventos_simulacion)
retos.sql                (retos_resultados, logros_usuario)
tutor-setup.sql          (aula lf_*: tablas, RLS, RPCs, triggers)   ← base del aula
   ├── logros-certificado.sql   (columnas nota/foto + tabla certificados + bucket ensambles)
   ├── pedagogia-coherencia.sql (comprensión/ganancia + amplía resumen + conceptos difíciles)
   │        └── academia.sql    (lecciones + añade columna al resumen)   ← requiere las 2 de arriba
   ├── entregas-archivos.sql    (archivo en entregas + bucket "entregas")   ← requiere tutor-setup
   ├── ranking.sql              (leaderboard)                               ← requiere tutor-setup
   └── prueba-arranque.sql      (marca de POST/arranque)
progreso-merge.sql       (RPC atómica lf_instalar_componente; OPCIONAL pero recomendada)
```

> Si dudas del orden, ejecuta primero `seguridad-rls.sql`, `retos.sql` y `tutor-setup.sql`; luego el
> resto en el orden de arriba; y `progreso-merge.sql` al final.

---

## 8. Poner la base en marcha desde cero

1. **Crear un proyecto en [supabase.com](https://supabase.com)** (plan free sirve).
2. Copiar **Project URL** y **anon public key** (Settings → API) y pegarlas en
   [`js/supabase-config.js`](../js/supabase-config.js) (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) y en el
   `SUPABASE_HOST` de [`server.cjs`](../server.cjs) (para la CSP).
3. **Auth → Providers:** habilitar **Email**. Decidir si exiges confirmación de correo (recomendado).
4. **Auth → URL Configuration:** poner en **Site URL** y **Redirect URLs** el dominio de producción
   (y `http://localhost:3000` para desarrollo). Sin esto, los correos de confirmar cuenta y
   recuperar contraseña **no funcionan**. Ver también [`SUPABASE.md`](../SUPABASE.md).
5. **SQL Editor:** ejecutar los scripts de `supabase/` en el orden de [§7](#7-orden-de-dependencias-de-los-scripts-sql).
6. **Storage:** los buckets `ensambles` y `entregas` se crean por SQL (`logros-certificado.sql` y
   `entregas-archivos.sql`). Verifica en Storage que existan y estén **privados**.
7. **Rol de Tutor:** cualquier usuario registrado con `rol = 'Tutor'` (elegido en el registro) verá
   el panel docente. No hay un paso extra en la BD; el rol vive en `raw_user_meta_data`.
8. Levantar el front (`npm start`) y probar registro → login → laboratorio → panel.

---

## 9. Notas de mantenimiento

- **Cambiar de proyecto Supabase** = actualizar la URL/anon key en `supabase-config.js` **y** el
  `SUPABASE_HOST` de la CSP en `server.cjs`.
- **Al modificar funciones/columnas** vía SQL, recuerda el `notify pgrst, 'reload schema'` (ya está
  al final de cada script) para que la API REST exponga el cambio sin reiniciar.
- **Degradación elegante:** toda la capa de datos del cliente atrapa errores y devuelve
  `null`/`false`/`[]` con un `console.warn`, de modo que un fallo de red **no rompe** la interfaz;
  el laboratorio y la Academia siguen usables offline.
- **Concurrencia web + móvil:** mantener desplegada `progreso-merge.sql` evita perder componentes
  cuando el mismo alumno usa ambos clientes a la vez.
- **Privacidad:** el ranking entre pares nunca expone correos; el panel docente sí (solo para el
  tutor de la clase).

---

_Última revisión: alineada con `supabase/*.sql` y `js/{supabase-config,auth,progreso,retos-api,tutor-api,academia-api}.js`._
