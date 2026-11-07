# Uncharted MVP contract

Local app, same-origin API, plain HTML/CSS/JS frontend. All model output must be rendered as text, never HTML.

GET `/api/status`:
`{state: 'unloaded'|'loading'|'ready'|'error'|'learning_only', error: string|null, active_job: string|null, model_name: string, revision: string, settings: {max_new_tokens:128, max_prompt_chars:2000, temperature:0.7, top_p:0.95, seed:1234, system_instruction:string}, neurons:[{key:'a'|'b',layer:number,index:number,min:number,max:number,delta_per_dose:number}], calibration_source:string}`

POST `/api/load` with `{}` retries loading, returns `{state}`. The server starts loading automatically.

In learning-only mode, status also contains `learning_only: true`. No inference worker or model is started. Both POST `/api/load` and POST `/api/experiments` return HTTP 503 with an explanatory `detail`. The frontend keeps Learn available and disables Run.

POST `/api/experiments` with `{prompt:string, dose_a:number, dose_b:number, seed:integer}` -> HTTP202 `{id:string,snapshot:object}`. A ranges0..1; B ranges-1..0; defaultseed1234. All numeric inputs finite, seed0..2147483647. Empty/overlongprompt rejected. HTTP409 if busy;422 if validation error. Model can load before a queued generation. Errors use `{detail: string|array}`.

GET `/api/experiments/{id}/events` is SSE, with numbered event IDs and replay. EventSource attaches listeners to these event names:
- `snapshot`: immutable experiment snapshot `{id,prompt,dose_a,dose_b,seed,model_name,revision,settings,neurons:[{key,layer,index,dose,delta}],created_at}`.
- `phase`: `{side:'baseline'|'steered',state:'generating'|'cached'|'loading'}`.
- `token`: `{side,text}`; append the text fragment.
- `result`: `{side,text,tokens,seconds,ttft_seconds,finish_reason:'stop'|'length'|'cancelled',cached,peak_memory_gb}`; replace existing side text with authoritative `text`.
- `complete`: `{id,status:'complete',snapshot,outputs:{baseline:result,steered:result},completed_at}`.
- `cancelled`: same result envelope with `status:'cancelled'`, possibly partial outputs.
- `failed`: `{id,status:'failed',message,snapshot,outputs}`.

POST `/api/experiments/{id}/cancel` with `{}` -> `{status:'cancelling'|'complete'|'cancelled'|'failed'}`. Cancellation is cooperative between tokens. Preserve partial output. Never allow concurrent inference.

GET `/api/experiments/{id}` -> result envelope with current `status`.

Backend binds only127.0.0.1. Baseline cached only for same prompt, template, modelrevision and settings/seed. Model state alwaysreset before/after each response, even errors/cancel. Fresh model generation cache per response.

UI requirements: two bounded sliders (Apositive,Bnegative), original/A/B/both presets; prompt input with examples; Run/Stop/Reset; streamed before/after; original settings remain visible above old outputs after edits; meaningful load/error/truncation status; guided 'Are both neurons needed?' exercise; small accurate diagram of32layers highlighting13/14 (zero-indexed); concise introduction; copy/download experiment; keyboard/mobile accessible; no fictional metrics. Explain that observed hostile output and quality changes are experimental. Plain output text. Same brevity instruction for both conditions. Disabledcontrols as needed while running. Output begins empty with useful instructions; no fabricated results.
