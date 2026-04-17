from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .artifacts import safe_dump_json
from .config import DEFAULT_CONFIG, HarnessConfig


def verify_probe(
    output_dir: Path,
    config: HarnessConfig = DEFAULT_CONFIG,
    *,
    intruder: bool = False,
) -> dict[str, Any]:
    if intruder:
        status = {
            "device_id": config.node_id,
            "state": "SIM_DRIFT_ALERT",
            "last_verified_at": datetime.now(tz=UTC).isoformat(),
            "notes": [
                "Probe verification failed closed.",
                "No drift magnitude disclosed for intruder path.",
            ],
        }
    else:
        status = {
            "device_id": config.node_id,
            "state": "SIM_DRIFT_OK",
            "last_verified_at": datetime.now(tz=UTC).isoformat(),
            "notes": [
                "Hash-only capsule emission enabled.",
                "Remote dispatch disabled by etp_sealed policy tier.",
            ],
        }

    safe_dump_json(output_dir / "puf-probe-status.json", status)
    return status
