"""Inference engine supporting Apple Silicon MLX and cross-platform PyTorch."""
import gc
import json
import logging
import os
from pathlib import Path
import threading
import time

from config import (
    ACTIVE_MODEL_NAME, BACKEND, CACHE_DIR, MODEL_DIR, MODEL_REVISION,
    NEURONS, SETTINGS, interventions
)

log = logging.getLogger('uncharted')


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


class NeuronOffsetHook:
    def __init__(self, index, torch_module):
        self.index = index
        self.delta = 0.0
        self.torch = torch_module

    def __call__(self, module, args):
        if self.delta != 0.0:
            activation = args[0]
            offset = self.torch.zeros(activation.shape[-1], dtype=activation.dtype, device=activation.device)
            offset[self.index] = self.delta
            return (activation + offset,) + args[1:]
        return args


class TorchEngine:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.hooks = []
        self.hook_handles = []
        self.device = None
        self.torch = None

    def load(self):
        if self.model is not None:
            return
        os.environ.setdefault('HF_HOME', str(CACHE_DIR))
        os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
        os.environ['TOKENIZERS_PARALLELISM'] = 'false'
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoModel, AutoTokenizer
        except ImportError as exc:
            raise RuntimeError(
                f"Missing dependency: {exc}. If you are in an activated virtualenv (.venv), "
                f"ensure PyTorch is installed there, or run using your system Python: "
                f"C:\\Users\\subho\\AppData\\Local\\Programs\\Python\\Python313\\python.exe run.py"
            ) from exc
        self.torch = torch

        model_path = None
        if MODEL_DIR.is_dir() and (MODEL_DIR / 'config.json').is_file():
            model_path = str(MODEL_DIR)
        else:
            model_path = ACTIVE_MODEL_NAME

        log.info('Loading model from: %s', model_path)
        try:
            tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
        except Exception as exc:
            raise RuntimeError(
                f'Could not load tokenizer from {model_path}. '
                'Ensure the model is downloaded or run scripts/download_model.py.'
            ) from exc

        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.device = device
        dtype = torch.bfloat16 if device == 'cuda' else torch.float32

        model = None
        load_error = None
        loaders = [AutoModelForCausalLM, AutoModel]
        try:
            from transformers import Qwen3_5ForConditionalGeneration
            loaders.append(Qwen3_5ForConditionalGeneration)
        except ImportError:
            pass

        for loader_cls in loaders:
            try:
                model = loader_cls.from_pretrained(
                    model_path,
                    torch_dtype=dtype,
                    low_cpu_mem_usage=True,
                    device_map=device if device == 'cuda' else None,
                    trust_remote_code=True,
                )
                if model is not None:
                    break
            except Exception as e:
                load_error = e
                continue

        if model is None:
            raise RuntimeError(
                f'Could not load model weights from {model_path}. '
                f'Run scripts/download_model.py to download the model first. ({load_error})'
            ) from load_error

        if device != 'cuda':
            model = model.to(device)
        model.eval()

        if hasattr(model, 'model') and hasattr(model.model, 'language_model') and hasattr(model.model.language_model, 'layers'):
            layers = model.model.language_model.layers
        elif hasattr(model, 'model') and hasattr(model.model, 'layers'):
            layers = model.model.layers
        elif hasattr(model, 'language_model') and hasattr(model.language_model, 'layers'):
            layers = model.language_model.layers
        elif hasattr(model, 'layers'):
            layers = model.layers
        else:
            raise RuntimeError('Unexpected model architecture; layers could not be located.')

        hooks = []
        hook_handles = []
        for n in NEURONS:
            layer_idx = n['layer']
            if layer_idx >= len(layers):
                raise RuntimeError(f'Target layer {layer_idx} exceeds model layer count {len(layers)}.')
            projection = layers[layer_idx].mlp.down_proj
            hook = NeuronOffsetHook(n['index'], torch)
            handle = projection.register_forward_pre_hook(hook)
            hooks.append(hook)
            hook_handles.append(handle)

        self.model = model
        self.tokenizer = tokenizer
        self.hooks = hooks
        self.hook_handles = hook_handles
        gc.collect()

    def clear(self):
        for hook in self.hooks:
            hook.delta = 0.0

    def generate(self, prompt, dose_a, dose_b, seed, on_text, cancelled):
        torch = self.torch
        self.clear()
        chunks = []
        tokens = 0
        first_text = None
        finish = 'stop'
        started = time.perf_counter()

        try:
            for hook, spec in zip(self.hooks, interventions(dose_a, dose_b)):
                hook.delta = spec['delta']

            if cancelled.is_set():
                return MLXEngine._result('', 0, 0.0, None, 'cancelled', 0.0)

            messages = [
                {'role': 'system', 'content': SETTINGS['system_instruction']},
                {'role': 'user', 'content': prompt}
            ]
            formatted = self.tokenizer.apply_chat_template(
                messages, add_generation_prompt=True, tokenize=False
            )
            inputs = self.tokenizer(formatted, return_tensors='pt').to(self.device)

            from transformers import TextIteratorStreamer, StoppingCriteria, StoppingCriteriaList

            class CancelCriteria(StoppingCriteria):
                def __init__(self, cancel_evt):
                    super().__init__()
                    self.cancel_evt = cancel_evt

                def __call__(self, input_ids, scores, **kwargs):
                    return self.cancel_evt.is_set()

            streamer = TextIteratorStreamer(
                self.tokenizer, skip_prompt=True, clean_up_tokenization_spaces=False
            )
            cancel_criteria = CancelCriteria(cancelled)

            torch.manual_seed(seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed_all(seed)

            gen_kwargs = dict(
                **inputs,
                streamer=streamer,
                max_new_tokens=SETTINGS['max_new_tokens'],
                temperature=SETTINGS['temperature'],
                top_p=SETTINGS['top_p'],
                do_sample=True,
                stopping_criteria=StoppingCriteriaList([cancel_criteria]),
                pad_token_id=self.tokenizer.pad_token_id or self.tokenizer.eos_token_id,
            )

            gen_thread = threading.Thread(
                target=self._run_generate, args=(gen_kwargs,), daemon=True
            )
            gen_thread.start()

            for text_chunk in streamer:
                if cancelled.is_set():
                    finish = 'cancelled'
                    break
                if text_chunk:
                    if first_text is None:
                        first_text = time.perf_counter() - started
                    chunks.append(text_chunk)
                    tokens += 1
                    on_text(text_chunk)

            gen_thread.join(timeout=2.0)
            if cancelled.is_set():
                finish = 'cancelled'
            elif tokens >= SETTINGS['max_new_tokens']:
                finish = 'length'
            else:
                finish = 'stop'

            return MLXEngine._result(
                ''.join(chunks), tokens, time.perf_counter() - started,
                first_text, finish, self._peak_memory_gb()
            )
        finally:
            self.clear()
            gc.collect()

    def _run_generate(self, kwargs):
        try:
            with self.torch.inference_mode():
                self.model.generate(**kwargs)
        except Exception as exc:
            log.warning('Torch generation ended: %s', exc)

    def _peak_memory_gb(self):
        if self.torch and self.torch.cuda.is_available():
            return self.torch.cuda.max_memory_allocated() / 1e9
        try:
            import psutil
            return psutil.Process().memory_info().rss / 1e9
        except Exception:
            return 0.0


def create_engine():
    if BACKEND == 'mlx':
        try:
            import mlx.core
            return MLXEngine()
        except ImportError:
            log.warning('MLX unavailable, falling back to TorchEngine')
    return TorchEngine()
