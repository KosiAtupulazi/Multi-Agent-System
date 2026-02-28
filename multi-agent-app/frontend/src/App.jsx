import { useEffect, useState } from "react"

function App() {
  const [status, setStatus] = useState("checking...")

  useEffect(() => {
    fetch("http://127.0.0.1:8000/health")
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setStatus("error — backend not reachable"))
  }, [])

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <h1 className="text-white text-4xl font-bold">Backend status: {status}</h1>
    </div>
  )
}

export default App