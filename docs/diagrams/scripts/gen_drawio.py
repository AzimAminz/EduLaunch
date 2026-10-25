"""Builds docs/diagrams/erd/edulaunch-erd.drawio from the tables in gen_erd.py.

Usage: python3 docs/diagrams/scripts/gen_drawio.py docs/diagrams/erd [--preview]
Page 1 is the full ERD (layout tuned so lines do not cross tables); one page per module follows.
"""
import sys, os, html
from xml.sax.saxutils import escape

SRC = os.path.join(os.path.dirname(__file__), 'gen_erd.py')
code = open(SRC).read().split('def entity')[0]
ns = {'sys': sys}
sys_argv = sys.argv
sys.argv = ['x', '/tmp']
exec(code, ns)
sys.argv = sys_argv
E, R, M = ns['E'], ns['R'], ns['M']
OUT = sys.argv[1]

KW, NW, HH, RH = 64, 186, 32, 26          # key col, name col, header, row height
TW = KW + NW
COLORS = ['#dae8fc|#6c8ebf', '#d5e8d4|#82b366', '#fff2cc|#d6b656', '#f8cecc|#b85450', '#e1d5e7|#9673a6',
          '#d0efef|#4a9e9e', '#ffe6cc|#d79b00', '#fce4ec|#c2185b', '#eeeeee|#777777']
OWNER = {t: i for i, (_, _, ts) in enumerate(M) for t in ts}
LEFT = {'||': 'ERmandOne', '|o': 'ERzeroToOne', '}|': 'ERoneToMany', '}o': 'ERzeroToMany'}
RIGHT = {'||': 'ERmandOne', 'o|': 'ERzeroToOne', '|{': 'ERoneToMany', 'o{': 'ERzeroToMany'}

def table_xml(tid, name, cols, x, y, fill, stroke, ref=False):
    h = HH + RH * len(cols)
    dash = 'dashed=1;' if ref else ''
    out = [f'<mxCell id="{tid}" value="{escape(name)}" style="shape=table;startSize={HH};container=1;collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=1;fontStyle=1;align=center;resizeLast=1;html=1;fillColor={fill};strokeColor={stroke};{dash}" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{TW}" height="{h}" as="geometry"/></mxCell>']
    for i, (c, k) in enumerate(cols):
        rid = f'{tid}_r{i}'
        bottom = 0 if i == len(cols) - 1 else 1
        out.append(f'<mxCell id="{rid}" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;top=0;left=0;right=0;bottom={bottom};strokeColor={stroke};" vertex="1" parent="{tid}"><mxGeometry y="{HH + RH * i}" width="{TW}" height="{RH}" as="geometry"/></mxCell>')
        kstyle = 'fontStyle=1;' if k else ''
        out.append(f'<mxCell id="{rid}_k" value="{escape(k.replace(", ", ","))}" style="shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;{kstyle}overflow=hidden;whiteSpace=wrap;html=1;align=center;" vertex="1" parent="{rid}"><mxGeometry width="{KW}" height="{RH}" as="geometry"><mxRectangle width="{KW}" height="{RH}" as="alternateBounds"/></mxGeometry></mxCell>')
        nstyle = 'fontStyle=4;' if 'PK' in k else ''
        out.append(f'<mxCell id="{rid}_n" value="{escape(c)}" style="shape=partialRectangle;connectable=0;fillColor=none;top=0;left=1;bottom=0;right=0;align=left;spacingLeft=8;{nstyle}overflow=hidden;whiteSpace=wrap;html=1;strokeColor={stroke};" vertex="1" parent="{rid}"><mxGeometry x="{KW}" width="{NW}" height="{RH}" as="geometry"><mxRectangle width="{NW}" height="{RH}" as="alternateBounds"/></mxGeometry></mxCell>')
    return out, h

def edge_xml(eid, a, card, b, label, straight=False):
    left, right = card[:2], card[-2:]
    dashed = '..' in card
    if a == b:
        style = f'edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=1;exitY=0.25;entryX=1;entryY=0.75;'
    elif straight:
        style = 'edgeStyle=none;rounded=0;html=1;'
    else:
        style = 'edgeStyle=entityRelationEdgeStyle;rounded=0;html=1;'
    style += f'startArrow={LEFT[left]};endArrow={RIGHT[right]};startFill=0;endFill=0;fontSize=11;labelBackgroundColor=#ffffff;' + ('dashed=1;' if dashed else '')
    return f'<mxCell id="{eid}" value="{escape(label)}" style="{style}" edge="1" parent="1" source="{a}" target="{b}"><mxGeometry relative="1" as="geometry"/></mxCell>'

