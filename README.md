# Terra Incognita · Uncharted

**Open a door into the world inside AI.** Learn how neural networks work, then change two internal signals in a real language model and compare its responses.

Uncharted runs locally, with an HTML/CSS/JavaScript frontend and a Python/FastAPI/MLX backend. **No Node.js build or API key is needed.**

## Features

- **Experiment:** bounded sliders for two Qwen3.5-4B neurons; streaming original and steered responses with matching prompts, seeds and settings.
- **Learn:** an animated teaching network, clickable neurons, activation interventions, training-versus-inference explanations, and token illustrations.
- **Investigate:** predict an effect, compare A alone / B alone / both, revisit results, and record an observation.
- **Keep evidence:** copy or download the actual prompt, doses, activation offsets, model revision, settings and responses. Cached and truncated answers are labelled.

## Choose your installation

| Machine | Available experience | Setup |
| --- | --- | --- |
| Apple Silicon Mac (M1 or newer), macOS 14+ | Full local Qwen experiment and Learn | Standard installation |
| Windows, Linux, or Intel Mac | Interactive Learn page; real-model experiments disabled | Learning-only installation |

Use **Python 3.12** and Git. Python 3.12 is the tested version. Full inference was verified on an **M1 with 8 GB unified memory** and short prompts. Keep only one model server running.

