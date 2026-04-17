from __future__ import annotations

import json
from pathlib import Path

from genesis_puf_harness import run_bench, verify_probe


def read_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def test_run_bench_emits_hash_only_artifact(tmp_path: Path) -> None:
    artifact = run_bench(tmp_path)
    output = read_json(tmp_path / "puf-bench-result.json")

    assert output["helper_hash"] == artifact["helper_hash"]
    assert "K_phys" not in json.dumps(output)
    assert "helper_bytes" not in json.dumps(output)
    assert artifact["intruder_rejected"] is True


def test_verify_probe_fails_closed_for_intruder_path(tmp_path: Path) -> None:
    status = verify_probe(tmp_path, intruder=True)
    output = read_json(tmp_path / "puf-probe-status.json")

    assert status["state"] == "SIM_DRIFT_ALERT"
    assert output["notes"][1] == "No drift magnitude disclosed for intruder path."
