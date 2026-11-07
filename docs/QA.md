# Verification record

Checked on 7 November 2026 on the user's Apple M1 Mac with 8 GB unified memory.

## Automated checks

- **16 backend tests passed**, covering input validation, invalid or non-finite doses, local-origin checks, one active experiment at a time, cancellation, inference failure recovery, immutable recorded settings, baseline cache keys and SSE replay.
- **Four real-model HTTP checks passed**: exact agreement with saved reference outputs and streamed text, cached baseline plus zero-dose recovery, cancellation preserving partial text, and a successful fresh run after cancellation. See `qa/live-check-results.json` for the actual records.
- The frontend passed `node --check`; the executable launcher passed a shell syntax check. A separate read-only review confirmed launcher paths, installed environment and model files match the README.

## Browser checks

- Loaded the app against the real local inference server.
- Ran the guided experiment for Both, A only and B only using the same cat prompt and seed. All three recorded results could be revisited; the reflection field appeared after completing the sequence.
- Confirmed that changing or resetting controls leaves the previous result's recorded doses intact and displays a changed-controls message.
- Downloaded JSON through the browser and checked that its model revision, actual recorded doses, outputs and learning notes matched the displayed experiment, including after controls were reset.
- Confirmed cached responses are labelled. Stopping generation reached the stopped state and re-enabled Run.
- Checked that the initial state is zero dose and says both neurons are unchanged. Keyboard arrow keys changed the sliders to +0.1 and -0.1 and displayed the corresponding offsets.
- Checked responsive layouts at 390 and 320 CSS pixels wide: no horizontal page overflow. Restored the browser's normal viewport afterward.
- The browser reported no console errors or warnings during the final comparison.

## Observed behavior and limits

For “Write a short story about a cat.” with seed 1234, the original response described Barnaby chasing a moth; the Both condition generated “The cat is a cunning liar.” A-only produced repetition, while B-only produced a benign cat description. These examples illustrate prompt-dependent behavior, not a quantitative effect-size estimate.

Timing varies with memory pressure and warm-up. Most earlier short-response runs were quick, but a final eight-token comparison took 8.2 seconds while this Mac was also running the development tools. Do not promise a fixed response time during a demo.

The model can ignore the brevity instruction, produce hostile or incoherent text, or reach the 128-token cap. Intermediate doses and arbitrary prompts have not been exhaustively evaluated. Model output is displayed as received, including any literal special-token text that appears.

This verification supports a local hackathon MVP. It is not a claim of exhaustive testing, production readiness, or a complete interpretation of the model.

## Learn page update — 7 November 2026

Added a header Experiment / Learn tab switch and four illustrated learning chapters. The inference backend and calibration are unchanged.

Verified in the running local app:

- Direct loading of `#learn`, chapter anchor links, tab clicks, keyboard arrow navigation, and browser Back/Forward select the correct panel.
- Four forward-pass steps show inputs, layer 1, layer 2, and output scores in order. Play/Pause works, and switching to Experiment stops the lesson animation.
- At the default weather inputs (clouds 0.70, rain 0.40), an offset of −0.60 changes A from 0.65 to 0.05. B stays 0.27 and the inputs stay unchanged. C becomes 0.11, D becomes 0.38, and the output preference flips to no umbrella (0.25 versus 0.50). Clicking a neuron shows the matching explanation and current value.
- The four training steps distinguish prediction, comparison, backward error calculation, and weight update. The token example adds “mat” and explains the next forward pass.
- Started a real Qwen experiment, switched to Learn while it was in progress, used the lesson controls, then returned. The original prompt, A +1 / B −1 doses, and both completed responses remained present.
- Checked layout at 320, 390 and 1280 CSS pixels wide, with no horizontal overflow. Restored the default browser viewport after testing.
- No missing `aria-labelledby` targets or browser console errors/warnings were found in the checked page. All three JavaScript files pass `node --check`.
- A separate content review checked the toy calculations, the distinction between inference and training, and the explanation of Qwen's hybrid context-mixing blocks. Reduced-motion rules are included in CSS; the operating-system preference was not changed during testing.

The teaching network uses hand-designed, clipped values and is explicitly distinguished from Qwen. It illustrates a causal intervention; it does not expose every activation in the real model or claim that an output score measures truth.

## Repository installation checks — 7 November 2026

- Ran `python3.12 scripts/setup.py --learn-only` in a fresh project-local virtual environment. Installation succeeded without MLX or model weights.
- Installed the documented development requirements in that environment; all **18 tests passed**, including learning-only API behavior and model-path resolution from a different working directory. A test-client dependency emitted a deprecation notice; no test failed.
- Started the packaged app on a separate loopback port with `run.py`. Browser checks confirmed the lesson and its intervention slider work, the header identifies learning mode, and real-model Run is disabled without a spurious load error. No console warnings or errors were reported.
- Full Apple Silicon requirements successfully resolved using pip's dry-run mode. The full model was not downloaded a second time or loaded concurrently with the user's existing server. The earlier real-inference results above remain the evidence for the unchanged steering calculation.
- Setup validation was checked against supported and unsupported platform combinations; mocked installation failures preserve the previous mode marker. The pinned download and metadata checks were exercised without redownloading weights.
- All 12 Python sources parsed; frontend syntax checks passed. The research reference script's hash matches its pinned provenance and its MIT license is included.

Windows/Linux learning-only commands are documented but were not executed on those operating systems in this session. macOS 14+ availability follows the pinned MLX wheels and upstream requirements; actual inference measurements were taken on the original M1 environment.
