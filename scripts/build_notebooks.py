from __future__ import annotations

import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
NOTEBOOK_DIR = REPO_ROOT / "notebooks"


def scaffold(kind: str, title: str, output_path: Path) -> None:
    notebook = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3",
            },
            "language_info": {"name": "python", "version": "3.11.0"},
        },
        "cells": [],
    }
    output_path.write_text(json.dumps(notebook, indent=2) + "\n", encoding="utf-8")


def write_notebook(path: Path, cells: list[dict[str, object]]) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    data["cells"] = cells
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def build_retraining_notebook(path: Path) -> None:
    cells = [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# Experiment: Retraining Eval Ablation\n",
                "\n",
                "Objective:\n",
                "- Compare baseline and candidate cycle outcomes.\n",
                "- Quantify the grader deltas that matter for phase-1 promotion safety.\n",
            ],
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "from __future__ import annotations\n",
                "\n",
                "import statistics\n",
                "\n",
                "baseline = [0.93, 0.91, 0.92]\n",
                "candidate = [0.79, 0.72, 0.73]\n",
                "delta = statistics.mean(candidate) - statistics.mean(baseline)\n",
                "summary = {\n",
                "    'baseline_avg': round(statistics.mean(baseline), 3),\n",
                "    'candidate_avg': round(statistics.mean(candidate), 3),\n",
                "    'mean_delta': round(delta, 3),\n",
                "}\n",
                "summary\n",
            ],
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Vital Signals\n",
                "\n",
                "- If `mean_delta` falls below `-0.10`, the watchdog window should be reviewed.\n",
                "- Treat `chemical_name` and `llm_judge` as the load-bearing graders.\n",
            ],
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "grader_scores = {\n",
                "    'chemical_name': [0.74, 0.75, 0.77],\n",
                "    'llm_judge': [0.69, 0.71, 0.70],\n",
                "}\n",
                "risk_flags = {\n",
                "    grader: round(statistics.mean(scores), 3) < 0.85\n",
                "    for grader, scores in grader_scores.items()\n",
                "}\n",
                "risk_flags\n",
            ],
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Outcome\n",
                "\n",
                "The seeded data intentionally lands in rollback territory so the notebook stays aligned with the worker tests.\n",
            ],
        },
    ]
    write_notebook(path, cells)


def build_puf_notebook(path: Path) -> None:
    cells = [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# Tutorial: eta_thermo Sim Validation\n",
                "\n",
                "Audience:\n",
                "- Operators validating the sim-first harness before physical-device rollout.\n",
                "\n",
                "Learning goals:\n",
                "- Confirm the harness emits hash-only artifacts.\n",
                "- Confirm intruder paths fail closed.\n",
            ],
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "from __future__ import annotations\n",
                "\n",
                "import json\n",
                "import sys\n",
                "import tempfile\n",
                "from pathlib import Path\n",
                "\n",
                "sys.path.insert(0, str(Path.cwd() / 'packages' / 'puf-harness' / 'src'))\n",
                "\n",
                "from genesis_puf_harness import run_bench, verify_probe\n",
                "\n",
                "tmp_dir = Path(tempfile.mkdtemp(prefix='eta-thermo-'))\n",
                "bench = run_bench(tmp_dir)\n",
                "probe = verify_probe(tmp_dir)\n",
                "bench, probe['state']\n",
            ],
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## Safety Checks\n",
                "\n",
                "The artifact must never include `K_phys`, helper bytes, or a raw signing key.\n",
            ],
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "artifact_text = (tmp_dir / 'puf-bench-result.json').read_text(encoding='utf-8')\n",
                "all(term not in artifact_text for term in ('K_phys', 'helper_bytes', 'PRIVATE_KEY'))\n",
            ],
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "intruder = verify_probe(tmp_dir, intruder=True)\n",
                "intruder['notes']\n",
            ],
        },
    ]
    write_notebook(path, cells)


def main() -> None:
    NOTEBOOK_DIR.mkdir(parents=True, exist_ok=True)

    retraining_path = NOTEBOOK_DIR / "retraining-eval-ablation.ipynb"
    puf_path = NOTEBOOK_DIR / "puf-sim-validation.ipynb"

    scaffold("experiment", "Retraining Eval Ablation", retraining_path)
    scaffold("tutorial", "eta_thermo Sim Validation", puf_path)

    build_retraining_notebook(retraining_path)
    build_puf_notebook(puf_path)

    print(f"Generated {retraining_path}")
    print(f"Generated {puf_path}")


if __name__ == "__main__":
    main()
