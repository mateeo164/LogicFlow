# Informe general del software LogicFlow

> Documento explicativo para una persona que no conoce el proyecto y necesita entenderlo por completo: qué hace, cómo está construido (aspectos técnicos) y por qué está diseñado así (aspectos pedagógicos).
> Universidad Central del Ecuador — Pedagogía de las Ciencias Experimentales, Informática. Materia: Desarrollo de Software Educativo.
> Última actualización del informe: 2026-07-07.

---

## 1. ¿Qué es LogicFlow en una frase?

**LogicFlow es un ecosistema educativo interactivo que enseña a armar y diagnosticar computadoras.** El estudiante aprende la teoría, ensambla una PC pieza por pieza en un laboratorio 3D, repara equipos con fallas simuladas, y el docente puede seguir su progreso, calificar y comparar a su clase. No es un solo programa, sino **tres aplicaciones que comparten la misma base de datos y las mismas cuentas de usuario**.

Está pensado para que alguien que nunca ha abierto un computador termine entendiendo qué hace cada componente, en qué orden se montan, por qué, y cómo se detecta una avería.

---

## 2. Las tres partes del ecosistema

| Parte | Qué es | Tecnología | Para qué sirve |
|-------|--------|------------|----------------|
| **SimuladorPC** | Aplicación **web** (el corazón del proyecto) | HTML5, CSS3, JavaScript (módulos ES), Three.js, Node/Express | Laboratorio 3D, teoría (Academia), retos de reparación, herramientas y panel docente |
| **LogicFlowMobile** | Aplicación **móvil nativa** (iOS/Android) | Expo SDK 54 / React Native, expo-router, TypeScript | Continuar el aprendizaje en el celular; escáner de componentes con Inteligencia Artificial; certificado final |
| **supabase** | El **backend en la nube** (base de datos + autenticación + funciones) | Supabase (PostgreSQL + Auth + Edge Functions) | Guarda usuarios, progreso, notas, clases, logros; ejecuta la IA del escáner |

Un detalle clave: **la web y la app móvil no son copias separadas**. Usan las mismas credenciales y la misma tabla de progreso, así que un estudiante inicia sesión en cualquiera de las dos y ve lo mismo. El certificado final incluso exige completar **una parte en la web y otra en el móvil**.

---

## 3. La aplicación web (SimuladorPC) en detalle

Es una plataforma web multipágina. No usa un framework pesado: son páginas HTML con JavaScript modular, lo que la hace ligera y fácil de servir. Funciona como **PWA** (Progressive Web App): se puede "instalar" como si fuera una app y tiene caché offline mediante un *service worker*.

### 3.1 Recorrido del estudiante (las páginas)

1. **Landing / inicio** (`index.html`) — presentación del proyecto, la metodología y la ruta de aprendizaje.
2. **Autenticación** (`login.html`, `registro.html`, `recuperar-password.html`, `actualizar-password.html`, `confirmar-cuenta.html`) — registro e inicio de sesión con validaciones, recuperación de contraseña por correo.
3. **Dashboard / menú** (`menu.html`) — el centro de mando del alumno: su nivel, XP, insignias, progreso general, accesos al laboratorio, retos, herramientas y su clase.
4. **Academia** (`academia.html` + `leccion.html`) — la **capa de teoría**: un curso con 3 módulos y 13 lecciones.
5. **Laboratorio 3D** (`juego.html`) — el simulador de ensamblaje, la joya del proyecto.
6. **Retos** (`retos.html` → `juego.html?reto=<id>`) — modo diagnóstico y reparación.
7. **Herramientas** — **Calculadora de fuente de poder** (`calculadora.html`) y **Glosario de hardware** (`glosario.html`).

### 3.2 El laboratorio 3D (`juego.html` + `js/juego.js`)

Es el componente más grande y complejo (el motor 3D vive en `js/juego.js`, ~194 KB). Usa **Three.js** para renderizar una escena tridimensional donde el estudiante ensambla una PC real, pieza por pieza, con modelos 3D de marcas reconocibles (NZXT, ASUS ROG, AMD, G.Skill, Samsung, NVIDIA, EVGA…).

