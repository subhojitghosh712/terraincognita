"""Behavioral backend tests. All inference is fake; MLX is never imported."""
from copy import deepcopy
import json
from pathlib import Path
import sys
import threading
import time
from types import SimpleNamespace
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from config import NEURONS, SETTINGS, interventions
from engine import MLXEngine
from experiments import BusyError, ExperimentManager, Job
from server import create_app


def wait_for(predicate, message='condition was not reached'):
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.005)
    raise AssertionError(message)


class FakeEngine:
    def __init__(self, hold_calls=(), fail_call=None, hold_load=False):
        self.calls = []
        self.started = [threading.Event() for _ in range(20)]
        self.release = threading.Event()
        self.load_started = threading.Event()
        self.load_release = threading.Event()
        if not hold_load:
            self.load_release.set()
        self.hold_calls = set(hold_calls)
        self.fail_call = fail_call
        self.dose_state = None
        self.clear_count = 0

    def load(self):
        self.load_started.set()
        if not self.load_release.wait(3):
            raise RuntimeError('fake load was not released')

    def clear(self):
        self.clear_count += 1
        self.dose_state = None

    def generate(self, prompt, dose_a, dose_b, seed, on_text, cancelled):
        if self.dose_state is not None:
            raise AssertionError('previous intervention leaked into generation')
        index = len(self.calls)
        self.calls.append((prompt, dose_a, dose_b, seed))
        self.dose_state = (dose_a, dose_b)
        text = 'Hello \u03bb\n'
        on_text(text)
        self.started[index].set()
        if index == self.fail_call:
            raise RuntimeError('fake inference failure')
        if index in self.hold_calls:
            while not self.release.wait(0.005):
                if cancelled.is_set():
                    break
        finish = 'cancelled' if cancelled.is_set() else 'stop'
        if finish == 'stop':
            on_text('world.')
            text += 'world.'
        return MLXEngine._result(text, 4, 0.1, 0.01, finish, 0.0)


