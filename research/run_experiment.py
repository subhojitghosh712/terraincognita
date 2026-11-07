"""Instrument the published experiment on the pinned local 4-bit checkpoint.

No model training, app server, or external generation API is used.
"""
import argparse
import dataclasses
import datetime
import gc
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import time
import traceback

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))
from config import APP_DIR, MODEL_DIR, MODEL_REVISION

ARCHIVE = APP_DIR / 'docs' / 'reproduction'
os.environ.setdefault('HF_HOME', str(APP_DIR / '.cache' / 'huggingface'))
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
os.environ.setdefault('MPLCONFIGDIR', str(APP_DIR / '.cache' / 'matplotlib'))

import mlx.core as mx
import psutil
from mlx_lm import load, stream_generate
from mlx_lm.sample_utils import make_sampler
import published_reproduction as reference

OUTPUT = ROOT / 'runs'
OUTPUT.mkdir(parents=True, exist_ok=True)
LOG = OUTPUT / 'progress.jsonl'
RESULTS = OUTPUT / 'results.json'

def verify_inputs():
    """Keep reruns tied to the model and reference used in the archived evidence."""
    manifest = json.loads((ARCHIVE / 'manifest.json').read_text())
    if manifest['model_revision'] != MODEL_REVISION:
        raise RuntimeError('The archived evidence and app specify different model revisions.')
    metadata = MODEL_DIR / '.cache/huggingface/download/model.safetensors.metadata'
    if not metadata.is_file() or metadata.read_text().splitlines()[0] != MODEL_REVISION:
        raise RuntimeError('Download the pinned model with scripts/download_model.py before running the research scripts.')
    source_digest = hashlib.sha256((ROOT / 'published_reproduction.py').read_bytes()).hexdigest()
    if source_digest != manifest['source_sha256']:
        raise RuntimeError('The vendored reference differs from the pinned published source.')
    return manifest

def event(kind, **kwargs):
    row = {'time_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
           'event': kind, **kwargs}
    line = json.dumps(row, ensure_ascii=False)
    print(line, flush=True)
    with LOG.open('a') as f:
        f.write(line + '\n')

def memory():
    return {'process_rss_gb': psutil.Process().memory_info().rss / 1e9,
            'mlx_active_gb': mx.get_active_memory() / 1e9,
            'mlx_cache_gb': mx.get_cache_memory() / 1e9,
            'mlx_peak_gb': mx.get_peak_memory() / 1e9,
            'system_available_gb': psutil.virtual_memory().available / 1e9,
            'system_swap_used_gb': psutil.swap_memory().used / 1e9}

