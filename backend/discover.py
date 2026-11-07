"""Find real MLP neurons (layer, index) that respond to each concept and write neurons.json.
Usage: python discover.py --model Qwen/Qwen2.5-1.5B-Instruct
"""
import argparse, json
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from concepts import CONCEPTS, QUESTIONS

ap = argparse.ArgumentParser()
ap.add_argument("--model", default="Qwen/Qwen2.5-1.5B-Instruct")
ap.add_argument("--min-depth", type=float, default=0.3)   # skip early layers
ap.add_argument("--max-depth", type=float, default=0.75)  # skip late layers
ap.add_argument("--top", type=int, default=5)             # candidates kept per concept
a = ap.parse_args()

dev = "cuda" if torch.cuda.is_available() else "cpu"
tok = AutoTokenizer.from_pretrained(a.model)
model = AutoModelForCausalLM.from_pretrained(
    a.model, torch_dtype=torch.bfloat16 if dev == "cuda" else torch.float32).to(dev).eval()
layers = model.model.layers
L = len(layers)
cap = {}

def make(i):
    def hook(mod, args):  # args[0] = the MLP's intermediate activations, i.e. the "neurons"
        cap[i] = args[0][0, -1].float().cpu()
    return hook
for i, l in enumerate(layers):
    l.mlp.down_proj.register_forward_pre_hook(make(i))

@torch.no_grad()
def acts(system, question):
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": question}]
    text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
    model(**tok(text, return_tensors="pt").to(dev))
    return torch.stack([cap[i] for i in range(L)])  # (layers, neurons)

lo, hi = int(L * a.min_depth), int(L * a.max_depth)
used, chosen, cands = set(), [], {}
for c in CONCEPTS:
    print("scanning", c["name"])
    P = torch.stack([acts(c["pos"], q) for q in QUESTIONS])
    N = torch.stack([acts(c["neg"], q) for q in QUESTIONS])
    d = P - N
    t = d.mean(0) / (d.std(0) / len(QUESTIONS) ** 0.5 + 1e-6)  # paired t-stat per neuron
    t[:lo] = 0; t[hi:] = 0
    scale = torch.cat([P, N]).std(0)
    picked = []
    for f in t.abs().flatten().topk(a.top * 6).indices.tolist():
        layer, idx = divmod(f, t.shape[1])
        if (layer, idx) in used: continue
        picked.append(dict(id=f"L{layer}N{idx}", layer=layer, index=idx, sign=1 if t[layer, idx] > 0 else -1,
                           scale=float(scale[layer, idx]), t=float(t[layer, idx]),
                           hint=c["hint"], lo=c["lo"], hi=c["hi"]))
        if len(picked) == a.top: break
    used.add((picked[0]["layer"], picked[0]["index"]))
    chosen.append(picked[0]); cands[c["name"]] = picked
json.dump(chosen, open("neurons.json", "w"), indent=2)
json.dump(cands, open("candidates.json", "w"), indent=2)
print("wrote neurons.json:", [n["id"] for n in chosen])
