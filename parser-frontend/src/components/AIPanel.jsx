import { useState } from 'react'
import styles from './Panels.module.css'
import Markdown from 'react-markdown'
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
  // Nuevo estado para recordar la pregunta activa
  const [lastAskedQuestion, setLastAskedQuestion] = useState('')

  const handleAsk = (qText) => {
    const q = qText.trim()
    if (q) {
      setLastAskedQuestion(q) // Guardamos la pregunta para mostrarla arriba
      onAsk(q)
    }
  }

  const submit = () => {
    if (question.trim()) {
      handleAsk(question)
      setQuestion('') // Ahora sí limpiamos el input de forma segura
    }
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

        {result?.ai_hint && !lastAskedQuestion && !aiAnswer && (
          <p className={styles.aiBody}>{result.ai_hint}</p>
        )}

        {/* Bloque para mostrar la pregunta que se está procesando o ya se respondió */}
        {lastAskedQuestion && (
          <div className={styles.userQuestionBox}>
             {lastAskedQuestion}
          </div>
        )}

        {aiLoading && (
          <div className={styles.aiLoading}>
            <span /> <span /> <span />
          </div>
        )}

        {aiAnswer && !aiLoading && (
          <div className={styles.aiAnswer}>
            <Markdown>{aiAnswer}</Markdown>
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
              onClick={() => handleAsk(s)} // También guarda la sugerencia como última pregunta
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