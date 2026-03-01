import { useState, useCallback, useEffect, useRef } from "react"
import ReactFlow, { Background, Controls, useNodesState, useEdgesState } from "reactflow"
import "reactflow/dist/style.css"
import ReactMarkdown from "react-markdown"

const initialNodes = [
  {
    id: "planner",
    position: { x: 0, y: 200 },
    data: { label: "Planner" },
    style: { background: "#1a1a2e", color: "#888", border: "1px solid #333", borderRadius: 8, padding: 10, width: 120 }
  },
  {
    id: "researcher",
    position: { x: 200, y: 200 },
    data: { label: "Researcher" },
    style: { background: "#1a1a2e", color: "#888", border: "1px solid #333", borderRadius: 8, padding: 10, width: 120 }
  },
  {
    id: "critic",
    position: { x: 400, y: 200 },
    data: { label: "Critic" },
    style: { background: "#1a1a2e", color: "#888", border: "1px solid #333", borderRadius: 8, padding: 10, width: 120 }
  },
  {
    id: "writer",
    position: { x: 600, y: 200 },
    data: { label: "Writer" },
    style: { background: "#1a1a2e", color: "#888", border: "1px solid #333", borderRadius: 8, padding: 10, width: 120 }
  },
]

const initialEdges = [
  { id: "p-r", source: "planner", target: "researcher", animated: false },
  { id: "r-c", source: "researcher", target: "critic", animated: false },
  { id: "c-r", source: "critic", target: "researcher", animated: false, style: { stroke: "#ff6a6a" }, label: "revise", labelStyle: { fill: "#ff6a6a", fontSize: 10 } },
  { id: "c-w", source: "critic", target: "writer", animated: false },
]