def page(pid, title, placements, rels):
    cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    boxes = []
    for (name, x, y, ref, label) in placements:
        if label:
            cells.append(f'<mxCell id="{pid}_lbl_{name}" value="{escape(label)}" style="text;html=1;fontSize=16;fontStyle=1;align=left;verticalAlign=bottom;" vertex="1" parent="1"><mxGeometry x="{x}" y="{y - 46}" width="{TW + 40}" height="36" as="geometry"/></mxCell>')
        fill, stroke = COLORS[OWNER[name]].split('|')
        cols = E[name]
        if ref:
            cols = [c for c in cols if c[1].startswith('PK')][:1]
            fill, stroke = '#ffffff', '#999999'
        xml, h = table_xml(f'{pid}_{name}', name, cols, x, y, fill, stroke, ref)
        cells += xml
        boxes.append((name, x, y, h, ref, fill, stroke, cols))
    for i, (a, c, b, l) in enumerate(rels):
        cells.append(edge_xml(f'{pid}_e{i}', f'{pid}_{a}', c, f'{pid}_{b}', l, straight=(pid == 'full')))
    body = ''.join(cells)
    return f'<diagram id="{pid}" name="{escape(title)}"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0"><root>{body}</root></mxGraphModel></diagram>', boxes

def full_layout():
    import random, math
    random.seed(11)
    names = list(E)
    COLS, ROWS = 6, 5
    PX, PY = TW + 150, 430
    hgt = {n: HH + RH * len(E[n]) for n in names}
    cells = [(c, r) for r in range(ROWS) for c in range(COLS)]
    edges = [(a, b) for a, _, b, _ in R if a != b]
    def rect(n, cell):
        c, r = cell
        return (c * PX, r * PY, c * PX + TW, r * PY + hgt[n])
    def center(n, cell):
        x1, y1, x2, y2 = rect(n, cell); return ((x1 + x2) / 2, (y1 + y2) / 2)
    def seg_rect(p, q, rc):
        x1, y1, x2, y2 = rc[0] - 12, rc[1] - 12, rc[2] + 12, rc[3] + 12
        for k in range(1, 40):
            t = k / 40
            x = p[0] + (q[0] - p[0]) * t; y = p[1] + (q[1] - p[1]) * t
            if x1 <= x <= x2 and y1 <= y <= y2:
                return True
        return False
    def ccw(A, B, C):
        return (C[1]-A[1])*(B[0]-A[0]) > (B[1]-A[1])*(C[0]-A[0])
    def cross(s1, s2):
        A, B = s1; C, D = s2
        return ccw(A, C, D) != ccw(B, C, D) and ccw(A, B, C) != ccw(A, B, D)
    def cost(pos):
        ctr = {n: center(n, pos[n]) for n in names}
        rc = {n: rect(n, pos[n]) for n in names}
        segs = []; c = 0.0
        for a, b in edges:
            p, q = ctr[a], ctr[b]
            c += 1.6 * math.hypot(p[0] - q[0], (p[1] - q[1]) * 1.2) / PX
            for n in names:
                if n not in (a, b) and seg_rect(p, q, rc[n]):
                    c += 80
            segs.append((a, b, p, q))
        for i in range(len(segs)):
            for j in range(i + 1, len(segs)):
                a1, b1, p1, q1 = segs[i]; a2, b2, p2, q2 = segs[j]
                if {a1, b1} & {a2, b2}:
                    continue
                if cross((p1, q1), (p2, q2)):
                    c += 8
        return c
    MANUAL = {
        'ASSESSMENT': (0, 0), 'ACTIVITY_ATTEMPT': (1, 0), 'STUDENT': (2, 0), 'USER': (3, 0), 'MERIT_FORMULA': (4, 0), 'SUPPORT_TICKET': (5, 0),
        'ACTIVITY': (0, 1), 'ACADEMIC_RECORD': (1, 1), 'RECOMMENDATION': (2, 1), 'SAVED_PROGRAM': (3, 1), 'ROADMAP': (4, 1),
        'RECORD_SUBJECT': (1, 2), 'PROGRAM': (2, 2), 'ROADMAP_STEP': (3, 2), 'REQUIREMENT': (4, 2), 'ADMISSION_STAT': (5, 2),
        'FIELD': (0, 3), 'SUBJECT': (1, 3), 'PROGRAM_FIELD': (2, 3), 'INSTITUTION': (3, 3), 'REQUIREMENT_RULE': (4, 3), 'DATA_SOURCE': (5, 3),
        'CAREER': (0, 4), 'PROGRAM_PATHWAY': (2, 4),
    }
    best = None
    for restart in range(3):
        pos = dict(MANUAL)
        empty = [c for c in cells if c not in pos.values()]
        cur = cost(pos); T = 3.0 if restart else 0.0001
        for it in range(5000):
            a = random.choice(names)
            if empty and random.random() < 0.35:
                k = random.randrange(len(empty)); old = pos[a]
                pos[a] = empty[k]; empty[k] = old
                nc = cost(pos)
                if nc <= cur or random.random() < math.exp((cur - nc) / T):
                    cur = nc
                else:
                    empty[k] = pos[a]; pos[a] = old
            else:
                b = random.choice(names)
                if a == b: continue
                pos[a], pos[b] = pos[b], pos[a]
                nc = cost(pos)
                if nc <= cur or random.random() < math.exp((cur - nc) / T):
                    cur = nc
                else:
                    pos[a], pos[b] = pos[b], pos[a]
            T = max(0.05, T * 0.9991)
        if best is None or cur < best[0]:
            best = (cur, dict(pos))
    pos = best[1]
    ctr = {n: center(n, pos[n]) for n in names}; rc = {n: rect(n, pos[n]) for n in names}
    for a, b in edges:
        hit = [n for n in names if n not in (a, b) and seg_rect(ctr[a], ctr[b], rc[n])]
        if hit: print('  melalui:', a, '->', b, hit)
    used_c = sorted({c for c, _ in pos.values()}); used_r = sorted({r for _, r in pos.values()})
    cmap = {c: i for i, c in enumerate(used_c)}; rmap = {r: i for i, r in enumerate(used_r)}
    print('layout cost', round(best[0], 1))
    return [(n, cmap[c] * PX, 40 + rmap[r] * PY, False, None) for n, (c, r) in pos.items()]

