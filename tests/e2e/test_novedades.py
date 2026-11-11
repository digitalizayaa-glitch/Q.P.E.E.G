"""Versión en la pantalla de inicio y aviso de novedades (una sola vez por versión).

Uso:  python3 tests/e2e/test_novedades.py      (desde la raíz del repositorio)
Variables opcionales: CHROME=/ruta/a/chrome  PORT=8804  SHOTS=carpeta
"""
import json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = os.environ.get("PORT", "8804")
URL = f"http://localhost:{PORT}/index.html"
SHOTS = os.environ.get("SHOTS")
DATA = {"routines": [{"id": "r1", "name": "Push", "days": []}], "logs": {}, "food": {"log": {}}, "achievements": []}


def page(b, errors, data=None, seen=None, consent=True):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    init = "localStorage.setItem('qpeeg_consent',JSON.stringify({v:1,share:false}));localStorage.setItem('qpeeg_install_seen','1');" if consent else ""
    if data: init += "if(!localStorage.getItem('qpeeg_state_v1'))localStorage.setItem('qpeeg_state_v1',%s);" % json.dumps(json.dumps(data))
    if seen: init += "if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.setItem('qpeeg_seen_version','%s');}" % seen
    if init: pg.add_init_script(init)
    pg.goto(URL); pg.wait_for_timeout(1300)
    return ctx, pg


dialog = lambda pg: pg.locator(".dialog-overlay").count() > 0


def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", PORT, "-d", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    r, errors = {}, []
    try:
        with sync_playwright() as p:
            # BROWSER=webkit prueba con el motor de Safari (iPhone); por defecto Chromium
            engine = os.environ.get("BROWSER", "chromium")
            opts = {"args": ["--no-sandbox", "--no-proxy-server"]} if engine == "chromium" else {}
            if os.environ.get("CHROME") and engine == "chromium": opts["executable_path"] = os.environ["CHROME"]
            b = getattr(p, engine).launch(**opts)
            version = None

            # Quien ya usaba la app recibe la actualización: ve las novedades una vez
            ctx, pg = page(b, errors, DATA)
            version = pg.evaluate("APP_VERSION")
            r["muestra_version"] = pg.locator("#versionBtn").inner_text() == f"Versión {version}"
            r["aviso_al_actualizar"] = dialog(pg) and pg.evaluate("notesVersion()") in pg.locator(".dialog-title").inner_text()
            if SHOTS: pg.screenshot(path=f"{SHOTS}/novedades_aviso.png")
            pg.locator(".dialog-btn", has_text="Entendido").click(); pg.wait_for_timeout(500)
            if SHOTS: pg.screenshot(path=f"{SHOTS}/novedades_inicio.png")
            pg.reload(); pg.wait_for_timeout(1300)
            r["solo_una_vez"] = not dialog(pg)
            pg.locator("#versionBtn").click(); pg.wait_for_timeout(500)
            r["tocar_version_lo_muestra"] = dialog(pg)
            ctx.close()

            # Instalación nueva: sin aviso
            ctx, pg = page(b, errors)
            r["nuevo_sin_aviso"] = not dialog(pg)
            ctx.close()

            # Primera vez: formulario "Importante" que no se cierra sin aceptar lo obligatorio; compartir es opcional
            ctx, pg = page(b, errors, DATA, seen=None, consent=False)
            form = pg.locator(".agree-sheet")
            r["acuerdos_primera_vez"] = form.count() == 1 and "Importante" in form.locator(".picker-title").inner_text() and not dialog(pg)
            ok = form.locator(".dialog-btn.accept")
            r["acuerdos_sin_cerrar"] = ok.is_disabled() and not form.locator(".picker-close").is_visible()
            pg.keyboard.press("Escape"); pg.mouse.click(5, 5); pg.wait_for_timeout(400)
            r["acuerdos_no_se_escapa"] = pg.locator(".agree-sheet").count() == 1
            if SHOTS: pg.screenshot(path=f"{SHOTS}/acuerdos.png")
            checks = form.locator(".agree-check")
            checks.nth(1).click(); checks.nth(2).click(); pg.wait_for_timeout(200)
            r["acuerdos_opcional"] = not ok.is_disabled() and checks.nth(0).get_attribute("aria-checked") == "false"
            ok.click(); pg.wait_for_timeout(1200)
            c = pg.evaluate("JSON.parse(localStorage.getItem('qpeeg_consent'))")
            r["acuerdos_guardados"] = c["v"] == 1 and c["share"] is False
            r["novedades_despues"] = dialog(pg)                      # quien ya usaba la app ve después las novedades
            pg.reload(); pg.wait_for_timeout(1300)
            r["acuerdos_una_vez"] = pg.locator(".agree-sheet").count() == 0
            pg.evaluate("openSettings()"); pg.wait_for_timeout(500)
            pg.locator(".dialog-btn", has_text="Mis acuerdos").click(); pg.wait_for_timeout(500)
            pg.locator(".agree-sheet .agree-check").nth(0).click()
            pg.locator(".agree-sheet .dialog-btn.accept", has_text="Guardar").click(); pg.wait_for_timeout(500)
            r["compartir_desde_ajustes"] = pg.evaluate("getConsent().share") is True and \
                "Compartes" in pg.locator(".settings-sheet").inner_text()
            ctx.close()

            # Venía de una versión anterior ya registrada: ve lo nuevo
            ctx, pg = page(b, errors, DATA, seen="1.0.0")
            r["desde_version_vieja"] = dialog(pg)
            ctx.close()

            # Ya vio esta versión: nada
            ctx, pg = page(b, errors, DATA, seen=version)
            r["misma_version_nada"] = not dialog(pg)
            ctx.close(); b.close()
    finally:
        srv.terminate()
    r["errores"] = errors
    print(json.dumps(r, ensure_ascii=False, indent=1))
    sys.exit(0 if all(v for k, v in r.items() if k != "errores") and not errors else 1)


if __name__ == "__main__":
    main()
