if ('serviceWorker' in navigator) {
    let recargando = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (recargando) return
        recargando = true
        window.location.reload()
    })
    navigator.serviceWorker.register('/service-worker.js').catch(() => {})
}