Qué ofrece:
- **Estaciones/pasos de montaje** (definidos en `js/pasos-data.js`): gabinete, ventiladores, placa base, CPU, disipador, RAM, almacenamiento NVMe, disco duro, cable SATA, GPU y fuente de poder.
- **Guía paso a paso** con instrucciones, pistas flotantes y un "dron" asistente que habla.
- **Procedimientos finos guiados**: no basta con "poner la pieza"; hay sub-tareas como alinear el triángulo del CPU, aplicar pasta térmica, conectar los cables de poder de la fuente en el orden correcto.
- **Modo caminar** (primera persona) para inspeccionar el equipo por dentro.
- **Evaluación integrada** (ver sección pedagógica): pre-test, micro-preguntas por componente y post-test.
- **Optimización de assets**: los modelos 3D están comprimidos con Draco y texturas WebP (se bajó de ~95 MB a ~5.5 MB), Three.js está vendorizado localmente en `/vendor/`.

### 3.3 Modo Retos — reparación (`js/retos-data.js`)

Cuatro retos de dificultad creciente (1★ a 3★) donde el estudiante actúa como **técnico de taller**:

| Reto | Síntoma que reporta el "cliente" | Dificultad |
|------|----------------------------------|------------|
| `no-enciende` | "Presiono el botón y no pasa absolutamente nada" | ★ |
| `sin-video` | "Prende y hace pitidos raros, pero el monitor queda en negro" | ★★ |
| `se-apaga` | "A los 5-10 minutos se apaga de golpe" | ★★ |
| `artefactos` | "Rayas de colores y cuadros por toda la pantalla" | ★★★ |

El alumno **inspecciona componente por componente**, interpreta señales técnicas reales (beeps, LEDs de diagnóstico, temperaturas, voltajes), puede pedir pistas graduadas, diagnostica la pieza culpable y la repara en el taller 3D. La nota penaliza errores de diagnóstico, uso de pistas y lentitud: mide el **razonamiento**, no la suerte.

### 3.4 Herramientas educativas

- **Calculadora de PSU** (`calculadora.html`): el estudiante elige componentes y calcula cuántos vatios necesita su fuente de poder — una habilidad práctica real al armar una PC.
- **Glosario** (`glosario.html`): diccionario de términos de hardware, filtrable. Las lecciones de la Academia enlazan directamente a un término con `glosario.html?q=<término>`.

### 3.5 Panel del Tutor (rol docente)

El sistema distingue dos roles (leídos del perfil del usuario): **Estudiante** y **Tutor**. El docente tiene una vista completamente distinta:
- Crea **clases** con un código; los estudiantes se unen con ese código.
- Ve **KPIs** por clase: número de estudiantes, promedio de ensamblaje, comprensión, avance de la Academia.
- **Crea tareas**, recibe entregas, **califica**.
- **Ranking entre pares** dentro de la clase (podio, resaltado de "tú").
- Exporta calificaciones a **CSV**, renombra/elimina clases, quita estudiantes.
- **Notificaciones** automáticas (nueva tarea, calificación publicada).

Por seguridad, el docente **no lee los datos de los alumnos directamente** de la base: lo hace a través de funciones controladas del servidor (RPC con `SECURITY DEFINER`), y a los compañeros solo se les muestra el nombre, nunca el correo.

---

## 4. La Academia — capa de teoría

Antes existían dos capas: **"hacer"** (simulador y retos) y **"consultar"** (glosario y calculadora). Faltaba **"aprender/leer"**. La Academia llena ese vacío.

Es **data-driven** (todo el contenido vive como datos en `js/academia-data.js`, y el visor los convierte en HTML). Consta de:
- **3 módulos**: Fundamentos → Componentes → Cierre.
- **13 lecciones**, por ejemplo: *"¿Qué es una computadora y cómo trabaja?"*, *"Compatibilidad: que las piezas se entiendan"*, *"Seguridad y buenas prácticas"*, una lección por cada componente, *"El orden correcto de montaje"* y *"Primer arranque: POST y BIOS"*.
- Cada lección tiene bloques tipados (párrafos, listas, datos curiosos, avisos, especificaciones) y un **mini-quiz**.
- **Progreso offline-first**: se guarda en el navegador (localStorage) y se sincroniza con la nube cuando hay sesión; al cargar fusiona ambos.

