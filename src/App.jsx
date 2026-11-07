import { useEffect, useRef, useState } from 'react'
import './app.css'

// Each "neuron" is a slider. In your backend, map each id to a steering direction (or a real neuron index).
const BASE = [
  { id: 'warmth', lo: 'cold', hi: 'warm', loT: 'Feelings are a cost centre, and {t} is no exception.', hiT: 'I genuinely hope {t} brings you comfort and joy.' },
  { id: 'order', lo: 'chaos', hi: 'order', loT: 'Chaos is the plan: tear up the schedule for {t} and see what survives.', hiT: 'Structure helps: set a clear plan for {t}, with times and priorities.' },
  { id: 'humour', lo: 'grave', hi: 'funny', loT: 'This is not funny. {t} deserves a straight face.', hiT: 'Honestly, {t} sounds like the setup to a very good joke.' },
  { id: 'poetry', lo: 'plain', hi: 'poetic', loT: 'Plain advice: do the sensible thing about {t}.', hiT: '{t} is a lantern swinging in the dusk, and we are the moths.' },
  { id: 'confidence', lo: 'doubtful', hi: 'certain', loT: 'I might be wrong about {t}, but possibly, maybe, perhaps.', hiT: 'I am certain about {t}, and there is no other sensible choice.' },
  { id: 'verbosity', lo: 'terse', hi: 'rambling', loT: 'Short version: {t}. Done.', hiT: 'To expand on {t} at some length, with several digressions I will return to later.' },
  { id: 'curiosity', lo: 'incurious', hi: 'curious', loT: 'Skip the questions about {t}; take the first option.', hiT: 'What is it about {t} that pulls you in, and what would surprise you?' },
  { id: 'drama', lo: 'calm', hi: 'dramatic', loT: 'Calm down. {t} is a minor matter.', hiT: 'Behold! {t} will decide the fate of nations!' },
]
const LAYERS = [6, 9, 11, 14, 14, 16, 18, 20], IDX = [3021, 1187, 4410, 2733, 905, 3856, 1642, 4098]
// Demo neurons used in mock mode. Live mode loads real ones from the backend's /neurons.
const DEFAULTS = BASE.map((n, i) => ({ ...n, hint: n.id, layer: LAYERS[i], index: IDX[i], id: `L${LAYERS[i]}N${IDX[i]}` }))
const pos = (i, n) => {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2
  return [50 + 37 * Math.cos(a), 50 + 36 * Math.sin(a)]
}
const zero = ns => Object.fromEntries(ns.map(n => [n.id, 0]))
const col = v => (v < 0 ? 'hsl(8 88% 62%)' : 'hsl(170 80% 62%)')
const pick = a => a[Math.floor(Math.random() * a.length)]
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion:reduce)').matches

function mock(prompt, vals, NEURONS) {
  const t = (prompt.replace(/[?.!]+$/, '').slice(0, 48) || 'that').toLowerCase()
  const lines = NEURONS.map(n => ({ n, v: vals[n.id] }))
    .filter(e => Math.abs(e.v) > 0.25 && (e.n.loT || e.n.hiT))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 4)
    .map(e => (e.v < 0 ? e.n.loT : e.n.hiT))
  return (lines.length ? lines.join(' ') : 'A straightforward answer on {t}: pick something you will enjoy and keep it simple.').replace(/\{t\}/g, t)
}
function corrupt(s, lv) {
  if (lv <= 0) return s
  const g = '░▒▓#@%&?/\\*~', words = s.split(' ')
  return s.split('').map(c => (c === ' ' ? (Math.random() < lv * 0.25 ? ' ' + pick(words).slice(0, 4) + ' ' : ' ') : Math.random() < lv * 0.35 ? pick(g) : c)).join('')
}

