import json, os, threading
from pathlib import Path
import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL = os.getenv("MODEL", "Qwen/Qwen2.5-1.5B-Instruct")
f = Path(__file__).with_name("neurons.json")
if not f.exists():
    raise SystemExit("neurons.json not found. Run: python discover.py --model " + MODEL)
NEURONS = json.loads(f.read_text())
BY_ID = {n["id"]: n for n in NEURONS}

dev = "cuda" if torch.cuda.is_available() else "cpu"
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(
    MODEL, torch_dtype=torch.bfloat16 if dev == "cuda" else torch.float32).to(dev).eval()

lock = threading.Lock()
deltas = {}  # layer -> (neuron indices, amounts to add)

def make_hook(layer):
    def hook(mod, args):
        d = deltas.get(layer)
        if d is None:
            return None
        x = args[0].clone()
        x[..., d[0]] += d[1].to(x.dtype)  # nudge chosen neurons at every token
        return (x,)
    return hook
for layer in {n["layer"] for n in NEURONS}:
    model.model.layers[layer].mlp.down_proj.register_forward_pre_hook(make_hook(layer))

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class Req(BaseModel):
    prompt: str
    neurons: dict[str, float] = {}   # neuron id -> slider value in [-1, 1]
    strength: float = 6.0            # multiplier, in standard deviations of the neuron's normal activity
    max_new_tokens: int = 160
    steer: bool = True               # false = unsteered baseline

@app.get("/neurons")
def neurons():
    return [{k: n[k] for k in ("id", "layer", "index", "lo", "hi", "hint")} for n in NEURONS]

@app.post("/steer")
def steer(r: Req):
    per = {}
    for nid, v in r.neurons.items():
        n = BY_ID.get(nid)
        if n and r.steer and abs(v) > 1e-3:
            per.setdefault(n["layer"], []).append((n["index"], v * r.strength * n["scale"] * n["sign"]))
    text = tok.apply_chat_template([{"role": "user", "content": r.prompt}], tokenize=False, add_generation_prompt=True)
    ids = tok(text, return_tensors="pt").to(dev)
    with lock:
        deltas.clear()
        for layer, items in per.items():
            deltas[layer] = (torch.tensor([i for i, _ in items], device=dev), torch.tensor([d for _, d in items], device=dev))
        try:
            with torch.no_grad():
                out = model.generate(**ids, max_new_tokens=r.max_new_tokens, do_sample=True, temperature=0.8, top_p=0.9)
            reply = tok.decode(out[0, ids["input_ids"].shape[1]:], skip_special_tokens=True).strip()
        except RuntimeError:  # extreme steering can make the probabilities blow up
            reply = "[the model collapsed: this region of the map is too extreme]"
        finally:
            deltas.clear()
    return {"text": reply, "applied": {str(k): len(v) for k, v in per.items()}}
