"""Loopback-only FastAPI service for Uncharted."""
import asyncio
from contextlib import asynccontextmanager
import json
import math

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator
from starlette.middleware.trustedhost import TrustedHostMiddleware

from config import APP_DIR, LEARN_ONLY, SETTINGS
from engine import MLXEngine
from experiments import BusyError, ExperimentManager


class ExperimentInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, allow_inf_nan=False)
    prompt: str = Field(min_length=1, max_length=SETTINGS['max_prompt_chars'])
    dose_a: float = Field(ge=0, le=1)
    dose_b: float = Field(ge=-1, le=0)
    seed: StrictInt = Field(default=1234, ge=0, le=2147483647)

    @field_validator('dose_a', 'dose_b', mode='before')
    @classmethod
    def finite_number(cls, value):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError('Dose must be a finite number.')
        return value


def create_app(engine_factory=MLXEngine, *, learning_only=False):
    manager = ExperimentManager(engine_factory)

    @asynccontextmanager
    async def lifespan(app):
        if not learning_only:
            manager.start()
        yield
        await asyncio.to_thread(manager.close)

    app = FastAPI(title='Uncharted', docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    app.state.manager = manager
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=['127.0.0.1', 'localhost'])

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Do not echo invalid non-finite numbers or arbitrarily large raw inputs
        # into JSON error responses. NaN is not valid JSON output.
        detail = [{k: item[k] for k in ('loc', 'msg', 'type')} for item in exc.errors()]
        return JSONResponse({'detail': detail}, status_code=422)

    @app.middleware('http')
    async def local_requests(request, call_next):
        if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
            origin = request.headers.get('origin')
            expected = f'{request.url.scheme}://{request.headers.get("host", "")}'
            if origin and origin != expected:
                return JSONResponse({'detail': 'Requests must come from the local app.'}, status_code=403)
            if request.headers.get('content-type', '').split(';')[0] != 'application/json':
                return JSONResponse({'detail': 'Use application/json.'}, status_code=415)
            if len(await request.body()) > 16384:
                return JSONResponse({'detail': 'Request is too large.'}, status_code=413)
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['Cache-Control'] = 'no-store'
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; script-src 'self'; style-src 'self'; "
            "img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'")
        return response

    @app.get('/api/status')
    async def status():
        result = manager.status()
        if learning_only:
            result.update(state='learning_only', learning_only=True)
        return result

    @app.post('/api/load')
    async def load():
        if learning_only:
            raise HTTPException(503, 'Learning-only mode does not load a model. See README.md for the Apple Silicon setup.')
        return manager.load()

    @app.post('/api/experiments', status_code=202)
    async def experiment(body: ExperimentInput):
        if learning_only:
            raise HTTPException(503, 'Experiments are unavailable in learning-only mode. The Learn page runs without a model.')
        try:
            job = manager.submit(**body.model_dump())
        except BusyError as exc:
            raise HTTPException(409, str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(503, str(exc)) from exc
        return {'id': job.id, 'snapshot': job.snapshot}

    def get_job(job_id):
        job = manager.get(job_id)
        if job is None:
            raise HTTPException(404, 'Experiment not found. It may have expired after newer runs.')
        return job

    @app.get('/api/experiments/{job_id}')
    async def record(job_id: str):
        return get_job(job_id).record()

    @app.post('/api/experiments/{job_id}/cancel')
    async def cancel(job_id: str):
        get_job(job_id)
        return manager.cancel(job_id)

    @app.get('/api/experiments/{job_id}/events')
    async def events(job_id: str, request: Request):
        job = get_job(job_id)
        try:
            after = max(0, int(request.headers.get('last-event-id', '0')))
        except ValueError as exc:
            raise HTTPException(400, 'Invalid event cursor.') from exc
        with job.lock:
            if after > len(job.events):
                raise HTTPException(400, 'Event cursor is ahead of this experiment.')

        async def stream():
            cursor = after
            idle = 0
            while True:
                if await request.is_disconnected():
                    return
                batch, done = job.read_events(cursor)
                for row in batch:
                    cursor = row['seq']
                    yield f"id: {cursor}\nevent: {row['type']}\ndata: {json.dumps(row['data'], ensure_ascii=False)}\n\n"
                if done:
                    return
                idle = 0 if batch else idle + 1
                if idle >= 150:
                    yield ': heartbeat\n\n'
                    idle = 0
                await asyncio.sleep(0.1)

        return StreamingResponse(stream(), media_type='text/event-stream',
                                 headers={'X-Accel-Buffering': 'no'})

    @app.get('/')
    async def index():
        return FileResponse(APP_DIR / 'static/index.html')

    app.mount('/static', StaticFiles(directory=APP_DIR / 'static'), name='static')
    return app


app = create_app(learning_only=LEARN_ONLY)
