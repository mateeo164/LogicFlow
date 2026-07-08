# LogicFlow — Simulador Educativo de Ensamblaje de PCs

Plataforma web educativa para aprender a ensamblar computadoras de forma interactiva. Incluye un laboratorio 3D, progreso de aprendizaje, sistema de niveles/XP, insignias, calculadora de PSU y glosario de hardware.

## 🚀 Características principales

- **Laboratorio 3D interactivo**: ensambla 8 componentes de PC en un entorno virtual con guía paso a paso.
- **Sistema de progreso**: estadísticas de aciertos, errores, demoras y tiempo total.
- **Niveles / XP / Insignias**: gana experiencia al ensamblar y desbloquea logros.
- **Modo claro / oscuro**: tema persistente en `localStorage`.
- **Herramientas educativas**:
  - Calculadora de fuente de poder (PSU).
  - Glosario interactivo de hardware.
- **Panel de tutor**: vista diferenciada para usuarios con rol `Tutor`.
- **PWA básica**: manifest y service worker para instalación y cache offline.
- **Diseño responsive y accesible**: funciona en escritorio, tablet y móvil.

## 🛠️ Tecnologías

- HTML5 + CSS3
- JavaScript (ES modules)
- Three.js (laboratorio 3D)
- Supabase (autenticación y persistencia de progreso)
- Node.js + Express (servidor local)

## 📁 Estructura destacada

```
├── index.html                 # Landing page
├── login.html                 # Inicio de sesión
├── registro.html              # Registro de usuario
├── recuperar-password.html    # Recuperación de contraseña
├── actualizar-password.html   # Nueva contraseña
├── menu.html                  # Dashboard del usuario
├── juego.html                 # Laboratorio 3D
├── calculadora.html           # Calculadora PSU
├── glosario.html              # Glosario de hardware
├── css/
│   ├── estilos.css            # Estilos base legacy
│   ├── logicflow-premium.css  # Design system V2
│   ├── landing-v2.css         # Mejoras landing
│   ├── auth-v2.css            # Mejoras auth
│   ├── dashboard-v2.css       # Mejoras dashboard
│   ├── sim-v2.css             # Mejoras simulador
│   ├── tools-v2.css           # Mejoras herramientas
│   ├── retos.css              # Módulo de retos
│   └── academia.css           # Módulo de academia
├── js/
│   ├── theme.js               # Modo claro/oscuro
│   ├── ui-effects.js          # Toasts, animaciones, utilidades
│   ├── achievements.js        # Niveles, XP e insignias
│   ├── learning-tools.js      # Datos de calculadora y glosario
│   ├── calculadora.js         # Lógica calculadora
│   ├── glosario.js            # Lógica glosario
│   ├── main.js                # Landing page
│   ├── menu.js                # Dashboard
│   ├── auth.js                # Autenticación
│   ├── progreso.js            # Persistencia de progreso
│   └── juego.js               # Motor 3D y lógica del simulador
├── manifest.json              # PWA manifest
├── service-worker.js          # Cache offline
└── server.cjs                 # Servidor Express
```

## ▶️ Cómo ejecutar (local)

```bash
npm install
npm start
```

El servidor se levanta en `http://localhost:3000`. Para probar el laboratorio 3D con modelos optimizados: `npm run optimize:models`.

Ejecutar la batería de pruebas:

```bash
npm test
```

## 🚀 Deploy

El proyecto es un servidor **Node.js + Express** que sirve los archivos estáticos (HTML/CSS/JS) y los assets 3D; el backend (auth y persistencia) es **Supabase**, así que no hay base de datos que aprovisionar en el host.

Requisitos del host:

- **Node.js ≥ 18** (definido en `engines` de `package.json`).
- Comando de build: _ninguno_ (no hay bundler).
- Comando de arranque: `npm start` (equivale a `node server.cjs`; también hay `Procfile`).
- El servidor escucha en `process.env.PORT` (lo inyecta la plataforma) o `3000` por defecto.
- Health-check disponible en `GET /health`.

Pasos genéricos (Render, Railway, Fly.io, Cloud Run, VPS, etc.):

1. Conecta el repositorio o sube el código al host.
2. Configura **Build Command**: vacío · **Start Command**: `npm start`.
3. (Opcional) Define `NODE_ENV=production` — ver `.env.example`.
4. Despliega. El proveedor asignará el puerto vía `PORT`.

> **Nota Supabase:** la URL del proyecto y la `anon key` son públicas por diseño (protegidas por RLS). Tras el deploy, añade el dominio de producción a la _allowlist_ de redirecciones de Auth en Supabase para que funcionen los correos de confirmación y recuperación.

## 🎓 Contexto

Proyecto educativo desarrollado para la **Universidad Central del Ecuador**, Pedagogía de las Ciencias Experimentales — Informática.

## 📝 Nota del rediseño V2 — Academic Premium

Este proyecto recibió un rediseño integral manteniendo intacta la lógica de autenticación, progreso y simulador 3D. El nuevo lenguaje visual es **educativo premium / académico**: tipografía serif (`Playfair Display`) para títulos, paleta sobria de azul marino y bronce, mucho aire en blanco y estructura de plataforma de aprendizaje universitaria.

Cambios principales:

- **Landing page reconstruida desde cero** con hero académico, diagrama técnico, metodología de 3 fases, ruta de 8 componentes, recursos didácticos y footer institucional.
- **Design system unificado** aplicado a todas las páginas: landing, login, registro, recuperación de contraseña, dashboard, laboratorio 3D, calculadora y glosario.
- **Modo claro / oscuro** persistente en `localStorage`.
- **Sistema de niveles, XP e insignias** en el dashboard.
- **Calculadora PSU** y **glosario técnico** como herramientas educativas independientes.
- **Panel de tutor** para usuarios con rol `Tutor`.
- **PWA básica** con manifest, service worker e icono SVG.
- **Responsive y accesible** en todos los breakpoints.
