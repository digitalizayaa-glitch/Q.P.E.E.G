"""Menú de comida: agregar varias sin salir, y sección Frecuentes.

Uso:  python3 tests/e2e/test_comida.py      (desde la raíz del repositorio)
Variables opcionales: CHROME=/ruta/a/chrome  PORT=8805  SHOTS=carpeta
"""
import json, os, re, subprocess, sys, time
from datetime import date, timedelta
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = os.environ.get("PORT", "8805")
URL = f"http://localhost:{PORT}/index.html"
SHOTS = os.environ.get("SHOTS")
VER = re.search(r'APP_VERSION = "([^"]+)"', open(os.path.join(ROOT, "scripts/core/version.js")).read()).group(1)

today = date.today()
log = {}
for back in (1, 2, 3, 4):   # arroz 4 veces en los últimos días → frecuente
    k = (today - timedelta(days=back)).isoformat()
    log.setdefault(k, []).append({"id": f"a{back}", "n": "Arroz blanco", "g": "h", "p": 1, "t": "1 porción"})
for back in (1, 2):         # banano solo 2 veces → no
    k = (today - timedelta(days=back)).isoformat()
    log.setdefault(k, []).append({"id": f"b{back}", "n": "Banano", "g": "fr", "p": 1, "t": "1 porción"})
ex = lambda i, n: {"id": i, "name": n, "kg": 40, "unit": "kg", "series": [{"min": 8, "max": 12}] * 3}
STATE = {"routines": [{"id": "r1", "name": "Torso-Pierna", "days": [{"id": "d1", "name": "Torso", "exercises": [ex("e1", "Press banca")]},
                                                                   {"id": "d2", "name": "Pierna", "exercises": [ex("e2", "Sentadilla")]}]},
                      {"id": "r2", "name": "Pull-Leg-Pull", "days": []}],
         "activeRoutineId": "r1", "logs": {}, "food": {"log": log}, "achievements": [],
         "nutrition": {"profile": {"sex": "m", "age": 30, "height": 180, "weight": 80, "activity": 1.55, "bf": None}, "goal": "maintain", "diet": "mod"},
         "settings": {"theme": "light", "glow": "verde", "bright": "mid", "speed": "mid"}}


