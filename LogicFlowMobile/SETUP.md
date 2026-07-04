# LogicFlow Mobile — Guía de Instalación

## Requisitos previos

- Node.js 18+
- npm o yarn
- Expo CLI: `npm install -g expo-cli`
- Para Android: Android Studio + emulador, o dispositivo físico con Expo Go
- Para iOS: Xcode (solo en Mac), o dispositivo físico con Expo Go

## Instalación

```bash
cd LogicFlowMobile
npm install
```

## Ejecutar en desarrollo

```bash
# Inicia el servidor de desarrollo
npm start

# Abre en Android
npm run android

# Abre en iOS
npm run ios
```

## Estructura del proyecto

```
LogicFlowMobile/
├── app/                    # Rutas (Expo Router)
│   ├── _layout.tsx         # Layout raíz con auth guard
│   ├── index.tsx           # Redirect inicial
│   ├── auth/               # Pantallas de autenticación
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   └── (tabs)/             # Tabs principales
│       ├── index.tsx       # Home / Dashboard
│       ├── scanner.tsx     # Escáner AR con IA
│       ├── assembly.tsx    # Guía de ensamble
│       ├── learn.tsx       # Tarjetas educativas
│       ├── badges.tsx      # Logros e insignias
│       └── profile.tsx     # Perfil de usuario
│
├── src/
│   ├── screens/            # Implementación de pantallas
│   ├── services/
│   │   ├── supabase.ts     # Cliente Supabase (mismas credenciales que la web)
│   │   ├── auth.ts         # Autenticación
│   │   └── progress.ts     # Progreso y estadísticas
│   ├── components/         # Componentes reutilizables
│   ├── constants/
│   │   ├── theme.ts        # Colores, tipografía, espaciado
│   │   └── components.ts   # Datos de los 8 componentes PC + XP/Niveles
│   └── hooks/
│       └── useAuth.ts      # Hook de sesión Supabase
│
└── assets/                 # Imágenes, iconos, splash
```

## Base de datos

La app usa las **mismas credenciales y tablas** que la aplicación web LogicFlow:

- **URL**: `https://kgyhbimpwwtnkiozymyr.supabase.co`
- **Tablas**: `progreso_usuario`, `eventos_simulacion`
- Las cuentas son compartidas — el usuario puede iniciar sesión con las mismas credenciales

## Funcionalidades MVP

### 1. Autenticación
- Login / Registro / Recuperación de contraseña
- Sesión persistente con AsyncStorage

### 2. Dashboard (Inicio)
- Nivel y barra de XP animada
- Estadísticas: componentes instalados, precisión, simulaciones
- Accesos directos a todas las funciones
- Siguiente componente sugerido
- Dato del día (rotatorio)

### 3. Escáner AR con IA
- Cámara en tiempo real con overlay de RA
- Detección real por IA (Google Gemini, multimodal): se toma una foto y se envía a una Supabase Edge Function que la clasifica entre los 8 componentes conocidos
- Conversación por voz: el estudiante puede grabar una pregunta de seguimiento sobre el componente detectado; la IA la responde y se lee en voz alta con `expo-speech`
- Ficha educativa del componente detectado: descripción, especificaciones, analogía, dato curioso
- Quiz de comprensión post-instalación
- Registro de aciertos/errores en Supabase

### 4. Guía de Ensamble paso a paso
- Timeline interactivo de los 8 componentes
- Cada paso muestra el consejo de instalación
- Barra de progreso
- Pantalla de celebración al completar

### 5. Módulo de Aprendizaje
- Tarjetas detalladas de los 8 componentes
- Tres tabs por componente: Descripción, Analogía pedagógica, Quiz
- Especificaciones técnicas
- Datos curiosos

### 6. Logros e Insignias
- 8 badges con condiciones de desbloqueo
- Mapa visual de niveles (Novato → Master Builder)
- Recompensas XP por insignia

### 7. Perfil
- Edición de nombre e institución
- Preferencias (notificaciones, efectos de sonido)
- Cierre de sesión

## Integración de IA del Escáner (Gemini + Supabase Edge Function)

El escáner ya no simula la detección: toma una foto real (`expo-camera`), opcionalmente graba
una pregunta hablada (`expo-audio`), y envía ambas a la Edge Function `scan-component`
(`supabase/functions/scan-component/index.ts`), que llama a la API de Gemini con la
`GEMINI_API_KEY` guardada como secreto de servidor — la key **nunca** viaja al cliente.
La respuesta se lee en voz alta con `expo-speech` (`src/services/ai.ts` expone
`detectarComponente()` y `preguntarSobreComponente()`).

### Desplegar la Edge Function (una sola vez, o cada vez que cambie `index.ts`)

```bash
cd LogicFlowMobile

# 1. Iniciar sesión con tu cuenta de Supabase (abre el navegador)
npx supabase login

# 2. Vincular este proyecto local con el proyecto de Supabase de LogicFlow
#    (project ref = el subdominio de la URL: https://<project-ref>.supabase.co)
npx supabase link --project-ref kgyhbimpwwtnkiozymyr

# 3. Guardar la API key de Gemini como secreto del proyecto (nunca la subas al repo)
npx supabase secrets set GEMINI_API_KEY=tu_api_key_de_google_ai_studio

# 4. Desplegar la función
npx supabase functions deploy scan-component
```

Consigue una API key gratuita en [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

La función verifica el JWT de Supabase por defecto, así que solo usuarios autenticados de la
app (mismo login que la web) pueden invocarla — esto evita que alguien externo consuma tu cuota
de Gemini.

### Probar localmente antes de desplegar (opcional)

```bash
npx supabase functions serve scan-component --env-file ./supabase/.env.local
```

Crea `supabase/.env.local` con `GEMINI_API_KEY=...` (ya está en `.gitignore` — nunca lo
commitees). Apunta la app a `http://localhost:54321` cambiando temporalmente la URL en
`src/services/supabase.ts`, o usa `supabase status` para ver la URL local exacta.

### Cambiar de modelo

El modelo por defecto es `gemini-2.5-flash`. Para usar otro, define el secreto `GEMINI_MODEL`:

```bash
npx supabase secrets set GEMINI_MODEL=gemini-2.5-pro
```
