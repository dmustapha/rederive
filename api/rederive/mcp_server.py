# File: api/rederive/mcp_server.py
"""Ecosystem integration (D-17): a stdio MCP server exposing Rederive's derivations to any MCP
client (Claude Code/Cursor). Tools: recall(q), get_derivation(node), list_nodes. Mirrors the
sibyl-memory-mcp tool surface so the same client that recalls Sibyl memories recalls ours.
CUT-order item 2 (DT-9). Requires `mcp` (pip)."""
from __future__ import annotations
from .engine import Engine
from .pipeline import dossier_graph, SOURCES
try:
    from mcp.server.fastmcp import FastMCP
    mcp = FastMCP("rederive")
    engine = Engine()
    # DEV-001: full recall surface = 6 source nodes + 24 derivations = 30 (PLAN CX.2).
    # dossier_graph() lists only the 24 derivations; sources are inputs referenced as source:<s>.
    # Expose both so an MCP client can recall every Rederive node (matches the 30-node gate).
    GRAPH_NODES = [f"source:{s}" for s in SOURCES] + [n for n, _r, _f in dossier_graph()]

    @mcp.tool()
    def recall(q: str, limit: int = 10) -> list:
        """FTS5 recall over Rederive derivations + provenance + doctrine."""
        return engine.recall(q, limit)

    @mcp.tool()
    def get_derivation(node: str) -> dict:
        """Return a stored derivation's value + provenance edges."""
        return engine.get_derivation(node)

    @mcp.tool()
    def list_nodes() -> list:
        """List all dossier graph nodes."""
        return GRAPH_NODES

    def main(): mcp.run(transport="stdio")
except Exception:                                            # mcp absent → module import no-ops (cut)
    def main(): raise SystemExit("mcp package not installed (D-17 cut)")