class ManagerTests(unittest.TestCase):
    def manager(self, engine=None):
        engine = engine or FakeEngine()
        manager = ExperimentManager(lambda: engine)
        manager.start()

        def cleanup():
            engine.release.set()
            engine.load_release.set()
            manager.close()

        self.addCleanup(cleanup)
        return manager, engine

    def done(self, manager, job):
        wait_for(lambda: job.record()['status'] in {'complete', 'cancelled', 'failed'}
                 and manager.status()['active_job'] is None)
        return job.record()

    def test_signed_doses_match_calibrated_residual_contributions(self):
        specs = interventions(0.5, -0.5)
        self.assertAlmostEqual(specs[0]['delta'], 11.041742903389734)
        self.assertAlmostEqual(specs[1]['delta'], -11.443172682623526)
        for spec, neuron in zip(specs, NEURONS):
            contribution = abs(spec['delta']) * neuron['column_norm']
            self.assertAlmostEqual(contribution,
                                   abs(spec['dose']) * neuron['median_residual_norm'])
        self.assertEqual([s['delta'] for s in interventions(0, 0)], [0, 0])

    def test_busy_and_cancellation_keep_partial_baseline_uncached(self):
        manager, engine = self.manager(FakeEngine(hold_calls={0}))
        job = manager.submit('hello', 1, -1, 1234)
        self.assertTrue(engine.started[0].wait(3))
        with self.assertRaises(BusyError):
            manager.submit('another', 0, 0, 1)
        self.assertEqual(manager.cancel(job.id)['status'], 'cancelling')
        result = self.done(manager, job)
        self.assertEqual(result['status'], 'cancelled')
        self.assertEqual(result['outputs']['baseline']['text'], 'Hello \u03bb\n')
        self.assertEqual(result['outputs']['baseline']['finish_reason'], 'cancelled')
        self.assertNotIn('steered', result['outputs'])
        self.assertEqual(len(engine.calls), 1)
        self.assertFalse(manager.cache)
        self.assertIsNone(engine.dose_state)
        self.assertEqual(manager.cancel(job.id)['status'], 'cancelled')

    def test_cancel_steered_retains_complete_cached_baseline(self):
        manager, engine = self.manager(FakeEngine(hold_calls={1}))
        job = manager.submit('hello', 1, -1, 42)
        self.assertTrue(engine.started[1].wait(3))
        manager.cancel(job.id)
        result = self.done(manager, job)
        self.assertEqual(result['outputs']['baseline']['finish_reason'], 'stop')
        self.assertEqual(result['outputs']['steered']['finish_reason'], 'cancelled')
        self.assertEqual(engine.calls, [('hello', 0, 0, 42), ('hello', 1, -1, 42)])
        self.assertEqual(len(manager.cache), 1)
        self.assertIsNone(engine.dose_state)

    def test_cancel_while_loading_never_starts_generation(self):
        manager, engine = self.manager(FakeEngine(hold_load=True))
        self.assertTrue(engine.load_started.wait(3))
        job = manager.submit('hello', 1, -1, 42)
        manager.cancel(job.id)
        engine.load_release.set()
        result = self.done(manager, job)
        self.assertEqual(result['status'], 'cancelled')
        self.assertEqual(result['outputs'], {})
        self.assertEqual(engine.calls, [])

    def test_failure_clears_intervention_and_does_not_cache_partial(self):
        manager, engine = self.manager(FakeEngine(fail_call=0))
        with self.assertLogs('uncharted', level='ERROR'):
            job = manager.submit('hello', 1, -1, 42)
            result = self.done(manager, job)
        self.assertEqual(result['status'], 'failed')
        self.assertIn('fake inference failure', result['message'])
        self.assertEqual(result['snapshot']['seed'], 42)
        self.assertEqual(result['snapshot']['settings']['seed'], 42)
        partial = result['outputs']['baseline']
        self.assertEqual(partial, {'side': 'baseline', 'text': 'Hello \u03bb\n',
                                   'finish_reason': 'error', 'cached': False})
        events, _ = job.read_events(0)
        self.assertEqual([event['type'] for event in events][-2:], ['result', 'failed'])
        self.assertEqual(events[-2]['data'], partial)
        self.assertEqual(events[-1]['data']['outputs']['baseline'], partial)
        self.assertFalse(manager.cache)
        self.assertIsNone(engine.dose_state)
        self.assertGreaterEqual(engine.clear_count, 3)
        engine.fail_call = None
        retry = self.done(manager, manager.submit('hello', 1, -1, 42))
        self.assertEqual(retry['status'], 'complete')
        self.assertFalse(retry['outputs']['baseline']['cached'])
        self.assertEqual(retry['outputs']['baseline']['text'], 'Hello \u03bb\nworld.')
        self.assertEqual(len(engine.calls), 3)

    def test_steered_failure_preserves_both_baseline_and_partial_output(self):
        manager, engine = self.manager(FakeEngine(fail_call=1))
        with self.assertLogs('uncharted', level='ERROR'):
            job = manager.submit('hello', 1, -1, 73)
            result = self.done(manager, job)
        self.assertEqual(result['status'], 'failed')
        self.assertEqual(result['snapshot']['settings']['seed'], 73)
        self.assertEqual(result['outputs']['baseline']['text'], 'Hello \u03bb\nworld.')
        self.assertEqual(result['outputs']['baseline']['finish_reason'], 'stop')
        self.assertEqual(result['outputs']['steered'],
                         {'side': 'steered', 'text': 'Hello \u03bb\n',
                          'finish_reason': 'error', 'cached': False})
        self.assertEqual(len(manager.cache), 1)
        self.assertIsNone(engine.dose_state)

    def test_baseline_cache_ignores_doses_but_separates_prompt_and_seed(self):
        manager, engine = self.manager()
        first = self.done(manager, manager.submit('hello', 1, -1, 42))
        self.assertFalse(first['outputs']['baseline']['cached'])
        second = self.done(manager, manager.submit('hello', 0.5, -0.5, 42))
        self.assertTrue(second['outputs']['baseline']['cached'])
        self.assertEqual(len(engine.calls), 3)
        self.assertEqual(second['outputs']['baseline']['seconds'], 0)
        self.assertEqual(second['outputs']['baseline']['original_seconds'], 0.1)
        third = self.done(manager, manager.submit('hello', 1, -1, 43))
        fourth = self.done(manager, manager.submit('different', 1, -1, 43))
        self.assertFalse(third['outputs']['baseline']['cached'])
        self.assertFalse(fourth['outputs']['baseline']['cached'])
        self.assertEqual(len(engine.calls), 7)

    def test_cache_key_includes_model_template_and_all_generation_settings(self):
        snapshot = {'prompt': 'hello', 'seed': 42, 'model_name': 'model',
                    'revision': 'revision', 'settings': deepcopy(SETTINGS)}
        original = ExperimentManager.cache_key(snapshot)
        for field in ['model_name', 'revision']:
            changed = deepcopy(snapshot)
            changed[field] += '-changed'
            self.assertNotEqual(original, ExperimentManager.cache_key(changed))
        for field in SETTINGS:
            changed = deepcopy(snapshot)
            value = changed['settings'][field]
            changed['settings'][field] = ('different' if isinstance(value, str)
                                          else not value if isinstance(value, bool) else value + 1)
            self.assertNotEqual(original, ExperimentManager.cache_key(changed), field)

    def test_snapshot_and_event_reads_are_defensive_copies(self):
        snapshot = {'id': 'test', 'settings': {'seed': 42}, 'neurons': [{'dose': 1}]}
        job = Job(snapshot)
        snapshot['settings']['seed'] = 5
        record = job.record()
        record['snapshot']['neurons'][0]['dose'] = 99
        events, _ = job.read_events(0)
        events[0]['data']['settings']['seed'] = 7
        self.assertEqual(job.snapshot['settings']['seed'], 42)
        self.assertEqual(job.snapshot['neurons'][0]['dose'], 1)
        self.assertEqual(job.read_events(0)[0][0]['data']['settings']['seed'], 42)


