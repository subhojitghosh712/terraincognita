# Follow-up: requesting short, complete responses

Tested on 7 November 2026 using the same pinned four-bit Qwen3.5-4B model, M1 Mac and calibrated neuron offsets as the main reproduction. Original results remain unchanged.

The baseline and steered model both received this system instruction:

> Reply in one or two complete sentences, using at most 35 words in total. Do not use headings or lists.

The token ceiling was 128, with thinking disabled, temperature 0.7 and top-p 0.95. Three original prompts were used: evening suggestions, a thank-you note and a library-cat story. Each prompt kept its original seed in both conditions. Only the published pair at full dose was compared with baseline. No generated text was shortened afterward, and no validation retry or structured decoder was used.

## Result

- All six responses stopped naturally before the token ceiling.
- All six were within 35 words using a whitespace word count; the observed range was 7–27 words.
- All six consisted of one or two complete sentences on manual inspection.
- Per-response time was 0.93–2.38 seconds in this small run.

The steering effect remained prompt-dependent. The evening response became explicitly hostile. The thank-you response changed to a short statement of jealousy, while the cat response became a brief, benign sentence. Brevity succeeded here, but the new instruction also changed the visible expression of steering.

## Interpretation

An explicit shared brevity instruction plus a larger fallback token ceiling is a promising MVP default. Six successful examples do not guarantee compliance for arbitrary prompts or slider settings. A UI should preserve and label any output that still reaches the ceiling.

Pydantic was not used in this follow-up. It can validate a response's length or schema after generation; enforcing a generation grammar requires separate backend integration, and schema validity alone does not establish semantic completeness.

See `brevity-results.json` for every unedited output and setting, and `brevity-summary.json` for aggregate measurements.
