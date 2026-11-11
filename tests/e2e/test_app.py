"""Recorrido general de la app y funcionamiento sin conexión.

Uso:  python3 tests/e2e/test_app.py            (desde la raíz del repositorio)
Variables opcionales: CHROME=/ruta/a/chrome  PORT=8802
"""
import json, os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = os.environ.get("PORT", "8802")
URL = f"http://localhost:{PORT}/index.html"

# Las pruebas no son sobre el aviso de novedades: se marca la versión actual como ya vista
_VER = re.search(r'APP_VERSION = "([^"]+)"', open(os.path.join(ROOT, "scripts/core/version.js")).read()).group(1)
SEEN = "localStorage.setItem('qpeeg_consent',JSON.stringify({v:1,share:false}));localStorage.setItem('qpeeg_install_seen','1'); localStorage.setItem('qpeeg_seen_version', '%s');" % _VER

ex = lambda i, n, s: {"id": i, "name": n, "kg": 40, "unit": "kg", "series": [{"min": 8, "max": 12}] * s}
STATE = {
    "routines": [{"id": "r1", "name": "Push Pull Legs", "days": [{"id": "d1", "name": "Push",
                  "exercises": [ex("e0", "Press banca", 4), ex("e1", "Fondos", 3), ex("e2", "Elevación de talones", 3)]}]}],
    "activeRoutineId": "r1", "logs": {}, "food": {"log": {}}, "achievements": [{"t": "Press banca 100 kg", "done": False}],
    "settings": {"theme": "dark", "glow": "verde", "bright": "mid", "speed": "mid"},
}


def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", PORT, "-d", ROOT],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    r, errors = {}, []
    try:
        with sync_playwright() as p:
            # BROWSER=webkit prueba con el motor de Safari (iPhone); por defecto Chromium
            engine = os.environ.get("BROWSER", "chromium")
            opts = {"args": ["--no-sandbox", "--no-proxy-server"]} if engine == "chromium" else {}
            if os.environ.get("CHROME") and engine == "chromium": opts["executable_path"] = os.environ["CHROME"]
            b = getattr(p, engine).launch(**opts)
            ctx = b.new_context(viewport={"width": 390, "height": 844})
            ctx.add_init_script(SEEN)
            pg = ctx.new_page()
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.add_init_script("if (!localStorage.getItem('qpeeg_state_v1')) localStorage.setItem('qpeeg_state_v1', %s)"
                               % json.dumps(json.dumps(STATE)))
            pg.goto(URL); pg.wait_for_timeout(1200)

            # Recorrido por las secciones
            pg.evaluate("enterApp(false)"); pg.wait_for_timeout(500)
            for sec in ["week", "exercises", "history"]:
                pg.evaluate(f"showSection('{sec}')"); pg.wait_for_timeout(500)
            pg.evaluate("startWorkoutDay('r1','d1')"); pg.wait_for_timeout(800)
            r["tarjetas_entreno"] = pg.evaluate("document.querySelectorAll('.workout-track > *').length") >= 3
            r["figuras_svg"] = pg.evaluate("document.querySelectorAll('.workout-track svg').length") >= 3

            # Abrir y cerrar una ventana emergente (animación de arriba hacia abajo y recogida)
            pg.evaluate("openSettings()"); pg.wait_for_timeout(500)
            r["ajustes_abre"] = pg.evaluate("!!document.querySelector('.picker-overlay')")
            pg.keyboard.press("Escape"); pg.wait_for_timeout(600)

            # Guardar un dato y comprobar que sobrevive a recargar
            pg.evaluate("state.achievements.push({ t: 'Prueba e2e', done: false }); saveState()"); pg.wait_for_timeout(300)
            pg.reload(); pg.wait_for_timeout(1000)
            r["persiste"] = pg.evaluate("state.achievements.some(a => a.t === 'Prueba e2e')")

            # Sin conexión: con el service worker instalado la app abre igual
            pg.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.controller !== null", timeout=10000)
            ctx.set_offline(True)
            pg.reload(); pg.wait_for_timeout(1200)
            r["offline_abre"] = pg.evaluate("typeof state === 'object' && state.routines.length === 1")
            r["offline_estilos"] = pg.evaluate("getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)'")
            ctx.set_offline(False)
            ctx.close(); b.close()
    finally:
        srv.terminate()
    r["errores"] = errors
    print(json.dumps(r, ensure_ascii=False, indent=1))
    sys.exit(0 if all(v for k, v in r.items() if k != "errores") and not errors else 1)


if __name__ == "__main__":
    main()
