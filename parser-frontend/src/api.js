// Quitamos el slash final para tener un control perfecto de las rutas
const BASE = 'http://127.0.0.1:8000'

/**
 * Analyze grammar + input string with a given algorithm.
 * Returns { valid, steps, table, tree, grammar_info, ai_hint }
 */
export async function parseGrammar({ grammar, input, algorithm }) {
    // AHORA SÍ: Apuntamos al enrutador dinámico que armamos en Python
    const res = await fetch(`${BASE}/api/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grammar, input, algorithm }),
    })
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || err.error || `HTTP ${res.status}`)
    }
    
    return res.json()
}

/**
 * Ask the AI about the current grammar (Gemini API via backend).
 * Returns { explanation }
 */
export async function explainGrammar({ grammar, question, algorithm }) {
    const res = await fetch(`${BASE}/api/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grammar, question, algorithm }),
    })
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}