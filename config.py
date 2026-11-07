"""The model and calibration configuration (supporting MLX on Apple Silicon and PyTorch on Windows/Linux)."""
import os
from pathlib import Path
import platform

APP_DIR = Path(__file__).resolve().parent
PROJECT_DIR = APP_DIR
MODEL_DIR = Path(os.environ.get('TERRA_INCOGNITA_MODEL_DIR') or os.environ.get('UNCHARTED_MODEL_DIR', APP_DIR / 'models/qwen3.5-4b-4bit')).expanduser().resolve()
CACHE_DIR = APP_DIR / '.cache/huggingface'
LEARN_ONLY = os.environ.get('TERRA_INCOGNITA_LEARN_ONLY') == '1' or os.environ.get('UNCHARTED_LEARN_ONLY') == '1' or (APP_DIR / '.learn-only').is_file()

IS_APPLE_SILICON = platform.system() == 'Darwin' and platform.machine().lower() in {'arm64', 'aarch64'}
DEFAULT_BACKEND = 'mlx' if IS_APPLE_SILICON else 'torch'
BACKEND = os.environ.get('TERRA_INCOGNITA_BACKEND') or os.environ.get('UNCHARTED_BACKEND', DEFAULT_BACKEND)
MODEL_NAME = 'mlx-community/Qwen3.5-4B-MLX-4bit'
MODEL_REVISION = '32f3e8ecf65426fc3306969496342d504bfa13f3'
TORCH_MODEL_NAME = os.environ.get('TERRA_INCOGNITA_TORCH_MODEL') or os.environ.get('UNCHARTED_TORCH_MODEL', 'Qwen/Qwen3.5-4B')
ACTIVE_MODEL_NAME = MODEL_NAME if BACKEND == 'mlx' else TORCH_MODEL_NAME

SYSTEM_INSTRUCTION = ('Reply in one or two complete sentences, using at most 35 words in total. '
                      'Do not use headings or lists.')
SETTINGS = {
    'max_new_tokens': 128, 'max_prompt_chars': 2000,
    'temperature': 0.7, 'top_p': 0.95, 'seed': 1234,
    'system_instruction': SYSTEM_INSTRUCTION,
    'thinking': False,
}
NEURONS = [
    {'key': 'a', 'layer': 14, 'index': 8949, 'min': 0.0, 'max': 1.0,
     'delta_per_dose': 22.083485806779468,
     'median_residual_norm': 10.266241073608398,
     'column_norm': 0.4648831784725189},
    {'key': 'b', 'layer': 13, 'index': 7956, 'min': -1.0, 'max': 0.0,
     'delta_per_dose': 22.886345365247053,
     'median_residual_norm': 9.574373245239258,
     'column_norm': 0.4183443486690521},
]
CALIBRATION_SOURCE = 'Local M1 reproduction, 7 November 2026; 578 calibration tokens.'


def interventions(dose_a, dose_b):
    return [{'key': n['key'], 'layer': n['layer'], 'index': n['index'],
             'dose': dose, 'delta': dose * n['delta_per_dose']}
            for n, dose in zip(NEURONS, (dose_a, dose_b))]
