"""Tuerca del ejercicio, historial (gráficas de tamaño fijo, título del calendario, pulso de hoy) y supermercado.

Uso:  python3 tests/e2e/test_ejercicio.py     (desde la raíz del repositorio)
Variables opcionales: CHROME=/ruta/a/chrome  PORT=8807  SHOTS=carpeta
"""
import json, os, re, subprocess, sys, time
from datetime import date, timedelta
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = os.environ.get("PORT", "8807")
URL = f"http://localhost:{PORT}/index.html"
SHOTS = os.environ.get("SHOTS")
VER = re.search(r'APP_VERSION = "([^"]+)"', open(os.path.join(ROOT, "scripts/core/version.js")).read()).group(1)

k = lambda o: (date.today() - timedelta(days=o)).isoformat()
ex = lambda i, n: {"id": i, "name": n, "kg": 40, "unit": "kg", "series": [{"min": 8, "max": 12}] * 3}
STATE = {"routines": [{"id": "r1", "name": "PPL", "days": [{"id": "d1", "name": "Push", "exercises": [ex("e0", "Press banca"), ex("e1", "Aperturas")]}]}],
         "activeRoutineId": "r1", "logs": {}, "food": {"log": {}},
         "sports": {k(1): [{"id": "s1", "k": "run", "n": "Correr", "u": "km", "v": 5}], k(2): [{"id": "s2", "k": "soccer", "n": "Fútbol", "u": "min", "v": 90}]},
         "settings": {"theme": "dark", "glow": "verde", "bright": "mid", "speed": "mid"}}


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
            pg.set_default_timeout(6000)
            pg.goto(URL); pg.wait_for_timeout(900)
            pg.evaluate("enterApp(false)"); pg.wait_for_timeout(300)

            # Historial: los botones no se mueven y todas las gráficas miden lo mismo
            pg.evaluate("showSection('history')"); pg.wait_for_timeout(400)
            pos = lambda: pg.evaluate("['histModeBtn','histMonthsBtn','histChartBtn'].map(i => Math.round(document.getElementById(i).getBoundingClientRect().top))")
            box = lambda: round(pg.evaluate("document.getElementById('historyChart').getBoundingClientRect().height"))
            first, sizes, places = pos(), set(), set()
            kinds = []
            for _ in range(3):
                kinds.append(pg.inner_text("#historyKind")); pg.click("#histModeBtn"); pg.wait_for_timeout(300)
            r["titulo_calendario"] = kinds == ["ENTRENOS", "CALORÍAS", "DEPORTES"]
            r["hoy_con_pulso"] = pg.evaluate("getComputedStyle(document.querySelector('.history-cell.today')).animationName") == "today-pulse"
            pg.click("#histChartBtn"); pg.wait_for_timeout(500)
            for _ in range(3):
                for _ in range(3):
                    places.add(tuple(pos())); sizes.add(box())
                    pg.click("#histMonthsBtn"); pg.wait_for_timeout(300)
                pg.click("#histModeBtn"); pg.wait_for_timeout(300)
            r["botones_quietos"] = places == {tuple(first)}
            r["sin_titulo_en_grafica"] = pg.evaluate("document.getElementById('historyKind').hidden")
            r["graficas_mismo_alto"] = len(sizes) == 1
            pg.click("#histChartBtn"); pg.wait_for_timeout(300)

            # Supermercado: las galletas y snacks aparecen en Agregar comida
            pg.evaluate("showSection('food'); openFoodPicker()"); pg.wait_for_timeout(500)
            titles = pg.evaluate("[...document.querySelectorAll('.picker-overlay:last-child .picker-group')].map(t => t.textContent)")
            r["supermercado"] = "Supermercado · Galletas" in titles and "Supermercado · Snacks y paquetes" in titles
            pg.locator(".picker-overlay:last-child .picker-search").fill("chiky"); pg.wait_for_timeout(300)
            r["busca_chiky"] = pg.locator(".picker-overlay:last-child .picker-item:visible").count() >= 1
            pg.evaluate("document.querySelectorAll('.picker-overlay').forEach(o => o.remove())")

            # Entreno: tuerca junto al nombre → galería y nombre
            pg.evaluate("showSection('week')"); pg.wait_for_timeout(300)
            pg.locator(".split-card").nth(0).click(); pg.wait_for_timeout(600)
            pg.locator(".wb-head .ex-gear").nth(0).click(); pg.wait_for_timeout(500)
            r["galeria"] = pg.locator(".ex-tile").count() > 40
            pg.locator(".ex-tile[aria-label='Barra de dominadas']").click(); pg.wait_for_timeout(300)
            r["imagen_elegida"] = pg.evaluate("state.routines[0].days[0].exercises[0].fig") == "eq-dominadas"
            r["marcada"] = pg.locator(".ex-tile.selected").get_attribute("aria-label") == "Barra de dominadas"
            pg.click(".ex-rename"); pg.wait_for_timeout(400)
            pg.keyboard.press("Control+A"); pg.keyboard.type("Dominadas"); pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
            r["nombre"] = pg.evaluate("state.routines[0].days[0].exercises[0].name") == "Dominadas"
            if SHOTS: pg.screenshot(path=f"{SHOTS}/ejercicio_ajustes.png")
            pg.locator(".ex-settings-sheet .picker-x, .ex-settings-sheet button[aria-label='Cerrar']").first.click(); pg.wait_for_timeout(400)
            r["tarjeta_actualizada"] = pg.locator(".wb-head .exercise-name").nth(0).inner_text() == "Dominadas"
            pg.locator(".ex-gear").nth(0).click(); pg.wait_for_timeout(400)
            pg.locator(".ex-tile[aria-label='Automática']").click(); pg.wait_for_timeout(300)
            r["automatica_borra"] = pg.evaluate("'fig' in state.routines[0].days[0].exercises[0]") is False

            # Editor de rutinas: también tiene la tuerca
            pg.evaluate("document.querySelectorAll('.picker-overlay').forEach(o => o.remove()); showSection('exercises')"); pg.wait_for_timeout(400)
            pg.locator("#routinesContainer .day-card").nth(0).click(); pg.wait_for_timeout(600)
            pg.locator("#routinesContainer .day-card").nth(0).click(); pg.wait_for_timeout(600)
            r["tuerca_editor"] = pg.locator(".rx-head .ex-gear").count() == 2
            pg.locator(".rx-head .ex-gear").nth(1).click(); pg.wait_for_timeout(400)
            pg.locator(".ex-tile[aria-label='Mancuerna']").click(); pg.wait_for_timeout(300)
            r["editor_guarda"] = pg.evaluate("state.routines[0].days[0].exercises[1].fig") == "eq-mancuerna"

            # Persiste al recargar
            pg.wait_for_timeout(500); pg.reload(); pg.wait_for_timeout(900)
            r["persiste"] = pg.evaluate("state.routines[0].days[0].exercises[1].fig") == "eq-mancuerna"
            ctx.close(); b.close()
    finally:
        srv.terminate()
    r["errores"] = errors
    print(json.dumps(r, ensure_ascii=False, indent=1))
    sys.exit(0 if all(v for k, v in r.items() if k != "errores") and not errors else 1)


if __name__ == "__main__":
    main()
