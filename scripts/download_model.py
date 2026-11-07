#!/usr/bin/env python3
"""Download the exact public checkpoint used for the neuron calibration."""
import argparse
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from config import MODEL_DIR, MODEL_NAME, MODEL_REVISION

MODEL_FILES = (
    'README.md', 'chat_template.jinja', 'config.json', 'model.safetensors',
    'model.safetensors.index.json', 'preprocessor_config.json',
    'processor_config.json', 'tokenizer.json', 'tokenizer_config.json',
    'video_preprocessor_config.json', 'vocab.json',
)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', type=Path, default=MODEL_DIR,
                        help='Model directory (default: UNCHARTED_MODEL_DIR or models/qwen3.5-4b-4bit).')
    args = parser.parse_args(argv)
    destination = args.destination.expanduser().resolve()
    os.environ.setdefault('HF_HOME', str(ROOT / '.cache/huggingface'))
    os.environ.setdefault('HF_HUB_DISABLE_XET', '1')
    os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print('huggingface-hub is missing. Run Python 3.12 with scripts/setup.py first, or install requirements.txt into .venv.', file=sys.stderr)
        return 1
    try:
        print(f'Model: {MODEL_NAME}\nRevision: {MODEL_REVISION}\nDestination: {destination}', flush=True)
        snapshot_download(
            repo_id=MODEL_NAME, revision=MODEL_REVISION, local_dir=destination,
            allow_patterns=list(MODEL_FILES), max_workers=2, token=False)
        missing = [name for name in MODEL_FILES if not (destination / name).is_file()]
        if missing:
            raise RuntimeError('The download is incomplete: ' + ', '.join(missing))
        metadata = destination / '.cache/huggingface/download/model.safetensors.metadata'
        if not metadata.is_file() or metadata.read_text(encoding='utf-8').splitlines()[0] != MODEL_REVISION:
            raise RuntimeError('Checkpoint revision metadata is missing or mismatched. Rerun the download; keep the model directory’s .cache folder.')
        print('Pinned checkpoint is ready. Keep its .cache metadata alongside the weights.', flush=True)
        return 0
    except KeyboardInterrupt:
        print('\nDownload interrupted. Rerun this command to resume.', file=sys.stderr)
        return 130
    except Exception as exc:
        print(f'\nModel download failed: {exc}\nCheck free disk space and the network connection, then rerun this command. Completed files are reused.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
