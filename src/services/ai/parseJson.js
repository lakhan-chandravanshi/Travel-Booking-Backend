/**
 * Robustly parse JSON returned by an LLM. Models occasionally wrap output in
 * markdown fences or add stray prose, so we strip fences and fall back to
 * extracting the outermost {...} block.
 */
export function parseJson(text) {
  if (!text) throw new Error('Empty AI response');
  let cleaned = String(text).trim();

  // Remove ```json ... ``` or ``` ... ``` fences.
  cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error('AI response was not valid JSON');
  }
}

export default parseJson;
