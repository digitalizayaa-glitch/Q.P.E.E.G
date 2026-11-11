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

# Las pruebas no son sobre el aviso de novedades: se marca la versión actual como ya vista
_VER = re.search(r'APP_VERSION = "([^"]+)"', open(os.path.join(ROOT, "scripts/core/version.js")).read()).group(1)
SEEN = "localStorage.setItem('qpeeg_consent',JSON.stringify({v:1,share:false})); localStorage.setItem('qpeeg_seen_version', '%s');" % _VER
SHOTS = os.environ.get("SHOTS")
SERVER = "https://sync.prueba"

vaults, pairs, history, retired = {}, {}, {}, set()
app_errors = []
calls = []


def rpc(route):
    name = route.request.url.rsplit("/", 1)[1]
    a = json.loads(route.request.post_data or "{}")
    calls.append(name)
    out = None
    if name == "qpeeg_get":
        v = vaults.get(a["p_id"])
        out = [{"blob": v["blob"], "rev": v["rev"]}] if v else ([{"gone": True}] if a["p_id"] in retired else [])
    elif name == "qpeeg_put":
        v = vaults.get(a["p_id"])
        if a["p_id"] in retired:
            out = -2
        elif a["p_rev"] == 0:
            out = -1 if v else 1
            if not v: vaults[a["p_id"]] = {"blob": a["p_blob"], "rev": 1}
        elif v and v["rev"] == a["p_rev"]:
            history.setdefault(a["p_id"], {})[v["rev"]] = {"blob": v["blob"], "saved_at": int(time.time() * 1000) - 3600_000}   # aquí: copia en cada cambio
            v["blob"] = a["p_blob"]; v["rev"] += 1; out = v["rev"]
        else:
            out = -1
    elif name == "qpeeg_pair_put":
        pairs[a["p_id"]] = a["p_payload"]
    elif name == "qpeeg_pair_take":
        out = pairs.pop(a["p_id"], None)
    elif name == "qpeeg_history":
        out = [{"rev": k, "saved_at": h["saved_at"]} for k, h in sorted(history.get(a["p_id"], {}).items(), reverse=True)]
    elif name == "qpeeg_history_get":
        h = history.get(a["p_id"], {}).get(a["p_rev"])
        out = [{"blob": h["blob"], "rev": a["p_rev"]}] if h else []
    elif name == "qpeeg_snapshot":
        v = vaults.get(a["p_id"])
        if v: history.setdefault(a["p_id"], {})[v["rev"]] = {"blob": v["blob"], "saved_at": int(time.time() * 1000)}
    elif name == "qpeeg_error":
        app_errors.append(a)
    elif name == "qpeeg_retire":
        vaults.pop(a["p_id"], None); history.pop(a["p_id"], None); retired.add(a["p_id"])
    empty = name in ("qpeeg_pair_put", "qpeeg_snapshot", "qpeeg_retire", "qpeeg_error")
    route.fulfill(status=200, content_type="application/json", body="" if empty else json.dumps(out))


