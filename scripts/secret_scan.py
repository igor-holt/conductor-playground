from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
ALLOWLIST = {".env.example", "docs/notion-research-report.md", "docs/notion-implementation-plan.md"}
PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9]{16,}"),
    re.compile(r"BEGIN [A-Z ]*PRIVATE KEY"),
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
]


def tracked_files() -> list[Path]:
    output = subprocess.check_output(["git", "ls-files"], cwd=REPO_ROOT, text=True)
    return [REPO_ROOT / line for line in output.splitlines() if line]


def main() -> None:
    violations: list[str] = []
    for path in tracked_files():
        rel = path.relative_to(REPO_ROOT).as_posix()
        if rel in ALLOWLIST or "node_modules" in rel or rel.startswith(".context/"):
            continue
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pattern in PATTERNS:
            if pattern.search(text):
                violations.append(f"{rel}: {pattern.pattern}")

    if violations:
        print("\n".join(violations))
        sys.exit(1)

    print("secret scan clean")


if __name__ == "__main__":
    main()
