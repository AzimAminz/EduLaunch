# EduLaunch documentation

| Document | What it covers |
|---|---|
| [edulaunch-guide.md](edulaunch-guide.md) | **Start here.** Plain-language guide to the whole system, with 12 student and admin scenarios |
| [setup.md](setup.md) | Run EduLaunch on your computer, step by step |
| [testing/manual-checklist.md](testing/manual-checklist.md) | Checks to do by hand in the browser after each step |
| [architecture.md](architecture.md) | How the five services, gateway, database schemas and events fit together |
| [system-design.md](system-design.md) | Roles, architecture, the ten modules, data flows, API outline, security, testing |
| [ai-and-cost-plan.md](ai-and-cost-plan.md) | Recommendation, offer-chance prediction, content collection, model choices, keeping cost near zero |
| [roadmap.md](roadmap.md) | Now / Next / Later, sprint plan, priorities, risks, success measures |
| [diagrams/erd/](diagrams/erd/) | ERD (24 tables; technical tables such as chat history, search chunks, notifications and audit log are left out): `edulaunch-erd.drawio` (full + one page per module), Mermaid files, PNG previews |
| [diagrams/decomposition/](diagrams/decomposition/) | Functional decomposition: 10 modules × 5 functions |
| [design/figma-design-log.md](design/figma-design-log.md) | Design log for the Figma file (Malay) |
| [design/brand/](design/brand/) | Logo and brand images |

## Roles

Only **Student** and **Admin**. There are no parent, guardian or counsellor accounts.

## Regenerating the diagrams

The diagrams are generated from code, so they stay consistent. Edit the tables in `docs/diagrams/scripts/gen_erd.py` or the modules in `docs/diagrams/scripts/gen_decomp.py`, then run from the project root:

```bash
python3 docs/diagrams/scripts/gen_erd.py docs/diagrams/erd
python3 docs/diagrams/scripts/gen_drawio.py docs/diagrams/erd           # about 1–2 minutes (layout search)
python3 docs/diagrams/scripts/gen_decomp.py docs/diagrams/decomposition
```

PNG previews of the Mermaid files can be rendered with `npx @mermaid-js/mermaid-cli -i <file>.mmd -o <file>.png`.

Open `.drawio` files with draw.io → File → Open from → Device. Copy Mermaid code from the files rather than retyping it: each attribute line starts with an invisible character that Mermaid needs.
