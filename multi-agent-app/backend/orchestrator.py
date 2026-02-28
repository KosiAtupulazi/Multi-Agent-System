from agents import planner, researcher, critic, writer
from search import search
import json
import asyncio

async def orchestrate(goal: str, websocket=None):
    async def emit(data):
        if websocket:
            await websocket.send_json(data)

    async def keep_alive():
        while True:
            await asyncio.sleep(10)
            await emit({"event": "ping"})

    state = {
        "goal": goal,
        "queries": None,
        "search_results": None,
        "research_notes": None,
        "critic_feedback": None,
        "final_output": None
    }

    ping_task = asyncio.create_task(keep_alive())

    try:
        # Step 1: Planner
        await emit({"event": "agent_start", "agent": "Planner"})
        planner_output = await asyncio.get_event_loop().run_in_executor(
            None, planner.run, goal
        )
        state["queries"] = json.loads(planner_output)
        await emit({"event": "agent_complete", "agent": "Planner", "output": state["queries"]})

        # Step 2: Search + Researcher
        await emit({"event": "agent_start", "agent": "Researcher"})
        all_results = []
        for q in state["queries"]:
            results = await asyncio.get_event_loop().run_in_executor(None, search, q)
            all_results.extend(results)
        state["search_results"] = all_results

        researcher_input = f"Goal: {goal}\n\nSearch results:\n{json.dumps(all_results, indent=2)}"
        researcher_output = await asyncio.get_event_loop().run_in_executor(
            None, researcher.run, researcher_input
        )
        state["research_notes"] = researcher_output
        await emit({"event": "agent_complete", "agent": "Researcher", "output": researcher_output})

        # Step 3: Critic loop
        revision_count = 0
        while revision_count < 3:
            await emit({"event": "agent_start", "agent": "Critic"})
            critic_output = await asyncio.get_event_loop().run_in_executor(
                None, critic.run, state["research_notes"]
            )

            clean = critic_output.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
                clean = clean.strip()

            critic_result = json.loads(clean)
            state["critic_feedback"] = critic_result
            await emit({"event": "agent_complete", "agent": "Critic", "output": critic_result})

            if critic_result["approved"]:
                break
            else:
                revision_count += 1
                await emit({"event": "agent_start", "agent": "Researcher"})
                researcher_input = f"""Goal: {goal}

Your previous research notes:
{state["research_notes"]}

The Critic rejected your notes and provided this feedback:
{json.dumps(critic_result["feedback"], indent=2)}

Revise your research notes to address the feedback.
Return the same JSON format with "notes" and "sources" fields."""

                researcher_output = await asyncio.get_event_loop().run_in_executor(
                    None, researcher.run, researcher_input
                )
                state["research_notes"] = researcher_output
                await emit({"event": "agent_complete", "agent": "Researcher", "output": researcher_output})

        # Step 4: Writer
        await emit({"event": "agent_start", "agent": "Writer"})
        writer_input = f"Goal: {goal}\n\nResearch notes:\n{state['research_notes']}"
        writer_output = await asyncio.get_event_loop().run_in_executor(
            None, writer.run, writer_input
        )
        state["final_output"] = writer_output
        await emit({"event": "agent_complete", "agent": "Writer", "output": writer_output})

        await emit({"event": "sources", "sources": state["search_results"]})
        await emit({"event": "run_complete", "final_output": writer_output})

    finally:
        ping_task.cancel()

    return state


if __name__ == "__main__":
    result = asyncio.run(orchestrate("What are the most promising ways to use AI in healthcare?"))
    print(result["final_output"])