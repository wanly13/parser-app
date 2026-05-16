import { useState } from 'react'
import OverviewPanel from './OverviewPanel.jsx'
import StepsPanel    from './StepsPanel.jsx'
import TablePanel    from './TablePanel.jsx'
import TreePanel     from './TreePanel.jsx'
import AIPanel       from './AIPanel.jsx'
import styles        from './ResultArea.module.css'

const TABS = [
  { id: 'overview', label: 'Resumen' },
  { id: 'steps',    label: 'Pasos' },
  { id: 'table',    label: 'Tabla' },
  { id: 'tree',     label: 'Árbol' },
  { id: 'ai',       label: 'IA Explica' },
]

export default function ResultArea({ result, loading, error, aiAnswer, aiLoading, onAsk }) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className={styles.area}>
      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        {loading && <div className={styles.spinner} />}
        {error && <span className={styles.errorBadge}>Error: {error}</span>}
      </div>

      <div className={styles.content}>
        {activeTab === 'overview' && <OverviewPanel result={result} />}
        {activeTab === 'steps'    && <StepsPanel    result={result} />}
        {activeTab === 'table'    && <TablePanel    result={result} />}
        {activeTab === 'tree'     && <TreePanel     result={result} />}
        {activeTab === 'ai'       && (
          <AIPanel
            result={result}
            aiAnswer={aiAnswer}
            aiLoading={aiLoading}
            onAsk={onAsk}
          />
        )}
      </div>
    </div>
  )
}
