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
- Detección simulada de componentes (preparado para integrar modelo TFLite/Roboflow)
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

## Integración de IA para el Escáner (Post-MVP)

Para reemplazar la detección simulada con un modelo real:

1. **Opción A — TensorFlow.js**: 
   - Instala `@tensorflow/tfjs-react-native` y `@tensorflow-models/coco-ssd`
   - Reemplaza `simulateAIDetection()` en `ScannerScreen.tsx` con inferencia real
   
2. **Opción B — Roboflow API**:
   - Entrena un modelo con fotos de componentes de PC en `roboflow.com`
   - Llama su API REST desde `simulateAIDetection()`

3. **Opción C — Google ML Kit**:
   - Usa `@react-native-ml-kit/image-labeling`
   - Mapea las etiquetas detectadas a IDs de componentes
