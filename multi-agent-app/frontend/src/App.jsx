import { useState, useCallback } from "react"
import ReactFlow, { Background, Controls, useNodesState, useEdgesState } from "reactflow"
import "reactflow/dist/style.css"

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
  idle:     { background: "#1a1a2e", color: "#888",    border: "1px solid #333" },
  active:   { background: "#0a2a1a", color: "#00ff9d", border: "1px solid #00ff9d" },
  done:     { background: "#111",    color: "#fff",    border: "1px solid #555" },
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

  const examples = [
    "What are the most promising ways to use AI in healthcare?",
    "How is climate change affecting global food security?",
    "What are the latest breakthroughs in quantum computing?",
  ]

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
        // Reset all nodes to idle, then light up the active one
        setNodes(nds => nds.map(n => ({
          ...n,
          style: {
            ...n.style,
            ...(n.id === data.agent.toLowerCase()
              ? agentColors.active
              : agentColors.idle)
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
        // Set all nodes to done
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
        <button
          onClick={resetAll}
          className="text-xs text-gray-500 border border-[#333] px-3 py-1 hover:border-gray-400 hover:text-white transition-all"
        >
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
        <div className="flex gap-2 flex-wrap">
          {examples.map(ex => (
            <button
              key={ex}
              onClick={() => setGoal(ex)}
              className="text-xs text-gray-500 border border-[#222] px-2 py-1 hover:text-white hover:border-[#444] transition-all"
            >
              {ex.slice(0, 45)}...
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: "400px" }}>

        {/* Graph */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
          >
            <Background color="#1e1e2e" gap={20} />
            <Controls />
          </ReactFlow>
        </div>

        {/* Agent outputs sidebar */}
        <div className="w-96 border-l border-[#1e1e2e] overflow-y-auto p-4 flex flex-col gap-4">
          {["Planner", "Researcher", "Critic", "Writer"].map(agent => (
            <div
              key={agent}
              className={`border p-3 transition-all ${activeAgent === agent ? "border-[#00ff9d]" : "border-[#222]"}`}
            >
              <div className={`text-xs font-bold mb-2 flex items-center gap-2 ${activeAgent === agent ? "text-[#00ff9d]" : "text-gray-500"}`}>
                {agent}
                {activeAgent === agent && (
                  <span className="inline-block w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse" />
                )}
              </div>
              <div className="text-xs text-gray-400 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {outputs[agent] || "Waiting..."}
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

      {/* Final output */}
      {finalOutput && (
        <div className="border-t border-[#1e1e2e] px-6 py-4 max-h-96 overflow-y-auto">
          <div className="text-xs text-[#00ff9d] mb-3 uppercase tracking-widest">Final Output</div>
          <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {finalOutput}
          </div>
        </div>
      )}

    </div>
  )
}