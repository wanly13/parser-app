import { useState } from 'react'
import styles from './Panels.module.css'

// Mapeo exhaustivo de colores para CUALQUIER tipo de parser (Top-Down y Bottom-Up)
const ACTION_COLOR = {
  // Top-Down / Descenso Recursivo / LL(1)
  Call    : styles.actPredict || styles.actCall,    // Color violeta/azul para llamadas
  Return  : styles.actMatch || styles.actReturn,    // Color verde suave para retornos exitosos
  Epsilon : styles.actReduce || styles.actEpsilon,  // Color naranja para derivaciones vacías
  Predict : styles.actPredict,
  Match   : styles.actMatch,

  // Bottom-Up / LR
  Shift   : styles.actShift,
  Reduce  : styles.actReduce,
  
  // Estados Finales
  Accept  : styles.actAccept,
  Error   : styles.actError, // Rojo chillón para la acción del error
}

export default function StepsPanel({ result }) {
  const [highlighted, setHighlighted] = useState(null)

  // Leemos steps directamente de result, sin importar si el backend devolvió éxito o error
  const steps = result?.steps

  if (!steps || steps.length === 0) return <Placeholder />

  return (
    <div className={`${styles.panel} animate-in`}>
      <div className={styles.stepHeader}>
        <span>#</span>
        <span>Pila / Contexto</span>
        <span>Entrada restante</span>
        <span>Acción</span>
        <span>Detalle</span>
      </div>
      <div className={styles.stepsList}>
        {steps.map((s, i) => {
          const isErrorRow = s.action === 'Error'
          
          // Construcción dinámica de clases para la fila completa
          const rowClasses = [
            styles.stepRow,
            highlighted === i ? styles.stepHighlighted : '',
            isErrorRow ? styles.stepRowError : '' // Inyectamos estilo de fila rota si es un error
          ].filter(Boolean).join(' ')

          return (
            <div
              key={i}
              className={rowClasses}
              onMouseEnter={() => !isErrorRow && setHighlighted(i)} // No iluminar si ya es fila de error
              onMouseLeave={() => setHighlighted(null)}
              // Estilo inline de emergencia por si tu CSS module no tiene stepRowError incorporado
              style={isErrorRow ? { 
                backgroundColor: 'rgba(239, 68, 68, 0.08)', 
                borderLeft: '4px solid #ef4444',
                color: '#fca5a5' 
              } : {}}
            >
              <span className={styles.stepNum} style={isErrorRow ? { color: '#ef4444' } : {}}>{s.n}</span>
              <span className={styles.stepStack}>{s.stack}</span>
              <span className={styles.stepInput} style={isErrorRow ? { textDecoration: 'line-through', opacity: 0.7 } : {}}>{s.input}</span>
              <span 
                className={ACTION_COLOR[s.action] ?? styles.actPredict}
                style={isErrorRow ? { backgroundColor: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' } : {}}
              >
                {s.action}
              </span>
              <span className={styles.stepDetail} style={isErrorRow ? { color: '#ef4444', fontWeight: '500' } : {}}>{s.detail}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Placeholder() {
  return <div className={styles.placeholder}>Ejecuta el análisis para ver el historial de pasos.</div>
}