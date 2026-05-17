import styles from './Panels.module.css'

export default function OverviewPanel({ result }) {
  if (!result) return <Empty />

  const { grammar_info, valid, success, steps, algorithm, ai_hint } = result
  const stepCount = steps?.length ?? 0

  // ESCANEO DE SEGURIDAD INTERNO
  const hasErrorStep = steps?.some(s => s.action === 'Error');
  const isChainValid = hasErrorStep ? false : (success !== undefined ? success : valid);

  return (
    <div className={`${styles.panel} animate-in`}>
      <div className={styles.infoStrip}>
        <InfoCard val={algorithm || "Descenso Recursivo"} label="Algoritmo activo" color="var(--accent)" />
        <InfoCard
          val={isChainValid ? '✓ Válida' : '✗ Inválida'}
          label="Resultado"
          color={isChainValid ? 'var(--accent2)' : 'var(--accent3)'}
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

      {/* NUEVA SECCIÓN: Conjuntos FIRST y FOLLOW calculados para LL(1) */}
      {grammar_info?.first && (
        <div style={{ marginTop: '24px' }}>
          <div className={styles.sectionTitle}>Conjuntos de Selección (FIRST / FOLLOW)</div>
          <div className={styles.prodList} style={{ padding: '4px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', fontSize: '0.85rem' }}>
                  <th style={{ padding: '10px 12px' }}>Símbolo</th>
                  <th style={{ padding: '10px 12px' }}>FIRST</th>
                  <th style={{ padding: '10px 12px' }}>FOLLOW</th>
                </tr>
              </thead>
              <tbody>
                {grammar_info.non_terminals.map((nt) => (
                  <tr key={nt} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--accent)' }}>
                      {nt}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#34d399', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                      {`{ ${grammar_info.first[nt] || 'ϵ'} }`}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#fbbf24', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                      {`{ ${grammar_info.follow[nt] || '$'} }`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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