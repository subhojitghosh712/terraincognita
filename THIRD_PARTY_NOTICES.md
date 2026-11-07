# Third-party notices and research credit

## Published neuron-steering reproduction

`research/published_reproduction.py` is an unchanged copy of `steer_qwen35.py` from [occcat/qwen35-evil-neuron](https://github.com/occcat/qwen35-evil-neuron), pinned to commit [`76a1020cfe53dcf512fc7cb98f8392eddd34b7f8`](https://github.com/occcat/qwen35-evil-neuron/tree/76a1020cfe53dcf512fc7cb98f8392eddd34b7f8).

- Copyright © 2026 occcat.
- License: MIT; the complete upstream text is retained in [`research/REFERENCE_LICENSE`](research/REFERENCE_LICENSE).
- Source SHA-256: `6c6a1cd1bf4eaa8cbef5963b3c01b4f098884723e67b665d4a1977f360b89fd0`.

The project used that script's calibration passages, prompts and reference implementation for its reproduction. The app's calibration constants come from the recorded local experiment. Research evidence and provenance are retained under [`docs/reproduction/`](docs/reproduction/).

The two-neuron finding and normalized intervention recipe are credited to [Lyra's original post](https://x.com/_lyraaaa_/status/2113833330429083662). This product presents an educational interface and does not claim a new neuron-steering method.

## Model weights

The app uses [MLX Community's four-bit Qwen3.5-4B checkpoint](https://huggingface.co/mlx-community/Qwen3.5-4B-MLX-4bit/tree/32f3e8ecf65426fc3306969496342d504bfa13f3), based on [Qwen/Qwen3.5-4B](https://huggingface.co/Qwen/Qwen3.5-4B).

- Pinned model revision: `32f3e8ecf65426fc3306969496342d504bfa13f3`.
- The pinned model card declares the Apache License 2.0.
- Model weights are **not bundled in this repository**. Setup downloads them separately from Hugging Face. Consult the upstream model repositories for their license text, notices, and model documentation.

## Dependencies

MLX, MLX-LM, Hugging Face Transformers, FastAPI and the other declared dependencies are installed from their package distributions and retain their respective licenses. This notice does not replace those licenses or assign a new license to the project's original code.
