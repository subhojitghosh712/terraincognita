'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const prompts = {
    cat: 'Write a short story about a cat.',
    thanks: 'Write a thank-you note to a colleague who covered my shift.',
    welcome: 'Write a warm welcome message for a new teammate.'
  };
  const conditions = { original: [0, 0], a: [1, 0], b: [0, -1], both: [1, -1] };
  const state = {
    server: null, busy: false, job: null, source: null, pollTimer: null,
    record: null, snapshot: null, outputs: {}, lastEvent: 0,
    guide: false, records: [], recovering: false, cancelling: false,
    submitting: false, statusFailures: 0, nextStatusTimer: null,
    guideNotes: new Map(), guideKey: null
  };
  const signed = (value) => Number(value) === 0 ? '0.0' : `${Number(value) < 0 ? '−' : '+'}${Math.abs(Number(value)).toFixed(1)}`;
  const readable = (error) => error instanceof Error ? error.message : String(error);

  function storageGet() { try { return sessionStorage.getItem('uncharted-active-job'); } catch { return null; } }
  function storageSet(value) { try { if (value) sessionStorage.setItem('uncharted-active-job', value); else sessionStorage.removeItem('uncharted-active-job'); } catch { /* Storage may be unavailable in private browsing. */ } }

  async function request(path, options = {}) {
    const response = await fetch(path, { signal: AbortSignal.timeout(15000), ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    let data;
    try { data = await response.json(); } catch { throw new Error(`The server returned an unreadable response (${response.status}).`); }
    if (!response.ok) {
      let message = data.detail || data.message || `Request failed (${response.status}).`;
      if (Array.isArray(message)) message = message.map((item) => item.msg || JSON.stringify(item)).join('; ');
      const error = new Error(typeof message === 'string' ? message : JSON.stringify(message));
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function setError(message) {
    $('errorBox').textContent = message || '';
    $('errorBox').hidden = !message;
  }

  function announce(message) { $('runStatus').textContent = message; }

  function currentSettings() {
    return { prompt: $('prompt').value.trim(), dose_a: Number($('doseA').value), dose_b: Number($('doseB').value), seed: Number($('seed').value) };
  }

  function conditionFor(record) {
    const snapshot = record.snapshot || record;
    return Object.keys(conditions).find((key) => conditions[key][0] === snapshot.dose_a && conditions[key][1] === snapshot.dose_b) || 'custom';
  }

  function updateControls() {
    const current = currentSettings();
    ['A', 'B'].forEach((letter) => {
      const input = $(`dose${letter}`);
      const value = Number(input.value);
      const output = $(`dose${letter}Value`);
      output.replaceChildren(document.createTextNode(signed(value)));
      const suffix = document.createElement('span'); suffix.textContent = 'dose'; output.appendChild(suffix);
      const range = Number(input.max) - Number(input.min);
      const fill = letter === 'B' ? (Number(input.max) - value) / range : (value - Number(input.min)) / range;
      input.style.setProperty('--fill', `${fill * 100}%`);
      input.setAttribute('aria-valuetext', `${signed(value)} normalized dose${value === 0 ? ', unchanged' : ''}`);
      const neuron = state.server?.neurons?.find((item) => item.key === letter.toLowerCase());
      if (neuron && Number.isFinite(neuron.delta_per_dose)) {
        const delta = value * neuron.delta_per_dose;
        $(`dose${letter}Description`).textContent = value === 0 ? 'No activation adjustment' : `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(2)} added to the natural activation`;
      }
    });
    document.querySelectorAll('[data-condition]').forEach((button) => {
      const pair = conditions[button.dataset.condition];
      const active = pair[0] === current.dose_a && pair[1] === current.dose_b;
      button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
    });
    const maxLength = state.server?.settings?.max_prompt_chars || 2000;
    $('promptCount').textContent = `${$('prompt').value.length.toLocaleString()} / ${maxLength.toLocaleString()}`;
    $('prompt').maxLength = maxLength;
    const snapshot = state.snapshot;
    $('editedNote').hidden = !snapshot || (current.prompt === snapshot.prompt && current.dose_a === snapshot.dose_a && current.dose_b === snapshot.dose_b && current.seed === snapshot.seed);
    if (!snapshot && !state.busy) {
      const unchanged = current.dose_a === 0 && current.dose_b === 0;
      $('steeredTitle').textContent = unchanged ? 'Comparison' : 'Steered';
      $('steeredLabel').textContent = unchanged ? 'NO INTERVENTION' : 'YOUR INTERVENTION';
    }
    const displayedSettings = snapshot || current;
    const displayedUnchanged = displayedSettings.dose_a === 0 && displayedSettings.dose_b === 0;
    $('steeredEmpty').querySelector('p').textContent = displayedUnchanged ? 'Both neurons are unchanged.' : 'An intervention inside.';
    $('steeredEmpty').querySelector('small').textContent = displayedUnchanged
      ? (snapshot ? 'This condition applies no activation adjustment.' : 'Choose Both to try the published setting.')
      : (snapshot ? 'The selected settings are recorded above.' : 'See what changes outside.');
    updateGuide();
    updateRunAvailability();
  }

  function updateRunAvailability() {
    const ready = state.server?.state === 'ready';
    const elsewhere = state.server?.active_job && state.server.active_job !== state.job && !state.busy;
    $('experimentControls').disabled = state.busy;
    $('runButton').disabled = state.busy || !ready || Boolean(elsewhere);
    $('runLabel').textContent = state.busy ? (state.cancelling ? 'Stopping…' : 'Experiment running…') : elsewhere ? 'Another experiment is running' : ready ? 'Run experiment' : state.server?.state === 'learning_only' ? 'Experiments unavailable in learning mode' : state.server?.state === 'error' ? 'Model needs attention' : 'Waiting for model';
    $('stopButton').hidden = !state.busy || !state.job;
    $('stopButton').disabled = state.cancelling;
    $('stopButton').textContent = state.cancelling ? 'Stopping after the current token…' : 'Stop generation';
    $('retryLoadButton').hidden = state.server?.state !== 'error' || state.busy;
    document.querySelectorAll('[data-guide]').forEach((button) => { button.disabled = state.busy; });
    $('copyButton').disabled = !state.record?.snapshot || state.busy;
    $('downloadButton').disabled = !state.record?.snapshot || state.busy;
  }

  function setCondition(key) {
    if (state.busy || !conditions[key]) return;
    $('doseA').value = conditions[key][0]; $('doseB').value = conditions[key][1];
    updateControls();
  }

  async function pollStatus() {
    try {
      const server = await request('/api/status');
      const previousState = state.server?.state;
      if (state.statusFailures > 0 || (previousState === 'error' && server.state !== 'error')) setError(null);
      state.server = server; state.statusFailures = 0;
      $('statusDot').className = `status-dot ${['ready', 'learning_only'].includes(server.state) ? 'ready' : server.state === 'error' ? 'error' : 'loading'}`;
      $('modelStatus').textContent = server.state === 'learning_only' ? 'Learning mode · no model' : server.state === 'ready' ? 'Qwen3.5 · 4B · local' : server.state === 'loading' ? 'Loading Qwen3.5 into memory' : server.state === 'error' ? 'Model could not load' : 'Model is starting';
      $('runContextLabel').textContent = server.state === 'learning_only' ? 'Explore Learn; real inference needs the full Mac setup.' : 'Real inference · runs on this Mac';
      if (server.state === 'error' && !state.busy) setError(server.error || 'Model loading failed. Use Retry loading the model to try again.');
      $('calibrationNote').textContent = `Calibration source: ${server.calibration_source || 'local model calibration'}. Layers are zero-indexed; the neuron values refer to the MLP before its down projection.`;
      const settings = server.settings || {};
      $('generationSummary').textContent = `Maximum ${settings.max_new_tokens || 128} new tokens · temperature ${settings.temperature ?? '—'} · top-p ${settings.top_p ?? '—'}. Both responses use the same seed and the same request for short, complete sentences.`;
      if (server.active_job && !state.busy && !state.job) restoreActive(server.active_job);
      updateControls();
    } catch (error) {
      state.statusFailures++;
      $('statusDot').className = 'status-dot error'; $('modelStatus').textContent = 'Local server is unreachable';
      if (!state.busy) { state.server = null; updateRunAvailability(); setError(`Cannot reach the local server. Keep the app's launcher running. ${readable(error)}`); }
    }
    clearTimeout(state.nextStatusTimer);
    state.nextStatusTimer = setTimeout(pollStatus, ['ready', 'learning_only'].includes(state.server?.state) ? 5000 : 2000);
  }

  function showSnapshot(snapshot) {
    if (!snapshot) return;
    state.snapshot = snapshot;
    $('recordContext').hidden = false;
    $('recordPrompt').textContent = snapshot.prompt;
    $('recordDoses').textContent = `A ${signed(snapshot.dose_a)} · B ${signed(snapshot.dose_b)}`;
    $('recordSeed').textContent = `seed ${snapshot.seed}`;
    $('steeredTitle').textContent = snapshot.dose_a === 0 && snapshot.dose_b === 0 ? 'Comparison' : 'Steered';
    $('steeredLabel').textContent = `A ${signed(snapshot.dose_a)} · B ${signed(snapshot.dose_b)}`;
    $('recordDetails').hidden = false;
    const items = [
      ['Model', snapshot.model_name || 'Qwen3.5-4B'],
      ['Revision', snapshot.revision || 'Not supplied'],
      ['Intervention', (snapshot.neurons || []).map((neuron) => `L${neuron.layer} / N${neuron.index}: dose ${signed(neuron.dose)}, Δ ${Number(neuron.delta).toFixed(4)}`).join('; ') || `A ${signed(snapshot.dose_a)}, B ${signed(snapshot.dose_b)}`],
      ['Sampling', `Temperature ${snapshot.settings?.temperature ?? '—'} · top-p ${snapshot.settings?.top_p ?? '—'} · max ${snapshot.settings?.max_new_tokens ?? '—'} new tokens`],
      ['Shared instruction', snapshot.settings?.system_instruction || 'Not supplied'],
      ['Calibration', snapshot.calibration_source || state.server?.calibration_source || 'Not supplied'],
      ['Experiment', snapshot.id || state.job || '—']
    ];
    const list = $('recordDetailsList'); list.replaceChildren();
    items.forEach(([label, value]) => { const term = document.createElement('dt'); term.textContent = label; const definition = document.createElement('dd'); definition.textContent = value; list.append(term, definition); });
    updateControls();
  }

  function clearOutputs() {
    state.outputs = {};
    ['baseline', 'steered'].forEach((side) => {
      $(`${side}Text`).textContent = ''; $(`${side}Text`).hidden = true; $(`${side}Text`).classList.remove('streaming');
      $(`${side}Empty`).hidden = false; $(`${side}Meta`).textContent = ''; $(`${side}Meta`).className = 'response-meta';
    });
  }

  function renderResult(side, result) {
    if (!['baseline', 'steered'].includes(side) || !result) return;
    state.outputs[side] = result;
    const text = $(`${side}Text`);
    text.textContent = result.text || ''; text.hidden = false; text.classList.remove('streaming');
    $(`${side}Empty`).hidden = true;
    const parts = [];
    if (result.cached) parts.push('CACHED · no new generation');
    else if (Number.isFinite(result.seconds)) parts.push(`${result.seconds.toFixed(1)}s`);
    if (Number.isFinite(result.tokens)) parts.push(`${result.tokens} tokens`);
    const meta = $(`${side}Meta`); meta.className = 'response-meta';
    if (result.finish_reason === 'length') { parts.push('Token limit reached · answer may be incomplete'); meta.classList.add('warning'); }
    else if (result.finish_reason === 'cancelled') { parts.push('Stopped · partial answer'); meta.classList.add('cancelled'); }
    else if (result.finish_reason === 'stop') parts.push('Finished naturally');
    meta.textContent = parts.join(' · ');
  }

  function closeStream() {
    if (state.source) state.source.close();
    state.source = null; clearTimeout(state.pollTimer); state.pollTimer = null;
  }

  function finish(record) {
    closeStream();
    state.busy = false; state.recovering = false; state.cancelling = false; state.submitting = false;
    state.record = record; state.job = null; storageSet(null);
    if (state.server) state.server.active_job = null;
    if (record.snapshot) showSnapshot(record.snapshot);
    ['baseline', 'steered'].forEach((side) => {
      $(`${side}Text`).classList.remove('streaming');
      if (record.outputs?.[side]) renderResult(side, record.outputs[side]);
      else if (record.status !== 'complete') $(`${side}Meta`).textContent = $(`${side}Text`).textContent ? 'Interrupted · no completed result' : 'Not generated';
    });
    $('resultBadge').classList.remove('running');
    if (record.status === 'complete') {
      $('resultBadge').textContent = 'EXPERIMENT COMPLETE';
      announce('Experiment complete. Compare what changed, then test your explanation with another question.');
      if (!state.records.some((item) => item.id === record.id)) state.records.push(record);
    } else if (record.status === 'cancelled') {
      $('resultBadge').textContent = 'EXPERIMENT STOPPED';
      announce('Generation stopped. Any partial response is preserved; the next run starts fresh.');
    } else {
      $('resultBadge').textContent = 'EXPERIMENT FAILED';
      setError(record.message || 'The experiment failed. You can retry after checking the local server.');
      announce('The experiment did not finish. Any available output has been preserved.');
    }
    $('recordTime').textContent = record.completed_at ? `Recorded ${formatDate(record.completed_at)}` : 'Experiment record available below.';
    updateControls();
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? value : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function onEvent(name, event) {
    if (!state.busy) return;
    if (event.lastEventId) {
      const eventId = Number(event.lastEventId);
      if (Number.isFinite(eventId)) { if (eventId <= state.lastEvent) return; state.lastEvent = eventId; }
    }
    let data;
    try { data = JSON.parse(event.data); } catch { recover('The live stream was interrupted. Recovering the experiment from the server…'); return; }
    if (name === 'snapshot') showSnapshot(data);
    if (name === 'phase') {
      const side = data.side;
      if (!['baseline', 'steered'].includes(side)) return;
      if (data.state === 'loading') announce('Loading the local model. This can take a moment on the first run.');
      else if (data.state === 'cached') announce(`${side === 'baseline' ? 'Original' : 'Steered'} response restored from a matching cached experiment.`);
      else if (data.state === 'generating') {
        announce(`Generating the ${side === 'baseline' ? 'original' : 'steered'} response locally…`);
        $(`${side}Empty`).hidden = true; $(`${side}Text`).hidden = false; $(`${side}Text`).classList.add('streaming');
        $(`${side}Meta`).textContent = 'Generating…';
      }
    }
    if (name === 'token' && ['baseline', 'steered'].includes(data.side) && typeof data.text === 'string') {
      $(`${data.side}Empty`).hidden = true; $(`${data.side}Text`).hidden = false;
      $(`${data.side}Text`).appendChild(document.createTextNode(data.text));
      $(`${data.side}Text`).classList.add('streaming');
    }
    if (name === 'result') renderResult(data.side, data);
    if (['complete', 'cancelled', 'failed'].includes(name)) finish(data);
  }

  function openStream(id) {
    closeStream(); state.lastEvent = 0;
    const source = new EventSource(`/api/experiments/${encodeURIComponent(id)}/events`);
    state.source = source;
    ['snapshot', 'phase', 'token', 'result', 'complete', 'cancelled', 'failed'].forEach((name) => source.addEventListener(name, (event) => {
      if (state.source === source && state.job === id) onEvent(name, event);
    }));
    source.onerror = () => { if (state.busy && state.job === id) recover('Live updates disconnected. Checking the experiment on the server…'); };
  }

  function recover(message) {
    if (!state.job || state.recovering) return;
    closeStream(); state.recovering = true;
    announce(message);
    pollExperiment(state.job);
  }

  async function restoreActive(id) {
    if (state.busy) return;
    state.busy = true; state.job = id; state.record = null; state.snapshot = null; storageSet(id);
    clearOutputs();
    $('resultBadge').textContent = 'RECOVERING EXPERIMENT'; $('resultBadge').classList.add('running');
    announce('Recovering an existing experiment from the local server…'); updateRunAvailability();
    try {
      const record = await request(`/api/experiments/${encodeURIComponent(id)}`);
      if (!state.busy || state.job !== id) return;
      if (record.snapshot) showSnapshot(record.snapshot);
      if (['complete', 'cancelled', 'failed'].includes(record.status)) finish(record);
      else openStream(id);
    } catch (error) {
      if (!state.busy || state.job !== id) return;
      if (error.status === 404) finish({ id, status: 'failed', snapshot: state.snapshot, outputs: {}, message: 'The previous experiment is no longer available. Run a new experiment when the model is ready.' });
      else recover('Waiting for the local server to recover the existing experiment…');
    }
  }

  async function pollExperiment(id) {
    if (!state.busy || state.job !== id) return;
    try {
      const record = await request(`/api/experiments/${encodeURIComponent(id)}`);
      if (!state.busy || state.job !== id) return;
      if (record.snapshot) showSnapshot(record.snapshot);
      ['baseline', 'steered'].forEach((side) => { if (record.outputs?.[side]) renderResult(side, record.outputs[side]); });
      if (['complete', 'cancelled', 'failed'].includes(record.status)) { setError(null); finish(record); return; }
      announce(state.cancelling ? 'Waiting for the server to stop generation…' : 'The experiment is still running. Recovering results without starting another run…');
    } catch (error) {
      if (!state.busy || state.job !== id) return;
      if (error.status === 404) {
        finish({ id, status: 'failed', snapshot: state.snapshot, outputs: state.outputs, message: 'This experiment is no longer available. The server may have restarted. Run a new experiment when the model is ready.' }); return;
      }
      announce('Connection lost. Keeping this experiment open and waiting for the local server…');
      setError(readable(error));
    }
    state.pollTimer = setTimeout(() => pollExperiment(id), 1500);
  }

  async function runExperiment(event) {
    event?.preventDefault();
    if (state.busy || state.submitting || !$('experimentForm').reportValidity()) return;
    const settings = currentSettings();
    if (!settings.prompt) { setError('Enter a question or choose a suggested prompt.'); $('prompt').focus(); return; }
    if (!Number.isInteger(settings.seed) || settings.seed < 0 || settings.seed > 2147483647) { setError('Choose a whole-number seed from 0 to 2147483647.'); return; }
    state.busy = true; state.submitting = true; state.record = null; state.snapshot = null; state.cancelling = false;
    setError(null); clearOutputs();
    $('recordContext').hidden = true; $('recordDetails').hidden = true;
    $('resultBadge').textContent = 'EXPERIMENT IN PROGRESS'; $('resultBadge').classList.add('running');
    $('recordTime').textContent = 'Both conditions use the same prompt and generation settings.';
    announce('Starting your experiment…'); updateRunAvailability();
    try {
      const data = await request('/api/experiments', { method: 'POST', body: JSON.stringify(settings) });
      state.job = data.id; state.submitting = false; storageSet(data.id);
      if (state.server) state.server.active_job = data.id;
      showSnapshot(data.snapshot); updateRunAvailability(); openStream(data.id);
    } catch (error) {
      state.busy = false; state.submitting = false;
      $('resultBadge').textContent = 'COULD NOT START'; $('resultBadge').classList.remove('running');
      setError(readable(error)); announce('The experiment could not be started. Check the message and try again.');
      updateRunAvailability();
    }
  }

  async function stopExperiment() {
    if (!state.job || state.cancelling) return;
    const id = state.job;
    state.cancelling = true; updateRunAvailability(); announce('Stopping after the current token. Partial responses will be preserved.');
    try { await request(`/api/experiments/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: '{}' }); }
    catch (error) {
      if (state.job !== id || !state.busy) return;
      state.cancelling = false; setError(`Could not confirm cancellation: ${readable(error)}`); updateRunAvailability(); recover('Checking the experiment status after the cancellation request…');
    }
  }

  function matchingGuideRecords() {
    const current = currentSettings();
    return state.records.filter((record) => record.snapshot?.prompt === current.prompt && record.snapshot?.seed === current.seed && record.status === 'complete');
  }

  function updateGuide() {
    const settings = currentSettings();
    const key = JSON.stringify([settings.prompt, settings.seed]);
    if (state.guideKey !== key) {
      if (state.guideKey) state.guideNotes.set(state.guideKey, { prediction: $('prediction').value, reflection: $('reflection').value });
      const notes = state.guideNotes.get(key);
      $('prediction').value = notes?.prediction || '';
      $('reflection').value = notes?.reflection || '';
      state.guideKey = key;
    }
    const records = matchingGuideRecords();
    let completed = 0;
    ['both', 'a', 'b'].forEach((key) => {
      const record = [...records].reverse().find((item) => conditionFor(item) === key);
      const button = document.querySelector(`[data-guide="${key}"]`);
      button.classList.toggle('done', Boolean(record));
      button.dataset.record = record?.id || '';
      document.querySelector(`[data-step-state="${key}"]`).textContent = record ? 'View recorded result' : 'Set this condition';
      document.querySelector(`[data-step-check="${key}"]`).textContent = record ? '✓' : '↗';
      if (record) completed++;
    });
    $('reflectionSection').hidden = completed !== 3;
    $('guideProgress').textContent = completed === 3 ? '3 of 3 conditions tested for this question. Compare the results, then try to find a question where your explanation fails.' : `${completed} of 3 conditions tested for this question and seed. Choose an untested condition, then press Run experiment.`;
  }

  function displayRecorded(record) {
    if (state.busy || !record) return;
    state.record = record; clearOutputs(); setError(null); showSnapshot(record.snapshot);
    ['baseline', 'steered'].forEach((side) => renderResult(side, record.outputs?.[side]));
    $('resultBadge').textContent = 'RECORDED EXPERIMENT'; $('resultBadge').classList.remove('running');
    $('recordTime').textContent = `Recorded ${formatDate(record.completed_at || record.snapshot?.created_at || '')}`;
    announce('Viewing a completed experiment. No new response is being generated.'); updateRunAvailability();
    $('resultsTitle').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function exportRecord() {
    if (!state.record?.snapshot) return null;
    state.guideNotes.set(state.guideKey, { prediction: $('prediction').value, reflection: $('reflection').value });
    const snapshot = state.record.snapshot || {};
    const notes = state.guideNotes.get(JSON.stringify([snapshot.prompt, snapshot.seed]));
    const labels = { both: 'Both neurons are needed for the effect', a: 'Neuron A produces most of the effect', b: 'Neuron B produces most of the effect', unsure: "I'm not sure yet" };
    return { ...state.record, learning_notes: { prediction: labels[notes?.prediction] || '', reflection: notes?.reflection?.trim() || '', note: 'An observed behavioral change is evidence of influence, not a complete explanation of the neuron or model.' } };
  }

  async function copyRecord() {
    const record = exportRecord(); if (!record) return;
    const snapshot = record.snapshot || {};
    const text = [
      'UNCHARTED — neuron-steering experiment',
      `Model: ${snapshot.model_name || 'Qwen3.5-4B'} (${snapshot.revision || 'revision unavailable'})`,
      `Prompt: ${snapshot.prompt || ''}`, `Doses: A ${signed(snapshot.dose_a)}; B ${signed(snapshot.dose_b)}. Seed: ${snapshot.seed}.`,
      '', 'ORIGINAL', record.outputs?.baseline?.text || '(No completed response)', '', 'STEERED', record.outputs?.steered?.text || '(No completed response)',
      '', 'FULL EXPERIMENT RECORD', JSON.stringify(record, null, 2)
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text); $('copyButton').textContent = 'Copied ✓';
      setTimeout(() => { $('copyButton').textContent = 'Copy experiment ↗'; }, 2000);
    } catch { setError('Clipboard access is unavailable. Download the JSON record instead.'); }
  }

  function downloadRecord() {
    const record = exportRecord(); if (!record) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `uncharted-${String(record.id || 'experiment').replace(/[^a-zA-Z0-9_-]/g, '')}.json`;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function setMode(guided) {
    state.guide = guided; $('guidePanel').hidden = !guided;
    $('guideMode').classList.toggle('active', guided); $('guideMode').setAttribute('aria-pressed', String(guided));
    $('exploreMode').classList.toggle('active', !guided); $('exploreMode').setAttribute('aria-pressed', String(!guided));
    updateGuide();
  }

  for (let layer = 0; layer < 32; layer++) {
    const cell = document.createElement('span'); cell.className = 'layer-cell'; cell.textContent = layer === 14 ? 'A' : layer === 13 ? 'B' : '';
    if (layer === 14) cell.classList.add('highlight-a'); if (layer === 13) cell.classList.add('highlight-b');
    cell.title = `Layer ${layer}${layer === 14 ? ' · neuron A' : layer === 13 ? ' · neuron B' : ''}`; $('layerGrid').appendChild(cell);
  }
  $('experimentForm').addEventListener('submit', runExperiment);
  ['prompt', 'doseA', 'doseB', 'seed'].forEach((id) => $(id).addEventListener('input', updateControls));
  document.querySelectorAll('[data-condition]').forEach((button) => button.addEventListener('click', () => setCondition(button.dataset.condition)));
  document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => { $('prompt').value = prompts[button.dataset.prompt]; updateControls(); }));
  document.querySelectorAll('[data-guide]').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.record) displayRecorded(state.records.find((record) => record.id === button.dataset.record));
    else { setCondition(button.dataset.guide); announce('Condition selected. Press Run experiment to test your prediction.'); $('runButton').focus(); }
  }));
  $('resetButton').addEventListener('click', () => setCondition('original'));
  $('stopButton').addEventListener('click', stopExperiment);
  $('copyButton').addEventListener('click', copyRecord);
  $('downloadButton').addEventListener('click', downloadRecord);
  $('exploreMode').addEventListener('click', () => setMode(false));
  $('guideMode').addEventListener('click', () => setMode(true));
  $('retryLoadButton').addEventListener('click', async () => {
    $('retryLoadButton').disabled = true; setError(null);
    try { await request('/api/load', { method: 'POST', body: '{}' }); announce('Retrying model loading…'); clearTimeout(state.nextStatusTimer); await pollStatus(); }
    catch (error) { setError(readable(error)); }
    finally { $('retryLoadButton').disabled = false; }
  });
  window.addEventListener('beforeunload', () => { closeStream(); clearTimeout(state.nextStatusTimer); });
  updateControls();
  const activeId = storageGet();
  if (activeId) restoreActive(activeId);
  pollStatus();
})();
