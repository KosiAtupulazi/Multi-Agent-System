# Multi-Agent AI System

A full-stack web application where four specialized AI agents collaborate in real time to research and answer any question. The system uses a live animated graph to visualize agents working, passing feedback, and iterating — all powered by the Claude API and live web search via Tavily.

---

## How It Works

When a user submits a goal, four agents run in sequence:

1. **Planner** — breaks the goal into specific search queries
2. **Researcher** — searches the web using Tavily and synthesizes the results
3. **Critic** — reviews the research and sends it back for revision if it finds weaknesses (loops up to 3 times)
4. **Writer** — produces a clean, well-structured final response

The frontend visualizes this entire process as an animated node graph in real time via WebSockets.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Flow, React Markdown |
| Backend | Python, FastAPI, Uvicorn |
| AI | Anthropic Claude API (claude-haiku) |
| Search | Tavily Search API |
| Real-time | WebSockets |
| Deployment | Vercel (frontend), Railway (backend) |

---

## Project Structure

```
multi-agent-system/
└── multi-agent-app/
    ├── frontend/
    │   └── src/
    │       └── App.jsx          # Full UI — graph, sidebar, sources, final output
    └── backend/
        ├── main.py              # FastAPI server + WebSocket endpoint
        ├── orchestrator.py      # Coordinates agents in sequence, handles critic loop
        ├── agents.py            # Agent class + all 4 agent definitions
        ├── search.py            # Tavily web search integration
        ├── requirements.txt     # Python dependencies
        └── .env                 # API keys (never committed to GitHub)
```

---

## File Breakdown

### `backend/agents.py`
Defines the `Agent` class and all four agents. Each agent is an instance of the class with a unique name and system prompt. The system prompt is what gives each agent its specific role and behavior. The `run()` method sends a message to Claude and returns the response.

### `backend/search.py`
A single `search()` function that calls the Tavily API with a query string and returns the top 3 results — title, URL, and raw page content (trimmed to 2000 characters per result).

### `backend/orchestrator.py`
The core of the system. An async function that runs all agents in sequence, emits WebSocket events at each step so the frontend can update in real time, and handles the Critic→Researcher feedback loop. If the Critic rejects the research, it sends the feedback back to the Researcher for revision. This repeats up to 3 times before moving on regardless.

### `backend/main.py`
The FastAPI server. Has two endpoints — a `/health` GET endpoint for status checks, and a `/ws` WebSocket endpoint that accepts a goal from the frontend and runs the orchestrator.

### `frontend/src/App.jsx`
The entire frontend in one file. Renders the React Flow graph, agent output sidebar, sources panel, and final markdown output. Connects to the backend via WebSocket and updates the UI in real time as events arrive.

---

## Running Locally

### Prerequisites
- Node.js v20 or higher
- Python 3.11 or higher
- An Anthropic API key — get one at `console.anthropic.com`
- A Tavily API key — get one at `app.tavily.com`

---

### 1. Clone the repo

```bash
git clone https://github.com/your-username/multi-agent-system.git
cd multi-agent-system/multi-agent-app
```

---

### 2. Set up the backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

- **Mac/Linux:** `source .venv/bin/activate`
- **Windows:** `.venv\Scripts\activate`

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder:

```
ANTHROPIC_API_KEY=your_anthropic_key_here
TAVILY_API_KEY=your_tavily_key_here
```

Start the backend server:

```bash
uvicorn main:app --reload
```

The backend will be running at `http://127.0.0.1:8000`. Visit `/health` to confirm it's working.

---

### 3. Set up the frontend

Open a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be running at `http://localhost:5173`.

---

### 4. Use the app

With both servers running, open `http://localhost:5173` in your browser. Type a research goal into the input box and hit Run. Watch the agents work in real time.

---

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Claude API key from console.anthropic.com |
| `TAVILY_API_KEY` | Your Tavily search API key from app.tavily.com |

Never commit your `.env` file to GitHub. It is already included in `.gitignore`.

---

## Key Concepts

**Why agents instead of one LLM call?**
Each agent has a single focused responsibility. The Planner only plans. The Researcher only researches. The Critic only critiques. This separation produces better output than asking one model to do everything at once, and makes the system's reasoning transparent and inspectable.

**Why WebSockets?**
A full agent run takes 30–60 seconds. WebSockets keep a persistent connection open so the frontend can receive live updates as each agent finishes, rather than waiting for everything to complete before showing anything.

**Why Tavily?**
Tavily is a search API built specifically for AI agents. It returns clean, structured results including full page content, which the Researcher uses as grounded real-world context rather than relying solely on the model's training data.