---

## 5. La aplicación móvil (LogicFlowMobile)

Es una app **nativa** hecha con Expo/React Native (no es un "navegador disfrazado" / WebView). Comparte cuentas y progreso con la web. Sus funciones:

1. **Autenticación** con sesión persistente.
2. **Dashboard** con nivel, barra de XP animada y estadísticas.
3. **Escáner con IA** (la función estrella del móvil): el estudiante apunta la cámara a un componente real; la foto se envía a una **Supabase Edge Function** que llama a **Google Gemini** (IA multimodal) para clasificarlo entre los 8 componentes conocidos. Puede además **grabar una pregunta hablada** y la IA responde en voz alta (`expo-speech`). La API key de Gemini **nunca viaja al teléfono**: vive como secreto en el servidor.
4. **Guía de ensamble** paso a paso.
5. **Módulo de aprendizaje** con tarjetas por componente (descripción, analogía pedagógica, quiz).
6. **Logros e insignias**.
7. **Perfil** y unirse a una clase por código.
8. **Certificado final** (`CertificateScreen`): se desbloquea solo si el estudiante aprobó **la web** *y* completó **el móvil**. Se genera una imagen del certificado y se puede compartir.
9. **Vista de tutor** en móvil: gestión de clases, tareas y calificaciones desde el celular.

---

## 6. El backend (Supabase)

Toda la persistencia y la lógica sensible viven en **Supabase** (PostgreSQL gestionado en la nube). Incluye:

- **Autenticación** de usuarios (correo/contraseña, confirmación por email, recuperación).
- **Base de datos** con tablas como: `progreso_usuario` (una sola fila compartida web+móvil por estudiante), `eventos_simulacion` (bitácora de aciertos/errores/quiz), `retos_resultados`, `logros_usuario`, `certificados`, y el módulo docente con prefijo `lf_` (`lf_clases`, `lf_inscripciones`, `lf_tareas`, `lf_entregas`, `lf_notificaciones`).
- **Seguridad a nivel de fila (RLS)**: cada usuario solo puede leer/escribir sus propios datos (`auth.uid() = user_id`). El acceso del docente a datos de alumnos pasa por **funciones RPC con `SECURITY DEFINER`**, nunca por lectura directa.
- **Almacenamiento** (bucket privado `ensambles`) para las fotos del ensamble.
- **Edge Function `scan-component`**: la lógica de IA del escáner móvil, que protege la API key y solo atiende a usuarios autenticados.

> Nota operativa: los scripts SQL (en `SimuladorPC/supabase/*.sql`) **debe ejecutarlos manualmente el administrador** en el editor SQL de Supabase; no se aplican solos.

---

## 7. Arquitectura y decisiones técnicas destacadas

- **Monorepo**: web, móvil y backend en un solo repositorio Git.
- **Sin framework de UI en la web**: JavaScript modular (ES modules) directo, lo que reduce dependencias y peso.
- **Design system en capas**: hoja base *legacy* + capa "V2 Academic Premium" (tipografía serif *Playfair Display*, paleta azul marino/bronce). Modo claro/oscuro persistente con dos capas de variables CSS.
- **Servidor**: Express simple (`server.cjs`) que sirve los estáticos en `localhost:3000`.
- **PWA**: `manifest.json` + `service-worker.js` (estrategia de caché con versión que se sube en cada cambio de JS/CSS).
- **Rendimiento 3D**: modelos Draco + texturas WebP, Three.js vendorizado, bucle de render pausable, CSP endurecida.
- **Pruebas**: hay tests con el runner nativo de Node (`test/*.test.js`) para la lógica pura (quiz, logros, herramientas de aprendizaje). El paquete es ESM para poder importar los módulos en las pruebas.
- **IA segura**: la key de Gemini vive como secreto de servidor en la Edge Function; el cliente nunca la ve.

---

