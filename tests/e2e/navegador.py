"""Abre el navegador de las pruebas: BROWSER=webkit usa el motor de Safari (iPhone); por defecto Chromium.
CHROME=/ruta/a/chrome usa un Chromium propio. Todas las pruebas deben abrir el navegador con esto."""
import os


def launch(p):
    engine = os.environ.get("BROWSER", "chromium")
    opts = {"args": ["--no-sandbox", "--no-proxy-server"]} if engine == "chromium" else {}
    if os.environ.get("CHROME") and engine == "chromium":
        opts["executable_path"] = os.environ["CHROME"]
    return getattr(p, engine).launch(**opts)


def is_webkit():
    return os.environ.get("BROWSER", "chromium") == "webkit"


# La app está "quieta": cargada, sin animaciones finitas en curso (las infinitas, como los pulsos, no cuentan),
# sin navegación o deslizamiento a medias y con lo pendiente ya guardado (se escribe ya en vez de esperar ~0,4 s).
# Reemplaza las esperas fijas (wait_for_timeout): espera lo justo y no depende de lo rápido que sea el equipo.
QUIETO = """() => {
    if (typeof SWIPE === 'undefined' || document.readyState !== 'complete') return false;
    if (SWIPE.busy || (typeof navFading !== 'undefined' && navFading)) return false;
    if (typeof saveTimer !== 'undefined' && saveTimer) flushSave();
    return !document.getAnimations().some(a => a.playState === 'running'
        && a.effect && isFinite(a.effect.getComputedTiming().endTime));
}"""


def quieto(pg, extra=0, timeout=5000):
    pg.wait_for_function(QUIETO, polling=40, timeout=timeout)
    pg.wait_for_timeout(60 + extra)    # un par de cuadros para que se pinte lo último
