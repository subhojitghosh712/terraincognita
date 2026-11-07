"""Run six matched brevity experiments without modifying archived results."""
import argparse
import gc
import json
from pathlib import Path
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline-results', type=Path,
                        help='Completed reproduction results containing calibration; defaults to the archived run.')
    args = parser.parse_args()

    import run_experiment as harness

    harness.verify_inputs()
    previous_path = args.baseline_results or harness.ARCHIVE / 'results.json'
    previous = json.loads(previous_path.read_text())
    if previous.get('status') != 'complete':
        parser.error('--baseline-results must point to a completed reproduction.')
    if previous['manifest']['model_revision'] != harness.MODEL_REVISION:
        parser.error('The baseline results refer to a different model revision.')

    mx = harness.mx
    reference = harness.reference
    out = harness.OUTPUT / 'brevity-results.json'
    directive = ('Reply in one or two complete sentences, using at most 35 words in total. '
                 'Do not use headings or lists.')
    result = {
        'status': 'running', 'model_manifest': previous['manifest'],
        'system_instruction': directive, 'max_tokens': 128,
        'temperature': 0.7, 'top_p': 0.95, 'thinking': False,
        'prompt_indices': [0, 2, 3], 'seed_base': 1234,
        'calibration': previous['calibration'],
        'calibration_reused_from_same_pinned_checkpoint': True, 'runs': []}

    def save():
        out.write_text(json.dumps(result, ensure_ascii=False, indent=2))

    mx.set_cache_limit(256 * 1024**2)
    mx.set_memory_limit(5 * 1024**3)
    save()
    print('Loading pinned local model for six matched brevity tests.', flush=True)
    model = None
    try:
        model, tokenizer = harness.load(str(harness.MODEL_DIR))
        for condition, active in [('baseline', []), ('pair_dose_1', previous['calibration'])]:
            reference.clear_steering(model)
            if active:
                reference.install_steering(model, active)
            for i in result['prompt_indices']:
                mx.random.seed(1234 + i)
                prompt = reference.chat_prompt(tokenizer, reference.PROMPTS[i], system=directive)
                parts = []
                started = time.perf_counter()
                for chunk in harness.stream_generate(
                        model, tokenizer, prompt=prompt, max_tokens=128,
                        sampler=harness.make_sampler(temp=0.7, top_p=0.95)):
                    parts.append(chunk.text)
                text = ''.join(parts).strip()
                row = {'condition': condition, 'prompt_index': i, 'prompt': reference.PROMPTS[i],
                       'seed': 1234 + i, 'output': text,
                       'word_count_whitespace': len(text.split()),
                       'within_35_words': len(text.split()) <= 35,
                       'generation_tokens': chunk.generation_tokens,
                       'finish_reason': chunk.finish_reason,
                       'seconds': time.perf_counter() - started}
                result['runs'].append(row)
                save()
                print(json.dumps(row, ensure_ascii=False), flush=True)
                del chunk
                gc.collect()
                mx.clear_cache()
        result['status'] = 'complete'
        save()
    except BaseException as exc:
        result['status'] = 'failed'
        result['error'] = repr(exc)
        save()
        raise
    finally:
        if model is not None:
            reference.clear_steering(model)


if __name__ == '__main__':
    main()
