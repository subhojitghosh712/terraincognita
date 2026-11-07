# Backend
    pip install -r requirements.txt
    python discover.py --model Qwen/Qwen2.5-1.5B-Instruct   # once; writes neurons.json
    uvicorn main:app --port 8000                             # same MODEL env var as above
Check candidates.json if a neuron does nothing: swap its entry in neurons.json for another candidate.
