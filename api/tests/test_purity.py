# File: api/tests/test_purity.py
import inspect
import pytest

# DEFERRED-UNTIL-C2: depends on pipeline.py (built at C2). Skip cleanly until it exists.
pytest.importorskip("rederive.pipeline", reason="pipeline.py wired at C2 (NN-1 purity gate)")

from rederive.pipeline import EXTRACTORS, METRIC_FNS, SYNTH_FNS  # noqa: E402

ALLOWED = (str, list, type(None))

def test_derive_fns_pure():
    for name, fn in {**EXTRACTORS, **METRIC_FNS, **SYNTH_FNS}.items():
        sig = inspect.signature(fn)
        assert list(sig.parameters) == ["values"], f"{name}: must take values only"
        for cell in (fn.__closure__ or []):
            assert isinstance(cell.cell_contents, ALLOWED), \
                f"{name}: closure holds {type(cell.cell_contents)} — config only (str/list/None)"
