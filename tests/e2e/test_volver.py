"""Casita → flecha de volver en secciones internas, y ✓ para dar el entreno del día por terminado.

Uso:  python3 tests/e2e/test_volver.py     (desde la raíz del repositorio)
Variables opcionales: CHROME=/ruta/a/chrome  PORT=8809  SHOTS=carpeta
"""
import json, os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = os.environ.get("PORT", "8809")
URL = f"http://localhost:{PORT}/index.html"
SHOTS = os.environ.get("SHOTS")
VER = re.search(r'APP_VERSION = "([^"]+)"', open(os.path.join(ROOT, "scripts/core/version.js"), encoding="utf-8").read()).group(1)

ex = lambda i, n: {"id": i, "name": n, "kg": 40, "unit": "kg", "series": [{"min": 8, "max": 12}] * 3}
STATE = {"routines": [{"id": "r1", "name": "PPL", "days": [{"id": "d1", "name": "Push", "exercises": [ex("e0", "Press banca"), dict(ex("e1", "Aperturas"), kg=100, series=[{"min": 10, "max": 15}] * 4), dict(ex("e2", "Fondos"), kg=102.5, unit="lb")]}]}],
         "activeRoutineId": "r1", "logs": {}, "food": {"log": {}}, "achievements": [],
         "settings": {"theme": "dark", "glow": "verde", "bright": "mid", "speed": "mid", "font": "arial"}}

mode = lambda pg: pg.evaluate("document.getElementById('homeBtn').dataset.mode || 'home'")
check_shown = lambda pg: pg.evaluate("!document.getElementById('dayDoneBtn').hidden")
status = lambda pg: pg.evaluate("dayStatus(findRoutine('r1'), getWorkoutDateKey())")
section = lambda pg: pg.evaluate("document.querySelector('.section.active').id")
shot = lambda pg, name: SHOTS and pg.screenshot(path=os.path.join(SHOTS, name + ".png"))


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
            ctx.add_init_script("localStorage.setItem('qpeeg_consent',JSON.stringify({v:1,share:false}));localStorage.setItem('qpeeg_install_seen','1');"
                                "localStorage.setItem('qpeeg_seen_version','%s');localStorage.setItem('qpeeg_tip_settings','1');"
                                "if(!localStorage.getItem('qpeeg_state_v1'))localStorage.setItem('qpeeg_state_v1',%s)" % (VER, json.dumps(json.dumps(STATE))))
            pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.set_default_timeout(6000)
            pg.goto(URL); pg.wait_for_timeout(900)
            pg.evaluate("enterApp(false)"); pg.wait_for_timeout(400)

            # Semana: casita normal, sin ✓
            r["semana_casita"] = mode(pg) == "home" and not check_shown(pg)

            # Entreno del día: flecha de volver y ✓ a la derecha
            pg.locator(".split-card", has_text="Push").click(); pg.wait_for_timeout(700)
            r["entreno_flecha"] = section(pg) == "workout" and mode(pg) == "back" and pg.get_attribute("#homeBtn", "aria-label") == "Volver"
            r["entreno_check"] = check_shown(pg)
            r["titulo_sin_flecha_de_texto"] = "←" not in pg.inner_text("#weekDate")
            hb, cb = pg.locator("#homeBtn").bounding_box(), pg.locator("#dayDoneBtn").bounding_box()
            r["check_a_la_derecha_mismo_tamano"] = cb["x"] > 300 and abs(cb["width"] - hb["width"]) < 1 and abs(cb["y"] - hb["y"]) < 1
            shot(pg, "volver_1_entreno")

            # Fila del plan (peso × series × reps): termina donde termina la 4.ª serie, sin kg/lb y sin cortar cifras
            rows = pg.evaluate("""[...document.querySelectorAll('.workout-track .wb-card')].map(c => {
                const plan = c.querySelector('.wb-plan').getBoundingClientRect(), sets = c.querySelector('.wb-sets').getBoundingClientRect();
                const fits = [...c.querySelectorAll('.wb-plan .kg-value, .wb-plan .wb-pv b')].every(e => e.scrollWidth <= e.clientWidth + 1);
                return { d: Math.abs(plan.left + plan.width - (sets.left + sets.width)), fits, unit: c.querySelector('.wb-unit')?.textContent,
                         toggle: !!c.querySelector('.wb-plan .rx-unit'), reps: c.querySelector('.wb-plan .wb-pv:last-child b').textContent }; })""")
            r["plan_termina_en_la_4a_serie"] = len(rows) == 3 and all(x["d"] < 1 for x in rows)
            r["plan_sin_cambio_kg_lb"] = not any(x["toggle"] for x in rows) and [x["unit"] for x in rows] == ["kg", "kg", "lb"]
            r["cifras_caben_3_digitos_y_rango"] = all(x["fits"] for x in rows) and len(rows[1]["reps"]) == 5

            # Un ejercicio en verde y los demás sin marcar: rojo; con ✓: verde
            pg.evaluate("state.logs.r1[getWorkoutDateKey()].exercises.e0 = { kg: 40, reps: [10, 10, 10], extra: 0 }; saveState()")
            r["sin_check_rojo"] = status(pg) == "red"
            pg.click("#dayDoneBtn"); pg.wait_for_timeout(300)
            r["con_check_verde"] = status(pg) == "green" and pg.evaluate("document.getElementById('dayDoneBtn').classList.contains('on')")
            shot(pg, "volver_2_check")
            pg.reload(); pg.wait_for_timeout(800)
            r["check_se_guarda"] = pg.evaluate("state.logs.r1[getWorkoutDateKey()].done === true") and status(pg) == "green"
            pg.evaluate("enterApp(false)"); pg.wait_for_timeout(400)
            pg.locator(".split-card", has_text="Push").click(); pg.wait_for_timeout(700)
            r["check_encendido_al_volver"] = pg.evaluate("document.getElementById('dayDoneBtn').classList.contains('on')")
            pg.click("#dayDoneBtn"); pg.wait_for_timeout(300)
            r["check_se_quita"] = status(pg) == "red" and pg.evaluate("!('done' in state.logs.r1[getWorkoutDateKey()])")

            # La flecha vuelve a Semana y la casita regresa
            pg.click("#homeBtn"); pg.wait_for_timeout(700)
            r["flecha_vuelve_a_semana"] = section(pg) == "week" and mode(pg) == "home" and not check_shown(pg)

            # Rutinas → días de una rutina (editor): flecha; volver → lista de rutinas con casita
            pg.evaluate("showSection('exercises')"); pg.wait_for_timeout(400)
            r["rutinas_casita"] = mode(pg) == "home"
            pg.evaluate("routineNav = { level: 'days', routineId: 'r1', dayId: null }; renderRoutinesTab()"); pg.wait_for_timeout(400)
            r["editor_flecha"] = mode(pg) == "back" and not check_shown(pg)
            shot(pg, "volver_3_editor")
            pg.click("#homeBtn"); pg.wait_for_timeout(700)
            r["editor_vuelve"] = section(pg) == "exercises" and pg.evaluate("routineNav.level") == "root" and mode(pg) == "home"

            # Casita en una sección principal: sale a la pantalla de inicio
            pg.click("#homeBtn"); pg.wait_for_timeout(900)
            r["casita_va_al_inicio"] = pg.evaluate("getComputedStyle(document.getElementById('landing')).display") != "none"
            b.close()
    finally:
        srv.terminate()
    r["errores"] = errors
    print(json.dumps(r, indent=1, ensure_ascii=False))
    sys.exit(0 if all(v for k, v in r.items() if k != "errores") and not errors else 1)


if __name__ == "__main__":
    main()