class EngineCleanupTests(unittest.TestCase):
    def engine(self, stream):
        engine = MLXEngine()
        engine.wrappers = [SimpleNamespace(delta=99), SimpleNamespace(delta=99)]
        engine.model = object()
        engine.mx = SimpleNamespace(reset_peak_memory=lambda: None,
                                    get_peak_memory=lambda: 0,
                                    synchronize=lambda: None, clear_cache=lambda: None,
                                    random=SimpleNamespace(seed=lambda value: None))
        engine.tokenizer = SimpleNamespace(apply_chat_template=lambda *a, **kw: [1, 2])
        engine.make_sampler = lambda **kw: kw
        engine.stream_generate = stream
        return engine

    def test_real_engine_finally_clears_on_stream_failure(self):
        closed = []

        def failing_stream(*args, **kwargs):
            try:
                yield SimpleNamespace(text='partial', generation_tokens=1, finish_reason=None)
                raise RuntimeError('decode failed')
            finally:
                closed.append(True)

        engine = self.engine(failing_stream)
        with self.assertRaisesRegex(RuntimeError, 'decode failed'):
            engine.generate('hello', 1, -1, 42, lambda text: None, threading.Event())
        self.assertEqual([w.delta for w in engine.wrappers], [0, 0])
        self.assertEqual(closed, [True])

    def test_real_engine_cancellation_closes_stream_and_preserves_partial_text(self):
        closed, observed_deltas = [], []
        cancel = threading.Event()

        def stream(*args, **kwargs):
            try:
                observed_deltas.append([w.delta for w in engine.wrappers])
                yield SimpleNamespace(text='first', generation_tokens=1, finish_reason=None)
                yield SimpleNamespace(text='unwanted', generation_tokens=2, finish_reason=None)
            finally:
                closed.append(True)

        engine = self.engine(stream)
        result = engine.generate('hello', 0.5, -0.5, 42, lambda text: cancel.set(), cancel)
        self.assertEqual(result['text'], 'first')
        self.assertEqual(result['tokens'], 1)
        self.assertEqual(result['finish_reason'], 'cancelled')
        self.assertLess(observed_deltas[0][1], 0)
        self.assertEqual([w.delta for w in engine.wrappers], [0, 0])
        self.assertEqual(closed, [True])


