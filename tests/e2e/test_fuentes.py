"""Fuentes (Ajustes → Fuente), fuente al azar en la primera apertura y globo "Personaliza".

Uso:  python3 tests/e2e/test_fuentes.py      (desde la raíz del repositorio)
Variables opcionales: CHROME=/ruta/a/chrome  PORT=8808  SHOTS=carpeta
"""
import json, os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = os.environ.get("PORT", "8808")
URL = f"http://localhost:{PORT}/index.html"
SHOTS = os.environ.get("SHOTS")
VERSION = re.search(r'APP_VERSION = "([^"]+)"', open(os.path.join(ROOT, "scripts/core/version.js"), encoding="utf-8").read()).group(1)
OLD_DATA = {"routines": [], "logs": {}, "food": {"log": {}}, "achievements": [],
            "settings": {"theme": "dark", "glow": "verde", "bright": "mid", "speed": "mid"}}
BASE = ("localStorage.setItem('qpeeg_consent',JSON.stringify({v:1,share:false}));localStorage.setItem('qpeeg_install_seen','1');"
        "localStorage.setItem('qpeeg_seen_version','%s');" % VERSION)

font = lambda pg: pg.evaluate("document.documentElement.dataset.font || 'arial'")
tip_visible = lambda pg: pg.evaluate("(() => { const t = document.getElementById('settingsTip'); return !!t && !t.hidden && t.getBoundingClientRect().height > 0; })()")
shot = lambda pg, name: SHOTS and pg.screenshot(path=os.path.join(SHOTS, name + ".png"))

# Texto de prueba en el ancho de la app: con cualquier fuente debe cortar en los mismos renglones
LAYOUT = """(() => {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:0;top:0;width:330px;font-size:15px;line-height:1.4';
    d.innerHTML = 'Pechuga a la plancha con arroz, frijoles, ensalada y medio aguacate. Quedan 560 kcal y 2 porciones de grasa para la cena de hoy.<br><b>Sentadilla 4×8 con 60 kg y descanso de 90 segundos entre cada serie de la rutina de pierna.</b>';
    document.body.appendChild(d); const h = d.getBoundingClientRect().height; d.remove(); return h;
})()"""


def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", PORT, "-d", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    r, errors = {}, []
    try:
        with sync_playwright() as p:
            opts = {"args": ["--no-sandbox", "--no-proxy-server"]}
            if os.environ.get("CHROME"): opts["executable_path"] = os.environ["CHROME"]
            b = p.chromium.launch(**opts)

            # 1) App nueva: fuente al azar entre las 3, la misma al reabrir, y el globo a la vista
            seen = set()
            for _ in range(8):
                ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
                pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
                pg.add_init_script(BASE); pg.goto(URL); pg.wait_for_timeout(700)
                f = font(pg); seen.add(f)
                if len(seen) == 1:
                    pg.reload(); pg.wait_for_timeout(700)
                    r["misma_al_reabrir"] = font(pg) == f
                    r["globo_visible"] = tip_visible(pg)
                    gear = pg.locator("#settingsBtn").bounding_box(); tip = pg.locator("#settingsTip").bounding_box()
                    r["globo_bajo_la_tuerca"] = tip["y"] > gear["y"] + gear["height"] - 2 and tip["x"] + tip["width"] > gear["x"]
                    shot(pg, "fuentes_1_globo")
                    first = (ctx, pg)
                else:
                    ctx.close()
            r["al_azar_entre_las_3"] = seen <= {"atkinson", "grotesk", "saira"} and len(seen) >= 2

            # 2) Tuerca: el globo se va, sale el selector con las 4 y cada una se aplica sin mover renglones
            ctx, pg = first
            pg.click("#settingsBtn"); pg.wait_for_timeout(400)
            r["globo_se_va"] = not tip_visible(pg)
            btns = pg.locator(".settings-font .seg-btn")
            r["selector_4_fuentes"] = btns.count() == 4 and btns.all_inner_texts() == ["Atkinson", "Grotesk", "Saira", "Arial"]
            heights, loaded = {}, {}
            for i, name in enumerate(["atkinson", "grotesk", "saira", "arial"]):
                btns.nth(i).click(); pg.wait_for_timeout(250)
                pg.evaluate("document.fonts.ready")
                heights[name] = pg.evaluate(LAYOUT)
                loaded[name] = font(pg) == name
                shot(pg, "fuentes_2_" + name)
            r["cada_fuente_se_aplica"] = all(loaded.values())
            r["mismos_renglones"] = max(heights.values()) - min(heights.values()) < 1
            r["alturas"] = heights
            btns.nth(1).click(); pg.wait_for_timeout(200)
            pg.reload(); pg.wait_for_timeout(700)
            r["guarda_la_fuente"] = font(pg) == "grotesk"
            r["globo_no_vuelve"] = not tip_visible(pg)
            ctx.close()

            # 3) Quien ya usaba la app (datos sin fuente) sigue con Arial y ve el globo
            ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
            pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.add_init_script(BASE + "if(!localStorage.getItem('qpeeg_state_v1'))localStorage.setItem('qpeeg_state_v1',%s);" % json.dumps(json.dumps(OLD_DATA)))
            pg.goto(URL); pg.wait_for_timeout(700)
            r["usuario_viejo_arial"] = font(pg) == "arial"
            r["usuario_viejo_ve_globo"] = tip_visible(pg)
            ctx.close()
            b.close()
    finally:
        srv.terminate()
    r["errores"] = errors
    print(json.dumps(r, indent=1, ensure_ascii=False))
    ok = all(v for k, v in r.items() if k not in ("alturas", "errores")) and not errors
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
