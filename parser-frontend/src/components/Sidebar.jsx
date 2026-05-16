import { useRef } from 'react'
import styles from './Sidebar.module.css'

const SYMBOLS = ['ϵ', '→', ' | ', "′", 'λ', '⊢', '$', '↑']

export default function Sidebar({
  grammar, onGrammarChange,
  inputStr, onInputChange,
  onInsert, onRun, loading,
  result,
}) {
  const taRef = useRef(null)

  const productions = grammar
    .split('\n')
    .filter(l => l.includes('→') || l.includes('->'))
    .map(l => l.trim())

  return (
    <aside className={styles.sidebar}>
      <section>
        <div className={styles.label}>Gramática</div>
        <textarea
          ref={taRef}
          className={styles.grammarArea}
          value={grammar}
          onChange={e => onGrammarChange(e.target.value)}
          spellCheck={false}
          rows={7}
        />
      </section>

      <section>
        <div className={styles.label}>Teclado virtual</div>
        <div className={styles.kbdGrid}>
          {SYMBOLS.map(sym => (
            <button
              key={sym}
              className={styles.kbdBtn}
              onClick={() => onInsert(sym.trim(), taRef)}
            >
              {sym.trim()}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className={styles.label}>Cadena de entrada</div>
        <div className={styles.inputRow}>
          <input
            className={styles.strInput}
            value={inputStr}
            onChange={e => onInputChange(e.target.value)}
            placeholder="ej: id + id * id"
          />
          <button
            className={styles.runBtn}
            onClick={onRun}
            disabled={loading}
          >
            {loading ? '...' : '▶ Analizar'}
          </button>
        </div>
      </section>

      <section className={styles.prodsSection}>
        <div className={styles.label}>Producciones</div>
        <div className={styles.prodList}>
          {productions.length === 0 && (
            <span className={styles.empty}>Ingresa una gramática</span>
          )}
          {productions.map((p, i) => {
            const [head, ...body] = p.split('→')
            return (
              <div key={i} className={styles.prodRow}>
                <span className={styles.prodHead}>{head?.trim()}</span>
                <span className={styles.prodArrow}>→</span>
                <span className={styles.prodBody}>{body.join('→').trim()}</span>
              </div>
            )
          })}
        </div>
      </section>

      {result && (
        <div className={`${styles.statusBadge} ${result.valid ? styles.valid : styles.invalid}`}>
          {result.valid ? '✓ Cadena aceptada' : '✗ Cadena rechazada'}
        </div>
      )}
    </aside>
  )
}
