"""Serialized inference, immutable experiment records, cancellation and SSE replay."""
from collections import OrderedDict
from copy import deepcopy
from datetime import datetime, timezone
import json
import logging
import queue
import threading
import uuid

from config import CALIBRATION_SOURCE, MODEL_NAME, MODEL_REVISION, NEURONS, SETTINGS, interventions

log = logging.getLogger('uncharted')
TERMINAL = {'complete', 'cancelled', 'failed'}


def now():
    return datetime.now(timezone.utc).isoformat()


class BusyError(Exception):
    pass


class Job:
    def __init__(self, snapshot):
        self.snapshot = deepcopy(snapshot)
        self.id = snapshot['id']
        self.status = 'queued'
        self.outputs = {}
        self.events = []
        self.completed_at = None
        self.message = None
        self.cancel = threading.Event()
        self.lock = threading.RLock()
        self.emit('snapshot', self.snapshot)

    def emit(self, kind, data):
        with self.lock:
            self.events.append({'seq': len(self.events) + 1, 'type': kind, 'data': deepcopy(data)})

    def record(self):
        with self.lock:
            result = {'id': self.id, 'status': self.status, 'snapshot': deepcopy(self.snapshot),
                      'outputs': deepcopy(self.outputs), 'completed_at': self.completed_at}
            if self.message:
                result['message'] = self.message
            return result

    def read_events(self, after):
        with self.lock:
            return deepcopy(self.events[after:]), self.status in TERMINAL

    def finish(self, status, message=None):
        with self.lock:
            self.status = status
            self.message = message
            self.completed_at = now()
            self.emit(status, self.record())


