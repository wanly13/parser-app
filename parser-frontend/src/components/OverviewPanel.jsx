import styles from './Panels.module.css'

export default function OverviewPanel({ result }) {
  if (!result) return <Empty />

  const { grammar_info, valid, steps, algorithm, ai_hint } = result
  const stepCount = steps?.length ?? 0

  return (
    <div className={`${styles.panel} animate-in`}>
      <div className={styles.infoStrip}>
        <InfoCard val={algorithm} label="Algoritmo activo" color="var(--accent)" />
        <InfoCard
          val={valid ? '✓ Válida' : '✗ Inválida'}
          label="Resultado"
          color={valid ? 'var(--accent2)' : 'var(--accent3)'}
        />
        <InfoCard val={stepCount} label="Pasos" color="var(--warn)" />
      </div>

      <div>
        <div className={styles.sectionTitle}>No terminales</div>
        <div className={styles.badgeRow}>
          {grammar_info?.non_terminals?.map(nt => (
            <span key={nt} className={`${styles.badge} ${styles.badgeNt}`}>{nt}</span>
          ))}
        </div>
      </div>

      <div>
        <div className={styles.sectionTitle}>Terminales</div>
        <div className={styles.badgeRow}>
          {grammar_info?.terminals?.map(t => (
            <span key={t} className={`${styles.badge} ${styles.badgeT}`}>{t}</span>
          ))}
        </div>
      </div>

      <div>
        <div className={styles.sectionTitle}>Producciones</div>
        <div className={styles.prodList}>
          {grammar_info?.productions?.map((p, i) => (
            <div key={i} className={styles.prodItem}>{p}</div>
          ))}
        </div>
      </div>

      {ai_hint && (
        <div className={styles.aiBox}>
          <div className={styles.aiHeader}>
            <div className={styles.aiIcon}>AI</div>
            <span className={styles.aiTitle}>Análisis automático</span>
          </div>
          <p className={styles.aiBody}>{ai_hint}</p>
        </div>
      )}
    </div>
  )
}

function InfoCard({ val, label, color }) {
  return (
    <div className={styles.infoCard}>
      <div className={styles.infoVal} style={{ color }}>{val}</div>
      <div className={styles.infoLabel}>{label}</div>
    </div>
  )
}

function Empty() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>⊢</div>
      <p>Ingresa una gramática y presiona <strong>▶ Analizar</strong></p>
    </div>
  )
}
