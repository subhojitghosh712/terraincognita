(() => {
  'use strict';
  const root = document.getElementById('learnView');
  if (!root) return;

  root.innerHTML = `
    <!-- HERO INTRO WITH 3D GYROSCOPIC VISUAL -->
    <section class="learn-intro">
      <div>
        <h1 id="learnTitle" tabindex="-1">Neural Signals &amp;<br><em>Activation Circuits.</em></h1>
        <p class="learn-lede">
          An interactive visual guide to signal propagation, residual stream mechanics, and runtime activation steering inside transformer language models.
        </p>
      </div>
      <div class="learn-intro-art" aria-hidden="true">
        <div class="learn-orbit orbit-one"></div>
        <div class="learn-orbit orbit-two"></div>
        <div class="learn-orbit orbit-three"></div>
        <span class="learn-art-dot dot-one"></span>
        <span class="learn-art-dot dot-two"></span>
        <span class="learn-art-dot dot-three"></span>
        <span class="learn-art-core">0.70<small>activation signal</small></span>
      </div>
    </section>

    <!-- CHAPTER NAVIGATION -->
    <nav class="learn-chapters" aria-label="Learning chapters">
      <a href="#learnSignals"><span>01</span> Follow a signal</a>
      <a href="#learnTraining"><span>02</span> Learning vs. answering</a>
      <a href="#learnLanguage"><span>03</span> From signals to words</a>
      <a href="#learnResearch"><span>04</span> Open the black box</a>
    </nav>

    <!-- CHAPTER 01: SIGNAL PROPAGATION -->
    <section id="learnSignals" class="learn-chapter" aria-labelledby="learnSignalTitle">
      <div class="learn-chapter-heading">
        <span class="learn-chapter-number">01 / FOLLOW A SIGNAL</span>
        <h2 id="learnSignalTitle">Feedforward Layer Computation</h2>
       </div>

      <div class="learn-lab">
        <div class="learn-lab-top">
          <div>
            <span class="learn-tag">INTERACTIVE CIRCUIT</span>
            <h3>Signal Flow &amp; Layer Calculations</h3>
          </div>
          <span class="learn-lab-note">2-Layer Feedforward Simulation</span>
        </div>

        <div class="learn-inputs">
          <label for="learnCloud">
            Input x₁ [Cloud Cover] <span id="learnCloudValue">70%</span>
            <input id="learnCloud" type="range" min="0" max="1" value="0.7" step="0.1">
            <small><span>0.0 (Clear)</span><span>1.0 (Overcast)</span></small>
          </label>
          <label for="learnRain">
            Input x₂ [Precipitation Chance] <span id="learnRainValue">40%</span>
            <input id="learnRain" type="range" min="0" max="1" value="0.4" step="0.1">
            <small><span>0.0 (Dry)</span><span>1.0 (Heavy rain)</span></small>
          </label>
        </div>

        <div class="learn-network-wrap">
          <div class="learn-network" id="learnNetwork">
            <svg class="learn-wires" viewBox="0 0 800 260" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="learnGradAmber" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#adcadb" stop-opacity="0.6"/>
                  <stop offset="100%" stop-color="#e9b76d" stop-opacity="1"/>
                </linearGradient>
                <filter id="learnGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                </filter>
              </defs>
              <g class="learn-wire-base">
                <path d="M85 70 L295 70 M85 70 L295 190 M85 190 L295 70 M85 190 L295 190"/>
                <path d="M295 70 L505 70 M295 70 L505 190 M295 190 L505 70 M295 190 L505 190"/>
                <path d="M505 70 L715 70 M505 70 L715 190 M505 190 L715 70 M505 190 L715 190"/>
              </g>
              <g data-wire-stage="1" class="learn-wire-group">
                <path class="wire-track" d="M85 70 L295 70 M85 70 L295 190 M85 190 L295 70 M85 190 L295 190"/>
                <path class="wire-pulse" d="M85 70 L295 70 M85 70 L295 190 M85 190 L295 70 M85 190 L295 190"/>
              </g>
              <g data-wire-stage="2" class="learn-wire-group">
                <path class="wire-track" d="M295 70 L505 70 M295 70 L505 190 M295 190 L505 70 M295 190 L505 190"/>
                <path class="wire-pulse" d="M295 70 L505 70 M295 70 L505 190 M295 190 L505 70 M295 190 L505 190"/>
              </g>
              <g data-wire-stage="3" class="learn-wire-group">
                <path class="wire-track" d="M505 70 L715 70 M505 70 L715 190 M505 190 L715 70 M505 190 L715 190"/>
                <path class="wire-pulse" d="M505 70 L715 70 M505 70 L715 190 M505 190 L715 70 M505 190 L715 190"/>
              </g>
            </svg>

            <!-- Column 0: Inputs -->
            <div class="learn-network-column" data-column="0">
              <span class="learn-column-label">INPUT VECTOR x₀</span>
              <button class="learn-node" type="button" data-node="cloud">
                <span class="learn-node-value">0.70</span>
                <span class="learn-node-name">x₁ · Clouds</span>
              </button>
              <button class="learn-node" type="button" data-node="rain">
                <span class="learn-node-value">0.40</span>
                <span class="learn-node-name">x₂ · Rain</span>
              </button>
            </div>

            <!-- Column 1: Hidden Layer 1 -->
            <div class="learn-network-column" data-column="1">
              <span class="learn-column-label">LAYER 1 (h₁)</span>
              <button class="learn-node learn-node-intervention" type="button" data-node="a">
                <span class="learn-node-value">0.65</span>
                <span class="learn-node-name">Neuron A [δ]</span>
              </button>
              <button class="learn-node" type="button" data-node="b">
                <span class="learn-node-value">0.27</span>
                <span class="learn-node-name">Neuron B</span>
              </button>
            </div>

            <!-- Column 2: Hidden Layer 2 -->
            <div class="learn-network-column" data-column="2">
              <span class="learn-column-label">LAYER 2 (h₂)</span>
              <button class="learn-node" type="button" data-node="c">
                <span class="learn-node-value">0.62</span>
                <span class="learn-node-name">Neuron C</span>
              </button>
              <button class="learn-node" type="button" data-node="d">
                <span class="learn-node-value">0.26</span>
                <span class="learn-node-name">Neuron D</span>
              </button>
            </div>

            <!-- Column 3: Output Logits -->
            <div class="learn-network-column" data-column="3">
              <span class="learn-column-label">OUTPUT LOGITS ŷ</span>
              <button class="learn-node" type="button" data-node="umbrella">
                <span class="learn-node-value">0.70</span>
                <span class="learn-node-name">Umbrella</span>
              </button>
              <button class="learn-node" type="button" data-node="walk">
                <span class="learn-node-value">0.41</span>
                <span class="learn-node-name">No umbrella</span>
              </button>
            </div>
          </div>
        </div>

        <div class="learn-stage-line">
          <div class="learn-stage-dots" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </div>
          <p id="learnFlowStatus" role="status">Press Play to propagate activations through each layer.</p>
        </div>

        <div class="learn-flow-controls">
          <button class="learn-button learn-button-primary" id="learnPlay" type="button">
            <span aria-hidden="true">▶</span> Play signal
          </button>
          <button class="learn-button" id="learnStep" type="button">One step →</button>
          <button class="learn-button learn-button-quiet" id="learnReset" type="button">Reset circuit ↺</button>
          <span>Select any neuron to inspect incoming weights &amp; activation formula.</span>
        </div>

        <div class="learn-inspector" id="learnInspector">
          <span class="learn-inspector-icon" aria-hidden="true">↳</span>
          <div>
            <h4 id="learnInspectorTitle">Neuron Telemetry &amp; Activation</h4>
            <p id="learnInspectorText">Each neuron computes a linear combination of inputs: y = clip(W·x + b). Brighter nodes reflect higher activation magnitudes.</p>
          </div>
        </div>

        <!-- INTERVENTION DECK -->
        <div class="learn-intervention">
          <div>
            <span class="learn-tag">CAUSAL INTERVENTION</span>
            <h3>Inject Signal Offset (δ) at Neuron A</h3>
            <p>Clamp an activation offset onto Neuron A. Observe how downstream layers (C, D) and output scores respond while input clues remain identical.</p>
          </div>
          <div class="learn-intervention-control">
            <label for="learnOffset">
              Offset δ at Neuron A
              <output id="learnOffsetValue">0.00</output>
            </label>
            <input id="learnOffset" type="range" min="-0.6" max="0.6" value="0" step="0.1">
            <div class="learn-slider-ends">
              <span>−0.60 (Inhibit)</span>
              <span>+0.60 (Potentiate)</span>
            </div>
            <p id="learnOutcome" role="status">Run propagation to compare baseline vs steered output scores.</p>
          </div>
        </div>

        <details class="learn-calculation">
          <summary>View mathematical formulations &amp; weights ↗</summary>
          <div>
            <p><strong>Weights (W)</strong> scale incoming signals, <strong>biases (b)</strong> provide a baseline threshold, and the <strong>activation function</strong> bounds outputs:</p>
            <p class="learn-equation">Neuron A = clip(0.90 × cloud + 0.80 × rain − 0.30 + δ) ∈ [0, 1]</p>
            <p id="learnCalculation">With current clues: clip(0.90 × 0.70 + 0.80 × 0.40 − 0.30) = 0.65.</p>
          </div>
        </details>
      </div>

      <!-- KEY CONCEPTS -->
      <div class="learn-key-ideas">
        <article>
          <span>01 / NEURONS</span>
          <h3>Computational Units</h3>
          <p>Neurons compute mathematical dot products over incoming vectors. An activation value has meaning only through its downstream projections.</p>
        </article>
        <article>
          <span>02 / LAYERS</span>
          <h3>Representational Depth</h3>
          <p>Hierarchical layers transform raw features into composite concepts. Higher layers synthesize contextual abstractions from earlier representations.</p>
        </article>
        <article>
          <span>03 / ACTIVATIONS</span>
          <h3>Dynamic State</h3>
          <p>Weights remain fixed parameters; activations represent ephemeral runtime states that fluctuate with each token and prompt.</p>
        </article>
      </div>
    </section>

    <!-- CHAPTER 02: INFERENCE VS TRAINING -->
    <section id="learnTraining" class="learn-chapter" aria-labelledby="learnTrainingTitle">
      <div class="learn-chapter-heading">
        <span class="learn-chapter-number">02 / LEARNING VS. ANSWERING</span>
        <h2 id="learnTrainingTitle">Inference Execution vs. Gradient Training</h2>
      </div>

      <div class="learn-lifecycle">
        <!-- Inference Card -->
        <article class="learn-lifecycle-card">
          <div class="learn-lifecycle-heading">
            <span class="learn-tag">INFERENCE RUNTIME</span>
            <span class="learn-pill">Forward Pass Only</span>
          </div>
          <h3>Deterministic Forward Journey</h3>
          <div class="learn-mini-flow" aria-label="Input flows forward through frozen weights">
            <span>Input Tokens</span>
            <b aria-hidden="true">→</b>
            <span>Transformer (32 Blocks)</span>
            <b aria-hidden="true">→</b>
            <span>Output Logits</span>
          </div>
          <p>Input tokens pass sequentially through frozen weight matrices. Activations are computed in-memory, producing next-token probabilities without altering stored weights.</p>
          <div class="learn-small-note">No backpropagation or weight modification occurs during model serving.</div>
        </article>

        <!-- Training Card -->
        <article class="learn-lifecycle-card learn-training-card">
          <div class="learn-lifecycle-heading">
            <span class="learn-tag">TRAINING LOOP</span>
            <span class="learn-pill">Bidirectional Optimization</span>
          </div>
          <h3>Backpropagation &amp; Gradient Updates</h3>
          <div class="learn-training-flow" id="learnTrainingFlow">
            <div class="learn-mini-flow">
              <span data-training-node="0">Weights (W)</span>
              <b class="learn-training-arrow" aria-hidden="true">→</b>
              <span data-training-node="1">Prediction (ŷ)</span>
              <b class="learn-training-arrow" aria-hidden="true">→</b>
              <span data-training-node="2">Target (y)</span>
            </div>
            <div class="learn-feedback-path" aria-hidden="true">
              <span>←</span> gradient feedback ∂L/∂W
            </div>
          </div>
          <p id="learnTrainingText" role="status">Click below to trace the 4-phase training loop: forward pass, loss calculation, backprop gradient calculation, and optimizer update.</p>
          <button id="learnTrainingStep" class="learn-button" type="button">Next training step →</button>
          <p class="learn-small-note">The chain rule computes partial derivatives ∂L/∂W. An optimizer (e.g. AdamW) applies W ← W − η∇W.</p>
        </article>
      </div>
    </section>

    <!-- CHAPTER 03: TRANSFORMER RESIDUAL STREAM -->
    <section id="learnLanguage" class="learn-chapter" aria-labelledby="learnLanguageTitle">
      <div class="learn-chapter-heading">
        <span class="learn-chapter-number">03 / FROM SIGNALS TO WORDS</span>
        <h2 id="learnLanguageTitle">Token Generation &amp; Residual Streams</h2>
      </div>

      <div class="learn-language-card">
        <div class="learn-token-scene">
          <span class="learn-tag">AUTOREGRESSIVE SEQUENCE</span>
          <div id="learnTokens" class="learn-tokens" aria-label="Sentence tokens">
            <span>The</span>
            <span>cat</span>
            <span>sat</span>
            <span>on</span>
            <span>the</span>
            <span class="learn-token-question">?</span>
          </div>
          <p>Text is discretized into <strong>tokens</strong> (subwords or punctuation). The transformer reads preceding tokens and computes probability scores for the next position.</p>
        </div>

        <div class="learn-language-route">
          <div>
            <span class="learn-route-number">1</span>
            <h3>Token Embeddings</h3>
            <p>Vocabulary indices map to high-dimensional continuous vectors in embedding space.</p>
          </div>
          <span class="learn-route-arrow" aria-hidden="true">→</span>
          <div>
            <span class="learn-route-number">2</span>
            <h3>32 Transformer Blocks</h3>
          </div>
          <span class="learn-route-arrow" aria-hidden="true">→</span>
          <div>
            <span class="learn-route-number">3</span>
            <h3>Unembedding Head</h3>
            <p>Final layer normalizes residual vectors and projects them to vocabulary logits via Softmax.</p>
          </div>
        </div>

        <div class="learn-next-token">
          <div class="learn-word-scores" aria-label="Next-token probability scores">
            <div style="--score: 64%;">
              <span>mat</span>
              <i></i>
              <small>64% (P_max)</small>
            </div>
            <div style="--score: 28%;">
              <span>sofa</span>
              <i></i>
              <small>28%</small>
            </div>
            <div style="--score: 8%;">
              <span>moon</span>
              <i></i>
              <small>8%</small>
            </div>
          </div>
          <div>
            <button class="learn-button learn-button-primary" id="learnTokenButton" type="button">
              Sample next token →
            </button>
            <p id="learnTokenStatus" role="status">The unembedding projection computes highest likelihood for "mat". Sample to append.</p>
          </div>
        </div>
      </div>

      <!-- TRANSFORMER BLOCK BLUEPRINT -->
      <div class="learn-transformer">
        <div>
          <span class="learn-tag">ARCHITECTURE DEEP DIVE</span>
          <h3>Inside a Transformer Block: The Residual Highway</h3>
          <p>In modern architectures like Qwen, 32 transformer blocks process text sequentially. Information is not stored in rigid compartments; instead, each layer adds its contribution directly to a central residual stream:</p>
          <p class="learn-equation" style="font-size: 11.5px; margin-top: 14px;">
            x_{l+1} = x_l + \\text{Attn}(x_l) + \\text{MLP}(x_l)
          </p>
          <p>Because the identity shortcut bypasses the sub-layers, earlier representations are preserved, preventing vanishing gradients and enabling direct activation steering.</p>
        </div>

        <div class="learn-block-illustration" aria-label="Transformer block blueprint with residual skip connection">
          <span class="learn-block-end">Representation Vector in [x_l]</span>
          <div class="learn-block-path">
            <span class="learn-shortcut">Residual Bypass [x_l] ↓</span>
            <div class="learn-block-step">
              <span>01</span>
              <div>
                <strong>Multi-Head Attention</strong>
                <small>Routes contextual information between all token positions.</small>
              </div>
            </div>
            <span class="learn-block-arrow" aria-hidden="true">↓</span>
            <div class="learn-block-step learn-block-mlp">
              <span>02</span>
              <div>
                <strong>SwiGLU MLP Layers</strong>
                <small>High-dimensional projection &amp; non-linear feature transformation.</small>
              </div>
            </div>
          </div>
          <span class="learn-block-end">Summation [x_{l+1}] → Next Block</span>
          <small>Qwen3.5-4B Architecture · 32 Repeating Residual Blocks</small>
        </div>
      </div>
    </section>

    <!-- CHAPTER 04: ACTIVATION STEERING -->
    <section id="learnResearch" class="learn-chapter learn-research" aria-labelledby="learnResearchTitle">
      <div class="learn-chapter-heading">
        <span class="learn-chapter-number">04 / OPEN THE BLACK BOX</span>
        <h2 id="learnResearchTitle">Mechanistic Interpretability &amp; Steering</h2>
      </div>

      <div class="learn-research-steps">
        <article>
          <span>01</span>
          <h3>Feature Localization</h3>
          <p>Pinpoint specific neuron activations that show statistically significant variance when particular semantic features are elicited.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Causal Intervention</h3>
          <p>Apply targeted scalar adjustments δ directly into the residual stream at runtime without retraining or fine-tuning weights.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Hypothesis Falsification</h3>
          <p>Contrast steered outputs against baseline generation across varied prompts to delineate true causal circuits from accidental correlations.</p>
        </article>
      </div>

      <div class="learn-final-note">
        <p>
          Activation steering directly demonstrates causality: when modifying an internal activation shifts the model's generated text, we have confirmed that circuit's influence.
        </p>
        <a class="learn-button learn-button-primary" href="#experiment" data-view-target="experiment">
          Open Experiment Workbench ↗
        </a>
        <small>Next step: test runtime steering on Qwen3.5-4B in the live workbench.</small>
      </div>
    </section>
  `;

  // SELECTOR HELPER
  const $ = id => document.getElementById(id);
  const clamp = value => Math.max(0, Math.min(1, value));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // CIRCUIT STATE
  let stage = -1;
  let timer = null;
  let selected = null;
  let trainingStage = -1;
  let tokenAdded = false;

  const nodes = [...root.querySelectorAll('[data-node]')];

  const labels = {
    cloud: 'Input x₁ · Cloud Cover',
    rain: 'Input x₂ · Precipitation',
    a: 'Layer 1 · Neuron A [Intervention]',
    b: 'Layer 1 · Neuron B',
    c: 'Layer 2 · Neuron C',
    d: 'Layer 2 · Neuron D',
    umbrella: 'Output Logit · Umbrella',
    walk: 'Output Logit · No umbrella'
  };

  const explanations = {
    cloud: 'Input clue normalized to [0.0, 1.0]. Represents an external feature before matrix transformation.',
    rain: 'Second input vector component. Combines with cloud cover via linear weights at Layer 1.',
    a: 'Linear dot product: clip(0.90·x₁ + 0.80·x₂ − 0.30 + δ). Your intervention offset modifies this node directly.',
    b: 'Independent Layer 1 neuron: clip(1.00 − 0.70·x₁ − 0.60·x₂). Remains invariant when Neuron A is steered.',
    c: 'Downstream synthesizer: clip(0.85·A + 0.25·B). Sensitive to interventions injected at Neuron A.',
    d: 'Inhibitory synthesizer: clip(0.90·B − 0.20·A + 0.15). Demonstrates negative downstream coupling.',
    umbrella: 'Output preference score: clip(0.20 + 0.80·C − 0.10·D). Compares against competing logits.',
    walk: 'Alternative logit: clip(0.20 + 0.80·D − 0.10·C). Downstream changes reflect the network’s final decision.'
  };

  function calculate(offset = Number($('learnOffset').value)) {
    const cloud = Number($('learnCloud').value);
    const rain = Number($('learnRain').value);
    const a = clamp(0.9 * cloud + 0.8 * rain - 0.3 + offset);
    const b = clamp(1 - 0.7 * cloud - 0.6 * rain);
    const c = clamp(0.85 * a + 0.25 * b);
    const d = clamp(0.9 * b - 0.2 * a + 0.15);
    return {
      cloud,
      rain,
      a,
      b,
      c,
      d,
      umbrella: clamp(0.2 + 0.8 * c - 0.1 * d),
      walk: clamp(0.2 + 0.8 * d - 0.1 * c)
    };
  }

  function preference(values) {
    if (Math.abs(values.umbrella - values.walk) < 0.005) return 'Tied score';
    return values.umbrella > values.walk ? 'Umbrella favored' : 'No umbrella favored';
  }

  function updateInspector(values) {
    if (!selected) return;
    $('learnInspectorTitle').textContent = `${labels[selected]} [Activation: ${values[selected].toFixed(2)}]`;
    $('learnInspectorText').textContent = explanations[selected];
  }

  function renderValues() {
    const values = calculate();
    const baseline = calculate(0);
    const offset = Number($('learnOffset').value);

    $('learnCloudValue').textContent = `${Math.round(values.cloud * 100)}%`;
    $('learnRainValue').textContent = `${Math.round(values.rain * 100)}%`;
    $('learnOffsetValue').textContent = `${offset > 0 ? '+' : ''}${offset.toFixed(2)}`;

    for (const node of nodes) {
      const key = node.dataset.node;
      node.querySelector('.learn-node-value').textContent = values[key].toFixed(2);
      node.style.setProperty('--activation', values[key]);
      node.setAttribute('aria-label', `${labels[key]}, activation ${values[key].toFixed(2)}.`);
      node.setAttribute('aria-pressed', String(selected === key));
      node.classList.toggle('learn-node-changed', Math.abs(values[key] - baseline[key]) > 0.0001);
    }

    $('learnCalculation').textContent = `Computed: clip(0.90 × ${values.cloud.toFixed(2)} + 0.80 × ${values.rain.toFixed(2)} − 0.30 ${offset < 0 ? '−' : '+'} ${Math.abs(offset).toFixed(2)}) = ${values.a.toFixed(2)}.`;

    $('learnOutcome').textContent = offset === 0
      ? `Baseline: ${preference(values)} (${values.umbrella.toFixed(2)} vs ${values.walk.toFixed(2)}). Adjust the offset above to steer downstream output.`
      : `Baseline: ${preference(baseline)} → Steered: ${preference(values)} (${values.umbrella.toFixed(2)} vs ${values.walk.toFixed(2)}). Dashed nodes indicate changed activations.`;

    updateInspector(values);
    return values;
  }

  const stageText = [
    '1 / 4 · Input encoding: Clues [0.70, 0.40] normalized into numerical input activation vectors.',
    '2 / 4 · Layer 1 projection: Neurons compute affine transforms h₁ = clip(W₁x + b₁ + δ).',
    '3 / 4 · Layer 2 propagation: Intermediate representations combined into feature vector h₂.',
    '4 / 4 · Output classification: Logit readout generates preference scores for umbrella vs walk.'
  ];

  function renderStage() {
    root.querySelectorAll('[data-column]').forEach(column => {
      column.classList.toggle('learn-column-lit', Number(column.dataset.column) <= stage);
      column.classList.toggle('learn-column-current', Number(column.dataset.column) === stage);
    });

    root.querySelectorAll('[data-wire-stage]').forEach(wire => {
      const at = Number(wire.dataset.wireStage);
      wire.classList.toggle('learn-wire-lit', at <= stage);
      wire.classList.toggle('learn-wire-flow', at === stage && !reducedMotion.matches);
    });

    root.querySelectorAll('.learn-stage-dots span').forEach((dot, index) => {
      dot.classList.toggle('active', index <= stage);
    });

    $('learnFlowStatus').textContent = stage < 0 ? 'Press Play to propagate activations through each layer.' : stageText[stage];
    $('learnStep').textContent = stage === 3 ? 'Start again →' : 'One step →';
  }

  function stop() {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    root.classList.add('learn-is-paused');
    $('learnPlay').innerHTML = '<span aria-hidden="true">▶</span> Play signal';
    $('learnPlay').setAttribute('aria-pressed', 'false');
  }

  function step() {
    stage = stage >= 3 ? 0 : stage + 1;
    renderStage();
  }

  function playNext() {
    if (root.hidden || document.hidden) {
      stop();
      return;
    }
    step();
    if (stage === 3) {
      timer = window.setTimeout(stop, 1400);
      return;
    }
    timer = window.setTimeout(playNext, 1400);
  }

  // EVENT LISTENERS FOR CONTROLS
  $('learnPlay').addEventListener('click', () => {
    if (timer !== null) {
      stop();
      return;
    }
    if (stage === 3) stage = -1;
    root.classList.remove('learn-is-paused');
    $('learnPlay').innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
    $('learnPlay').setAttribute('aria-pressed', 'true');
    playNext();
  });

  $('learnStep').addEventListener('click', () => {
    stop();
    step();
  });

  $('learnReset').addEventListener('click', () => {
    stop();
    stage = -1;
    selected = null;
    $('learnCloud').value = '0.7';
    $('learnRain').value = '0.4';
    $('learnOffset').value = '0';
    $('learnInspectorTitle').textContent = 'Neuron Telemetry & Activation';
    $('learnInspectorText').textContent = 'Each neuron computes a linear combination of inputs: y = clip(W·x + b). Brighter nodes reflect higher activation magnitudes.';
    renderValues();
    renderStage();
  });

  ['learnCloud', 'learnRain', 'learnOffset'].forEach(id => {
    $(id).addEventListener('input', () => {
      stop();
      stage = 3;
      renderValues();
      renderStage();
      $('learnFlowStatus').textContent = id === 'learnOffset'
        ? 'Intervention offset applied at Neuron A. Downstream signals recomputed.'
        : 'Input clues updated. Forward activations recomputed across layers.';
    });
  });

  nodes.forEach(node => {
    node.addEventListener('click', () => {
      selected = node.dataset.node;
      renderValues();
    });
  });

  // CHAPTER 02: TRAINING LOOP
  const trainingText = [
    '1 / 4 · Forward pass: Input passes through layers to generate prediction logits ŷ.',
    '2 / 4 · Loss evaluation: Objective function L(ŷ, y) measures divergence against target.',
    '3 / 4 · Backpropagation: Chain rule calculates error gradients ∂L/∂W backward through network.',
    '4 / 4 · Optimizer update: Optimizer applies gradient step W ← W − η∇W to tune weights.'
  ];

  $('learnTrainingStep').addEventListener('click', () => {
    trainingStage = (trainingStage + 1) % 4;
    $('learnTrainingFlow').dataset.stage = String(trainingStage);
    $('learnTrainingText').textContent = trainingText[trainingStage];
    $('learnTrainingStep').textContent = trainingStage === 3 ? 'Follow the loop again →' : 'Next training step →';
  });

  // CHAPTER 03: TOKEN GENERATION
  $('learnTokenButton').addEventListener('click', () => {
    tokenAdded = !tokenAdded;
    const token = root.querySelector('.learn-token-question');
    token.textContent = tokenAdded ? 'mat' : '?';
    token.classList.toggle('learn-token-arrived', tokenAdded);
    $('learnTokenButton').textContent = tokenAdded ? 'Reset sequence ↺' : 'Sample next token →';
    $('learnTokenStatus').textContent = tokenAdded
      ? 'Token "mat" (64% probability) sampled and appended to context window (N → N+1).'
      : 'Logit distribution evaluated across vocabulary. Candidate tokens scored by Softmax probability.';
  });

  // VIEW CHANGE CLEANUP
  ['bravenewworld:viewchange', 'terraincognita:viewchange', 'uncharted:viewchange'].forEach(name => {
    document.addEventListener(name, event => {
      if (event.detail?.view !== 'learn') stop();
    });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });

  // INITIAL RENDER
  renderValues();
  renderStage();
})();
