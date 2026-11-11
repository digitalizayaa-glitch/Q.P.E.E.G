"""Ver un día anterior desde el calendario: toda la app queda en ese día hasta tocar "Hoy".

Uso:  python3 tests/e2e/test_dia_pasado.py     (desde la raíz del repositorio)
Variables opcionales: CHROME=/ruta/a/chrome  PORT=8806  SHOTS=carpeta
"""
import json, os, re, subprocess, sys, time
from datetime import date, timedelta
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = os.environ.get("PORT", "8806")
URL = f"http://localhost:{PORT}/index.html"
SHOTS = os.environ.get("SHOTS")
VER = re.search(r'APP_VERSION = "([^"]+)"', open(os.path.join(ROOT, "scripts/core/version.js")).read()).group(1)

# Un miércoles con nombre largo para probar que el título cabe
past = date.today() - timedelta(days=1)
while past.weekday() != 2 or past.month not in (9, 11, 12, 10, 1, 2):
    past -= timedelta(days=1)
PK = past.isoformat()
ex = {"id": "e1", "name": "Press banca", "kg": 40, "unit": "kg", "series": [{"min": 8, "max": 12}] * 3}
STATE = {"routines": [{"id": "r1", "name": "Torso-Pierna", "days": [{"id": "d1", "name": "Torso", "exercises": [ex]}]}],
         "activeRoutineId": "r1", "logs": {"r1": {PK: {"dayId": "d1", "exercises": {"e1": {"kg": 40, "reps": [10, 9, 8], "extra": 0}}}}},
         "food": {"log": {PK: [{"id": "f1", "n": "Arroz blanco", "g": "h", "p": 2, "t": "2 porciones"}]}}, "achievements": [],
         "nutrition": {"profile": {"sex": "m", "age": 30, "height": 180, "weight": 80, "activity": 1.55, "bf": None}, "goal": "bulk", "diet": "high"},
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
            ctx = b.new_context(viewport={"width": 360, "height": 780}, service_workers="block")
            ctx.add_init_script("localStorage.setItem('qpeeg_seen_version','%s');"
                                "if(!localStorage.getItem('qpeeg_state_v1'))localStorage.setItem('qpeeg_state_v1',%s)" % (VER, json.dumps(json.dumps(STATE))))
            pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.goto(URL); pg.wait_for_timeout(900)
            pg.evaluate("enterApp(false)"); pg.wait_for_timeout(300)
            title = lambda: pg.locator("#weekDate").inner_text()
            fits = lambda: pg.evaluate("(() => { const e = document.getElementById('weekDate'); return e.scrollWidth <= e.clientWidth + 1; })()")
            today_btn = lambda: pg.locator("#todayBtn").is_visible()
            r["hoy_sin_boton"] = not today_btn()

            # Desde el calendario de calorías
            pg.evaluate("showSection('history'); historyMode = 'food'; renderHistory()"); pg.wait_for_timeout(400)
            pg.evaluate(f"historyOffset = ({past.year} * 12 + {past.month - 1}) - (new Date().getFullYear() * 12 + new Date().getMonth()); renderHistory()"); pg.wait_for_timeout(300)
            pg.locator(f".history-grid [data-key='{PK}']").click(); pg.wait_for_timeout(600)
            r["abre_comida_del_dia"] = pg.evaluate("document.querySelector('.section.active').id") == "food" and pg.evaluate("foodKey()") == PK
            r["titulo_cabe"] = fits() and "←" not in title()
            r["boton_hoy"] = today_btn()
            if SHOTS: pg.screenshot(path=f"{SHOTS}/dia_pasado_comida.png")

            # Deslizar a otras pestañas mantiene el día
            pg.evaluate("shiftWeekTab(1)"); pg.wait_for_timeout(300)        # Historial
            pg.evaluate("shiftWeekTab(1)"); pg.wait_for_timeout(300)        # Semana
            r["semana_mismo_dia"] = pg.evaluate("getWorkoutDateKey()") == PK
            r["semana_titulo_dia"] = str(past.day) in title() and fits()
            if SHOTS: pg.screenshot(path=f"{SHOTS}/dia_pasado_semana.png")
            pg.evaluate("shiftWeekTab(1)"); pg.wait_for_timeout(300)        # Rutinas
            r["rutinas_sin_boton"] = not today_btn()
            pg.evaluate("shiftWeekTab(1)"); pg.wait_for_timeout(300)        # Comida
            r["comida_sigue"] = pg.evaluate("foodKey()") == PK

            # "Hoy" vuelve a hoy en todas
            pg.locator("#todayBtn").click()
            try: pg.wait_for_function("foodKey() === dateKey() && getWorkoutDateKey() === dateKey()", timeout=4000); pg.wait_for_timeout(300)
            except Exception: pass
            r["hoy_vuelve"] = pg.evaluate("foodKey() === dateKey() && getWorkoutDateKey() === dateKey()") and not today_btn()

            # Desde el calendario de entreno lleva al día y también a su comida
            pg.evaluate(f"setViewDate(null); showSection('history'); historyMode = 'workout'; openHistoryDay('{PK}')"); pg.wait_for_timeout(600)
            pg.evaluate("showSection('food')")
            try: pg.wait_for_function(f"foodKey() === '{PK}'", timeout=4000)
            except Exception: pass
            r["entreno_luego_comida_mismo_dia"] = pg.evaluate("foodKey()") == PK
            ctx.close(); b.close()
    finally:
        srv.terminate()
    r["errores"] = errors
    print(json.dumps(r, ensure_ascii=False, indent=1))
    sys.exit(0 if all(v for k, v in r.items() if k != "errores") and not errors else 1)


if __name__ == "__main__":
    main()