const agentColors = {
  idle:   { background: "#1a1a2e", color: "#888",    border: "1px solid #333" },
  active: { background: "#0a2a1a", color: "#00ff9d", border: "2px solid #00ff9d" },
  done:   { background: "#111",    color: "#fff",    border: "1px solid #555" },
}

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [goal, setGoal] = useState("")
  const [running, setRunning] = useState(false)
  const [outputs, setOutputs] = useState({})
  const [sources, setSources] = useState([])
  const [finalOutput, setFinalOutput] = useState("")
  const [activeAgent, setActiveAgent] = useState(null)
  const finalRef = useRef(null)

  const examples = [
    "What are the most promising ways to use AI in healthcare?",
    "How is climate change affecting global food security?",
    "What are the latest breakthroughs in quantum computing?",
  ]

  // Auto scroll to final output when it appears
  useEffect(() => {
    if (finalOutput && finalRef.current) {
      finalRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [finalOutput])

  const setNodeStyle = useCallback((agentId, status) => {
    setNodes(nds => nds.map(n => {
      if (n.id === agentId.toLowerCase()) {
        return { ...n, style: { ...n.style, ...agentColors[status] } }
      }
      return n
    }))
  }, [setNodes])

  const resetAll = () => {
    setNodes(initialNodes)
    setEdges(initialEdges)
    setOutputs({})
    setSources([])
    setFinalOutput("")
    setActiveAgent(null)
    setGoal("")
  }

  const runAgents = () => {
    if (!goal.trim() || running) return
    setRunning(true)
    setOutputs({})
    setSources([])
    setFinalOutput("")
    setNodes(initialNodes)

    const ws = new WebSocket("ws://127.0.0.1:8000/ws")

    ws.onopen = () => {
      ws.send(JSON.stringify({ goal }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.event === "ping") return

      if (data.event === "agent_start") {
        setNodes(nds => nds.map(n => ({
          ...n,
          style: {
            ...n.style,
            ...(n.id === data.agent.toLowerCase() ? agentColors.active : agentColors.idle)
          }
        })))
        setActiveAgent(data.agent)
      }

      if (data.event === "agent_complete") {
        setNodeStyle(data.agent, "done")
        setOutputs(prev => ({
          ...prev,
          [data.agent]: typeof data.output === "object"
            ? JSON.stringify(data.output, null, 2)
            : data.output
        }))
      }

      if (data.event === "sources") {
        setSources(data.sources)
      }

      if (data.event === "run_complete") {
        setFinalOutput(data.final_output)
        setRunning(false)
        setActiveAgent(null)
        setNodes(nds => nds.map(n => ({
          ...n,
          style: { ...n.style, ...agentColors.done }
        })))
      }
    }

    ws.onerror = () => {
      setRunning(false)
      alert("Connection error — make sure your backend is running")
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-mono flex flex-col">

      {/* Header */}
      <div className="border-b border-[#1e1e2e] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#00ff9d]">Multi-Agent AI System</h1>
          <p className="text-xs text-gray-500">Planner → Researcher → Critic → Writer</p>
        </div>
        <button onClick={resetAll} className="text-xs text-gray-500 border border-[#333] px-3 py-1 hover:border-gray-400 hover:text-white transition-all">
          Reset
        </button>
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-b border-[#1e1e2e]">
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            value={goal}
            onChange={e => setGoal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runAgents()}
            placeholder="Enter a research goal..."
            className="flex-1 bg-[#111] border border-[#333] px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00ff9d]"
          />
          <button
            onClick={runAgents}
            disabled={running || !goal.trim()}
            className="px-6 py-2 bg-[#00ff9d] text-black text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#00e68a] transition-all"
          >
            {running ? "Running..." : "Run"}
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-600">Try:</span>
          {examples.map(ex => (
            <button key={ex} onClick={() => setGoal(ex)} className="text-xs text-gray-500 border border-[#222] px-2 py-1 hover:text-white hover:border-[#444] transition-all">
              {ex.slice(0, 45)}...
            </button>
          ))}
        </div>
      </div>

      {/* Graph + Sidebar */}
      <div className="flex overflow-hidden" style={{ minHeight: "400px" }}>
        <div className="flex-1">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
            <Background color="#1e1e2e" gap={20} />
            <Controls />
          </ReactFlow>
        </div>

        {/* Agent outputs sidebar */}
        <div className="w-96 border-l border-[#1e1e2e] overflow-y-auto p-4 flex flex-col gap-3">
          <div className="text-xs text-gray-600 uppercase tracking-widest">Agent Outputs</div>
          {["Planner", "Researcher", "Critic", "Writer"].map(agent => (
            <div key={agent} className={`border p-3 transition-all ${activeAgent === agent ? "border-[#00ff9d] bg-[#0a1a0f]" : "border-[#222]"}`}>
              <div className={`text-xs font-bold mb-2 flex items-center gap-2 ${activeAgent === agent ? "text-[#00ff9d]" : outputs[agent] ? "text-white" : "text-gray-600"}`}>
                {agent}
                {activeAgent === agent && <span className="inline-block w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse" />}
                {outputs[agent] && activeAgent !== agent && <span className="text-gray-600 font-normal text-xs">done</span>}
              </div>
              <div className="text-xs text-gray-400 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {outputs[agent] || <span className="text-gray-700 italic">Waiting...</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sources */}
      {sources.length > 0 && (
        <div className="border-t border-[#1e1e2e] px-6 py-4">
          <div className="text-xs text-gray-500 mb-3 uppercase tracking-widest">Sources Searched</div>
          <div className="flex flex-wrap gap-2">
            {sources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noreferrer" className="text-xs text-[#7c6aff] border border-[#2a2a4a] px-3 py-1 hover:border-[#7c6aff] hover:text-white transition-all max-w-xs truncate">
                {s.title || s.url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Final output — only appears after run completes */}
      {finalOutput && (
        <div ref={finalRef} className="border-t-2 border-[#00ff9d] mx-6 my-6 pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-sm font-bold text-[#00ff9d] uppercase tracking-widest">Final Output</div>
            <div className="flex-1 h-px bg-[#1a3a1a]" />
          </div>
          <div className="text-sm text-gray-300 leading-relaxed
            [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-6 [&_h1]:mb-3
            [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h2]:mb-3
            [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-[#00ff9d] [&_h3]:mt-4 [&_h3]:mb-2
            [&_p]:mb-4 [&_p]:leading-relaxed
            [&_ul]:mb-4 [&_ul]:pl-4 [&_li]:mb-1 [&_li]:list-disc
            [&_ol]:mb-4 [&_ol]:pl-4 [&_ol>li]:list-decimal
            [&_strong]:text-white [&_strong]:font-bold
            [&_table]:w-full [&_table]:border-collapse [&_table]:mb-4
            [&_th]:border [&_th]:border-[#333] [&_th]:p-2 [&_th]:text-left [&_th]:text-white [&_th]:bg-[#111]
            [&_td]:border [&_td]:border-[#333] [&_td]:p-2 [&_td]:text-gray-400
            [&_code]:text-[#00ff9d] [&_code]:bg-[#111] [&_code]:px-1 [&_code]:rounded
            [&_hr]:border-[#333] [&_hr]:my-4">
            <ReactMarkdown>{finalOutput}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Scroll hint — shown while running to tell user output is coming */}
      {running && (
        <div className="text-center py-4 text-xs text-gray-600 animate-pulse">
          Agents are working... final output will appear below when complete
        </div>
      )}

    </div>
  )
}