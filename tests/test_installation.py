"""Portable configuration and learning-only mode must not require MLX or a model."""
import os
from pathlib import Path
import subprocess
import sys
import unittest

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from server import create_app


class InstallationTests(unittest.TestCase):
    def test_learning_mode_never_constructs_an_engine(self):
        def forbidden_engine():
            raise AssertionError('Learning mode must not load or construct an inference engine')

        app = create_app(forbidden_engine, learning_only=True)
        with TestClient(app, base_url='http://127.0.0.1:8765') as client:
            self.assertEqual(client.get('/').status_code, 200)
            self.assertEqual(client.get('/static/learn.js').status_code, 200)
            self.assertEqual(client.get('/api/status').json()['state'], 'learning_only')
            self.assertIsNone(app.state.manager.worker)
            self.assertEqual(client.post('/api/load', json={}).status_code, 503)
            self.assertEqual(client.post('/api/experiments', json={
                'prompt': 'hello', 'dose_a': 0, 'dose_b': 0, 'seed': 42,
            }).status_code, 503)
            self.assertEqual(len(app.state.manager.jobs), 0)

    def test_model_location_is_relative_to_repo_not_current_directory(self):
        env = os.environ.copy()
        env.pop('UNCHARTED_MODEL_DIR', None)
        code = 'import sys; sys.path.insert(0, sys.argv[1]); import config; print(config.MODEL_DIR)'
        default = subprocess.check_output([sys.executable, '-c', code, str(ROOT)], cwd=ROOT / 'tests', env=env, text=True).strip()
        self.assertEqual(Path(default), ROOT / 'models/qwen3.5-4b-4bit')
        env['UNCHARTED_MODEL_DIR'] = str(ROOT / 'custom-model')
        custom = subprocess.check_output([sys.executable, '-c', code, str(ROOT)], cwd=ROOT / 'tests', env=env, text=True).strip()
        self.assertEqual(Path(custom), ROOT / 'custom-model')


if __name__ == '__main__':
    unittest.main()
