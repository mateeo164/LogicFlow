# 🔧 DEBUG - Sistema de Autenticación

## ❌ Problema Identificado y SOLUCIONADO

El problema era que el código se ejecutaba **ANTES de que el DOM estuviera listo**.

```javascript
// ❌ ANTES - Incorrecto
const form = document.getElementById('form-registro')  // null
form?.addEventListener(...)  // No hace nada porque form es null

// ✅ AHORA - Correcto
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-registro')  // ✓ Existe
    form?.addEventListener(...)  // ✓ Funciona correctamente
})
```

## ✅ Archivos Corregidos

1. **js/registro.js** ← Envuelto en DOMContentLoaded
2. **js/login.js** ← Envuelto en DOMContentLoaded
3. **js/recuperar-password.js** ← Envuelto en DOMContentLoaded
4. **js/actualizar-password.js** ← Envuelto en DOMContentLoaded

Ahora el código espera a que el DOM esté completamente cargado antes de buscar elementos.

## 🧪 Instrucciones para Probar

### Paso 1: Abre la Consola del Navegador
- Presiona **F12** o **Ctrl+Shift+I**
- Ve a la pestaña **Console**

### Paso 2: Ve a Registro
1. Abre `registro.html`
2. **Abre la Consola (F12)** y mira los logs

### Paso 3: Intenta Registrarte
1. Llena solo un campo (p. ej., Nombre: "Juan")
2. Deja los demás vacíos
3. Click en "Crear Cuenta y Continuar"

**Resultado Esperado en Consola:**
```
🔍 Form submitted
📝 Datos: {
  nombres: 'Juan',
  correo: '',
  institucion: '',
  password: '',
  confirm_password: ''
}
📤 Resultado: {
  exito: false,
  errores: {
    correo: "✗ El correo electrónico es obligatorio.",
    password: "✗ La contraseña es obligatoria.",
    confirm_password: "✗ Debe confirmar la contraseña."
  }
}
```

**En la Página:**
- ✓ Campos vacíos se marcan en ROJO
- ✓ Mensajes de error aparecen debajo de cada campo
- ✓ Mensaje global en rojo: "Corrige los campos marcados..."

### Paso 4: Prueba con Datos Válidos
1. Llena todos los campos correctamente:
   ```
   Nombre: Juan Pérez
   Correo: juan.perez@uce.edu.ec
   Institución: UCE
   Contraseña: SecurePass123!
   Confirmar: SecurePass123!
   ```
2. Click en "Crear Cuenta y Continuar"

**Resultado Esperado en Consola:**
```
🔍 Form submitted
📝 Datos: { nombres: 'Juan Pérez', ... }
📤 Resultado: {
  exito: true,
  requiereConfirmacion: true,
  mensaje: "Cuenta creada exitosamente..."
}
```

**En la Página:**
- ✓ Mensaje verde: "Cuenta creada exitosamente..."
- ✓ Formulario se limpia (reset)
- ✓ NO se redirecciona (requiere confirmación de email)

### Paso 5: Prueba Login
1. Abre `login.html`
2. Abre Consola (F12)

**Intenta sin campos:**
1. Click "Continuar" sin llenar nada
2. Espera a ver los logs en la consola

**Resultado Esperado:**
```
✗ Campos se marcan en rojo
✗ Mensaje de error aparece
```

**Intenta con datos válidos:**
1. Correo: `juan.perez@uce.edu.ec`
2. Contraseña: `SecurePass123!`
3. Click "Continuar"

**Resultado Esperado:**
```
📤 Resultado login: {
  exito: true,
  mensaje: "Sesión iniciada correctamente.",
  usuario: {...}
}
✓ Redirección a menu.html
```

## 📊 Logs Disponibles

El código ahora registra (console.log) automáticamente:

```javascript
🔍 Form submitted          // Formulario enviado
📝 Datos: {...}           // Datos capturados
📤 Resultado: {...}       // Respuesta de Supabase
✓ Enlace válido           // Enlace de recuperación válido
✗ Sin sesión válida       // Error de sesión
```

**Para ver estos logs:**
1. Abre F12 (Consola)
2. Realiza una acción (registro, login, etc.)
3. Busca los logs con los prefijos 🔍, 📝, 📤, ✓, ✗

## ✅ Checklist de Validación

- [ ] Abro F12 y veo la Consola
- [ ] Voy a registro.html
- [ ] Intento registrar sin campos → aparecen errores en rojo
- [ ] Aparecen mensajes específicos debajo de cada campo
- [ ] Lleno correctamente → registro exitoso
- [ ] Voy a login.html
- [ ] Intento sin campos → errores en rojo
- [ ] Lleno datos válidos → REDIRECCIÓN A menu.html ✨
- [ ] Veo logs en la consola

## 🚨 Si Aún No Funciona

1. **Limpia el caché:**
   - Ctrl+Shift+Delete en Chrome
   - O abre en "Incógnito" (Ctrl+Shift+N)

2. **Revisa la Consola (F12):**
   - ¿Hay errores de color rojo?
   - Cópialos y compártelos

3. **Verifica Supabase:**
   - ¿Las credenciales están correctas en `supabase-config.js`?
   - ¿Supabase Auth está habilitado?

4. **Recarga completa:**
   - Ctrl+Shift+R (recarga forzada)
   - O Cmd+Shift+R en Mac

## 📝 Ejemplo de Consola Correcta

```
registro.html loaded
🔍 Form submitted
📝 Datos: {
  nombres: 'Maria Garcia',
  correo: 'maria@uce.edu.ec',
  institucion: 'UCE',
  password: 'SecurePass123!',
  confirm_password: 'SecurePass123!'
}
📤 Resultado: {
  exito: true,
  requiereConfirmacion: true,
  mensaje: 'Cuenta creada exitosamente...'
}
```

## 🎯 Próximo Paso

Si todo funciona con los logs, entonces:
1. ✓ Las validaciones funcionan
2. ✓ Supabase está conectado
3. ✓ Los formularios responden
4. ✓ Las redirecciones funcionan

**¡Tu sistema está LISTO! 🚀**

---

**¿Preguntas?** Mira los logs en la consola (F12) para ver exactamente qué está pasando.