class ExperimentManager:
    def __init__(self, engine_factory):
        self.engine_factory = engine_factory
        self.engine = None
        self.state = 'unloaded'
        self.error = None
        self.active_job = None
        self.jobs = OrderedDict()
        self.cache = OrderedDict()
        self.lock = threading.RLock()
        self.tasks = queue.Queue()
        self.worker = None
        self.closed = False

    def start(self):
        with self.lock:
            if self.worker:
                return
            self.worker = threading.Thread(target=self._worker, name='mlx-inference', daemon=True)
            self.worker.start()
        self.load()

    def close(self):
        with self.lock:
            self.closed = True
            if self.active_job:
                self.jobs[self.active_job].cancel.set()
            self.tasks.put(('stop', None))
        if self.worker:
            self.worker.join(timeout=15)

    def status(self):
        with self.lock:
            return {'state': self.state, 'error': self.error, 'active_job': self.active_job,
                    'model_name': MODEL_NAME, 'revision': MODEL_REVISION,
                    'settings': deepcopy(SETTINGS), 'neurons': deepcopy(NEURONS),
                    'calibration_source': CALIBRATION_SOURCE}

    def load(self):
        with self.lock:
            if self.closed:
                raise RuntimeError('The inference service is shutting down.')
            if self.state not in {'loading', 'ready'}:
                self.state = 'loading'
                self.error = None
                self.tasks.put(('load', None))
            return {'state': self.state}

    def submit(self, prompt, dose_a, dose_b, seed):
        with self.lock:
            if self.closed:
                raise RuntimeError('The inference service is shutting down.')
            if self.active_job:
                raise BusyError('An experiment is already running. Stop it or wait for it to finish.')
            if self.state == 'error':
                raise RuntimeError(self.error or 'Model loading failed. Retry loading first.')
            snapshot = {'id': uuid.uuid4().hex, 'prompt': prompt, 'dose_a': dose_a,
                        'dose_b': dose_b, 'seed': seed, 'model_name': MODEL_NAME,
                        'revision': MODEL_REVISION, 'settings': {**deepcopy(SETTINGS), 'seed': seed},
                        'neurons': interventions(dose_a, dose_b),
                        'created_at': now(), 'calibration_source': CALIBRATION_SOURCE}
            job = Job(snapshot)
            self.jobs[job.id] = job
            while len(self.jobs) > 16:
                self.jobs.popitem(last=False)
            self.active_job = job.id
            self.tasks.put(('job', job))
            return job

    def get(self, job_id):
        with self.lock:
            return self.jobs.get(job_id)

    def cancel(self, job_id):
        with self.lock:
            job = self.jobs.get(job_id)
            if job is None:
                raise KeyError(job_id)
            with job.lock:
                if job.status in TERMINAL:
                    return {'status': job.status}
                job.cancel.set()
                return {'status': 'cancelling'}

    def _ensure_loaded(self):
        if self.engine is not None:
            return
        with self.lock:
            self.state = 'loading'
        engine = self.engine_factory()
        try:
            engine.load()
        except Exception:
            engine.clear()
            raise
        self.engine = engine
        with self.lock:
            self.state, self.error = 'ready', None

    @staticmethod
    def cache_key(snapshot):
        return json.dumps({k: snapshot[k] for k in ['prompt', 'seed', 'model_name', 'revision', 'settings']},
                          sort_keys=True, ensure_ascii=False)

    def _run_job(self, job):
        s = job.snapshot
        try:
            if job.cancel.is_set():
                job.finish('cancelled')
                return
            with job.lock:
                job.status = 'running'
            if self.engine is None:
                job.emit('phase', {'side': 'baseline', 'state': 'loading'})
            self._ensure_loaded()
            for side in ['baseline', 'steered']:
                if job.cancel.is_set():
                    break
                self.engine.clear()
                key = self.cache_key(s)
                cached = self.cache.get(key) if side == 'baseline' else None
                if cached is not None:
                    self.cache.move_to_end(key)
                    result = deepcopy(cached)
                    result.update(cached=True, original_seconds=result['seconds'], seconds=0.0,
                                  ttft_seconds=0.0, side=side)
                    job.emit('phase', {'side': side, 'state': 'cached'})
                else:
                    job.emit('phase', {'side': side, 'state': 'generating'})
                    streamed_text = []
                    def on_text(text):
                        streamed_text.append(text)
                        job.emit('token', {'side': side, 'text': text})
                    a, b = (0.0, 0.0) if side == 'baseline' else (s['dose_a'], s['dose_b'])
                    try:
                        result = self.engine.generate(s['prompt'], a, b, s['seed'], on_text, job.cancel)
                    except Exception:
                        # The generator may fail after showing tokens. Keep that
                        # evidence without inventing unavailable timing/counts.
                        partial = {'side': side, 'text': ''.join(streamed_text),
                                   'finish_reason': 'error', 'cached': False}
                        with job.lock:
                            job.outputs[side] = partial
                        job.emit('result', partial)
                        raise
                    finally:
                        self.engine.clear()
                    result['side'] = side
                    if side == 'baseline' and result['finish_reason'] in {'stop', 'length'} and not job.cancel.is_set():
                        self.cache[key] = deepcopy(result)
                        while len(self.cache) > 16:
                            self.cache.popitem(last=False)
                with job.lock:
                    job.outputs[side] = result
                job.emit('result', result)
                if result['finish_reason'] == 'cancelled':
                    job.cancel.set()
            job.finish('cancelled' if job.cancel.is_set() else 'complete')
        except Exception as exc:
            log.exception('Experiment failed')
            if self.engine is None:
                with self.lock:
                    self.state, self.error = 'error', str(exc)
            job.finish('failed', str(exc) or 'Generation failed. Try again with a shorter prompt.')
        finally:
            if self.engine:
                self.engine.clear()
            with self.lock:
                self.active_job = None

    def _worker(self):
        while True:
            action, job = self.tasks.get()
            try:
                if action == 'stop':
                    if self.engine:
                        self.engine.clear()
                    return
                if action == 'load':
                    try:
                        self._ensure_loaded()
                    except Exception as exc:
                        log.exception('Model loading failed')
                        with self.lock:
                            self.state, self.error = 'error', str(exc)
                else:
                    self._run_job(job)
            finally:
                self.tasks.task_done()
