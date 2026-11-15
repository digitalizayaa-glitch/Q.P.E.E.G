"""Rendimiento y toques reales, con un año de datos (≈ 0,6 MB sin fotos):
- deslizar un valor no serializa todo el estado en cada paso (guardado agrupado) y aun así queda guardado;
- refrescar el entreno no acumula escuchadores de la ventana (fuga de memoria);
- con toques reales de teléfono (solo Chromium: CDP), tocar las letras del cuadro activa el cuadro, no el botón kg/lb.

Uso:  python3 tests/e2e/test_rendimiento.py     (desde la raíz del repositorio)
Variables opcionales: BROWSER=webkit  CHROME=/ruta/a/chrome  PORT=8811
"""
import json, os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import navegador

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORT = os.environ.get("PORT", "8811")
URL = f"http://localhost:{PORT}/index.html"
VER = re.search(r'APP_VERSION = "([^"]+)"', open(os.path.join(ROOT, "scripts/core/version.js"), encoding="utf-8").read()).group(1)

ex = lambda i, n: {"id": i, "name": n, "kg": 40, "unit": "kg", "series": [{"min": 8, "max": 12}] * 3}
STATE = {"routines": [{"id": "r1", "name": "PPL", "days": [{"id": "d1", "name": "Push", "exercises": [ex("e0", "Press banca"), ex("e1", "Aperturas")]}]}],
         "activeRoutineId": "r1", "logs": {}, "food": {"log": {}}, "achievements": [],
         "settings": {"theme": "dark", "glow": "verde", "bright": "mid", "speed": "mid", "font": "arial"}}

# Un año de uso intenso: 4 rutinas de 5 días con 6 ejercicios, entrenos casi diarios, 12 comidas al día, deportes
INFLATE = """() => {
  const rs = [];
  for (let r = 0; r < 4; r++) { const days = []; for (let d = 0; d < 5; d++) { const exs = []; for (let e = 0; e < 6; e++)
      exs.push({ id: `x${r}${d}${e}`, name: 'Ejercicio ' + e, kg: 40, unit: 'kg', series: [1,2,3,4].map(() => ({ min: 8, max: 12 })) });
    days.push({ id: `d${r}${d}`, name: 'Día ' + d, exercises: exs }); } rs.push({ id: `R${r}`, name: 'Rutina ' + r, days }); }
  state.routines = state.routines.concat(rs);
  const now = Date.now();
  for (let i = 1; i < 365; i++) { const k = dateKey(new Date(now - i * 864e5)); const r = rs[i % 4], day = r.days[i % 5];
    (state.logs[r.id] ||= {})[k] = { dayId: day.id, exercises: Object.fromEntries(day.exercises.map(e => [e.id, { kg: 40 + i / 10, reps: [10, 10, 9, 8] }])), plan: planOf(day) };
    state.food.log[k] = Array.from({ length: 12 }, (_, j) => ({ id: `f${i}_${j}`, n: 'Arroz blanco cocido', g: 'h', p: 1, t: '1/2 taza', pt: { h: 1 } }));
    if (i % 2 === 0) (state.sports[k] ||= []).push({ id: 's' + i, k: 'bike', n: 'Ciclismo', km: 20, min: 60, up: 200 }); }
  return JSON.stringify(state).length;
}"""


