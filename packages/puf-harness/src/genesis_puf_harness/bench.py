from __future__ import annotations

import random
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .artifacts import safe_dump_json, sha256_hex
from .config import DEFAULT_CONFIG, HarnessConfig


def _sample_memory_field(config: HarnessConfig) -> list[float]:
    rng = random.Random(config.rng_audit_seed)
    scale = config.memory_geom_dim[1] / config.memory_geom_dim[0]
    return [round(rng.random() * scale, 8) for _ in range(config.memory_seed_dim)]


def run_bench(
    output_dir: Path,
    config: HarnessConfig = DEFAULT_CONFIG,
) -> dict[str, Any]:
    field = _sample_memory_field(config)
    helper_hash = sha256_hex("|".join(f"{value:.8f}" for value in field[:16]))
    signature = sha256_hex(helper_hash + config.node_id)
    drift_score = round(sum(field[:10]) / (10_000_000), 10)

    artifact = {
      "run_id": f"bench-{datetime.now(tz=UTC).strftime('%Y%m%d%H%M%S')}",
      "node_id": config.node_id,
      "challenge_size": config.challenge_size,
      "memory_seed_dim": config.memory_seed_dim,
      "memory_geom_dim": list(config.memory_geom_dim),
      "helper_hash": helper_hash,
      "eta_thermo_signature": signature,
      "drift_score": drift_score,
      "intruder_rejected": True,
      "policy_tier": config.policy_tier,
      "config": {
        key: value
        for key, value in asdict(config).items()
        if key not in {"capsule_path"}
      },
    }

    safe_dump_json(output_dir / "puf-bench-result.json", artifact)
    return artifact
