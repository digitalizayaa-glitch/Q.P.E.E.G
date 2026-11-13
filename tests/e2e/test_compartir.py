"""Compartir datos de entrenamiento: con cuenta, todos sus teléfonos usan el mismo id anónimo
(una persona cuenta una vez) y ese id no es el de la cuenta en el servidor.

Uso:  python3 tests/e2e/test_compartir.py            (desde la raíz del repositorio)
"""
import json, os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(__file__))
import test_sync as S

shared = {}


def rpc(route):
    name = route.request.url.rsplit("/", 1)[1]
    if name != "qpeeg_share":
        return S.rpc(route)
    a = json.loads(route.request.post_data or "{}")
    if a.get("p_data") is None: shared.pop(a["p_id"], None)
    else: shared[a["p_id"]] = a["p_data"]
    route.fulfill(status=200, content_type="application/json", body="")


def phone(browser, data, errors):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block", bypass_csp=True)
    ctx.add_init_script(S.SEEN)
    ctx.route("**/scripts/core/config.js", lambda r: r.fulfill(
        content_type="text/javascript", body=f'const QPEEG_SYNC = {{ url: "{S.SERVER}", key: "clave-publica" }};'))
    ctx.route(f"{S.SERVER}/rest/v1/rpc/*", rpc)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    if data:
        pg.add_init_script("if (!localStorage.getItem('qpeeg_state_v1')) localStorage.setItem('qpeeg_state_v1', %s)" % json.dumps(json.dumps(data)))
    pg.goto(S.URL); pg.wait_for_timeout(900)
    pg.evaluate("enterApp(false)"); pg.wait_for_timeout(300)
    return ctx, pg


def share_now(pg, on=True):
    pg.evaluate("c => { setConsent({ v: LEGAL_VERSION, share: c, unshare: !c }); return syncSharedTraining(); }", on)
    pg.wait_for_timeout(500)


def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", S.PORT, "-d", S.ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    r, errors = {}, []
    try:
        with sync_playwright() as p:
            opts = {"args": ["--no-sandbox", "--no-proxy-server"]}
            if os.environ.get("CHROME"): opts["executable_path"] = os.environ["CHROME"]
            b = p.chromium.launch(**opts)

            # A sin cuenta: comparte con el número al azar del teléfono
            ctxA, A = phone(b, {"routines": [{"id": "r1", "name": "Push", "days": []}], "logs": {}, "food": {"log": {}}, "achievements": []}, errors)
            share_now(A)
            dev = A.evaluate("localStorage.getItem('qpeeg_share_id')")
            r["sin_cuenta_id_telefono"] = list(shared) == [dev]

            # A crea cuenta: pasa al id de la cuenta al momento y borra el anterior
            A.evaluate("openSettings()"); A.wait_for_timeout(400)
            S.click(A, "Crear mi código")
            code = re.search(r"[2-9A-Z]{4}(?:-[2-9A-Z]{4}){4}", S.dialog_text(A)).group(0)
            S.click(A, "Listo"); A.wait_for_timeout(800)
            A.keyboard.press("Escape"); A.wait_for_timeout(300)
            A.evaluate("syncSharedTraining()"); A.wait_for_timeout(500)
            acc_id = list(S.vaults)[0]
            r["con_cuenta_un_registro"] = len(shared) == 1 and dev not in shared
            r["no_es_id_de_cuenta"] = acc_id not in shared

            # B entra con el mismo código y comparte: sigue siendo uno solo
            ctxB, B = phone(b, None, errors)
            B.evaluate("openSettings()"); B.wait_for_timeout(400)
            S.click(B, "Entrar con un código")
            B.fill(".dialog-input", code); S.click(B, "Seguir"); B.wait_for_timeout(1200)
            S.click(B, "Entendido"); B.keyboard.press("Escape"); B.wait_for_timeout(300)
            share_now(B)
            r["dos_telefonos_un_registro"] = len(shared) == 1 and "Push" in list(shared.values())[0]

            # B deja de compartir: se borra lo de la cuenta
            share_now(B, False)
            r["quitar_borra"] = len(shared) == 0
            ctxA.close(); ctxB.close(); b.close()
    finally:
        srv.terminate()
    r["sin_errores"] = not errors
    for k, v in r.items(): print(("OK  " if v else "MAL ") + k)
    if errors: print(errors)
    sys.exit(0 if all(r.values()) else 1)


if __name__ == "__main__":
    main()
