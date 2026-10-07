"""Writes the decision-flow and timeline diagrams into diagrams/, from their sources.

Sources: mocks_b1.py, mocks_b2.py, mocks_power.py. Each builds its SVGs into an OUT dict."""
import io, contextlib, sys
sys.path.insert(0, ".")
with contextlib.redirect_stdout(io.StringIO()):
    import mocks_b1, mocks_b2, mocks_power
NAMES = {
    "m1-status": "status-tree", "m2a-dispatch": "afterhours-dispatch", "m2b-escalation": "afterhours-escalation",
    "m3-pickup": "pmd-pickup", "m5-routing": "routing", "m7-waivers": "waivers", "m8a-death": "death-call",
    "m8b-swap": "swap-out", "m9-rental": "rental-timeline", "m10-costshare": "cost-share", "m11-resupply": "resupply-windows",
    "m12-eligibility": "eligibility-status", "p2-panels": "power-process",
}
ALL = {**mocks_b1.OUT, **mocks_b2.OUT, **mocks_power.OUT}
for src, name in NAMES.items():
    open(f"diagrams/{name}.svg", "w").write(ALL[src])
    print(f"diagrams/{name}.svg  {len(ALL[src]):,} bytes")