def module_layout(owned):
    rels = [r for r in R if r[2] in owned]
    refs = []
    for a, _, b, _ in rels:
        for x in (a, b):
            if x not in owned and x not in refs:
                refs.append(x)
    pl = []
    y = 60
    for i, t in enumerate(refs):
        pl.append((t, 0, y, True, 'Referenced' if i == 0 else None))
        y += HH + RH + 60
    cols = [[], []]
    for i, t in enumerate(owned):
        cols[i % 2].append(t)
    for ci, col in enumerate(cols):
        x = (TW + 160) * (ci + 1)
        y = 60
        for j, t in enumerate(col):
            pl.append((t, x, y, False, 'Owned by module' if (ci == 0 and j == 0) else None))
            y += HH + RH * len(E[t]) + 80
    return pl, rels

pages = []
previews = []
xml, boxes = page('full', 'Full ERD', full_layout(), R)
pages.append(xml); previews.append(('full', boxes, R))
for slug, title, owned in M:
    pl, rels = module_layout(owned)
    xml, boxes = page(slug.replace('-', '_'), f'{slug[:2]} {title}', pl, rels)
    pages.append(xml); previews.append((slug, boxes, rels))

doc = '<mxfile host="app.diagrams.net">' + ''.join(pages) + '</mxfile>'
open(os.path.join(OUT, 'edulaunch-erd.drawio'), 'w', encoding='utf-8').write(doc)

# ---- PNG preview (layout check only)
try:
    if '--preview' not in sys.argv:
        raise ImportError
    from PIL import Image, ImageDraw, ImageFont
    font = ImageFont.load_default()
    os.makedirs(os.path.join(OUT, 'png-drawio'), exist_ok=True)
    for slug, boxes, rels in previews:
        W = max(b[1] for b in boxes) + TW + 40
        H = max(b[2] + b[3] for b in boxes) + 40
        img = Image.new('RGB', (int(W), int(H)), 'white')
        d = ImageDraw.Draw(img)
        pos = {b[0]: b for b in boxes}
        for a, c, bb, l in rels:
            A, B = pos[a], pos[bb]
            p1 = (A[1] + TW / 2, A[2] + A[3] / 2); p2 = (B[1] + TW / 2, B[2] + B[3] / 2)
            d.line([p1, p2], fill='#bbbbbb', width=1)
        for name, x, y, h, ref, fill, stroke, cols in boxes:
            d.rectangle([x, y, x + TW, y + h], fill=fill, outline=stroke)
            d.text((x + 8, y + 10), name, fill='black', font=font)
            for i, (cname, k) in enumerate(cols):
                yy = y + HH + RH * i
                d.line([x, yy, x + TW, yy], fill=stroke)
                d.line([x + KW, yy, x + KW, yy + RH], fill=stroke)
                d.text((x + 8, yy + 8), k.replace(', ', ','), fill='black', font=font)
                d.text((x + KW + 8, yy + 8), cname, fill='black', font=font)
        img.save(os.path.join(OUT, 'png-drawio', f'{slug}.png'))
except ImportError:
    pass
print('pages', len(pages))