def save(result):
    temp = RESULTS.with_suffix('.tmp')
    temp.write_text(json.dumps(result, indent=2, ensure_ascii=False))
    temp.replace(RESULTS)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--max-tokens', type=int, default=90)
    args = parser.parse_args()
    if args.max_tokens <= 0:
        parser.error('--max-tokens must be greater than zero')
    manifest = verify_inputs()
    mx.set_cache_limit(256 * 1024**2)
    mx.set_memory_limit(5 * 1024**3)
    result = {
        'status': 'running',
        'manifest': manifest,
        'harness_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'platform': platform.platform(), 'python': platform.python_version(),
        'device': mx.device_info(),
        'packages': {p: importlib.metadata.version(p) for p in
                     ['mlx', 'mlx-metal', 'mlx-lm', 'transformers', 'numpy', 'psutil']},
        'settings': {'temperature': 0.7, 'top_p': 0.95, 'seed_base': 1234,
                     'max_tokens': args.max_tokens, 'thinking': False,
                     'prompt_indices': list(range(len(reference.PROMPTS))),
                     'fresh_generation_cache_per_run': True,
                     'calibration': 'Published four raw passages; remove token 0 per passage.',
                     'layer_indexing': 'zero-based',
                     'memory_limit_bytes': 5 * 1024**3,
                     'cache_limit_bytes': 256 * 1024**2},
        'runs': [], 'perplexity': {},
    }
    save(result)
    event('starting', device=result['device'], memory=memory())
    try:
        t0 = time.perf_counter()
        model, tokenizer = load(str(MODEL_DIR))
        result['load_seconds'] = time.perf_counter() - t0
        result['memory_after_load'] = memory()
        layers = reference.get_layers(model)
        assert len(layers) == 32, len(layers)
        result['architecture'] = {
            'layers': len(layers),
            'down_proj_type': type(layers[14].mlp.down_proj).__name__,
            'bits': layers[14].mlp.down_proj.bits,
            'group_size': layers[14].mlp.down_proj.group_size,
        }
        assert result['architecture']['bits'] == 4
        event('loaded', seconds=result['load_seconds'], architecture=result['architecture'],
              memory=memory())
        t0 = time.perf_counter()
        deltas = reference.compute_deltas(model, tokenizer,
                                          [(14, 8949, 1.0), (13, 7956, -1.0)], 0)
        result['calibration'] = deltas
        result['calibration_seconds'] = time.perf_counter() - t0
        gc.collect()
        mx.clear_cache()
        event('calibrated', values=deltas, seconds=result['calibration_seconds'], memory=memory())
        save(result)

        # Preserve the primary script's chat formatting and sampler exactly.
        prompts = [reference.chat_prompt(tokenizer, p) for p in reference.PROMPTS]
        result['formatted_prompt_preview'] = tokenizer.decode(prompts[0]) if isinstance(prompts[0], list) else prompts[0]
        result['tokenizer_eos_ids'] = list(tokenizer.eos_token_ids)
        result['im_end_token_id'] = tokenizer.convert_tokens_to_ids('<|im_end|>')
        assert result['im_end_token_id'] in tokenizer.eos_token_ids, 'Chat end token must stop generation.'

        def run(name, active, indices, measure_ppl=False):
            reference.clear_steering(model)
            if active:
                reference.install_steering(model, active)
            gc.collect()
            mx.clear_cache()
            event('condition_start', condition=name, memory=memory())
            if measure_ppl:
                t0 = time.perf_counter()
                ppl, n = reference.perplexity(model, tokenizer, reference.PPL_TEXT)
                result['perplexity'][name] = {'value': ppl, 'tokens': n,
                                               'seconds': time.perf_counter() - t0}
                gc.collect()
                mx.clear_cache()
                event('perplexity', condition=name, **result['perplexity'][name], memory=memory())
                save(result)
            for i in indices:
                mx.random.seed(1234 + i)
                mx.reset_peak_memory()
                started = time.perf_counter()
                first_token = None
                first_text = None
                segments, tokens = [], []
                before = memory()
                event('generation_start', condition=name, prompt_index=i)
                last = None
                for chunk in stream_generate(model, tokenizer, prompt=prompts[i],
                                             max_tokens=args.max_tokens,
                                             sampler=make_sampler(temp=0.7, top_p=0.95)):
                    now = time.perf_counter()
                    if first_token is None:
                        first_token = now - started
                    if first_text is None and chunk.text:
                        first_text = now - started
                    segments.append(chunk.text)
                    tokens.append(int(chunk.token))
                    last = chunk
                elapsed = time.perf_counter() - started
                entry = {'condition': name, 'prompt_index': i,
                         'prompt': reference.PROMPTS[i], 'seed': 1234+i,
                         'active': active,
                         'output': ''.join(segments).strip(), 'token_ids': tokens,
                         'generation_tokens': last.generation_tokens,
                         'prompt_tokens': last.prompt_tokens,
                         'finish_reason': last.finish_reason,
                         'seconds': elapsed, 'time_to_first_token_seconds': first_token,
                         'time_to_first_text_seconds': first_text,
                         'generation_tokens_per_second': last.generation_tps,
                         'prompt_tokens_per_second': last.prompt_tps,
                         'memory_before': before, 'memory_after': memory()}
                result['runs'].append(entry)
                save(result)
                event('generation_complete', condition=name, prompt_index=i,
                      seconds=round(elapsed, 2), first_text_seconds=round(first_text or 0, 2),
                      tokens=last.generation_tokens, finish_reason=last.finish_reason,
                      generation_tps=round(last.generation_tps, 2),
                      output_preview=entry['output'][:250], memory=memory())
                del last, chunk
                gc.collect()
                mx.clear_cache()
            reference.clear_steering(model)

        indices = range(len(reference.PROMPTS))
        run('baseline', [], indices, True)
        run('pair_dose_1', deltas, indices, True)
        run('neuron_A_only', [deltas[0]], indices, True)
        run('neuron_B_only', [deltas[1]], indices, True)
        half = [{**d, 'dose': d['dose'] / 2, 'delta': d['delta'] / 2,
                 'contrib_norm': d['contrib_norm'] / 2} for d in deltas]
        run('pair_dose_0.5', half, [0, 3, 4], True)
        run('baseline_after_reset', [], [0])
        original = next(r for r in result['runs'] if r['condition'] == 'baseline' and r['prompt_index'] == 0)
        restored = result['runs'][-1]
        result['reset_control'] = {
            'text_identical': original['output'] == restored['output'],
            'token_ids_identical': original['token_ids'] == restored['token_ids']}
        result['status'] = 'complete'
        result['memory_at_end'] = memory()
        save(result)
        event('complete', runs=len(result['runs']), reset_control=result['reset_control'])
    except BaseException as exc:
        result['status'] = 'failed'
        result['error'] = repr(exc)
        result['traceback'] = traceback.format_exc()
        save(result)
        event('failed', error=repr(exc))
        raise

if __name__ == '__main__':
    main()
