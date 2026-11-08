"""Sincronización entre teléfonos, en el navegador real, con un servidor simulado
que se comporta como supabase/esquema.sql.

Uso:  python3 tests/e2e/test_sync.py            (desde la raíz del repositorio)
Variables opcionales: CHROME=/ruta/a/chrome  PORT=8803  SHOTS=carpeta (capturas)
"""
import json, os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = os.environ.get("PORT", "8803")
URL = f"http://localhost:{PORT}/index.html"
SHOTS = os.environ.get("SHOTS")
SERVER = "https://sync.prueba"

vaults, pairs = {}, {}
calls = []


def rpc(route):
    name = route.request.url.rsplit("/", 1)[1]
    a = json.loads(route.request.post_data or "{}")
    calls.append(name)
    out = None
    if name == "qpeeg_get":
        v = vaults.get(a["p_id"])
        out = [{"blob": v["blob"], "rev": v["rev"]}] if v else []
    elif name == "qpeeg_put":
        v = vaults.get(a["p_id"])
        if a["p_rev"] == 0:
            out = -1 if v else 1
            if not v: vaults[a["p_id"]] = {"blob": a["p_blob"], "rev": 1}
        elif v and v["rev"] == a["p_rev"]:
            v["blob"] = a["p_blob"]; v["rev"] += 1; out = v["rev"]
        else:
            out = -1
    elif name == "qpeeg_pair_put":
        pairs[a["p_id"]] = a["p_payload"]
    elif name == "qpeeg_pair_take":
        out = pairs.pop(a["p_id"], None)
    route.fulfill(status=200, content_type="application/json", body="" if out is None and name == "qpeeg_pair_put" else json.dumps(out))


def phone(browser, data, errors):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
    ctx.route("**/scripts/core/config.js", lambda r: r.fulfill(
        content_type="text/javascript", body=f'const QPEEG_SYNC = {{ url: "{SERVER}", key: "clave-publica" }};'))
    ctx.route(f"{SERVER}/rest/v1/rpc/*", rpc)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    if data:
        pg.add_init_script("if (!localStorage.getItem('qpeeg_state_v1')) localStorage.setItem('qpeeg_state_v1', %s)" % json.dumps(json.dumps(data)))
    pg.goto(URL); pg.wait_for_timeout(900)
    pg.evaluate("enterApp(false)"); pg.wait_for_timeout(300)
    return ctx, pg


def dialog_text(pg):
    return pg.locator(".dialog-overlay .dialog-text").first.inner_text()


def click(pg, text):
    pg.locator("button", has_text=text).last.click(); pg.wait_for_timeout(450)


