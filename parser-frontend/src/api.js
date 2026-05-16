const BASE = 'http://127.0.0.1:8000/'

/**
 * Analyze grammar + input string with a given algorithm.
 * Returns { valid, steps, table, tree, grammar_info, ai_hint }
 */
export async function parseGrammar({ grammar, input, algorithm }) {
    const res = await fetch(`${BASE}parse/ll1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grammar, input, algorithm }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
    }
    return res.json()
}

/**
 * Ask the AI about the current grammar (Claude API via backend).
 * Returns { explanation }
 */
export async function explainGrammar({ grammar, question, algorithm }) {
    const res = await fetch(`${BASE}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grammar, question, algorithm }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}