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
            # BROWSER=webkit prueba con el motor de Safari (iPhone); por defecto Chromium
            engine = os.environ.get("BROWSER", "chromium")
            opts = {"args": ["--no-sandbox", "--no-proxy-server"]} if engine == "chromium" else {}
            if os.environ.get("CHROME") and engine == "chromium": opts["executable_path"] = os.environ["CHROME"]
            b = getattr(p, engine).launch(**opts)
            ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
            ctx.add_init_script("localStorage.setItem('qpeeg_consent',JSON.stringify({v:1,share:false}));" "localStorage.setItem('qpeeg_seen_version','%s');"
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
            r["calendario_con_palabras"] = all(c for c in pg.evaluate("[...document.querySelectorAll('.history-cell:not(.blank)')].map(c => c.getAttribute('aria-label'))")) and "hoy" in pg.evaluate("document.querySelector('.history-cell.today').getAttribute('aria-label')")
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

            # Deportes: tiempo, distancia y desnivel (cada uno opcional) → carga, en una sola gráfica
            pg.evaluate("showSection('week')"); pg.wait_for_timeout(300)
            pg.locator("text=Añadir deporte").click(); pg.wait_for_timeout(400)
            pg.locator(".picker-item", has_text="Ciclismo").click(); pg.wait_for_timeout(400)
            r["deporte_tres_datos"] = pg.locator(".sport-col").count() == 3 and pg.locator(".sport-col").first.locator(".sport-step").count() == 2
            pg.locator(".sport-value").nth(1).click(); pg.wait_for_timeout(200); pg.keyboard.press("Control+A"); pg.keyboard.type("33"); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
            want = pg.evaluate("Math.round(sportLoad({ k: 'bike', km: 33 }))")
            r["deporte_carga"] = f"Carga {want}" in pg.inner_text(".sport-load").replace("\n", " ")
            pg.locator(".sport-form .dialog-btn.accept").click(); pg.wait_for_timeout(400)
            sp = pg.evaluate("state.sports[getWorkoutDateKey()].slice(-1)[0]")
            r["deporte_guardado"] = sp.get("k") == "bike" and sp.get("km") == 33 and "min" not in sp
            pg.locator(".sport-chip-text").last.click(); pg.wait_for_timeout(400)
            r["deporte_se_edita"] = pg.locator(".sport-form .dialog-btn.accept").inner_text() == "Guardar" and pg.locator(".sport-value").nth(1).inner_text() == "33 km"
            pg.locator(".sport-form .dialog-btn.ghost").click(); pg.wait_for_timeout(300)
            pg.evaluate("showSection('history'); historyMode = 'sport'; historyView = 'chart'; renderHistory()"); pg.wait_for_timeout(600)
            r["deporte_grafica_carga"] = pg.locator("#historyChart .chart-heading").count() == 1 and pg.inner_text("#historyChart .chart-heading").upper().startswith("CARGA") and pg.locator("#historyChart svg.chart-svg").count() == 1
            pg.evaluate("historyMode = 'workout'; historyView = 'calendar'; renderHistory()")

            # Supermercado: las galletas y snacks aparecen en Agregar comida
            pg.evaluate("showSection('food'); openFoodPicker()"); pg.wait_for_timeout(500)
            titles = pg.evaluate("[...document.querySelectorAll('.picker-overlay:last-child .picker-group')].map(t => t.textContent)")
            r["buscador_con_nombre"] = pg.locator(".picker-overlay:last-child .picker-search").get_attribute("aria-label") == "Buscar"
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
            pg.evaluate("document.querySelectorAll('.ex-settings-sheet').forEach(s => s.closest('.picker-overlay').remove())"); pg.wait_for_timeout(300)

            # Tuerca del título del día: ordenar ejercicios
            pg.locator(".day-sheet .day-title-row .ex-gear").click(); pg.wait_for_timeout(400)
            r["orden_abre"] = pg.locator(".order-row").count() == 2
            pg.locator(".order-row").nth(1).locator(".order-btn").first.click(); pg.wait_for_timeout(300)
            if SHOTS: pg.screenshot(path=f"{SHOTS}/ejercicio_orden.png")
            r["orden_guarda"] = pg.evaluate("state.routines[0].days[0].exercises.map(e => e.id)") == ["e1", "e0"]
            r["orden_primero_sin_subir"] = pg.locator(".order-row").nth(0).locator(".order-btn").first.is_disabled()
            pg.locator(".order-sheet").locator("xpath=..").locator(".picker-close").click(); pg.wait_for_timeout(400)
            r["orden_en_editor"] = pg.locator(".day-sheet .rx-head .exercise-name").nth(0).inner_text() == "Aperturas"

            # Persiste al recargar
            pg.wait_for_timeout(500); pg.reload(); pg.wait_for_timeout(900)
            r["persiste"] = pg.evaluate("state.routines[0].days[0].exercises[0].fig") == "eq-mancuerna"
            ctx.close(); b.close()
    finally:
        srv.terminate()
    r["errores"] = errors
    print(json.dumps(r, ensure_ascii=False, indent=1))
    sys.exit(0 if all(v for k, v in r.items() if k != "errores") and not errors else 1)


if __name__ == "__main__":
    main()
