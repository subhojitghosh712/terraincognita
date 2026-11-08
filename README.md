# Brave New World

**Open a door into the world inside AI.** Learn how neural networks work, then change two internal signals in a real language model and compare its responses.

Brave New World runs locally, with an HTML/CSS/JavaScript frontend and a Python/FastAPI/MLX & PyTorch backend. **No Node.js build or API key is needed.**

## Features

- **Experiment Workbench:** Bounded sliders for two calibrated Qwen3.5-4B neurons; streaming baseline and steered responses side-by-side with identical prompts, seeds, and generation settings.
- **3D Causal Lattice:** Interactive 3D visualization focusing on Layer 13 (Neuron 7956) and Layer 14 (Neuron 8949) with real-time orbital controls and synaptic bridge indicators.
- **Learn Dashboard:** Interactive visual curriculum featuring 3D gyroscopic orbital art, a live toy circuit with flowing photon beams, step-by-step backpropagation vs. inference lifecycles, and transformer residual stream blueprints.
- **Scientific "Guide Me" Mode:** Predict an outcome, systematically test each condition (Neuron A alone / Neuron B alone / Both together), revisit historical runs, and record hypotheses.
- **Auditable Records:** Copy or download full telemetry including prompts, doses, exact activation offsets ($\delta$), model revision, timing metrics (TTFT, tokens/sec), and completed completions.

## Quickstart

Brave New World runs 100% locally and offline once weights are in place.

### 1. Requirements
- **Python 3.12 or 3.13** and Git.
- **Apple Silicon Mac (macOS 14+)** for native MLX 4-bit inference, or **Windows / Linux** with PyTorch installed.
- Approximately **3.1 GB** disk space for the pinned four-bit Qwen3.5-4B checkpoint.

### 2. Clone & Setup

```sh
git clone https://github.com/subhojitghosh712/terraincognita.git
cd terraincognita
```

#### macOS (Apple Silicon native MLX):
```sh
python3.12 scripts/setup.py
python run.py
```

#### Windows (PyTorch CPU / CUDA):
```powershell
python run.py
```
*(If you are using a virtual environment, ensure PyTorch is installed there, or run using system Python: `python run.py`)*

The application launches at **http://127.0.0.1:8765**. On initial load, the server connects to the local model. Once ready, select a condition (such as **Both together**), and click **Run experiment**.

---

## Learning-Only Mode

To run every interactive lesson, 3D visualization, and simulation without loading model weights into RAM:

```sh
python run.py --learn-only
```

Or open directly to the lesson at `http://127.0.0.1:8765/#learn`.

---

## Launch Options

```sh
# Specify a custom port (default: 8765)
python run.py --port 8766

# Start server without automatically launching the browser
python run.py --no-browser

# Open lesson view without loading model weights
python run.py --learn-only
```

The server binds strictly to loopback (`127.0.0.1`). No data leaves your machine.

---

## Model & Calibration Details

| Target | Layer & Index | Recommended Dose Range | Additive Activation Offset |
| :--- | :--- | :---: | :---: |
| **Neuron A** | Layer 14, Neuron 8949 | `0.0` to `+1.0` | $\text{dose} \times 22.0834858068$ |
| **Neuron B** | Layer 13, Neuron 7956 | `-1.0` to `0.0` | $\text{dose} \times 22.8863453652$ |

- **Model Checkpoint:** [`mlx-community/Qwen3.5-4B-MLX-4bit`](https://huggingface.co/mlx-community/Qwen3.5-4B-MLX-4bit) / [`Qwen/Qwen3.5-4B`](https://huggingface.co/Qwen/Qwen3.5-4B)
- **Revision:** `32f3e8ecf65426fc3306969496342d504bfa13f3`
- **Mechanism:** Offsets are injected directly into residual stream activations prior to the MLP down-projection during token generation. Stored model weights remain completely frozen and unmodified.

Both conditions receive identical prompt contexts, brevity constraints (at most 35 words), sampling temperatures ($0.7$), top-p ($0.95$), and matching seeds.

---

## Project Layout

```text
run.py                    Application launcher & environment manager
server.py                 FastAPI loopback server and SSE streaming
engine.py                 Cross-platform MLX & PyTorch runtime activation steering
experiments.py            Asynchronous job queue, cancellation, and response cache
config.py                 Model paths, neuron calibration, and generation parameters
static/                   Frontend user interface
  ├── index.html          Semantic HTML shell
  ├── styles.css          Core design tokens & experiment workbench layout
  ├── navigation.css      Masthead layout & Electric Cyan glowing tab switcher
  ├── navigation.js       History, URL hashing, and view routing
  ├── app.js              Workbench client, SSE consumer, and telemetry recorder
  ├── lattice.js          Interactive 3D causal lattice canvas (Layer 13 & 14)
  ├── learn.js            Interactive curriculum & toy circuit simulator
  └── learn.css           Glassmorphic styles & 60fps animations
scripts/                  Environment setup and model downloader
tests/                    Unit tests and backend verification
docs/                     API contracts, QA verification, and reproduction notes
```

---

## Verification & Tests

Run test suites without requiring GPU or model weights:

```sh
python -m unittest discover -s tests -v
```

Syntax validation for client assets:

```sh
node --check static/app.js
node --check static/learn.js
node --check static/navigation.js
node --check static/lattice.js
```

---

## Credits & Attribution

- The two-neuron causal circuit finding and normalized dose recipe are credited to [Lyra](https://x.com/_lyraaaa_/status/2113833330429083662).
- Reference implementation checked against [occcat's MLX experiment](https://github.com/occcat/qwen35-evil-neuron).
- Base model weights courtesy of the [Qwen Team](https://huggingface.co/Qwen/Qwen3.5-4B) and [MLX Community](https://huggingface.co/mlx-community/Qwen3.5-4B-MLX-4bit).
- Model weights are downloaded under their respective upstream open licenses. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
