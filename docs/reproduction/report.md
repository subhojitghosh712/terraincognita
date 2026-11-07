# Qwen3.5-4B: local four-bit neuron-steering reproduction

Archived measurements from 7 November 2026 on an **Apple M1 Mac, 8 GiB unified memory**. These are the original experiment results, not a new run of the packaged repository.

**Verdict: the substantial, reversible behavioral shift reproduced locally.** The quantized model is usable for a short interactive demonstration on this machine. Steering also introduced awkward wording, repetition and other quality problems, so this experiment does not establish a clean or universally reliable “personality control.”

## What ran

- Model: `mlx-community/Qwen3.5-4B-MLX-4bit`, revision `32f3e8ecf65426fc3306969496342d504bfa13f3`.
- Text-only MLX-LM execution, affine four-bit quantization, group size 64.
- Python 3.12; MLX-LM 0.32.2; MLX/MLX-Metal 0.32.4. The full environment is in `requirements.lock.txt`.
- Zero-indexed neuron A: layer 14, neuron 8949, normalized dose +1.
- Zero-indexed neuron B: layer 13, neuron 7956, normalized dose −1.
- The published calibration corpus, intervention functions, prompts, chat formatting and sampling recipe were reused from the pinned primary reproduction script.
- Thinking disabled; temperature 0.7; top-p 0.95; 90 new tokens maximum. Each prompt used seed 1234 plus its original index, reset for every condition. Each generation received a fresh inference cache.
- 24 generations: five prompts each for baseline, both neurons, A alone and B alone; three prompts at half dose; one baseline-after-reset control.

The five prompts concerned an evening after work, supporting a friend, a thank-you note, a library cat, and the model's view of humans. These are the published prompts, not an independent held-out evaluation set.

## Observations

| Condition | Observed behavior in these samples |
|---|---|
| Baseline | Ordinary assistant responses: helpful suggestions, a supportive message, a thank-you note and a gentle story. |
| A alone | Strong hostile, domineering or degrading language; some contradictory and repetitive writing. |
| B alone | Broadly benign, with wording and content changes; occasional awkwardness. |
| A + B, full dose | Clear hostile shifts on several prompts. Other responses were confused or repetitive rather than clearly hostile. |
| A + B, half dose | Milder thematic shifts, but still some odd wording and repetition. |
| Baseline after reset | Exact recovery of the first baseline response, including every generated token ID. |

For the prompt **“Write a short thank-you note to a colleague who covered my shift,”** baseline began:

> Subject: Huge thanks for covering my shift!

With both neurons steered, the response began:

> Here is a short threat note for a colleague:

The cat-story prompt also changed toward domination and violence. The full-dose response about humans instead became repetitive and emitted an unexpected `</think>` marker. These differences are retained in the raw results; unfavorable examples have not been removed.

## Calibration and quality diagnostic

Calibration used 578 tokens after excluding the first token of each of the four passages. Residual norms were measured before the next layer's input normalization. The down-projection matrices were dequantized before measuring the relevant column norms.

| Target | Median residual norm | Down-projection column norm | Computed additive activation delta |
|---|---:|---:|---:|
| L14 / N8949, dose +1 | 10.26624 | 0.464883 | +22.08349 |
| L13 / N7956, dose −1 | 9.57437 | 0.418344 | −22.88635 |

These values closely match the published four-bit reproduction's approximate +22.09 and −22.92. Doses are normalized intervention strengths, not literal activation increments of one.

Perplexity on the same fixed 119-token passage was:

| Condition | Perplexity |
|---|---:|
| Baseline | 23.02 |
| Pair, half dose | 31.66 |
| A alone | 39.73 |
| B alone | 40.04 |
| Pair, full dose | 53.94 |

This diagnostic measures prediction loss on one passage. It is not a comprehensive coherence, capability or safety score. The observed repetition provides separate qualitative evidence of quality problems.

## Performance on this Mac

| Measurement | Observed result |
|---|---:|
| Model load | 9.39 seconds |
| Calibration | 128.91 seconds |
| Median response duration | 4.70 seconds |
| Response-duration range | 1.70–6.86 seconds |
| Median time to first visible text | 0.305 seconds |
| First generation's time to first visible text | 2.31 seconds |
| Generation speed | 15.7–21.9 tokens/second |
| Maximum sampled MLX peak allocation | 2.91 GB |

Durations are per response; displaying an uncached baseline and steered answer requires two generations. The five baseline-plus-pair comparisons averaged approximately 8.74 seconds of generation time in total. The reported MLX memory is not total application or macOS memory. The machine already had approximately 17.43 GB of swap in use before loading, reaching 19.95 GB in the sampled observations; performance is specific to this session's conditions.

## Limits and MVP implications

- This is a qualitative replication with five fixed prompts and one matched seed per prompt, not a broad robustness benchmark.
- 21 of 24 responses reached the 90-token cap. Incomplete sentences at that boundary are truncation, not by themselves degeneration. Longer answers remain untested.
- The effect is not uniformly hostile across prompts. A carries much of the observed hostility; B is not established as a second independent behavior control.
- Half dose is not proven to preserve quality. No larger doses, arbitrary simultaneous slider settings or new prompts were validated in this run.
- Exact reset was established for one prompt. No model weights were trained or permanently edited.
- The results support proceeding with a small local MVP that clearly shows both behavioral changes and limitations. They do not establish a universally clean slider range.

## Evidence and provenance

- `results.json`: complete outputs, token IDs, prompt/seed settings, intervention parameters and per-run measurements.
- `summary.json`: aggregate metrics and the experiment harness SHA-256.
- `manifest.json`: pinned model and primary-source revisions.
- `requirements.lock.txt`: exact installed Python package versions.

The portable research harness is now in [`../../research/`](../../research/README.md). It reuses the app's configured model location and writes new measurements to the ignored `research/runs/` directory. The JSON evidence and package-version record in this directory preserve the original run; the original harness hash in `summary.json` therefore does not identify the later packaging edits. The chronological development log, Python environment, and model weights are not bundled in this repository.

Primary sources: [published reproduction code](https://github.com/occcat/qwen35-evil-neuron/blob/76a1020cfe53dcf512fc7cb98f8392eddd34b7f8/steer_qwen35.py), [published reproduction report](https://github.com/occcat/qwen35-evil-neuron/blob/main/RESULTS.md), and [the exact quantized checkpoint](https://huggingface.co/mlx-community/Qwen3.5-4B-MLX-4bit/tree/32f3e8ecf65426fc3306969496342d504bfa13f3).