def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", PORT, "-d", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    r, errors = {}, []
    routine = lambda i, n: {"id": i, "name": n, "days": []}
    try:
        with sync_playwright() as p:
            opts = {"args": ["--no-sandbox", "--no-proxy-server"]}
            if os.environ.get("CHROME"): opts["executable_path"] = os.environ["CHROME"]
            b = p.chromium.launch(**opts)

            # Teléfono A: tiene datos y crea la cuenta
            ctxA, A = phone(b, {"routines": [routine("r1", "Push")], "logs": {}, "food": {"log": {}}, "achievements": []}, errors)
            A.evaluate("openSettings()"); A.wait_for_timeout(400)
            r["seccion_visible"] = A.locator(".settings-label", has_text="Cuenta").count() == 1
            if SHOTS: A.screenshot(path=f"{SHOTS}/cuenta_1_sin_cuenta.png")
            click(A, "Crear código de cuenta")
            code = re.search(r"[2-9A-Z]{4}(?:-[2-9A-Z]{4}){4}", dialog_text(A)).group(0)
            if SHOTS: A.screenshot(path=f"{SHOTS}/cuenta_2_codigo.png")
            click(A, "Listo"); A.wait_for_timeout(800)
            r["a_subio"] = len(vaults) == 1
            r["cifrado"] = bool(vaults) and "Push" not in list(vaults.values())[0]["blob"]
            if SHOTS: A.screenshot(path=f"{SHOTS}/cuenta_3_con_cuenta.png")

            # Teléfono B: nuevo, entra con el código de cuenta
            ctxB, B = phone(b, None, errors)
            B.evaluate("openSettings()"); B.wait_for_timeout(400)
            click(B, "Ya tengo un código")
            B.fill(".dialog-input", code.lower().replace("-", " ")); click(B, "Entrar"); B.wait_for_timeout(1200)
            r["b_vinculado"] = "vinculada" in B.locator(".dialog-overlay .dialog-title").first.inner_text()
            click(B, "Entendido")
            r["b_recibe"] = B.evaluate("state.routines.map(x => x.name).join()") == "Push"

            # A cambia algo → B lo recibe
            A.keyboard.press("Escape"); A.wait_for_timeout(300)
            A.evaluate("state.achievements.push({ t: 'Correr 10 km', done: false }); saveState(); syncNow()"); A.wait_for_timeout(800)
            B.keyboard.press("Escape"); B.wait_for_timeout(300)
            B.evaluate("syncNow()"); B.wait_for_timeout(800)
            r["b_recibe_cambio"] = B.evaluate("state.achievements.some(a => a.t === 'Correr 10 km')")
            r["b_pantalla_refrescada"] = "Correr 10 km" in B.locator("#achievementsList").inner_text()

            # Teléfono C con sus propios datos: entra con código temporal y une
            A.evaluate("openSettings()"); A.wait_for_timeout(400)
            click(A, "Vincular otro teléfono")
            pair = re.search(r"\b[2-9A-Z]{4}-[2-9A-Z]{4}\b", dialog_text(A)).group(0)
            click(A, "Listo"); A.keyboard.press("Escape"); A.wait_for_timeout(300)
            ctxC, C = phone(b, {"routines": [routine("r9", "Pierna")], "logs": {}, "food": {"log": {}}, "achievements": []}, errors)
            C.evaluate("openSettings()"); C.wait_for_timeout(400)
            click(C, "Ya tengo un código"); C.fill(".dialog-input", pair); click(C, "Entrar"); C.wait_for_timeout(900)
            r["c_pregunta_unir"] = "ya tiene datos" in C.locator(".dialog-overlay .dialog-title").first.inner_text()
            if SHOTS: C.screenshot(path=f"{SHOTS}/cuenta_4_unir.png")
            click(C, "Unir"); C.wait_for_timeout(1200); click(C, "Entendido")
            r["c_unio"] = sorted(C.evaluate("state.routines.map(x => x.name)")) == ["Pierna", "Push"]
            A.evaluate("syncNow()"); A.wait_for_timeout(800)
            r["a_recibe_de_c"] = sorted(A.evaluate("state.routines.map(x => x.name)")) == ["Pierna", "Push"]
            r["temporal_un_uso"] = len(pairs) == 0

            # Sin conexión: B guarda y sube al volver la conexión
            ctxB.set_offline(True)
            B.evaluate("state.routines.push({ id: 'r5', name: 'Brazo', days: [] }); saveState()")
            r["b_offline"] = B.evaluate("syncNow()") == "offline"
            ctxB.set_offline(False); B.wait_for_timeout(7000)
            A.evaluate("syncNow()"); A.wait_for_timeout(800)
            r["sube_al_volver_red"] = "Brazo" in A.evaluate("state.routines.map(x => x.name).join()")

            # Mientras se entrena no se cambian los datos; se aplican al salir
            C.keyboard.press("Escape"); C.wait_for_timeout(300)
            C.evaluate("state.routines[0].days.push({ id: 'd1', name: 'Día', exercises: [{ id: 'e1', name: 'Curl', kg: 10, unit: 'kg', series: [{ min: 8, max: 12 }] }] }); saveState(); syncNow()")
            C.wait_for_timeout(800)
            rid = C.evaluate("state.routines[0].id")
            C.evaluate(f"startWorkoutDay('{rid}', 'd1')"); C.wait_for_timeout(600)
            A.evaluate("syncNow()"); A.wait_for_timeout(600)
            A.evaluate("state.achievements.push({ t: 'Durante entreno', done: false }); saveState(); syncNow()"); A.wait_for_timeout(800)
            r["entrenando_espera"] = C.evaluate("syncNow()") == "busy" and not C.evaluate("state.achievements.some(a => a.t === 'Durante entreno')")
            C.evaluate("showSection('week')"); C.wait_for_timeout(300)
            r["aplica_al_salir"] = C.evaluate("syncNow()") == "ok" and C.evaluate("state.achievements.some(a => a.t === 'Durante entreno')")

            # Los tres terminan iguales
            for pg in (A, B, C, A, B): pg.evaluate("syncNow()"); pg.wait_for_timeout(500)
            snap = lambda pg: pg.evaluate("JSON.stringify(syncableState())")
            r["todos_iguales"] = snap(A) == snap(B) == snap(C)
            for c in (ctxA, ctxB, ctxC): c.close()

            # Sin servidor configurado la sección no aparece
            ctx = b.new_context(service_workers="block"); pg = ctx.new_page()
            pg.goto(URL); pg.wait_for_timeout(600); pg.evaluate("enterApp(false); openSettings()"); pg.wait_for_timeout(400)
            r["oculta_sin_servidor"] = pg.locator(".settings-label", has_text="Cuenta").count() == 0
            ctx.close(); b.close()
    finally:
        srv.terminate()
    r["errores"] = errors
    print(json.dumps(r, ensure_ascii=False, indent=1))
    sys.exit(0 if all(v for k, v in r.items() if k != "errores") and not errors else 1)


if __name__ == "__main__":
    main()
