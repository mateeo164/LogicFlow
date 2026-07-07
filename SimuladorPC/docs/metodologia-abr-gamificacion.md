# LogicFlow — Metodología: Aprendizaje Basado en Retos + Gamificación

Este documento mapea **cada principio de la metodología** con la **evidencia concreta en el código**, para poder defender el proyecto ante la rúbrica del curso. Última actualización: 2026-07-07.

---

## 1. Aprendizaje Basado en Retos (ABR / *Challenge Based Learning*)

El ABR estructura el aprendizaje en tres momentos: **Engage → Investigate → Act**. LogicFlow lo implementa en su **Modo Retos**, donde el estudiante actúa como técnico que diagnostica y repara PCs con fallas reales.

| Fase ABR | Cómo se implementa | Evidencia |
|----------|--------------------|-----------|
| **Engage** (reto anclado en la realidad) | Cada reto arranca con la voz de un *cliente* describiendo un síntoma auténtico ("Presiono el botón y no pasa nada…"). No es una pregunta abstracta, es un problema situado. | [`js/retos-data.js`](../js/retos-data.js) → campo `cliente`, `sintomas` |
| **Investigate** (investigación guiada) | El estudiante inspecciona componente por componente, interpreta señales técnicas reales (beeps, LEDs de diagnóstico, temperaturas, voltajes) y puede pedir pistas graduadas. | `inspecciones`, `pistas` en [`js/retos-data.js`](../js/retos-data.js) |
| **Act** (solución + evaluación) | Diagnostica el componente que falla y lo **repara en el taller 3D**; el sistema evalúa con una nota razonada. | `juego.html?reto=<id>` desde [`js/retos-page.js`](../js/retos-page.js); explicación en `descripcionFalla`/`explicacion` |
| **Progresión de dificultad** | 4 retos escalonados de 1★ a 3★: `no-enciende → sin-video → se-apaga → artefactos`. | campo `dificultad` en [`js/retos-data.js`](../js/retos-data.js) |
| **Evaluación auténtica** | La nota **no** premia adivinar: penaliza errores de diagnóstico (−2), uso de pistas (−1) y lentitud (−1). Mide el proceso de razonamiento, no solo el resultado. | `calcularNotaReto()` en [`js/retos-data.js`](../js/retos-data.js:174); umbral `NOTA_MINIMA_RETO = 7` |
| **Persistencia del desempeño** | Cada intento se guarda con métricas del proceso (errores, pistas, inspecciones, segundos) para retroalimentación docente. | tabla `retos_resultados` en [`supabase/retos.sql`](../supabase/retos.sql); API en [`js/retos-api.js`](../js/retos-api.js) |

**Complemento teórico (capa "aprender"):** la Academia ([`academia.html`](../academia.html)) da el sustento conceptual antes/después del reto, cerrando el ciclo *teoría ↔ práctica*.

---

## 2. Gamificación de las recompensas

Se aplican las tres mecánicas clásicas **PBL (Points · Badges · Leaderboards)**, más bonificaciones y niveles.

### 2.1 Puntos y niveles (Points)
- Sistema de **XP** con 5 niveles: `Novato → Aprendiz → Técnico → Experto → Master Builder`.
- Evidencia: `LEVELS`, `XP`, `calculateTotalXp()` en [`js/achievements.js`](../js/achievements.js:1).

### 2.2 Insignias / logros (Badges)
- **8 insignias** por hitos globales + **7 logros granulares** por procedimiento sin errores + **6 logros de reto** (Ojo clínico, Sin manual, Contrarreloj, Reparación impecable…).
- Evidencia: `BADGES`, `GRANULAR_LOGROS` en [`js/achievements.js`](../js/achievements.js:65); `LOGROS_RETO` en [`js/retos-data.js`](../js/retos-data.js:126).
- Los logros **se traducen en recompensa tangible**: cada uno suma un bono de nota (+0.05, tope +0.5) → `bonoPorLogros()`/`notaConBono()` en [`js/achievements.js`](../js/achievements.js:143).

### 2.3 Ranking entre pares (Leaderboards) — *capa social añadida*
- Cada estudiante ve su posición frente a **sus compañeros de clase** (el grupo de pares real), con podio, resaltado de "tú" y puntaje transparente.
- **Fórmula visible:** `puntos = retos_superados×100 + logros×25 + mejor_nota_reto×10 + componentes×10`.
- **Privacidad y seguridad:** la RPC es `SECURITY DEFINER` y solo la puede invocar un miembro de la clase (tutor o estudiante inscrito); a los pares se les muestra **solo el nombre, nunca el correo**.
- Evidencia:
  - Backend: función `lf_ranking_clase()` en [`supabase/ranking.sql`](../supabase/ranking.sql).
  - API: `rankingClase()` en [`js/tutor-api.js`](../js/tutor-api.js).
  - UI: `toggleRanking()`/`renderRankingHTML()` en [`js/tutor.js`](../js/tutor.js); estilos `.ranking-*` en [`css/dashboard-v2.css`](../css/dashboard-v2.css).

### 2.4 Retroalimentación y progreso (Feedback loops)
- Barra de nivel con "XP para el siguiente nivel", insignias recientes, y progreso del simulador que **integra los retos** (100% = componentes instalados + retos superados).
- Evidencia: `renderAchievements()`, `renderRetosBanner()` en [`js/menu.js`](../js/menu.js).

---

## 3. Cómo activar el ranking (una sola vez)

1. Abrir **Supabase → SQL Editor**.
2. Ejecutar el contenido de [`supabase/ranking.sql`](../supabase/ranking.sql).
3. Listo: en `menu.html`, cada clase del estudiante muestra el botón **🏆 Ranking**.

> Requiere que el rol de Tutor ya esté configurado ([`supabase/tutor-setup.sql`](../supabase/tutor-setup.sql)), del que dependen los helpers `lf_es_tutor_de` / `lf_esta_inscrito`.

---

## 4. Trazabilidad rápida (para la defensa)

| Requisito de la rúbrica | Archivo(s) clave |
|--------------------------|------------------|
| Reto situado y auténtico | `js/retos-data.js`, `retos.html` |
| Investigación + pistas graduadas | `js/retos-data.js`, `juego.html` |
| Evaluación del proceso | `calcularNotaReto()` en `js/retos-data.js` |
| Puntos y niveles | `js/achievements.js` |
| Insignias con recompensa real | `js/achievements.js`, `js/retos-api.js` |
| Ranking entre pares | `supabase/ranking.sql`, `js/tutor.js`, `js/tutor-api.js` |
| Retroalimentación visible | `js/menu.js` |
