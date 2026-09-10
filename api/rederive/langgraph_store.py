# File: api/rederive/langgraph_store.py
"""Deepest framework integration (D-16): the dossier pipeline as a LangGraph StateGraph whose
persistence layer is Sibyl through the official sibyl-memory-langgraph BaseStore adapter.
Each node's derive still routes through engine.derive() so NN-1..NN-8 hold; LangGraph owns
orchestration, Sibyl owns the store. CUT-order item 1 (DT-9) — the bespoke run_graph is the fallback."""
from __future__ import annotations
from .engine import Engine
from .pipeline import dossier_graph
try:
    from sibyl_memory_langgraph import SibylStore           # BaseStore adapter (brief §6)
    from langgraph.graph import StateGraph, END
    HAVE_LANGGRAPH = True
except Exception:                                            # adapter/langgraph absent → engine fallback
    HAVE_LANGGRAPH = False

def build_langgraph(engine: Engine):
    if not HAVE_LANGGRAPH:
        return None
    store = SibylStore(engine._m)                            # Sibyl backs the LangGraph store
    sg = StateGraph(dict)
    graph = dossier_graph()
    prev = None
    for node, refs, fn in graph:
        def step(state, node=node, refs=refs, fn=fn):
            val, verdict = engine.derive(node, refs, fn)
            return {**state, node: {"value": val, "verdict": verdict}}
        sg.add_node(node, step)
        if prev: sg.add_edge(prev, node)
        prev = node
    sg.set_entry_point(graph[0][0]); sg.add_edge(prev, END)
    return sg.compile(store=store)
