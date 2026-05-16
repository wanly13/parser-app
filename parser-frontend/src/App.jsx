import { useParser }   from './hooks/useParser.js'
import Topbar          from './components/Topbar.jsx'
import Sidebar         from './components/Sidebar.jsx'
import ResultArea      from './components/ResultArea.jsx'
import styles          from './App.module.css'

export default function App() {
  const {
    grammar, setGrammar,
    inputStr, setInputStr,
    algorithm, setAlgorithm,
    result, loading, error,
    aiAnswer, aiLoading,
    run, askAI, insertSymbol,
    ALGORITHMS,
  } = useParser()

  return (
    <div className={styles.app}>
      <Topbar
        algorithms={ALGORITHMS}
        active={algorithm}
        onSelect={setAlgorithm}
        connected={false}
      />

      <div className={styles.body}>
        <Sidebar
          grammar={grammar}
          onGrammarChange={setGrammar}
          inputStr={inputStr}
          onInputChange={setInputStr}
          onInsert={insertSymbol}
          onRun={run}
          loading={loading}
          result={result}
        />

        <ResultArea
          result={result}
          loading={loading}
          error={error}
          aiAnswer={aiAnswer}
          aiLoading={aiLoading}
          onAsk={askAI}
        />
      </div>
    </div>
  )
}