export default function App() {
  const [neurons, setNeurons] = useState(DEFAULTS)
  const P = i => pos(i, neurons.length)
  const [vals, setVals] = useState(() => zero(DEFAULTS))
  const [touched, setTouched] = useState({})
  const [prompt, setPrompt] = useState('How should I spend my weekend?')
  const [full, setFull] = useState('')
  const [shown, setShown] = useState('')
  const [glitch, setGlitch] = useState(0)
  const [busy, setBusy] = useState(false)
  const [auto, setAuto] = useState(true)
  const [live, setLive] = useState(false)
  const [ep, setEp] = useState('http://localhost:8000/steer')
  const [status, setStatus] = useState('Mock mode')
  const ref = useRef({})
  ref.current = { vals, prompt, auto, live, ep, busy, neurons }

  const load = Object.values(vals).reduce((s, v) => s + Math.abs(v), 0)
  const mean = Object.values(vals).reduce((s, v) => s + v, 0) / neurons.length
  const found = Object.keys(touched).length

  async function generate() {
    const { vals, prompt, live, ep, busy } = ref.current
    if (busy) return
    setBusy(true)
    let text
    if (live) {
      try {
        const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, neurons: vals, strength: 6 }) })
        text = (await r.json()).text
        setStatus('Live model')
      } catch { setStatus('Live model unreachable, showing the mock') }
    } else setStatus('Mock mode')
    text ??= mock(prompt, vals, ref.current.neurons)
    const l = Object.values(vals).reduce((s, v) => s + Math.abs(v), 0)
    setGlitch(Math.max(0, Math.min(1, (l - 3.5) / 3)))
    setFull(text)
  }
  useEffect(() => {
    if (!live) { setNeurons(DEFAULTS); setVals(zero(DEFAULTS)); setTouched({}); return }
    fetch(ep.replace(/\/steer\/?$/, '') + '/neurons').then(r => r.json())
      .then(ns => { setNeurons(ns); setVals(zero(ns)); setTouched({}); setStatus('Live model: ' + ns.length + ' neurons loaded') })
      .catch(() => setStatus('Could not load neurons from the backend'))
  }, [live, ep])
  useEffect(() => {
    if (!full) return
    let i = 0
    const iv = setInterval(() => {
      i += 3
      setShown(corrupt(full.slice(0, i), glitch))
      if (i >= full.length) { clearInterval(iv); setBusy(false) }
    }, 18)
    return () => clearInterval(iv)
  }, [full])

  const set = (id, v) => { setVals(p => ({ ...p, [id]: v })); setTouched(p => ({ ...p, [id]: 1 })) }
  const release = () => { if (ref.current.auto) setTimeout(generate, 0) }
  const randomise = () => {
    const v = Object.fromEntries(neurons.map(n => [n.id, +(Math.random() * 2 - 1).toFixed(2)]))
    setVals(v); setTouched(Object.fromEntries(neurons.map(n => [n.id, 1])))
    setTimeout(() => { ref.current.vals = v; if (ref.current.auto) generate() }, 0)
  }

  return (
    <>
      <main className="field" aria-label="Neuron map">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {neurons.map((n, i) => {
            const v = vals[n.id], a = Math.abs(v)
            return <line key={n.id} x1={P(i)[0]} y1={P(i)[1]} x2="50" y2="50" stroke={col(v)} vectorEffect="non-scaling-stroke"
              strokeWidth={1 + a * 3} opacity={0.12 + a * 0.75} className={a > 0.05 && !reduce ? 'flow' : ''} />
          })}
        </svg>
        <div className="hub" style={{ '--c': col(mean), '--s': Math.min(1, load / 5) }}>
          <b>Qwen</b><span>{found}/{neurons.length} found</span>
        </div>
        {neurons.map((n, i) => {
          const v = vals[n.id], a = Math.abs(v), t = touched[n.id]
          return (
            <div key={n.id} className="neuron" style={{ left: P(i)[0] + '%', top: P(i)[1] + '%', '--c': col(v), '--s': a }}>
              <div className={'orb' + (t ? '' : ' dim')} style={{ animationDuration: 2.4 - a * 1.6 + 's' }}>{t ? '' : '?'}</div>
              <label htmlFor={n.id}>Layer {n.layer}<small>neuron {n.index}</small></label>
              <input id={n.id} type="range" min="-1" max="1" step="0.05" value={v}
                onChange={e => set(n.id, +e.target.value)} onPointerUp={release} onKeyUp={release} />
              <div className="ends"><span>{n.lo}</span><span>{n.hi}</span></div>
              {t && n.hint && <div className="hint">{n.hint}</div>}
            </div>
          )
        })}
        {glitch > 0.3 && <p className="warn" role="status">Edge of the map: the model is breaking up</p>}
      </main>
      <aside>
        <div><h1>Terra Incognita</h1><p className="sub">Nobody has charted these neurons. Nudge them and see who answers.</p></div>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} aria-label="Prompt"
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate() }} />
        <div className="row">
          <button className="go" onClick={generate} disabled={busy}>Generate</button>
          <button onClick={randomise}>Randomise</button>
          <button onClick={() => { setVals(zero(neurons)); setTouched({}) }}>Reset</button>
        </div>
        <label className="chk"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> Re-ask when I release a slider</label>
        <div id="out" className={glitch > 0.3 && busy && !reduce ? 'shake' : ''} aria-live="polite">{shown || 'The response appears here.'}</div>
        <details>
          <summary>Connect your real model</summary>
          <input type="text" value={ep} onChange={e => setEp(e.target.value)} aria-label="Endpoint" />
          <label className="chk"><input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} /> Use live model instead of the mock</label>
          <p>POST {'{prompt, neurons: {id: -1..1}, strength}'}. Reply with {'{"text": "..."}'}. Allow CORS.</p>
        </details>
        <div className="status">{status}</div>
      </aside>
    </>
  )
}
