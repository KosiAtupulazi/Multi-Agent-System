from anthropic import Anthropic
from dotenv import load_dotenv
from search import search
import json

load_dotenv()

client = Anthropic()

class Agent:
    def __init__(self, name, system_prompt):
        self.name = name
        self.system_prompt = system_prompt

    def run(self, user_message):
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=self.system_prompt,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )
        text = response.content[0].text.strip()
        # Strip markdown code blocks if Claude adds them
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        return text


# Planner agent
planner = Agent(
    name="Planner",
    system_prompt="""You are a Planner. Your only job is to take a user's goal and break it into 3-5 specific search queries that together would fully answer it.
Each query should be concrete and specific enough to return useful web results.
Return only a JSON array of strings. No explanation, no preamble, just the array."""
)

# Researcher agent
researcher = Agent(
    name="Researcher",
    system_prompt="""You are a Researcher. You will receive either:
1. Search results to synthesize into research notes, OR
2. Your previous notes + critic feedback asking you to revise

In both cases your job is the same: return actual research notes as a JSON object with:
- "notes": a detailed string of synthesized research
- "sources": a list of URLs you used

Never explain what you will do. Never ask questions. Never write meta-commentary.
Just return the revised JSON with improved notes that address the feedback.
If a claim cannot be supported, remove it rather than keeping it unsupported."""
)

# Critic agent
critic = Agent(
    name="Critic",
    system_prompt="""You are a Critic. You will receive research notes.
Your job is to identify weaknesses — vague claims, missing evidence, important angles that were skipped.
Be specific about what needs improvement.
Return a JSON object with two fields:
- "approved": true or false
- "feedback": a list of specific revision notes. Empty list if approved."""
)

# Writer agent
writer = Agent(
    name="Writer",
    system_prompt="""You are a Writer. You will receive a goal and research notes.
Your job is to write a clear, well-structured, and engaging final response that fully answers the goal.
Use headings, bullet points where helpful, and write in plain English.
Return only the final written response, no JSON."""
)


# Test all agents
if __name__ == "__main__":
    goal = "What are the most promising ways to use AI in healthcare?"

    print("--- PLANNER ---")
    planner_output = planner.run(goal)
    print(planner_output)

    queries = json.loads(planner_output)

    print("\n--- SEARCHING ---")
    all_results = []
    for q in queries:
        results = search(q)
        all_results.extend(results)
        print(f"Searched: {q}")

    print("\n--- RESEARCHER ---")
    researcher_input = f"Goal: {goal}\n\nSearch results:\n{json.dumps(all_results, indent=2)}"
    researcher_output = researcher.run(researcher_input)
    print(researcher_output)

    print("\n--- CRITIC ---")
    critic_output = critic.run(researcher_output)
    print(critic_output)

    print("\n--- WRITER ---")
    writer_input = f"Goal: {goal}\n\nResearch notes:\n{researcher_output}"
    writer_output = writer.run(writer_input)
    print(writer_output)