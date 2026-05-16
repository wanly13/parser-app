import { useState, useCallback } from 'react'
import { parseGrammar, explainGrammar } from '../api.js'

const DEFAULT_GRAMMAR = `E → T E'
E' → + T E' | ϵ
T → F T'
T' → * F T' | ϵ
F → ( E ) | id`

const ALGORITHMS = ['RD', 'LL(1)', 'LR(0)', 'SLR(1)', 'LALR(1)', 'LR(1)']

// Mock data so the UI works before the backend is ready
function mockResult(grammar, input, algorithm) {
  return {
    valid: true,
    algorithm,
    grammar_info: {
      start: 'E',
      non_terminals: ["E", "E'", "T", "T'", "F"],
      terminals: ['+', '*', '(', ')', 'id', '$'],
      productions: [
        "E → T E'",
        "E' → + T E' | ϵ",
        "T → F T'",
        "T' → * F T' | ϵ",
        "F → ( E ) | id",
      ],
    },
    steps: [
      { n: 1,  stack: "$ E",       input: "id+id*id$", action: "Predict",  detail: "E → T E'" },
      { n: 2,  stack: "$ E' T",    input: "id+id*id$", action: "Predict",  detail: "T → F T'" },
      { n: 3,  stack: "$ E' T' F", input: "id+id*id$", action: "Predict",  detail: "F → id" },
      { n: 4,  stack: "$ E' T' id",input: "id+id*id$", action: "Match",    detail: "id" },
      { n: 5,  stack: "$ E' T'",   input: "+id*id$",   action: "Predict",  detail: "T' → ϵ" },
      { n: 6,  stack: "$ E'",      input: "+id*id$",   action: "Predict",  detail: "E' → + T E'" },
      { n: 7,  stack: "$ E' T +",  input: "+id*id$",   action: "Match",    detail: "+" },
      { n: 8,  stack: "$ E' T",    input: "id*id$",    action: "Predict",  detail: "T → F T'" },
      { n: 9,  stack: "$ E' T' F", input: "id*id$",    action: "Predict",  detail: "F → id" },
      { n: 10, stack: "$ E' T' id",input: "id*id$",    action: "Match",    detail: "id" },
      { n: 11, stack: "$ E' T'",   input: "*id$",      action: "Predict",  detail: "T' → * F T'" },
      { n: 12, stack: "$",         input: "$",         action: "Accept",   detail: "✓" },
    ],
    table: {
      type: 'LL1',
      non_terminals: ["E", "E'", "T", "T'", "F"],
      terminals: ['id', '+', '*', '(', ')', '$'],
      cells: {
        "E":  { id: "T E'", '(': "T E'" },
        "E'": { '+': "+ T E'", ')': 'ϵ', '$': 'ϵ' },
        "T":  { id: "F T'", '(': "F T'" },
        "T'": { '+': 'ϵ', '*': "* F T'", ')': 'ϵ', '$': 'ϵ' },
        "F":  { id: 'id', '(': '( E )' },
      },
    },
    tree: {
      label: 'E', children: [
        { label: 'T', children: [
          { label: 'F', children: [{ label: 'id', children: [] }] },
          { label: "T'", children: [{ label: 'ϵ', children: [] }] },
        ]},
        { label: "E'", children: [
          { label: '+', children: [] },
          { label: 'T', children: [
            { label: 'F', children: [{ label: 'id', children: [] }] },
            { label: "T'", children: [
              { label: '*', children: [] },
              { label: 'F', children: [{ label: 'id', children: [] }] },
              { label: "T'", children: [{ label: 'ϵ', children: [] }] },
            ]},
          ]},
          { label: "E'", children: [{ label: 'ϵ', children: [] }] },
        ]},
      ]
    },
    ai_hint: `La gramática es LL(1). No se detectó recursión izquierda ni ambigüedad. La cadena "${input}" fue aceptada en 12 pasos.`,
  }
}

export function useParser() {
  const [grammar, setGrammar] = useState(DEFAULT_GRAMMAR)
  const [inputStr, setInputStr] = useState('id + id * id')
  const [algorithm, setAlgorithm] = useState('LL(1)')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [aiAnswer, setAiAnswer] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      // Try real backend first; fall back to mock
      const data = await parseGrammar({ grammar, input: inputStr, algorithm })
      setResult(data)
    } catch {
      // Backend not ready yet → use mock so UI is always demo-able
      setResult(mockResult(grammar, inputStr, algorithm))
    } finally {
      setLoading(false)
    }
  }, [grammar, inputStr, algorithm])

  const askAI = useCallback(async (question) => {
    setAiLoading(true)
    setAiAnswer(null)
    try {
      const data = await explainGrammar({ grammar, question, algorithm })
      setAiAnswer(data.explanation)
    } catch {
      setAiAnswer('Backend de IA no disponible aún. Conéctalo en /api/explain.')
    } finally {
      setAiLoading(false)
    }
  }, [grammar, algorithm])

  const insertSymbol = useCallback((sym, textareaRef) => {
    const el = textareaRef.current
    if (!el) { setGrammar(g => g + sym); return }
    const s = el.selectionStart, e = el.selectionEnd
    const next = grammar.slice(0, s) + sym + grammar.slice(e)
    setGrammar(next)
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = s + sym.length
      el.focus()
    })
  }, [grammar])

  return {
    grammar, setGrammar,
    inputStr, setInputStr,
    algorithm, setAlgorithm,
    result, loading, error,
    aiAnswer, aiLoading,
    run, askAI, insertSymbol,
    ALGORITHMS,
  }
}
