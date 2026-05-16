import { useState } from 'react'
import styles from './Panels.module.css'

const SUGGESTIONS = [
  '¿Esta gramática es ambigua?',
  '¿Cómo elimino la recursión izquierda?',
  '¿Cómo la factorizo para LL(1)?',
  '¿Cuál es el FIRST de E?',
  '¿Cuál es el FOLLOW de E\'?',
  '¿Por qué E\' → ϵ en este contexto?',
]

export default function AIPanel({ result, aiAnswer, aiLoading, onAsk }) {
  const [question, setQuestion] = useState('')

  const submit = () => {
    const q = question.trim()
    if (q) { onAsk(q); setQuestion('') }
  }

  return (
    <div className={`${styles.panel} animate-in`}>
      <div className={styles.aiBox}>
        <div className={styles.aiHeader}>
          <div className={styles.aiIcon}>AI</div>
          <span className={styles.aiTitle}>Explícame con IA</span>
        </div>

        {!result && (
          <p className={styles.aiBody} style={{ opacity: 0.5 }}>
            Analiza una gramática primero para habilitar las explicaciones.
          </p>
        )}

        {result?.ai_hint && !aiAnswer && (
          <p className={styles.aiBody}>{result.ai_hint}</p>
        )}

        {aiLoading && (
          <div className={styles.aiLoading}>
            <span />  <span /> <span />
          </div>
        )}

        {aiAnswer && (
          <div className={styles.aiAnswer}>
            {aiAnswer}
          </div>
        )}
      </div>

      <div>
        <div className={styles.sectionTitle}>Sugerencias</div>
        <div className={styles.chips}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              className={styles.chip}
              onClick={() => onAsk(s)}
              disabled={aiLoading || !result}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className={styles.sectionTitle}>Pregunta propia</div>
        <div className={styles.aiInputRow}>
          <input
            className={styles.aiInput}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="ej: ¿Por qué esta gramática no es LL(1)?"
            disabled={!result}
          />
          <button
            className={styles.runBtn}
            onClick={submit}
            disabled={aiLoading || !result || !question.trim()}
          >
            Preguntar ↗
          </button>
        </div>
      </div>
    </div>
  )
}