## 8. Aspectos pedagógicos (el "por qué")

El diseño no es casual: responde a dos marcos pedagógicos explícitos, documentados en `docs/metodologia-abr-gamificacion.md`.

### 8.1 Aprendizaje Basado en Retos (ABR / *Challenge Based Learning*)

Estructura el aprendizaje en **Engage → Investigate → Act**, implementado en el Modo Retos:
- **Engage**: cada reto arranca con la voz de un *cliente* describiendo un síntoma auténtico ("presiono el botón y no pasa nada"). Problema situado, no pregunta abstracta.
- **Investigate**: el alumno inspecciona componentes, interpreta señales reales (beeps, LEDs, temperaturas, voltajes) y pide pistas graduadas.
- **Act**: diagnostica y **repara** en el taller 3D; recibe una nota razonada.
- **Progresión** de 1★ a 3★ y **evaluación auténtica** que mide el proceso (penaliza errores, pistas y lentitud), no el acierto por azar.

### 8.2 Gamificación (Points · Badges · Leaderboards)

- **Puntos y niveles (XP)**: 5 niveles — *Novato → Aprendiz → Técnico → Experto → Master Builder*.
- **Insignias**: 8 insignias por hitos globales + 7 logros granulares por procedimiento perfecto + 6 logros de reto. Los logros dan **recompensa tangible**: cada uno suma un bono a la nota (+0.05, tope +0.5).
- **Ranking entre pares**: cada estudiante ve su posición frente a sus compañeros de clase con una fórmula transparente y visible.
- **Ciclos de retroalimentación**: barra de nivel, "XP para el siguiente nivel", insignias recientes y progreso que integra los retos (100% = componentes instalados + retos superados).

### 8.3 Evaluación formativa y medición del aprendizaje

Esto es lo pedagógicamente más sofisticado del proyecto:
- **Pre-test y post-test** con las mismas preguntas, para medir cuánto aprendió el estudiante.
- **Micro-preguntas conceptuales** tras instalar cada componente, cuya retroalimentación explica el **porqué** (no solo el qué).
- **Nota mixta**: 60% destreza (ensamblaje) + 40% comprensión (preguntas) — la calificación refleja si el estudiante *entendió*, no solo si hizo bien los clics.
- **Ganancia de aprendizaje normalizada (Hake's gain)**: cuánto del margen que le faltaba recuperó entre el pre y el post-test.
- **Coherencia alumno↔docente**: la dimensión de comprensión se persiste y llega al panel del tutor, que ve promedio, ganancia y hasta los "conceptos difíciles" de la clase (dónde falla más gente).

### 8.4 Las tres capas del aprendizaje

El ecosistema cubre el ciclo completo:
1. **Aprender / leer** → Academia (teoría).
2. **Hacer** → laboratorio 3D y retos (práctica).
3. **Consultar** → glosario y calculadora (referencia).

Y cierra el círculo teoría ↔ práctica: la teoría da el sustento antes/después del reto, y el reto pone a prueba lo aprendido.

---

## 9. Cómo ejecutarlo (resumen práctico)

**Web:**
```bash
cd SimuladorPC
npm install
npm start          # → http://localhost:3000
```

**Móvil:**
```bash
cd LogicFlowMobile
npm install
npx expo start     # abrir con Expo Go (QR), emulador o navegador
```

**Backend:** requiere una cuenta de Supabase; ejecutar los `*.sql` de `SimuladorPC/supabase/` en el editor SQL y desplegar la Edge Function `scan-component` con la key de Gemini como secreto.

---

## 10. Estado y contexto

Proyecto académico de la **Universidad Central del Ecuador** (Pedagogía de las Ciencias Experimentales — Informática). Versión actual: **V1.1 (lanzamiento oficial)**. Distribuido temporalmente como código abierto con fines educativos.

En resumen, LogicFlow es un **ecosistema educativo completo** —teoría, práctica 3D, diagnóstico, evaluación medible, gamificación y panel docente, en web y móvil, respaldado por una nube segura— construido sobre dos marcos pedagógicos sólidos (ABR + gamificación) y con instrumentos reales de medición del aprendizaje.
