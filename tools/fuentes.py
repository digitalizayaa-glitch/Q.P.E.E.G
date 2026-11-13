#!/usr/bin/env python3
"""Genera las fuentes de la app (fonts/*.woff) igualadas a Arial.

Cada fuente se escala (cambiando unitsPerEm, sin tocar los trazos) para que un texto en
español mida lo mismo de ancho que en Arial, y se le ponen las métricas verticales de
Arial (ascendente, descendente, interlineado). Así los renglones cortan en el mismo
lugar y las alturas de línea no cambian, en cualquier navegador.

Uso:  python3 tools/fuentes.py <carpeta de google/fonts> <fuente Arial regular> <Arial negrita>
      (Liberation Sans sirve como Arial: tiene las mismas medidas)
Fuentes: Atkinson Hyperlegible, Space Grotesk y Saira, licencia SIL OFL 1.1.
"""
import sys, os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

GF, AR_REG, AR_BOLD = sys.argv[1:4]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fonts")

SAMPLE = ("Pechuga a la plancha con arroz, frijoles y ensalada. Quedan 560 kcal y 2 porciones de grasa. "
          "Sentadilla 4×8 con 60 kg. Hoy, jueves: harinas, proteína, lácteos, vegetales y frutas. "
          "Rutina de pierna, espalda y hombro; descanso de 90 segundos entre series. 0123456789 ¿Qué comiste?")
UNICODES = (list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + [0x152, 0x153, 0x2212, 0x20AC, 0x2122]
            + list(range(0x2010, 0x2028)) + list(range(0x2030, 0x203B)) + list(range(0x2190, 0x2194)))

FONTS = [  # (salida, archivo de origen, ejes del variable a fijar o None, Arial de referencia)
    ("atkinson-400", "ofl/atkinsonhyperlegible/AtkinsonHyperlegible-Regular.ttf", None, AR_REG),
    ("atkinson-700", "ofl/atkinsonhyperlegible/AtkinsonHyperlegible-Bold.ttf", None, AR_BOLD),
    ("grotesk-400", "ofl/spacegrotesk/SpaceGrotesk[wght].ttf", {"wght": 400}, AR_REG),
    ("grotesk-700", "ofl/spacegrotesk/SpaceGrotesk[wght].ttf", {"wght": 700}, AR_BOLD),
    ("saira-400", "ofl/saira/Saira[wdth,wght].ttf", {"wdth": 100, "wght": 400}, AR_REG),
    ("saira-700", "ofl/saira/Saira[wdth,wght].ttf", {"wdth": 100, "wght": 700}, AR_BOLD),
]


def width_em(font):
    """Ancho del texto de muestra en em (sin kerning)."""
    cmap, hmtx, upm = font.getBestCmap(), font["hmtx"], font["head"].unitsPerEm
    return sum(hmtx[cmap[ord(c)]][0] for c in SAMPLE) / upm


def arial_metrics(path):
    f = TTFont(path)
    upm, hh, os2 = f["head"].unitsPerEm, f["hhea"], f["OS/2"]
    return {k: v / upm for k, v in {
        "asc": hh.ascent, "desc": hh.descent, "gap": hh.lineGap,
        "tasc": os2.sTypoAscender, "tdesc": os2.sTypoDescender, "tgap": os2.sTypoLineGap,
        "wasc": os2.usWinAscent, "wdesc": os2.usWinDescent}.items()}, width_em(f)


os.makedirs(OUT, exist_ok=True)
for name, src, axes, ref in FONTS:
    font = TTFont(os.path.join(GF, src))
    if axes:
        font = instancer.instantiateVariableFont(font, axes)
    m, ref_w = arial_metrics(ref)
    scale = ref_w / width_em(font)                     # >1 = la fuente es más angosta que Arial
    upm = max(16, min(16384, round(font["head"].unitsPerEm / scale)))
    font["head"].unitsPerEm = upm
    r = lambda v: round(v * upm)
    hh, os2 = font["hhea"], font["OS/2"]
    hh.ascent, hh.descent, hh.lineGap = r(m["asc"]), r(m["desc"]), r(m["gap"])
    os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = r(m["tasc"]), r(m["tdesc"]), r(m["tgap"])
    os2.usWinAscent, os2.usWinDescent = r(m["wasc"]), r(m["wdesc"])
    os2.fsSelection &= ~(1 << 7)                        # sin USE_TYPO_METRICS: todos usan las métricas de Arial

    opts = subset.Options()
    opts.flavor = "woff"
    opts.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "tnum"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=UNICODES)
    sub.subset(font)
    path = os.path.join(OUT, name + ".woff")
    subset.save_font(font, path, opts)
    print(f"{name}: escala {scale:.3f}, {os.path.getsize(path) // 1024} KB, ancho igualado {width_em(TTFont(path)) / ref_w:.4f}")
