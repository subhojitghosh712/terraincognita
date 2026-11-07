# Reproduce the neuron-steering measurements

These scripts reproduce the measurements behind the app. They are separate from the web server and require the full Apple Silicon / MLX installation described in the [main README](../README.md). They do not train the model or change its stored weights.

The archived evidence in [`../docs/reproduction/`](../docs/reproduction/) was measured on 7 November 2026 on an Apple M1 Mac with 8 GB unified memory. Packaging these scripts for the repository did not rerun that experiment. The original JSON records remain unchanged.

## Setup

From the repository root, complete the main installation and model download, then install the additional memory-measurement dependency:

```sh
.venv/bin/python -m pip install -r research/requirements.txt
```

The research scripts use `MODEL_DIR` from the app's root `config.py`. By default this is `models/qwen3.5-4b-4bit`; the same `UNCHARTED_MODEL_DIR` override supported by the app applies here. The pinned checkpoint and vendored reference hash are checked before inference.

Stop the web server before running these scripts so that the Mac does not hold two copies of the model in memory. Full reproduction includes calibration and can take several minutes.

## Full reproduction

```sh
.venv/bin/python research/run_experiment.py
```

This runs 24 generations across baseline, the two-neuron pair, A alone, B alone, a half-dose pair, and a reset control. It also computes the original single-passage perplexity diagnostic and records memory/timing measurements. The default response cap is 90 new tokens, matching the archived experiment. A different cap can be requested with `--max-tokens 128`, but those measurements are a different experimental setting.

New files are written to **`research/runs/`**, which is excluded from Git:

- `results.json`: full outputs, token IDs, settings and measurements.
- `progress.jsonl`: progress and resource observations.

Running again replaces `results.json` and appends to the progress log. Copy those files elsewhere first if you want to retain a previous local run. No archived evidence under `docs/reproduction/` is overwritten.

## Six-response brevity experiment

```sh
.venv/bin/python research/test_brevity.py
```

This uses the archived calibration by default and requests short responses from both conditions. Its new output is `research/runs/brevity-results.json`. To use calibration from your latest full reproduction:

```sh
.venv/bin/python research/test_brevity.py --baseline-results research/runs/results.json
```

The script records whitespace word counts and whether generation stopped naturally. It does not shorten, rewrite, or retry the output. Each rerun replaces the previous local brevity result.

## What is included

- `run_experiment.py` and `test_brevity.py`: the project's experiment harnesses, adapted to the portable repository paths.
- `published_reproduction.py`: an unchanged copy of occcat's `steer_qwen35.py` at commit `76a1020cfe53dcf512fc7cb98f8392eddd34b7f8`.
- `REFERENCE_LICENSE`: the exact upstream MIT license, copyright © 2026 occcat.
- `requirements.txt`: the main app requirements plus `psutil` for memory measurements.

See [third-party notices](../THIRD_PARTY_NOTICES.md) for source and model attribution. The historical `requirements.lock.txt` under `docs/reproduction/` records the original environment; it is evidence, not the recommended installation entry point.

## Interpretation

The archived experiment is a small qualitative reproduction, not a broad capability or safety evaluation. Timing and exact outputs may vary across hardware and software environments. Hostile, repetitive, or confusing text is possible. Changes caused by intervention are evidence of influence, not proof that a neuron has one dedicated meaning.
