# LogicFlow

LogicFlow es un ecosistema educativo orientado a enseñar el ensamblaje y funcionamiento de computadoras mediante una experiencia interactiva, visual y práctica. El proyecto combina una aplicación web de simulación, una app móvil y servicios de base de datos para ofrecer una experiencia completa de aprendizaje.

## ¿Qué incluye este repositorio?

Este repositorio contiene tres partes principales:

- SimuladorPC: una plataforma web educativa con laboratorio 3D, herramientas de aprendizaje, progreso del estudiante y sistema de logros.
- LogicFlowMobile: una aplicación móvil construida con Expo para continuar la experiencia de aprendizaje desde dispositivos móviles.
- supabase: configuraciones y scripts para la integración con Supabase, incluyendo funciones y migraciones.

## Características principales

- Simulación interactiva de ensamblaje de PCs.
- Laboratorio 3D y recorrido guiado por componentes.
- Progreso del usuario, XP, niveles e insignias.
- Calculadora de potencia para fuentes de poder (PSU).
- Glosario educativo de hardware.
- Autenticación y persistencia de datos con Supabase.
- Versión móvil con experiencia de aprendizaje en dispositivos iOS/Android.

## Estructura del proyecto

```text
LogicFlow/
├── LogicFlowMobile/        # App móvil con Expo / React Native
├── SimuladorPC/            # Aplicación web del simulador educativo
├── supabase/               # Configuración, migraciones y funciones backend
└── README.md               # Documentación general del repositorio
```

## Tecnologías utilizadas

### Aplicación web
- HTML5, CSS3 y JavaScript
- Node.js y Express
- Supabase
- Three.js para el laboratorio 3D

### Aplicación móvil
- React Native
- Expo Router
- Expo Camera, Audio, Speech y Secure Store
- Supabase SDK

## Requisitos previos

- Node.js 18 o superior
- npm o yarn
- Expo CLI (para la app móvil)
- Cuenta de Supabase (si vas a usar la integración completa)

## Cómo ejecutar el proyecto

### 1) Aplicación web

```bash
cd SimuladorPC
npm install
npm start
```

La aplicación quedará disponible en el puerto local configurado por el servidor.

### 2) Aplicación móvil

```bash
cd LogicFlowMobile
npm install
npx expo start
```

Desde ahí puedes abrir la app en un emulador, dispositivo físico o navegador web.

## Integración con Supabase

El proyecto usa Supabase para:

- autenticación de usuarios
- almacenamiento de progreso
- registro de eventos de simulación
- funciones backend y lógica de IA en la app móvil

## Estado del proyecto

LogicFlow está en desarrollo como una solución educativa integral para apoyar el aprendizaje práctico de hardware y ensamblaje de computadoras.

## Contribución

Si deseas contribuir al proyecto, puedes hacer un fork del repositorio, crear una rama con tus cambios y abrir un pull request con una descripción clara de la mejora realizada.

## Licencia

Este proyecto se distribuye con fines académicos y educativos de manera temporal como código abierto.