The pinned model download is approximately **3.1 GB**, separate from Python packages. Allow several additional gigabytes for the environment and caches. Installation needs internet access; subsequent model loading and inference are offline. See the official [MLX platform requirements](https://ml-explore.github.io/mlx/build/html/install.html).

## Full installation: Apple Silicon Mac

Install [Python 3.12](https://www.python.org/downloads/) and Git if needed. Use a native Apple Silicon Python, not an Intel Python running under Rosetta.

```sh
git clone https://github.com/subhojitghosh712/terraincognita.git
cd terraincognita
python3.12 scripts/setup.py
.venv/bin/python run.py
```

Setup creates a project-local `.venv`, installs pinned dependencies, and downloads the exact checkpoint into `models/qwen3.5-4b-4bit/`. It does not install system software or change global Python packages. The download can take several minutes.

The app opens at **http://127.0.0.1:8765**. Wait for the model indicator to become ready, choose **Both**, and press **Run experiment**. The header switch opens **Learn** without losing your experiment.

After installation, you can also double-click **Start Uncharted.command** in Finder. Keep its Terminal window open. Press **Control-C** there to stop the server and release model memory.

## Learning-only installation: Windows, Linux, or any Mac

This mode runs every interactive lesson without downloading weights or installing MLX. It does **not** simulate Qwen responses or enable the real-model experiment.

**macOS / Linux:**

```sh
git clone https://github.com/subhojitghosh712/terraincognita.git
cd terraincognita
python3.12 scripts/setup.py --learn-only
.venv/bin/python run.py
```

**Windows PowerShell:**

```powershell
git clone https://github.com/subhojitghosh712/terraincognita.git
cd terraincognita
py -3.12 scripts/setup.py --learn-only
.\.venv\Scripts\python.exe run.py
```

Open **http://127.0.0.1:8765/#learn** if the browser does not open automatically. Setup remembers this mode in an ignored `.learn-only` file. On a supported Mac, running setup without `--learn-only` later installs full inference and removes that marker.

## Launch options

```sh
# Use another port if 8765 is occupied.
.venv/bin/python run.py --port 8766

# Leave the browser closed.
.venv/bin/python run.py --no-browser

# Temporarily open the lesson without loading a model.
.venv/bin/python run.py --learn-only
```

The server binds only to `127.0.0.1`. This is a local, single-user app. GitHub stores the source; GitHub Pages cannot run its Python/MLX inference backend.

## Reuse or repair a model download

Install the environment without downloading weights:

```sh
python3.12 scripts/setup.py --skip-model
```

Finish or repair the pinned download:

```sh
.venv/bin/python scripts/download_model.py
```

Reuse a complete model folder previously downloaded by this project:

```sh
UNCHARTED_MODEL_DIR="/absolute/path/to/model" .venv/bin/python run.py
```

Keep its hidden `.cache/huggingface/download/` metadata. Loading checks the pinned revision, four-bit projections, geometry and calibrated column norms. Another Qwen checkpoint or quantization is not interchangeable with this calibration.

## What the experiment changes

| Control | Zero-indexed target | Allowed dose | Additive activation offset |
| --- | --- | ---: | ---: |
| A | Layer 14, neuron 8949 | 0 to +1 | dose × 22.0834858068 |
| B | Layer 13, neuron 7956 | −1 to 0 | dose × 22.8863453652 |

Offsets are added before the MLP down projection during prompt processing and generation. Weights are not edited. Zero leaves the neuron unchanged. The endpoint is the published reference dose, not a guarantee of coherent output or a percentage of natural activation.

Model: [`mlx-community/Qwen3.5-4B-MLX-4bit`](https://huggingface.co/mlx-community/Qwen3.5-4B-MLX-4bit), revision `32f3e8ecf65426fc3306969496342d504bfa13f3`.

Both conditions receive the same request for one or two sentences in at most 35 words, temperature 0.7, top-p 0.95, and the selected seed. A 128-token cap is the fallback; the word limit is an instruction, not a validator. Responses are shown as generated.

## Limits

- Steering can produce hostility, repetition or confusing text. Effects depend on the prompt and settings. This does not establish dedicated “evil neurons” or explain the whole model.
- The Learn network is a hand-designed illustration, not Qwen's live activations. Inference sends signals forward; training uses backward error information to update weights.
- One worker runs one experiment at a time. Original responses may be reused from a clearly labelled cache.
- The latest 16 records and 16 cached baselines remain in server memory. Restart clears them. Browser learning notes last for the current page session. Export records you want to keep.
- Stop takes effect between tokens; a GPU operation already in progress may need to finish first.
- Real inference currently uses the Apple Silicon MLX backend. A Windows/Linux GPU backend is not included.

## Troubleshooting

| Problem | What to try |
| --- | --- |
| `python3.12` not found | Install Python 3.12 and reopen the terminal. On Windows use `py -3.12`. |
| Virtual environment creation fails | Ensure Python includes `venv` and `ensurepip`; Linux distributions may package them separately. |
| Unsupported platform / no matching MLX wheel | Use native ARM Python on macOS 14+, or choose `--learn-only`. |
| Port already in use | Stop the earlier server with Control-C, or use `--port 8766`. |
| Missing model / revision mismatch | Run `scripts/download_model.py` with the `.venv` Python. Preserve hidden metadata when copying model folders. |
| Loading fails or generation is slow | Close memory-heavy apps, keep one server running, shorten the prompt, and inspect the Terminal error. First generation can take longer. |
| Browser cannot connect | Keep the server terminal open and use its printed `127.0.0.1` URL. |
| Experiment disabled in learning mode | On a supported Mac, rerun setup without `--learn-only`. The lessons require no model. |

## Development and verification

Backend tests use fake inference and need no MLX, weights or GPU:

```sh
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m unittest discover -s tests -v
```

On Windows, substitute `.\.venv\Scripts\python.exe`. If Node.js is available, run `node --check static/app.js`, `node --check static/learn.js`, and `node --check static/navigation.js`; Node.js is not required to run the app.

See [verification notes](docs/QA.md), the [API contract](docs/API.md), the [local reproduction](docs/reproduction/report.md), and the [research harness](research/README.md). Historical timings describe the tested M1 session, not a performance guarantee on another machine.

## Project layout

```text
run.py                    Local launcher
server.py                 FastAPI API and event stream
engine.py                 Reversible MLX activation steering
experiments.py            Worker, records, cancellation and cache
config.py                 Pinned model, calibration and settings
static/                   Experiment and Learn interfaces
scripts/                  Setup and model download
tests/                    Backend and installation checks
research/                 Reproduction harness and credited reference code
docs/                     API, verification and research evidence
models/                   Downloaded locally; ignored by Git
.venv/                    Created locally; ignored by Git
```

## Credit

The two-neuron finding and normalized dose recipe are credited to [Lyra](https://x.com/_lyraaaa_/status/2113833330429083662). Reproduction was checked against [occcat's MLX experiment](https://github.com/occcat/qwen35-evil-neuron). Models come from [Qwen](https://huggingface.co/Qwen/Qwen3.5-4B) and [MLX Community](https://huggingface.co/mlx-community/Qwen3.5-4B-MLX-4bit).

This project's contribution is the educational experience and experiment interface, not a new steering method. Model weights are downloaded separately under their upstream license. See [third-party notices](THIRD_PARTY_NOTICES.md).
