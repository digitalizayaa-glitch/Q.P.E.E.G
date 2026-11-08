"""Pruebas de interfaz del almacenamiento (IndexedDB + espejo de localStorage).

Uso:  python3 tests/e2e/test_storage.py            (desde la raíz del repositorio)
Variables opcionales: CHROME=/ruta/a/chrome  PORT=8801
"""
import json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = os.environ.get("PORT", "8801")
URL = f"http://localhost:{PORT}/index.html"
KEY = "qpeeg_state_v1"

V1_STATE = {  # datos tal como los guardaba la versión anterior (sin "meta")
    "routines": [{"id": "r1", "name": "Push", "days": [{"id": "d1", "name": "Pecho",
                 "exercises": [{"id": "e1", "name": "Press banca", "kg": 60, "unit": "kg", "series": [{"min": 8, "max": 12}] * 3}]}]}],
    "activeRoutineId": "r1",
    "logs": {"r1": {"2026-11-02": {"dayId": "d1", "exercises": {"e1": {"kg": 60, "reps": [10, 9, 8], "extra": 0}}}}},
    "food": {"log": {}}, "achievements": [], "settings": {"theme": "light", "glow": "verde", "bright": "mid", "speed": "mid"},
}

READ_IDB = """() => new Promise(res => { const r = indexedDB.open('qpeeg', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => { const g = r.result.transaction('kv').objectStore('kv').get('state');
    g.onsuccess = () => { res(g.result ? { savedAt: g.result.savedAt, state: JSON.parse(g.result.json) } : null); r.result.close(); }; }; })"""


def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", PORT, "-d", ROOT],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    results, errors = {}, []
    try:
        with sync_playwright() as p:
            opts = {"args": ["--no-sandbox", "--no-proxy-server"]}
            if os.environ.get("CHROME"): opts["executable_path"] = os.environ["CHROME"]
            b = p.chromium.launch(**opts)

            # 1) Datos v1 en localStorage → se migran a v2 y se copian a IndexedDB
            ctx = b.new_context(service_workers="block")
            pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.goto(URL); pg.evaluate(f"localStorage.setItem('{KEY}', {json.dumps(json.dumps(V1_STATE))})")
            pg.reload(); pg.wait_for_function("document.readyState==='complete'"); pg.wait_for_timeout(600)
            idb = pg.evaluate(READ_IDB)
            results["migra_v1"] = bool(idb) and idb["state"]["meta"]["schema"] == 2 and len(idb["state"]["routines"]) == 1
            results["conserva_registro"] = bool(idb) and idb["state"]["logs"]["r1"]["2026-11-02"]["exercises"]["e1"]["reps"] == [10, 9, 8]
            results["tema_claro"] = pg.evaluate("document.documentElement.getAttribute('data-theme')") == "light"

            # 2) Se borra localStorage → los datos vuelven desde IndexedDB
            pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(800)
            results["recupera_de_idb"] = pg.evaluate("state.routines.length === 1 && state.routines[0].name === 'Push'")

            # 3) localStorage lleno → se guarda igual en IndexedDB y sin aviso de error
            pg.evaluate("""() => { Storage.prototype.setItem = () => { throw new DOMException('lleno', 'QuotaExceededError'); };
                                   state.achievements.push({ t: 'Logro nuevo', done: false }); return saveState(); }""")
            pg.wait_for_timeout(300)
            results["sin_aviso"] = pg.evaluate("!document.querySelector('.dialog-overlay, .dialog')")
            idb = pg.evaluate(READ_IDB)
            results["guarda_en_idb_lleno"] = bool(idb) and any(a["t"] == "Logro nuevo" for a in idb["state"]["achievements"])
            pg.reload(); pg.wait_for_timeout(800)
            results["idb_gana_si_mas_nuevo"] = pg.evaluate("state.achievements.some(a => a.t === 'Logro nuevo')")
            ctx.close()

            # 4) Instalación nueva: sin datos → estado vacío con id de dispositivo
            ctx = b.new_context(service_workers="block")
            pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.goto(URL); pg.wait_for_timeout(800)
            results["nuevo_vacio"] = pg.evaluate("state.routines.length === 0 && !!state.meta.device && state.meta.schema === 2")
            ctx.close(); b.close()
    finally:
        srv.terminate()
    results["errores"] = errors
    print(json.dumps(results, ensure_ascii=False, indent=1))
    ok = all(v for k, v in results.items() if k != "errores") and not errors
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
