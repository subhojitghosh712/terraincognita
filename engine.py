"""One MLX model, owned exclusively by the inference worker thread."""
import gc
import json
import os
import time

from config import CACHE_DIR, MODEL_DIR, MODEL_REVISION, NEURONS, SETTINGS, interventions


class MLXEngine:
    def __init__(self):
        self.model = None
        self.wrappers = []

    def load(self):
        if self.model is not None:
            return
        if not (MODEL_DIR / 'model.safetensors').is_file():
            raise RuntimeError('The tested model is missing. Run .venv/bin/python scripts/download_model.py, or see README.md for setup.')
        metadata = MODEL_DIR / '.cache/huggingface/download/model.safetensors.metadata'
        if not metadata.is_file() or metadata.read_text().splitlines()[0] != MODEL_REVISION:
            raise RuntimeError('Model revision does not match the tested calibration. Restore the pinned model download.')
        config = json.loads((MODEL_DIR / 'config.json').read_text())
        if config.get('quantization', {}).get('bits') != 4:
            raise RuntimeError('This app requires the calibrated four-bit checkpoint.')
        os.environ.setdefault('HF_HOME', str(CACHE_DIR))
        os.environ['HF_HUB_OFFLINE'] = '1'
        os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
        os.environ['TOKENIZERS_PARALLELISM'] = 'false'
        import mlx.core as mx
        import mlx.nn as nn
        from mlx_lm import load, stream_generate
        from mlx_lm.sample_utils import make_sampler
        self.mx, self.stream_generate, self.make_sampler = mx, stream_generate, make_sampler
        mx.set_cache_limit(256 * 1024**2)
        mx.set_memory_limit(5 * 1024**3)
        model, tokenizer = load(str(MODEL_DIR))
        layers = model.language_model.model.layers
        if len(layers) != 32:
            raise RuntimeError('Unexpected model geometry; calibration was not applied.')
        if tokenizer.convert_tokens_to_ids('<|im_end|>') not in tokenizer.eos_token_ids:
            raise RuntimeError('The model is missing its chat end token.')

        class NeuronOffset(nn.Module):
            def __init__(self, base, index):
                super().__init__()
                self.base = base
                self.index = index
                self.delta = 0.0

            def __call__(self, activation):
                if self.delta != 0:
                    # Same additive intervention as the verified reproduction,
                    # before down_proj on prefill and every decoded token.
                    offset = mx.zeros((activation.shape[-1],), dtype=mx.float32)
                    offset = offset.at[self.index].add(self.delta)
                    activation = (activation.astype(mx.float32) + offset).astype(activation.dtype)
                return self.base(activation)

        wrappers = []
        for n in NEURONS:
            projection = layers[n['layer']].mlp.down_proj
            if not isinstance(projection, nn.QuantizedLinear) or projection.bits != 4:
                raise RuntimeError('Unexpected projection precision; calibration was not applied.')
            weights = mx.dequantize(projection.weight, projection.scales, projection.biases,
                                    projection.group_size, projection.bits)
            actual_norm = float(mx.linalg.norm(weights[:, n['index']].astype(mx.float32)))
            if abs(actual_norm - n['column_norm']) > 0.0001:
                raise RuntimeError('Model column norm does not match the tested calibration.')
            del weights
            wrapper = NeuronOffset(projection, n['index'])
            layers[n['layer']].mlp.down_proj = wrapper
            wrappers.append(wrapper)
        self.model, self.tokenizer, self.wrappers = model, tokenizer, wrappers
        gc.collect()
        mx.clear_cache()

    def clear(self):
        for wrapper in self.wrappers:
            wrapper.delta = 0.0

    def generate(self, prompt, dose_a, dose_b, seed, on_text, cancelled):
        mx = self.mx
        self.clear()
        chunks = []
        tokens = 0
        first_text = None
        finish = 'cancelled'
        started = time.perf_counter()
        stream = None
        mx.reset_peak_memory()
        try:
            for wrapper, spec in zip(self.wrappers, interventions(dose_a, dose_b)):
                wrapper.delta = spec['delta']
            if cancelled.is_set():
                return self._result('', 0, 0.0, None, 'cancelled', 0.0)
            messages = [{'role': 'system', 'content': SETTINGS['system_instruction']},
                        {'role': 'user', 'content': prompt}]
            formatted = self.tokenizer.apply_chat_template(
                messages, add_generation_prompt=True, enable_thinking=False)
            mx.random.seed(seed)
            stream = self.stream_generate(
                self.model, self.tokenizer, prompt=formatted,
                max_tokens=SETTINGS['max_new_tokens'],
                sampler=self.make_sampler(temp=SETTINGS['temperature'], top_p=SETTINGS['top_p']))
            for chunk in stream:
                if cancelled.is_set():
                    break
                tokens = chunk.generation_tokens
                if chunk.text:
                    if first_text is None:
                        first_text = time.perf_counter() - started
                    chunks.append(chunk.text)
                    on_text(chunk.text)
                if chunk.finish_reason:
                    finish = chunk.finish_reason
            return self._result(''.join(chunks), tokens, time.perf_counter() - started,
                                first_text, finish, mx.get_peak_memory() / 1e9)
        finally:
            try:
                if stream is not None:
                    stream.close()
            finally:
                self.clear()
                mx.synchronize()
                gc.collect()
                mx.clear_cache()

    @staticmethod
    def _result(text, tokens, seconds, ttft, finish, peak):
        return {'text': text, 'tokens': tokens, 'seconds': seconds,
                'ttft_seconds': ttft, 'finish_reason': finish,
                'cached': False, 'peak_memory_gb': peak}
