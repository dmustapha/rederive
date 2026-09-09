# File: api/tests/test_fuzz.py
import random, tempfile
from rederive.engine import Engine, RunReport, h

def fuzz_round(rng, r):
    db = tempfile.mktemp(suffix=".db"); eng = Engine(db_path=db, tenant="t")
    n_src, n_der = rng.randint(3, 6), rng.randint(4, 10)
    sources = {f"s{i}": f"content-{i}-v0" for i in range(n_src)}
    for k, v in sources.items(): eng.ingest_source(k, v)
    dag = {}
    for j in range(n_der):
        deps = [f"source:{rng.choice(list(sources))}" for _ in range(rng.randint(1, 3))]
        if j > 0: deps += [f"derivation:d{rng.randrange(j)}" for _ in range(rng.randint(0, 2))]
        dag[f"d{j}"] = sorted(set(deps))
    fn = lambda vals: "|".join(f"{k}={h(str(v))[:6]}" for k, v in sorted(vals.items()))
    graph = [(node, deps, fn) for node, deps in dag.items()]
    def run_all(e):
        out = {}
        for node, deps, f in graph: out[node], _ = e.derive(node, deps, f)
        return out
    run_all(eng)
    edited = rng.sample(list(sources), rng.randint(1, 2))
    for s in edited: eng.ingest_source(s, f"content-{s}-EDITED-r{r}")
    after = run_all(eng)
    db2 = tempfile.mktemp(suffix=".db"); eng2 = Engine(db_path=db2, tenant="t")
    for k in sources:
        eng2.ingest_source(k, f"content-{k}-EDITED-r{r}" if k in edited else sources[k])
    truth = run_all(eng2)
    assert after == truth, f"round {r}: cached pipeline diverged from ground truth"

def test_fuzz_25_rounds():
    rng = random.Random(42)
    for r in range(25): fuzz_round(rng, r)
