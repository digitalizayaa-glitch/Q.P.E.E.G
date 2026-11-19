"""Menú de comida: agregar varias sin salir, y sección Frecuentes.

Uso:  python3 tests/e2e/test_comida.py      (desde la raíz del repositorio)
Variables opcionales: CHROME=/ruta/a/chrome  PORT=8805  SHOTS=carpeta
"""
import json, os, re, subprocess, sys, time
from datetime import date, timedelta
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import navegador

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
            # BROWSER=webkit prueba con el motor de Safari (iPhone); por defecto Chromium
            engine = os.environ.get("BROWSER", "chromium")
            opts = {"args": ["--no-sandbox", "--no-proxy-server"]} if engine == "chromium" else {}
            if os.environ.get("CHROME") and engine == "chromium": opts["executable_path"] = os.environ["CHROME"]
            b = getattr(p, engine).launch(**opts)
            ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
            ctx.add_init_script("localStorage.setItem('qpeeg_consent',JSON.stringify({v:1,share:false}));localStorage.setItem('qpeeg_install_seen','1');" "localStorage.setItem('qpeeg_seen_version','%s');"
                                "if(!localStorage.getItem('qpeeg_state_v1'))localStorage.setItem('qpeeg_state_v1',%s)" % (VER, json.dumps(json.dumps(STATE))))
            pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.goto(URL); navegador.quieto(pg)
            pg.evaluate("enterApp(false)"); navegador.quieto(pg)
            if SHOTS: pg.screenshot(path=f"{SHOTS}/semana_tarjetas.png")
            pg.evaluate("showSection('exercises')"); navegador.quieto(pg)
            if SHOTS: pg.screenshot(path=f"{SHOTS}/rutinas_tarjetas.png")
            r["tarjetas_color_boton"] = pg.evaluate("getComputedStyle(document.querySelector('.day-card')).borderColor") == \
                pg.evaluate("getComputedStyle(document.querySelector('.square-card.add-square')).borderColor")

            pg.evaluate("showSection('food')"); navegador.quieto(pg)
            pg.locator(".food-add").click(); navegador.quieto(pg)
            groups = pg.locator(".picker-group").all_inner_texts()
            r["frecuentes_arriba"] = bool(groups) and groups[0].lower() == "frecuentes"
            first = pg.locator(".picker-list > *").nth(1).inner_text()
            r["solo_arroz_frecuente"] = "Arroz blanco" in first and pg.locator(".picker-list > *").nth(2).inner_text().lower().startswith("harinas")
            if SHOTS: pg.screenshot(path=f"{SHOTS}/menu_frecuentes.png")

            pg.locator(".picker-item", has_text="Arroz blanco").first.click(); navegador.quieto(pg)
            pg.locator(".stepper-overlay button", has_text="Agregar").click(); navegador.quieto(pg)
            r["menu_sigue_abierto"] = pg.locator(".picker-overlay:not(.stepper-overlay)").count() == 1
            r["arroz_marcado"] = pg.locator(".picker-item.picked", has_text="Arroz blanco").count() == 2   # en Frecuentes y en Harinas
            # Volver a tocar lo agregado: abre en la cantidad puesta y se corrige sin duplicar
            pg.locator(".picker-item.picked", has_text="Arroz blanco").first.click(); navegador.quieto(pg)
            r["reabre_en_cantidad"] = pg.locator(".stepper-overlay .stepper-value").inner_text().strip() == "1" and \
                pg.locator(".stepper-overlay button", has_text="Guardar").count() == 1
            pg.locator(".stepper-overlay .stepper-arrow, .stepper-overlay button").filter(has_text="▲").first.click(); navegador.quieto(pg)
            pg.locator(".stepper-overlay button", has_text="Guardar").click(); navegador.quieto(pg)
            r["corrige_sin_duplicar"] = pg.evaluate("foodEntries().filter(e => e.n === 'Arroz blanco').map(e => e.p).join()") == "2"
            pg.locator(".picker-item.picked", has_text="Arroz blanco").first.click(); navegador.quieto(pg)
            r["reabre_en_2"] = "Guardar" in pg.locator(".stepper-overlay").inner_text()
            pg.locator(".stepper-overlay button", has_text="Cancelar").click(); navegador.quieto(pg)
            # Filtros y lupa
            pg.locator(".picker-filter", has_text="Frutas").click(); navegador.quieto(pg)
            r["filtro_frutas"] = [g.lower() for g in pg.locator(".picker-group").all_inner_texts()] == ["frutas"]
            pg.locator(".picker-filter", has_text="Todos").click(); navegador.quieto(pg)
            pg.focus(".picker-search"); pg.keyboard.type("banano"); pg.keyboard.press("Enter"); navegador.quieto(pg)
            r["enter_cierra_teclado"] = pg.evaluate("document.activeElement !== document.querySelector('.picker-search')")
            pg.focus(".picker-search"); pg.locator(".picker-lens").click(); navegador.quieto(pg)
            r["lupa_cierra_teclado"] = pg.evaluate("document.activeElement !== document.querySelector('.picker-search')")
            pg.fill(".picker-search", ""); navegador.quieto(pg)
            box = pg.locator(".picker-sheet").bounding_box()
            r["cuadro_mas_alto"] = box["y"] < 0.75 * (844 - 560) / 2 + 2 and 844 - (box["y"] + box["height"]) < 0.75 * (844 - 560) / 2 + 2
            if SHOTS: pg.screenshot(path=f"{SHOTS}/menu_filtros.png")
            pg.fill(".picker-search", "pechuga"); navegador.quieto(pg)
            pg.locator(".picker-item", has_text="Pechuga").first.click(); navegador.quieto(pg)
            pg.locator(".stepper-overlay button", has_text="Cancelar").click(); navegador.quieto(pg)
            r["cancelar_no_marca"] = pg.locator(".picker-item.picked").count() == 0   # con el filtro solo se ve la pechuga
            pg.locator(".picker-item", has_text="Pechuga").first.click(); navegador.quieto(pg)
            pg.locator(".stepper-overlay button", has_text="Agregar").click(); navegador.quieto(pg)
            pg.fill(".picker-search", ""); navegador.quieto(pg)
            r["varias_marcadas"] = pg.locator(".picker-item.picked").count() == 3
            if SHOTS: pg.screenshot(path=f"{SHOTS}/menu_agregadas.png")
            r["guardadas"] = pg.evaluate("foodEntries().map(e => e.n).sort().join()") == "Arroz blanco,Pechuga de pollo"
            pg.locator(".picker-close").click(); navegador.quieto(pg)
            r["resumen_actualizado"] = "/" in pg.locator(".food-macros").inner_text()
            r["cerrado"] = pg.locator(".picker-overlay").count() == 0

            # Comida rápida: pizza por slice, sin salir del menú
            pg.locator(".food-add").click(); navegador.quieto(pg)
            pg.fill(".picker-search", "pepperoni"); navegador.quieto(pg)
            r["catalogo_pizzas"] = pg.locator(".picker-group", has_text="Pizza Hut").count() == 1 and \
                pg.locator(".picker-group", has_text="Papa John's").count() == 1 and pg.locator(".picker-group", has_text="Rey Pizza").count() == 1
            if SHOTS:
                pg.fill(".picker-search", "jamón y queso"); navegador.quieto(pg)
                pg.screenshot(path=f"{SHOTS}/menu_jamon_queso.png")
                pg.fill(".picker-search", "pepperoni"); navegador.quieto(pg)
            kcal0 = pg.evaluate("foodTotals(foodEntries()).kcal")
            pg.locator(".picker-item", has_text="Pizza Hut · Pizza pepperoni mediana").first.click(); navegador.quieto(pg)
            r["stepper_slices"] = "slice" in pg.locator(".stepper-overlay").inner_text()
            r["stepper_equivalencia"] = "harina" in pg.locator(".stepper-overlay").inner_text()
            pg.locator(".stepper-overlay button[aria-label*='Subir'], .stepper-overlay .stepper-up").first.click(); navegador.quieto(pg)
            r["flecha_de_uno"] = "2" in pg.locator(".stepper-value, .stepper-overlay").first.inner_text().split("slices")[0]
            if SHOTS: pg.screenshot(path=f"{SHOTS}/stepper_pizza.png")
            pg.locator(".stepper-overlay .stepper-down, .stepper-overlay button[aria-label*='Bajar']").first.click(); navegador.quieto(pg)
            pg.locator(".stepper-overlay button", has_text="Agregar").click(); navegador.quieto(pg)
            r["rapida_marcada"] = pg.locator(".picker-item.picked", has_text="Pizza Hut").count() == 1
            pg.locator(".picker-close").click(); navegador.quieto(pg)
            r["rapida_suma"] = round(pg.evaluate("foodTotals(foodEntries()).kcal") - kcal0) == 220
            r["rapida_suma_porciones"] = pg.evaluate("foodTotals(foodEntries()).portions.h") >= 1.5
            pg.locator(".food-hist-btn").click(); navegador.quieto(pg)
            bands = pg.evaluate("[...document.querySelectorAll('.fh-list .picker-group')].map(g => g.textContent)")
            r["historial_reciente_arriba"] = len(bands) >= 1
            r["historial_equivalencia"] = "harina" in pg.locator(".fh-list").inner_text()
            if SHOTS: pg.screenshot(path=f"{SHOTS}/historial_porciones.png")
            pg.locator(".picker-close").click(); navegador.quieto(pg)

            # Volumen sucio: un solo deslizable de 200 en 200, el subtítulo dice en cuánto queda el día
            # cada alimento del catálogo (también los calibrados, como la miel) abre su cuadro de cantidad
            rotos = pg.evaluate("""(() => { const bad = []; for (const g in FOOD_CATALOG) FOOD_CATALOG[g].forEach(it => {
                try { askFoodAmount(g, it); if (!document.querySelector('.stepper-sheet')) bad.push(it[0]); } catch (e) { bad.push(it[0]); }
                document.querySelectorAll('.stepper-overlay').forEach(o => o.remove()); stepperOverlay = null; }); return bad; })()""")
            r["catalogo_se_puede_agregar"] = rotos == []
            # fibra, azúcar añadido, sodio y edulcorantes bajo los macros; lo que pasa de su máximo, en naranja
            pg.evaluate("renderFood()")
            r["extras_visibles"] = pg.locator(".food-extras span").count() == 4
            pg.evaluate("addFoodEntry({ id: 'ed1', n: 'Refrescos · Coca-Cola Sin Azúcar', g: 'rapida', p: 9, k: 0, mc: 0, mp: 0, mf: 0, t: '', ts: Date.now() }); renderFood()")
            r["extras_naranja"] = pg.locator(".food-extras b.over").count() >= 1
            pg.evaluate("removeFoodEntry('ed1'); renderFood()")

            if rotos: print("NO ABREN:", rotos)
            now = round(pg.evaluate("foodTotals(foodEntries()).kcal"))
            pg.locator(".food-done").click(); navegador.quieto(pg)
            if SHOTS: pg.screenshot(path=f"{SHOTS}/volumen_sucio.png")
            box = pg.locator(".stepper-sheet .stepper-value")
            num = lambda: int(box.inner_text().replace("kcal", "").strip())
            r["numero_con_kcal"] = box.inner_text().strip().endswith("kcal")
            start = num()
            r["volumen_sucio_de_200"] = start % 200 == 0
            pg.locator(".stepper-sheet .stepper-btn").first.click(); navegador.quieto(pg)
            r["sube_200"] = num() == start + 200
            r["dice_en_cuanto_queda"] = f"{now + start + 200:,}".replace(",", ".") in pg.locator(".stepper-sub").inner_text() or str(now + start + 200) in pg.locator(".stepper-sub").inner_text().replace(".", "")
            pg.locator(".stepper-sheet .dialog-btn.accept").click(); navegador.quieto(pg)
            r["se_suma"] = round(pg.evaluate("foodTotals(foodEntries()).kcal")) == now + start + 200
            r["boton_activo"] = pg.locator(".food-done.on").count() == 1
            pg.locator(".food-done").click(); navegador.quieto(pg)
            pg.locator(".dialog-btn", has_text="Quitar").click(); navegador.quieto(pg)
            r["se_puede_quitar"] = not pg.evaluate("foodEntries().some(e => e.g === 'libre')") and pg.locator(".food-done.on").count() == 0
            # Cancelar no suma nada
            pg.locator(".food-done").click(); navegador.quieto(pg)
            pg.locator(".stepper-sheet .dialog-btn", has_text="Cancelar").click(); navegador.quieto(pg)
            r["cancelar_no_suma"] = not pg.evaluate("foodEntries().some(e => e.g === 'libre')")
            ctx.close(); b.close()
    finally:
        srv.terminate()
    r["errores"] = errors
    print(json.dumps(r, ensure_ascii=False, indent=1))
    sys.exit(0 if all(v for k, v in r.items() if k != "errores") and not errors else 1)


if __name__ == "__main__":
    main()
