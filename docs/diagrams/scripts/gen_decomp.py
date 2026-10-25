"""Builds the functional decomposition diagram (draw.io + Mermaid).

Usage: python3 docs/diagrams/scripts/gen_decomp.py docs/diagrams/decomposition
"""
import os, sys
from xml.sax.saxutils import escape
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

ROOT = 'EduLaunch Platform'
MODULES = [
 ('Identity & Access', ['Create an account', 'Log in and reset password', 'Choose your education level', 'Edit your profile', 'Export or delete your data']),
 ('Academic Profile', ['Upload a result slip', 'Fix only the flagged grades', 'Add or remove subjects', 'Enter results by hand', 'Move up a level when results are out']),
 ('Programme Catalogue', ['Search by university and field', 'Filter by study level', 'View programme details', 'Compare programmes', 'Save programmes']),
 ('Eligibility & Prediction', ['Check entry requirements', 'Calculate merit', 'Estimate offer chance', 'Show what is missing (what-if)', 'Suggest alternative pathways']),
 ('Self Discovery', ['Take the interest test', 'Try short field activities', 'Rate each activity', 'See your interest profile', 'Get a Form 4 stream suggestion']),
 ('Recommendation & AI', ['Rank programmes for you', 'Explain each recommendation', 'Highlight the top match', 'Update when your profile changes', 'Answer questions with sources']),
 ('Study & Career Planning', ['Build a roadmap for your level', 'Form 1–3: stream to SPM to field', 'Diploma: work now or continue', 'Show careers for each field', 'Track next actions and versions']),
 ('Content Pipeline', ['Keep a list of official sources', 'Check sources every week', 'Detect what changed', 'Draft requirements with AI', 'Prepare text for search']),
 ('Notifications & Support', ['Alert on requirement changes', 'Remind about result release', 'Contact support', 'Report wrong data', 'Track ticket status']),
 ('Administration', ['Manage universities and programmes', 'Manage requirements and merit', 'Review and publish AI drafts', 'Manage admin accounts', 'View the audit log']),
]
COLORS = ['#dae8fc|#6c8ebf', '#d5e8d4|#82b366', '#fff2cc|#d6b656', '#f8cecc|#b85450', '#e1d5e7|#9673a6',
          '#d0efef|#4a9e9e', '#ffe6cc|#d79b00', '#fce4ec|#c2185b', '#eeeeee|#777777', '#e6e6ff|#6666cc']

# ---------- draw.io ----------
PITCH, L1W, L1H, LW, LH = 250, 220, 60, 196, 50
cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
total = PITCH * (len(MODULES) - 1) + L1W
rootw = 300
cells.append(f'<mxCell id="root" value="{escape(ROOT)}" style="rounded=1;whiteSpace=wrap;html=1;fontStyle=1;fontSize=18;fillColor=#142747;fontColor=#ffffff;strokeColor=#142747;" vertex="1" parent="1"><mxGeometry x="{(total - rootw) / 2}" y="0" width="{rootw}" height="64" as="geometry"/></mxCell>')
edge = 0
for i, (name, funcs) in enumerate(MODULES):
    fill, stroke = COLORS[i].split('|')
    x = i * PITCH
    mid = f'm{i}'
    cells.append(f'<mxCell id="{mid}" value="{i + 1}.0  {escape(name)}" style="rounded=1;whiteSpace=wrap;html=1;fontStyle=1;fontSize=14;fillColor={fill};strokeColor={stroke};strokeWidth=2;" vertex="1" parent="1"><mxGeometry x="{x}" y="150" width="{L1W}" height="{L1H}" as="geometry"/></mxCell>')
    cells.append(f'<mxCell id="e{edge}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=none;strokeColor=#142747;exitX=0.5;exitY=1;entryX=0.5;entryY=0;" edge="1" parent="1" source="root" target="{mid}"><mxGeometry relative="1" as="geometry"/></mxCell>'); edge += 1
    for j, f in enumerate(funcs):
        fid = f'f{i}_{j}'
        y = 150 + L1H + 30 + j * (LH + 22)
        cells.append(f'<mxCell id="{fid}" value="{i + 1}.{j + 1}  {escape(f)}" style="rounded=1;whiteSpace=wrap;html=1;fontSize=12;align=left;spacingLeft=10;fillColor=#ffffff;strokeColor={stroke};" vertex="1" parent="1"><mxGeometry x="{x + 24}" y="{y}" width="{LW}" height="{LH}" as="geometry"/></mxCell>')
        cells.append(f'<mxCell id="e{edge}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=none;strokeColor={stroke};exitX=0.06;exitY=1;entryX=0;entryY=0.5;" edge="1" parent="1" source="{mid}" target="{fid}"><mxGeometry relative="1" as="geometry"/></mxCell>'); edge += 1
xml = '<mxfile host="app.diagrams.net"><diagram id="decomp" name="Decomposition"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0"><root>' + ''.join(cells) + '</root></mxGraphModel></diagram></mxfile>'
open(os.path.join(OUT, 'edulaunch-decomposition.drawio'), 'w', encoding='utf-8').write(xml)

# ---------- Mermaid ----------
m = ['flowchart TD', f'    ROOT["{ROOT}"]']
for i, (name, funcs) in enumerate(MODULES):
    m.append(f'    subgraph M{i + 1}["{i + 1}.0 {name}"]')
    m.append('        direction TB')
    ids = [f'F{i + 1}_{j + 1}' for j in range(len(funcs))]
    for nid, f, j in zip(ids, funcs, range(len(funcs))):
        m.append(f'        {nid}["{i + 1}.{j + 1} {f}"]')
    m.append('        ' + ' ~~~ '.join(ids))
    m.append('    end')
for i in range(len(MODULES)):
    m.append(f'    ROOT --- M{i + 1}')
m.append('    style ROOT fill:#142747,color:#ffffff,stroke:#142747')
for i, c in enumerate(COLORS):
    fill, stroke = c.split('|')
    m.append(f'    style M{i + 1} fill:{fill},stroke:{stroke},stroke-width:2px')
    for j in range(len(MODULES[i][1])):
        m.append(f'    style F{i + 1}_{j + 1} fill:#ffffff,stroke:{stroke}')
open(os.path.join(OUT, 'edulaunch-decomposition.mmd'), 'w', encoding='utf-8').write('\n'.join(m) + '\n')
print('modules', len(MODULES), 'functions', sum(len(f) for _, f in MODULES))
