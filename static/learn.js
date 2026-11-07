(() => {
  'use strict';
  const root = document.getElementById('learnView');
  if (!root) return;
  root.innerHTML = `
    <section class="learn-intro">
      <div><p class="eyebrow">A FIELD GUIDE TO THE WORLD INSIDE</p><h1 id="learnTitle" tabindex="-1">It starts with<br><em>a little signal.</em></h1><p class="learn-lede">You do not need to know the maths to start exploring.<br>A few small experiments can make the invisible feel tangible.</p></div>
      <div class="learn-intro-art" aria-hidden="true"><div class="learn-orbit orbit-one"></div><div class="learn-orbit orbit-two"></div><span class="learn-art-dot dot-one"></span><span class="learn-art-dot dot-two"></span><span class="learn-art-dot dot-three"></span><span class="learn-art-core">0.7<small>a signal, not a thought</small></span></div>
    </section>
    <nav class="learn-chapters" aria-label="Learning chapters"><a href="#learnSignals"><span>01</span> Follow a signal</a><a href="#learnTraining"><span>02</span> Learning vs. answering</a><a href="#learnLanguage"><span>03</span> From signals to words</a><a href="#learnResearch"><span>04</span> Open the black box</a></nav>

    <section id="learnSignals" class="learn-chapter" aria-labelledby="learnSignalTitle">
      <div class="learn-chapter-heading"><span class="learn-chapter-number">01 / FOLLOW A SIGNAL</span><h2 id="learnSignalTitle">Many small calculations.<br>One useful answer.</h2><p>Imagine a tiny network deciding whether to suggest an umbrella. It receives clues about the weather, combines them, and produces two scores. Watch the numbers travel.</p></div>
      <div class="learn-lab">
        <div class="learn-lab-top"><div><span class="learn-tag">INTERACTIVE ILLUSTRATION</span><h3>A tiny weather network</h3></div><span class="learn-lab-note">Hand-designed teaching example · not Qwen</span></div>
        <div class="learn-inputs"><label for="learnCloud">Cloud cover <span id="learnCloudValue">70%</span><input id="learnCloud" type="range" min="0" max="1" value="0.7" step="0.1"><small>Clear sky <span>Heavy clouds</span></small></label><label for="learnRain">Chance of rain <span id="learnRainValue">40%</span><input id="learnRain" type="range" min="0" max="1" value="0.4" step="0.1"><small>Unlikely <span>Very likely</span></small></label></div>
        <div class="learn-network-wrap">
          <div class="learn-network" id="learnNetwork">
            <svg class="learn-wires" viewBox="0 0 800 260" preserveAspectRatio="none" aria-hidden="true"><g data-wire-stage="1"><path d="M85 70 L295 70 M85 70 L295 190 M85 190 L295 70 M85 190 L295 190"/></g><g data-wire-stage="2"><path d="M295 70 L505 70 M295 70 L505 190 M295 190 L505 70 M295 190 L505 190"/></g><g data-wire-stage="3"><path d="M505 70 L715 70 M505 70 L715 190 M505 190 L715 70 M505 190 L715 190"/></g></svg>
            <div class="learn-network-column" data-column="0"><span class="learn-column-label">INPUT CLUES</span><button class="learn-node" type="button" data-node="cloud"><span class="learn-node-value">0.70</span><span class="learn-node-name">Clouds</span></button><button class="learn-node" type="button" data-node="rain"><span class="learn-node-value">0.40</span><span class="learn-node-name">Rain</span></button></div>
            <div class="learn-network-column" data-column="1"><span class="learn-column-label">LAYER 1</span><button class="learn-node learn-node-intervention" type="button" data-node="a"><span class="learn-node-value">0.65</span><span class="learn-node-name">Neuron A</span></button><button class="learn-node" type="button" data-node="b"><span class="learn-node-value">0.27</span><span class="learn-node-name">Neuron B</span></button></div>
            <div class="learn-network-column" data-column="2"><span class="learn-column-label">LAYER 2</span><button class="learn-node" type="button" data-node="c"><span class="learn-node-value">0.62</span><span class="learn-node-name">Neuron C</span></button><button class="learn-node" type="button" data-node="d"><span class="learn-node-value">0.26</span><span class="learn-node-name">Neuron D</span></button></div>
            <div class="learn-network-column" data-column="3"><span class="learn-column-label">OUTPUT SCORES</span><button class="learn-node" type="button" data-node="umbrella"><span class="learn-node-value">0.70</span><span class="learn-node-name">Umbrella</span></button><button class="learn-node" type="button" data-node="walk"><span class="learn-node-value">0.41</span><span class="learn-node-name">No umbrella</span></button></div>
          </div>
        </div>
        <div class="learn-stage-line"><div class="learn-stage-dots" aria-hidden="true"><span></span><span></span><span></span><span></span></div><p id="learnFlowStatus" role="status">Press Play to follow the clues from left to right.</p></div>
        <div class="learn-flow-controls"><button class="learn-button learn-button-primary" id="learnPlay" type="button"><span aria-hidden="true">▶</span> Play signal</button><button class="learn-button" id="learnStep" type="button">One step →</button><button class="learn-button learn-button-quiet" id="learnReset" type="button">Reset illustration</button><span>Click any circle to inspect its signal.</span></div>
        <div class="learn-inspector" id="learnInspector"><span class="learn-inspector-icon" aria-hidden="true">↳</span><div><h4 id="learnInspectorTitle">A neuron is a tiny calculator.</h4><p id="learnInspectorText">It combines incoming numbers, gives some connections more influence than others, and produces a new number. That output number is its activation. A brighter circle here means a larger activation.</p></div></div>
        <div class="learn-intervention"><div><span class="learn-tag">YOUR FIRST INTERVENTION</span><h3>Turn one signal up. What follows?</h3><p>Keep the weather the same. Add a small offset to neuron A and watch the later layers change. The inputs and neuron B stay the same.</p></div><div class="learn-intervention-control"><label for="learnOffset">Adjustment to neuron A <output id="learnOffsetValue">0.00</output></label><input id="learnOffset" type="range" min="-0.6" max="0.6" value="0" step="0.1"><div class="learn-slider-ends"><span>−0.6 · turn down</span><span>+0.6 · turn up</span></div><p id="learnOutcome" role="status">Run the illustration to compare the output scores.</p></div></div>
        <details class="learn-calculation"><summary>Curious about the calculation?</summary><div><p>A <strong>weight</strong> is a connection's influence: it can strengthen, weaken, or oppose an incoming signal. A <strong>bias</strong> is an extra offset. An <strong>activation function</strong> transforms the total; this toy clips it between 0 and 1.</p><p class="learn-equation">Neuron A = clip(0.9 × clouds + 0.8 × rain − 0.3 + your adjustment)</p><p id="learnCalculation">With these clues: clip(0.9 × 0.70 + 0.8 × 0.40 − 0.3) = 0.65.</p><p>Layers repeat this pattern: combine signals, transform them, pass the results onward. The numbers and connection rules here were chosen by us for teaching. Real networks learn their weights from data, and their activations are not generally limited to 0–1.</p></div></details>
      </div>
      <div class="learn-key-ideas"><article><span>NEURON</span><h3>A calculation, not a little person.</h3><p>It has no independent opinion. Its number matters through its connections to the rest of the network.</p></article><article><span>LAYER</span><h3>A group working on signals.</h3><p>Many neurons transform information together. Later layers can combine patterns from earlier ones.</p></article><article><span>ACTIVATION</span><h3>The signal right now.</h3><p>It changes with the input. A weight is a learned setting; an activation is a temporary result.</p></article></div>
    </section>

    <section id="learnTraining" class="learn-chapter" aria-labelledby="learnTrainingTitle">
      <div class="learn-chapter-heading"><span class="learn-chapter-number">02 / LEARNING VS. ANSWERING</span><h2 id="learnTrainingTitle">Practice changes the settings.<br>Answering uses them.</h2><p>These are two different moments in a model's life. The sliders on our Experiment page act while it answers.</p></div>
      <div class="learn-lifecycle">
        <article class="learn-lifecycle-card"><div class="learn-lifecycle-heading"><span class="learn-tag">INFERENCE</span><span class="learn-pill">What happens when you ask</span></div><h3>The forward journey</h3><div class="learn-mini-flow" aria-label="Input flows forward through the network to an answer"><span>Your input</span><b aria-hidden="true">→</b><span>Network</span><b aria-hidden="true">→</b><span>An answer</span></div><p>Signals travel forward through the model. The weights normally stay fixed. No answer key is needed, and the model is not automatically learning from this exchange.</p><div class="learn-small-note">In a language model, this forward process repeats as it generates new tokens.</div></article>
        <article class="learn-lifecycle-card learn-training-card"><div class="learn-lifecycle-heading"><span class="learn-tag">TRAINING</span><span class="learn-pill">What happens during practice</span></div><h3>Feedback travels backward</h3><div class="learn-training-flow" id="learnTrainingFlow"><div class="learn-mini-flow"><span data-training-node="0">Network</span><b class="learn-training-arrow" aria-hidden="true">→</b><span data-training-node="1">Prediction</span><b class="learn-training-arrow" aria-hidden="true">→</b><span data-training-node="2">Target</span></div><div class="learn-feedback-path" aria-hidden="true"><span>←</span> error feedback</div></div><p id="learnTrainingText" role="status">First, make a prediction. Then compare it with a training target, such as the next token in an example.</p><button id="learnTrainingStep" class="learn-button" type="button">Follow the training loop →</button><p class="learn-small-note">Backpropagation calculates how weights contributed to the error. An optimizer uses that information to adjust them. It is not neurons' activations flowing backward during inference.</p></article>
      </div>
    </section>

    <section id="learnLanguage" class="learn-chapter" aria-labelledby="learnLanguageTitle">
      <div class="learn-chapter-heading"><span class="learn-chapter-number">03 / FROM SIGNALS TO WORDS</span><h2 id="learnLanguageTitle">How does that become<br>a conversation?</h2><p>A language model turns pieces of text into numbers, transforms those numbers, then scores possible next pieces of text.</p></div>
      <div class="learn-language-card"><div class="learn-token-scene"><span class="learn-tag">A SENTENCE IN PROGRESS</span><div id="learnTokens" class="learn-tokens" aria-label="Illustrative text pieces"><span>The</span><span>cat</span><span>sat</span><span>on</span><span>the</span><span class="learn-token-question">?</span></div><p>Text is split into <strong>tokens</strong>: pieces that can be words, parts of words, or punctuation. These boxes are simplified; a real tokenizer may split text differently.</p></div><div class="learn-language-route"><div><span class="learn-route-number">1</span><h3>Give the text numbers</h3><p>Each token becomes a list of numbers that the network can work with.</p></div><span class="learn-route-arrow" aria-hidden="true">→</span><div><span class="learn-route-number">2</span><h3>Build the context</h3><p>Repeated transformer blocks update those numbers using the text so far.</p></div><span class="learn-route-arrow" aria-hidden="true">→</span><div><span class="learn-route-number">3</span><h3>Score the next token</h3><p>A final readout scores possibilities. The model selects one, adds it, and repeats.</p></div></div><div class="learn-next-token"><div class="learn-word-scores" aria-label="Invented next-token scores for illustration"><div><span>mat</span><i></i><small>higher</small></div><div><span>sofa</span><i></i><small></small></div><div><span>moon</span><i></i><small>lower</small></div></div><div><button class="learn-button learn-button-primary" id="learnTokenButton" type="button">Add a possible next token →</button><p id="learnTokenStatus" role="status">Illustrative scores, not a live model prediction. A higher score makes a token more likely, not certain.</p></div></div></div>
      <div class="learn-transformer"><div><span class="learn-tag">A CLOSER LOOK AT ONE BLOCK</span><h3>Layers are not labelled drawers of knowledge.</h3><p>In the Qwen model we use, 32 transformer blocks repeatedly transform the text's representation. Each block mixes information from the context, then transforms the signals with an MLP. Qwen uses more than one way to mix context. Signals also carry forward through shortcut paths.</p><p>There is no universal rule that “layer 1 learns grammar” or “layer 14 stores personality.” Meanings can be spread across many neurons, and one neuron can participate in several patterns.</p></div><div class="learn-block-illustration" aria-label="A simplified transformer block: incoming representation, context mixing, MLP transformation, then an updated representation. A shortcut carries information alongside the transformations."><span class="learn-block-end">Representation in</span><div class="learn-block-path"><span class="learn-shortcut">shortcut ↓</span><div class="learn-block-step"><span>01</span><div><strong>Mix the context</strong><small>Bring information together from the text.</small></div></div><span class="learn-block-arrow" aria-hidden="true">↓</span><div class="learn-block-step learn-block-mlp"><span>02</span><div><strong>MLP · neuron calculations</strong><small>Transform the signals at each position.</small></div></div></div><span class="learn-block-end">Updated representation → next block</span><small>Simplified diagram; details vary across blocks.</small></div></div>
    </section>

    <section id="learnResearch" class="learn-chapter learn-research" aria-labelledby="learnResearchTitle"><div class="learn-chapter-heading"><span class="learn-chapter-number">04 / OPEN THE BLACK BOX</span><h2 id="learnResearchTitle">You can ask more than<br><em>“What did it say?”</em></h2><p>Interpretability research asks what happens inside a model and how those internal processes shape its behavior.</p></div><div class="learn-research-steps"><article><span>01</span><h3>Notice a pattern</h3><p>Does a signal tend to change for certain kinds of input? That is a clue, not yet an explanation.</p></article><article><span>02</span><h3>Change one thing</h3><p>Alter an internal activation while keeping the question and generation settings fixed.</p></article><article><span>03</span><h3>Test your explanation</h3><p>Compare outputs. Try other questions. Look for cases where your explanation fails.</p></article></div><div class="learn-final-note"><p>Changing a signal and seeing an effect gives evidence of influence. It does not prove that a single neuron owns a concept, or that we have explained the whole model.</p><a class="learn-button learn-button-primary" href="#experiment" data-view-target="experiment">Try it inside a real model <span aria-hidden="true">↗</span></a><small>Your next step: adjust two real Qwen neurons and compare what happens.</small></div></section>
  `;

  const $ = id => document.getElementById(id);
  const clamp = value => Math.max(0, Math.min(1, value));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let stage = -1;
  let timer = null;
  let selected = null;
  let trainingStage = -1;
  let tokenAdded = false;
  const nodes = [...root.querySelectorAll('[data-node]')];
  const labels = { cloud: 'Cloud cover', rain: 'Chance of rain', a: 'Neuron A · layer 1', b: 'Neuron B · layer 1', c: 'Neuron C · layer 2', d: 'Neuron D · layer 2', umbrella: 'Umbrella · output score', walk: 'No umbrella · output score' };
  const explanations = {
    cloud: 'This is an input clue, turned into a number. The slider changes the clue itself. It is not a hidden neuron or a learned weight.',
    rain: 'This second input clue joins the first. More than one clue can influence each neuron in the next layer.',
    a: 'This neuron combines both weather clues using fixed connection strengths. Your adjustment is added here. Its changed signal can affect both neurons in the next layer.',
    b: 'This neuron combines the same clues in a different way. Adjusting A does not change B: neither receives the other’s output.',
    c: 'This neuron combines A and B. Its activation can change even though you only touched a neuron in the earlier layer.',
    d: 'This neuron combines A and B with different influences. A larger A signal can reduce D’s activation in this toy.',
    umbrella: 'This score combines the last layer’s signals. A larger score makes this option the toy network’s preference. It is not a measured probability of rain.',
    walk: 'This competing score also depends on the last layer. Comparing the two scores gives the toy’s choice; both can change after an intervention.'
  };

  function calculate(offset = Number($('learnOffset').value)) {
    const cloud = Number($('learnCloud').value);
    const rain = Number($('learnRain').value);
    const a = clamp(0.9 * cloud + 0.8 * rain - 0.3 + offset);
    const b = clamp(1 - 0.7 * cloud - 0.6 * rain);
    const c = clamp(0.85 * a + 0.25 * b);
    const d = clamp(0.9 * b - 0.2 * a + 0.15);
    return { cloud, rain, a, b, c, d, umbrella: clamp(0.2 + 0.8 * c - 0.1 * d), walk: clamp(0.2 + 0.8 * d - 0.1 * c) };
  }
  function preference(values) {
    if (Math.abs(values.umbrella - values.walk) < 0.005) return 'the two choices are tied';
    return values.umbrella > values.walk ? 'umbrella has the higher score' : 'no umbrella has the higher score';
  }
  function updateInspector(values) {
    if (!selected) return;
    $('learnInspectorTitle').textContent = `${labels[selected]} · ${values[selected].toFixed(2)}`;
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
      node.setAttribute('aria-label', `${labels[key]}, activation ${values[key].toFixed(2)}. Inspect this signal.`);
      node.setAttribute('aria-pressed', String(selected === key));
      node.classList.toggle('learn-node-changed', Math.abs(values[key] - baseline[key]) > 0.0001);
    }
    $('learnCalculation').textContent = `With these clues: clip(0.9 × ${values.cloud.toFixed(2)} + 0.8 × ${values.rain.toFixed(2)} − 0.3 ${offset < 0 ? '−' : '+'} ${Math.abs(offset).toFixed(2)}) = ${values.a.toFixed(2)}.`;
    $('learnOutcome').textContent = offset === 0
      ? `No adjustment: ${preference(values)} (${values.umbrella.toFixed(2)} vs. ${values.walk.toFixed(2)}). Try turning A down.`
      : `Before: ${preference(baseline)}. Now: ${preference(values)} (${values.umbrella.toFixed(2)} vs. ${values.walk.toFixed(2)}). Outlined circles show changed signals.`;
    updateInspector(values);
    return values;
  }
  const stageText = [
    '1 / 4 · The weather clues become numbers. They are the input to the network.',
    '2 / 4 · Layer 1 combines the input clues. Every neuron applies its own connection strengths.',
    '3 / 4 · Layer 2 combines the previous layer’s activations into new signals.',
    '4 / 4 · The output layer turns those signals into two scores. The weights did not change.'
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
    root.querySelectorAll('.learn-stage-dots span').forEach((dot, index) => dot.classList.toggle('active', index <= stage));
    $('learnFlowStatus').textContent = stage < 0 ? 'Press Play to follow the clues from left to right.' : stageText[stage];
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
    if (root.hidden || document.hidden) { stop(); return; }
    step();
    if (stage === 3) { timer = window.setTimeout(stop, 1450); return; }
    timer = window.setTimeout(playNext, 1450);
  }
  $('learnPlay').addEventListener('click', () => {
    if (timer !== null) { stop(); return; }
    if (stage === 3) stage = -1;
    root.classList.remove('learn-is-paused');
    $('learnPlay').innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
    $('learnPlay').setAttribute('aria-pressed', 'true');
    playNext();
  });
  $('learnStep').addEventListener('click', () => { stop(); step(); });
  $('learnReset').addEventListener('click', () => {
    stop(); stage = -1; selected = null;
    $('learnCloud').value = '0.7'; $('learnRain').value = '0.4'; $('learnOffset').value = '0';
    $('learnInspectorTitle').textContent = 'A neuron is a tiny calculator.';
    $('learnInspectorText').textContent = 'It combines incoming numbers, gives some connections more influence than others, and produces a new number. That output number is its activation. A brighter circle here means a larger activation.';
    renderValues(); renderStage();
  });
  ['learnCloud', 'learnRain', 'learnOffset'].forEach(id => $(id).addEventListener('input', () => {
    stop(); stage = 3; renderValues(); renderStage();
    $('learnFlowStatus').textContent = id === 'learnOffset' ? 'Intervention applied at A. Only A and downstream signals can change; the weather inputs and B stay fixed.' : 'New input, new activations. The network’s connection strengths are unchanged.';
  }));
  nodes.forEach(node => node.addEventListener('click', () => { selected = node.dataset.node; renderValues(); }));

  const trainingText = [
    '1 / 4 · Forward pass: the network uses its current weights to make a prediction.',
    '2 / 4 · Compare: a loss function measures how far the prediction is from the training target.',
    '3 / 4 · Backpropagation: calculate backward through the computation how changing each weight would affect that error.',
    '4 / 4 · Update: an optimizer nudges the weights using that feedback. The next example gets a new forward pass.'
  ];
  $('learnTrainingStep').addEventListener('click', () => {
    trainingStage = (trainingStage + 1) % 4;
    $('learnTrainingFlow').dataset.stage = String(trainingStage);
    $('learnTrainingText').textContent = trainingText[trainingStage];
    $('learnTrainingStep').textContent = trainingStage === 3 ? 'Follow the loop again →' : 'Next training step →';
  });
  $('learnTokenButton').addEventListener('click', () => {
    tokenAdded = !tokenAdded;
    const token = root.querySelector('.learn-token-question');
    token.textContent = tokenAdded ? 'mat' : '?';
    token.classList.toggle('learn-token-arrived', tokenAdded);
    $('learnTokenButton').textContent = tokenAdded ? 'Reset the example ↺' : 'Add a possible next token →';
    $('learnTokenStatus').textContent = tokenAdded ? '“mat” joins the context. To continue, the model runs forward again and scores the next token using the longer text. This example is an illustration, not live inference.' : 'Illustrative scores, not a live model prediction. A higher score makes a token more likely, not certain.';
  });
  document.addEventListener('uncharted:viewchange', event => { if (event.detail?.view !== 'learn') stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  renderValues(); renderStage();
})();
