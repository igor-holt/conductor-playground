from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class HarnessConfig:
    node_id: str = "hotpocket-local"
    challenge_size: int = 16_384
    memory_seed_dim: int = 128
    memory_geom_dim: tuple[int, int] = (128, 256)
    drift_limit: float = 1.0e-6
    rng_audit_seed: int = 42
    capsule_path: Path = Path.home() / ".genesis" / "soul-capsule-v1.jsonl"
    policy_tier: str = "etp_sealed"


DEFAULT_CONFIG = HarnessConfig()
