// Registro del service worker con auto-recarga cuando un SW nuevo toma el
// control. Sin esto, un usuario con una versión vieja del SW cacheada (p. ej.
// cache-first de antes de la v21) puede quedar atascado sirviendo un
// juego.html/juego.js viejo indefinidamente: el navegador instala el SW nuevo
// en segundo plano pero la pestaña abierta sigue con los recursos viejos
// hasta que alguien recarga. `controllerchange` dispara una única recarga en
// cuanto el SW nuevo reclama la página, así el usuario ve la versión al día
// sin pasos manuales (DevTools, borrar caché, etc.).
if ('serviceWorker' in navigator) {
    let recargando = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (recargando) return
        recargando = true
        window.location.reload()
    })
    navigator.serviceWorker.register('/service-worker.js').catch(() => {})
}