def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", PORT, "-d", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    r, errors = {}, []
    try:
        with sync_playwright() as p:
            opts = {"args": ["--no-sandbox", "--no-proxy-server"]}
            if os.environ.get("CHROME"): opts["executable_path"] = os.environ["CHROME"]
            b = p.chromium.launch(**opts)
            ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
            ctx.add_init_script("localStorage.setItem('qpeeg_seen_version','%s');"
                                "if(!localStorage.getItem('qpeeg_state_v1'))localStorage.setItem('qpeeg_state_v1',%s)" % (VER, json.dumps(json.dumps(STATE))))
            pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.goto(URL); pg.wait_for_timeout(900)
            pg.evaluate("enterApp(false)"); pg.wait_for_timeout(400)
            if SHOTS: pg.screenshot(path=f"{SHOTS}/semana_tarjetas.png")
            pg.evaluate("showSection('exercises')"); pg.wait_for_timeout(500)
            if SHOTS: pg.screenshot(path=f"{SHOTS}/rutinas_tarjetas.png")
            r["tarjetas_color_boton"] = pg.evaluate("getComputedStyle(document.querySelector('.day-card')).borderColor") == \
                pg.evaluate("getComputedStyle(document.querySelector('.square-card.add-square')).borderColor")

            pg.evaluate("showSection('food')"); pg.wait_for_timeout(500)
            pg.locator(".food-add").click(); pg.wait_for_timeout(500)
            groups = pg.locator(".picker-group").all_inner_texts()
            r["frecuentes_arriba"] = bool(groups) and groups[0].lower() == "frecuentes"
            first = pg.locator(".picker-list > *").nth(1).inner_text()
            r["solo_arroz_frecuente"] = "Arroz blanco" in first and pg.locator(".picker-list > *").nth(2).inner_text().lower().startswith("harinas")
            if SHOTS: pg.screenshot(path=f"{SHOTS}/menu_frecuentes.png")

            pg.locator(".picker-item", has_text="Arroz blanco").first.click(); pg.wait_for_timeout(500)
            pg.locator(".stepper-overlay button", has_text="Agregar").click(); pg.wait_for_timeout(600)
            r["menu_sigue_abierto"] = pg.locator(".picker-overlay:not(.stepper-overlay)").count() == 1
            r["arroz_marcado"] = pg.locator(".picker-item.picked", has_text="Arroz blanco").count() == 2   # en Frecuentes y en Harinas
            pg.fill(".picker-search", "pechuga"); pg.wait_for_timeout(300)
            pg.locator(".picker-item", has_text="Pechuga").first.click(); pg.wait_for_timeout(500)
            pg.locator(".stepper-overlay button", has_text="Cancelar").click(); pg.wait_for_timeout(500)
            r["cancelar_no_marca"] = pg.locator(".picker-item.picked").count() == 0   # con el filtro solo se ve la pechuga
            pg.locator(".picker-item", has_text="Pechuga").first.click(); pg.wait_for_timeout(500)
            pg.locator(".stepper-overlay button", has_text="Agregar").click(); pg.wait_for_timeout(600)
            pg.fill(".picker-search", ""); pg.wait_for_timeout(300)
            r["varias_marcadas"] = pg.locator(".picker-item.picked").count() == 3
            if SHOTS: pg.screenshot(path=f"{SHOTS}/menu_agregadas.png")
            r["guardadas"] = pg.evaluate("foodEntries().map(e => e.n).sort().join()") == "Arroz blanco,Pechuga de pollo / Salmón"
            pg.locator(".picker-close").click(); pg.wait_for_timeout(500)
            r["resumen_actualizado"] = "/" in pg.locator(".food-macros").inner_text()
            r["cerrado"] = pg.locator(".picker-overlay").count() == 0

            # Comida rápida: pizza por slice, sin salir del menú
            pg.locator(".food-add").click(); pg.wait_for_timeout(500)
            pg.fill(".picker-search", "pepperoni"); pg.wait_for_timeout(300)
            r["catalogo_pizzas"] = pg.locator(".picker-group", has_text="Pizza Hut").count() == 1 and \
                pg.locator(".picker-group", has_text="Papa John's").count() == 1 and pg.locator(".picker-group", has_text="Rey Pizza").count() == 1
            if SHOTS: pg.screenshot(path=f"{SHOTS}/menu_rapida.png")
            kcal0 = pg.evaluate("foodTotals(foodEntries()).kcal")
            pg.locator(".picker-item", has_text="Pizza Hut · Pizza pepperoni mediana").first.click(); pg.wait_for_timeout(500)
            r["stepper_slices"] = "slices" in pg.locator(".stepper-overlay").inner_text()
            pg.locator(".stepper-overlay button", has_text="Agregar").click(); pg.wait_for_timeout(500)
            r["rapida_marcada"] = pg.locator(".picker-item.picked", has_text="Pizza Hut").count() == 1
            pg.locator(".picker-close").click(); pg.wait_for_timeout(500)
            r["rapida_suma"] = round(pg.evaluate("foodTotals(foodEntries()).kcal") - kcal0) == 220

            # Dar el día
            goal = pg.evaluate("nutritionPlan().kcal")
            pg.locator(".food-done").click(); pg.wait_for_timeout(500)
            if SHOTS: pg.screenshot(path=f"{SHOTS}/dar_dia_confirmar.png")
            pg.locator(".dialog-btn", has_text="Dar el día").click(); pg.wait_for_timeout(500)
            r["dia_completo"] = round(pg.evaluate("foodTotals(foodEntries()).kcal")) == goal
            r["boton_activo"] = pg.locator(".food-done.on").count() == 1
            r["barra_llena"] = pg.evaluate("document.querySelector('.food-bar i').style.width") == "100%"
            if SHOTS: pg.screenshot(path=f"{SHOTS}/dar_dia_hecho.png")
            pg.locator(".food-done").click(); pg.wait_for_timeout(400)
            pg.locator(".dialog-btn", has_text="Quitar").click(); pg.wait_for_timeout(500)
            r["se_puede_quitar"] = not pg.evaluate("foodEntries().some(e => e.g === 'libre')") and pg.locator(".food-done.on").count() == 0
            ctx.close(); b.close()
    finally:
        srv.terminate()
    r["errores"] = errors
    print(json.dumps(r, ensure_ascii=False, indent=1))
    sys.exit(0 if all(v for k, v in r.items() if k != "errores") and not errors else 1)


if __name__ == "__main__":
    main()
