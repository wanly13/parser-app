import { useState } from 'react'
import styles from './Panels.module.css'

const ACTION_COLOR = {
  Predict : styles.actPredict,
  Match   : styles.actMatch,
  Shift   : styles.actShift,
  Reduce  : styles.actReduce,
  Accept  : styles.actAccept,
  Error   : styles.actError,
}

export default function StepsPanel({ result }) {
  const [highlighted, setHighlighted] = useState(null)

  if (!result?.steps?.length) return <Placeholder />

  const { steps } = result

  return (
    <div className={`${styles.panel} animate-in`}>
      <div className={styles.stepHeader}>
        <span>#</span>
        <span>Pila</span>
        <span>Entrada restante</span>
        <span>Acción</span>
        <span>Detalle</span>
      </div>
      <div className={styles.stepsList}>
        {steps.map((s, i) => (
          <div
            key={i}
            className={`${styles.stepRow} ${highlighted === i ? styles.stepHighlighted : ''}`}
            onMouseEnter={() => setHighlighted(i)}
            onMouseLeave={() => setHighlighted(null)}
          >
            <span className={styles.stepNum}>{s.n}</span>
            <span className={styles.stepStack}>{s.stack}</span>
            <span className={styles.stepInput}>{s.input}</span>
            <span className={ACTION_COLOR[s.action] ?? styles.actPredict}>
              {s.action}
            </span>
            <span className={styles.stepDetail}>{s.detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Placeholder() {
  return <div className={styles.placeholder}>Ejecuta el análisis para ver los pasos.</div>
}