def phone(browser, data, errors):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
    ctx.add_init_script(SEEN)
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
            # BROWSER=webkit prueba con el motor de Safari (iPhone); por defecto Chromium
            engine = os.environ.get("BROWSER", "chromium")
            opts = {"args": ["--no-sandbox", "--no-proxy-server"]} if engine == "chromium" else {}
            if os.environ.get("CHROME") and engine == "chromium": opts["executable_path"] = os.environ["CHROME"]
            b = getattr(p, engine).launch(**opts)

            # Teléfono A: tiene datos y crea la cuenta
            ctxA, A = phone(b, {"routines": [routine("r1", "Push")], "logs": {}, "food": {"log": {}}, "achievements": []}, errors)
            A.evaluate("openSettings()"); A.wait_for_timeout(400)
            r["seccion_visible"] = A.locator(".settings-label", has_text="Cuenta").count() == 1
            if SHOTS: A.screenshot(path=f"{SHOTS}/cuenta_1_sin_cuenta.png")
            click(A, "Crear mi código")
            code = re.search(r"[2-9A-Z]{4}(?:-[2-9A-Z]{4}){4}", dialog_text(A)).group(0)
            if SHOTS: A.screenshot(path=f"{SHOTS}/cuenta_2_codigo.png")
            click(A, "Listo"); A.wait_for_timeout(800)
            r["a_subio"] = len(vaults) == 1
            r["cifrado"] = bool(vaults) and "Push" not in list(vaults.values())[0]["blob"]
            if SHOTS: A.screenshot(path=f"{SHOTS}/cuenta_3_con_cuenta.png")

            # Teléfono B: nuevo, entra con el código de cuenta
            ctxB, B = phone(b, None, errors)
            B.evaluate("openSettings()"); B.wait_for_timeout(400)
            click(B, "Entrar con un código")
            B.fill(".dialog-input", code.lower().replace("-", " ")); click(B, "Seguir"); B.wait_for_timeout(1200)
            r["b_vinculado"] = "ya usa esa cuenta" in dialog_text(B)
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
            click(A, "Usar en otro teléfono")
            pair = re.search(r"\b[2-9A-Z]{4}-[2-9A-Z]{4}\b", dialog_text(A)).group(0)
            click(A, "Listo"); A.keyboard.press("Escape"); A.wait_for_timeout(300)
            ctxC, C = phone(b, {"routines": [routine("r9", "Pierna")], "logs": {}, "food": {"log": {}}, "achievements": []}, errors)
            C.evaluate("openSettings()"); C.wait_for_timeout(400)
            click(C, "Entrar con un código"); C.fill(".dialog-input", pair); click(C, "Seguir"); C.wait_for_timeout(900)
            r["c_avisa_datos_sin_cuenta"] = "datos sin cuenta" in C.locator(".dialog-overlay .dialog-title").first.inner_text()
            r["sin_unir"] = C.locator("button", has_text="Unir").count() == 0
            if SHOTS: C.screenshot(path=f"{SHOTS}/cuenta_4_reemplazar.png")
            click(C, "Entrar y reemplazar"); C.wait_for_timeout(1200); click(C, "Entendido")
            r["c_reemplaza"] = C.evaluate("state.routines.map(x => x.name)") == ["Push"]
            A.evaluate("syncNow()"); A.wait_for_timeout(800)
            r["a_no_recibe_mezcla"] = A.evaluate("state.routines.map(x => x.name)") == ["Push"]
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

            # B cambia a otra cuenta (D) y vuelve a la suya: nada se mezcla
            ctxD, D = phone(b, {"routines": [routine("r7", "Cuenta D")], "logs": {}, "food": {"log": {}}, "achievements": []}, errors)
            D.evaluate("openSettings()"); D.wait_for_timeout(400)
            click(D, "Crear mi código")
            code_d = re.search(r"[2-9A-Z]{4}(?:-[2-9A-Z]{4}){4}", dialog_text(D)).group(0)
            click(D, "Listo"); D.wait_for_timeout(800)
            B.evaluate("openSettings()"); B.wait_for_timeout(400)
            click(B, "Entrar con otro código"); B.fill(".dialog-input", code_d); click(B, "Seguir"); B.wait_for_timeout(1200)
            r["cambio_muestra_mi_codigo"] = code in dialog_text(B)
            if SHOTS: B.screenshot(path=f"{SHOTS}/cuenta_5_cambiar.png")
            click(B, "Cambiar de cuenta"); B.wait_for_timeout(1200); click(B, "Entendido")
            r["b_en_cuenta_d"] = B.evaluate("state.routines.map(x => x.name)") == ["Cuenta D"]
            B.evaluate("openSettings()"); B.wait_for_timeout(400)
            click(B, "Entrar con otro código"); B.fill(".dialog-input", code); click(B, "Seguir"); B.wait_for_timeout(1200)
            click(B, "Cambiar de cuenta"); B.wait_for_timeout(1200); click(B, "Entendido")
            r["b_vuelve_a_la_suya"] = "Push" in B.evaluate("state.routines.map(x => x.name).join()") and "Cuenta D" not in B.evaluate("state.routines.map(x => x.name).join()")
            ctxD.close()

            # Versiones anteriores: A borra una rutina y vuelve a una versión de antes
            names_before = A.evaluate("state.routines.map(x => x.name).join()")
            A.evaluate("state.routines = state.routines.filter(x => x.name !== 'Push'); saveState(); syncNow()"); A.wait_for_timeout(900)
            A.evaluate("openSettings()"); A.wait_for_timeout(400)
            click(A, "Versiones anteriores"); A.wait_for_timeout(500)
            r["versiones_lista"] = A.locator(".version-btn").count() >= 1
            if SHOTS: A.screenshot(path=f"{SHOTS}/cuenta_6_versiones.png")
            A.locator(".version-btn").first.click(); A.wait_for_timeout(400)
            click(A, "Volver a esta versión"); A.wait_for_timeout(1500); click(A, "Entendido")
            r["version_restaurada"] = A.evaluate("state.routines.map(x => x.name).join()") == names_before
            B.evaluate("syncNow()"); B.wait_for_timeout(800)
            r["version_llega_a_b"] = "Push" in B.evaluate("state.routines.map(x => x.name).join()")

            # Cambiar el código: A recibe uno nuevo; B (código viejo) deja de sincronizar y entra con el nuevo
            A.evaluate("openSettings()"); A.wait_for_timeout(400)
            click(A, "Cambiar mi código"); click(A, "Cambiar código"); A.wait_for_timeout(1500)
            new_code = re.search(r"[2-9A-Z]{4}(?:-[2-9A-Z]{4}){4}", dialog_text(A)).group(0)
            r["codigo_nuevo"] = new_code != code
            click(A, "Listo")
            B.keyboard.press("Escape"); B.wait_for_timeout(300)
            r["b_codigo_viejo"] = B.evaluate("syncNow()") in ("gone", "idle")
            B.wait_for_timeout(400); B.evaluate("openSettings()"); B.wait_for_timeout(500)
            r["b_avisa_cambio"] = "cambió de código" in B.locator(".settings-account").inner_text()
            if SHOTS: B.screenshot(path=f"{SHOTS}/cuenta_7_codigo_viejo.png")
            click(B, "Entrar con un código"); B.fill(".dialog-input", new_code); click(B, "Seguir"); B.wait_for_timeout(1000)
            click(B, "Entrar"); B.wait_for_timeout(1200); click(B, "Entendido")
            r["b_con_codigo_nuevo"] = snap(A) == snap(B)
            for c in (ctxA, ctxB, ctxC): c.close()

            # Registro de errores: un fallo se envía sin textos del usuario
            ctxE, E = phone(b, None, errors)
            E.evaluate("""setTimeout(() => { throw new Error('No se pudo guardar "Press banca" 75 kg id 1794349511116') }, 0)"""); E.wait_for_timeout(1500)
            errors[:] = [e for e in errors if "No se pudo guardar" not in e]
            sent = app_errors[-1] if app_errors else {}
            r["error_enviado"] = "No se pudo guardar" in sent.get("p_msg", ""); print("ENVIADO", json.dumps(sent, ensure_ascii=False)[:400])
            r["error_sin_datos"] = bool(sent) and "Press banca" not in json.dumps(sent) and "1794349511116" not in json.dumps(sent)
            r["error_con_version"] = sent.get("p_ver") == _VER and "·" in sent.get("p_ua", "")
            ctxE.close()

            # Sin servidor configurado la sección no aparece
            ctx = b.new_context(service_workers="block")
            ctx.route("**/scripts/core/config.js", lambda r: r.fulfill(content_type="text/javascript", body='const QPEEG_SYNC = { url: "", key: "" };'))
            pg = ctx.new_page()
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
