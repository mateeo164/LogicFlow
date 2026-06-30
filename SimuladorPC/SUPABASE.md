# Configuración de Supabase para LogicFlow

## Estado verificado
- La URL y la clave anónima configuradas responden correctamente en la API de Supabase.
- El proyecto está listo para usar Auth con email/password.

## Recomendación
- Mantener la configuración actual en js/supabase-config.js.
- Si el registro o login siguen fallando en producción, revisar que:
  1. Supabase Auth esté habilitado.
  2. El proyecto tenga activado el proveedor de email/password.
  3. El correo de confirmación esté configurado correctamente.
  4. La política de red permita conexiones a la API de Supabase.

## Nota importante
Si se necesita usar un flujo más robusto en producción, conviene añadir variables de entorno y no hardcodear las credenciales.
