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
