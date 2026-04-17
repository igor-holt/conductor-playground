from __future__ import annotations

import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
NOTEBOOKS = [
    REPO_ROOT / "notebooks" / "retraining-eval-ablation.ipynb",
    REPO_ROOT / "notebooks" / "puf-sim-validation.ipynb",
]


def execute_notebook(path: Path) -> None:
    namespace = {"__name__": "__main__"}
    data = json.loads(path.read_text(encoding="utf-8"))
    for cell in data.get("cells", []):
      if cell.get("cell_type") != "code":
          continue
      source = "".join(cell.get("source", []))
      exec(compile(source, str(path), "exec"), namespace, namespace)


def main() -> None:
    for notebook in NOTEBOOKS:
        if not notebook.exists():
            raise SystemExit(f"missing notebook: {notebook}")
        execute_notebook(notebook)
        print(f"executed {notebook.name}")


if __name__ == "__main__":
    main()
