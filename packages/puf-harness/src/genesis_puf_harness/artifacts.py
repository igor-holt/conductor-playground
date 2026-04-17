from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

BLOCKED_PATTERNS = ("API_KEY", "SECRET", "PRIVATE_KEY", "password", "token", "K_phys", "helper_bytes")


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def safe_dump_json(path: Path, payload: dict[str, Any]) -> None:
    text = json.dumps(payload, indent=2, sort_keys=True)
    ensure_no_sensitive_patterns(text)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text + "\n", encoding="utf-8")


def ensure_no_sensitive_patterns(text: str) -> None:
    lowered = text.lower()
    for pattern in BLOCKED_PATTERNS:
        if pattern.lower() in lowered:
            raise ValueError(f"blocked pattern detected: {pattern}")