def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", PORT, "-d", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    r, errors = {}, []
    try:
        with sync_playwright() as p:
            b = navegador.launch(p)
            touch = not navegador.is_webkit()
            ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", has_touch=touch, is_mobile=touch)
            ctx.add_init_script("localStorage.setItem('qpeeg_consent',JSON.stringify({v:1,share:false}));localStorage.setItem('qpeeg_install_seen','1');"
                                "localStorage.setItem('qpeeg_seen_version','%s');localStorage.setItem('qpeeg_tip_settings','1');"
                                "if(!localStorage.getItem('qpeeg_state_v1'))localStorage.setItem('qpeeg_state_v1',%s)" % (VER, json.dumps(json.dumps(STATE))))
            pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.goto(URL); pg.wait_for_timeout(900)
            pg.evaluate("enterApp(false)"); pg.wait_for_timeout(300)
            size = pg.evaluate(INFLATE); print("tamaño del estado:", size)
            r["estado_de_un_año"] = size > 400_000
            pg.evaluate("flushSave()"); pg.wait_for_timeout(300)

            # Entrar al entreno y medir pasos de deslizar (síncrono): sin serializar todo cada vez
            pg.evaluate("() => { const r = findRoutine('r1'); activeWorkout = { routineId: 'r1', dayId: 'd1' }; workoutPage = 0; showSection('workout'); }")
            pg.wait_for_timeout(600)
            steps = pg.evaluate("""() => { const t = []; for (let i = 0; i < 8; i++) { const t0 = performance.now();
                changeWorkoutReps('r1', 'd1', 'e0', 0, 1, null); t.push(performance.now() - t0); } return t; }""")
            worst = max(steps[1:])
            r["paso_de_deslizar_rapido"] = worst < 5
            # Igual queda guardado: en IndexedDB tras el agrupado
            pg.wait_for_timeout(700)
            saved = pg.evaluate("async () => { const rec = await QStore.load(); return JSON.parse(rec.json).logs.r1[dateKey()].exercises.e0.reps[0]; }")
            r["se_guarda_agrupado"] = saved == pg.evaluate("state.logs.r1[dateKey()].exercises.e0.reps[0]") and saved >= 8
            # Al ocultar la app se escribe de inmediato
            pg.evaluate("changeWorkoutReps('r1', 'd1', 'e0', 0, 1, null); document.dispatchEvent(new Event('visibilitychange'))")
            pg.evaluate("Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange'))")
            pg.wait_for_timeout(150)
            now = pg.evaluate("async () => { await QStore.flush(); const rec = await QStore.load(); return JSON.parse(rec.json).logs.r1[dateKey()].exercises.e0.reps[0]; }")
            r["al_ocultar_se_escribe_ya"] = now == pg.evaluate("state.logs.r1[dateKey()].exercises.e0.reps[0]")
            pg.evaluate("Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })")

            # Fuga: refrescar el entreno 20 veces no agrega escuchadores de resize
            pg.evaluate("() => { window.__rz = 0; const o = window.addEventListener; window.addEventListener = function (t, ...a) { if (t === 'resize') window.__rz++; return o.call(this, t, ...a); }; }")
            for _ in range(20): pg.evaluate("refreshWorkout()")
            pg.wait_for_timeout(200)
            r["sin_fuga_de_escuchadores"] = pg.evaluate("window.__rz") == 0

            # Toques reales: tocar el número romano activa la serie (el cuadro late); deslizar desde la letra sube
            if touch:
                cdp = ctx.new_cdp_session(pg)
                def pt(sel):
                    bb = pg.locator(sel).first.bounding_box(); return bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
                def tap(sel):
                    x, y = pt(sel)
                    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]}); pg.wait_for_timeout(60)
                    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(250)
                def drag(sel, dy):
                    x, y = pt(sel)
                    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
                    for i in range(1, 11):
                        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y + dy * i / 10}]}); pg.wait_for_timeout(16)
                    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(300)
                label = ".workout-track .wb-card .wb-serie .serie-label"
                box = ".workout-track .wb-card .wb-serie .reps-value"
                before = pg.evaluate("state.logs.r1[dateKey()].exercises.e0.reps[0]")
                tap(label)
                r["toque_en_letras_activa_cuadro"] = pg.evaluate(f"document.querySelector('{box}').classList.contains('value-armed')")
                drag(label, -130)
                r["toque_arriba_sube"] = pg.evaluate("state.logs.r1[dateKey()].exercises.e0.reps[0]") > before
                r["al_soltar_deja_de_latir"] = not pg.evaluate(f"document.querySelector('{box}').classList.contains('value-armed')")
            ctx.close(); b.close()
    finally:
        srv.terminate()
    r["errores"] = errors
    print(json.dumps(r, ensure_ascii=False, indent=1))
    sys.exit(0 if all(v for k, v in r.items() if k != "errores") and not errors else 1)


if __name__ == "__main__":
    main()