class APITests(unittest.TestCase):
    def setUp(self):
        self.engine = FakeEngine()
        self.app = create_app(lambda: self.engine)
        self.client = TestClient(self.app, base_url='http://127.0.0.1:8765',
                                 raise_server_exceptions=False)
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)

    @staticmethod
    def payload(**updates):
        return {'prompt': 'hello', 'dose_a': 1, 'dose_b': -1, 'seed': 42, **updates}

    def test_invalid_inputs_are_rejected_without_jobs(self):
        cases = [self.payload(prompt='   '), self.payload(prompt='a' * 2001),
                 self.payload(dose_a=1.01), self.payload(dose_b=0.01),
                 self.payload(dose_a=True), self.payload(dose_a='0.5'),
                 self.payload(seed=True), self.payload(seed=-1),
                 self.payload(seed=2147483648), self.payload(extra='unexpected')]
        for payload in cases:
            with self.subTest(payload=payload):
                response = self.client.post('/api/experiments', json=payload)
                self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(len(self.app.state.manager.jobs), 0)

    def test_nonfinite_doses_return_validation_error(self):
        for field in ['dose_a', 'dose_b']:
            for value in [float('nan'), float('inf'), float('-inf')]:
                with self.subTest(field=field, value=value):
                    response = self.client.post('/api/experiments',
                                                content=json.dumps(self.payload(**{field: value})),
                                                headers={'Content-Type': 'application/json'})
                    self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(len(self.app.state.manager.jobs), 0)

    def test_host_origin_content_type_and_size_boundaries(self):
        self.assertEqual(self.client.get('/api/status', headers={'Host': 'evil.example'}).status_code, 400)
        self.assertEqual(self.client.post('/api/load', json={},
                                         headers={'Origin': 'https://evil.example'}).status_code, 403)
        self.assertEqual(self.client.post('/api/load', json={},
                                         headers={'Origin': 'http://127.0.0.1:9999'}).status_code, 403)
        self.assertEqual(self.client.post('/api/load', content='{}',
                                         headers={'Content-Type': 'text/plain'}).status_code, 415)
        self.assertEqual(self.client.post('/api/load', content=' ' * 16385,
                                         headers={'Content-Type': 'application/json'}).status_code, 413)
        self.assertEqual(self.client.post('/api/load', json={},
                                         headers={'Origin': 'http://127.0.0.1:8765'}).status_code, 200)

    def test_api_busy_cancel_and_missing_job(self):
        self.engine.hold_calls = {0}
        response = self.client.post('/api/experiments', json=self.payload())
        self.assertEqual(response.status_code, 202)
        job_id = response.json()['id']
        self.assertTrue(self.engine.started[0].wait(3))
        self.assertEqual(self.client.post('/api/experiments', json=self.payload()).status_code, 409)
        self.assertEqual(self.client.post(f'/api/experiments/{job_id}/cancel', json={}).status_code, 200)
        wait_for(lambda: self.app.state.manager.active_job is None)
        self.assertEqual(self.client.get(f'/api/experiments/{job_id}').json()['status'], 'cancelled')
        self.assertEqual(self.client.get('/api/experiments/missing').status_code, 404)

    def test_sse_replay_unicode_and_authoritative_results(self):
        response = self.client.post('/api/experiments', json=self.payload())
        self.assertEqual(response.status_code, 202)
        job_id = response.json()['id']
        wait_for(lambda: self.app.state.manager.active_job is None)
        url = f'/api/experiments/{job_id}/events'

        def parse(text):
            rows = []
            for block in text.strip().split('\n\n'):
                fields = dict(line.split(': ', 1) for line in block.splitlines())
                rows.append({'id': int(fields['id']), 'type': fields['event'],
                             'data': json.loads(fields['data'])})
            return rows

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/event-stream', response.headers['content-type'])
        rows = parse(response.text)
        self.assertEqual([r['id'] for r in rows], list(range(1, len(rows) + 1)))
        self.assertEqual(sum(r['type'] == 'complete' for r in rows), 1)
        self.assertEqual(rows[-1]['type'], 'complete')
        for side in ['baseline', 'steered']:
            text = ''.join(r['data']['text'] for r in rows
                           if r['type'] == 'token' and r['data']['side'] == side)
            final = next(r['data'] for r in rows if r['type'] == 'result' and r['data']['side'] == side)
            self.assertEqual(text, final['text'])
            self.assertEqual(text, 'Hello \u03bb\nworld.')
        replay = parse(self.client.get(url, headers={'Last-Event-ID': '3'}).text)
        self.assertEqual(replay, rows[3:])
        self.assertEqual(self.client.get(url, headers={'Last-Event-ID': str(len(rows))}).text, '')
        self.assertEqual(self.client.get(url, headers={'Last-Event-ID': str(len(rows) + 1)}).status_code, 400)
        self.assertEqual(self.client.get(url, headers={'Last-Event-ID': 'bad'}).status_code, 400)


if __name__ == '__main__':
    unittest.main()
