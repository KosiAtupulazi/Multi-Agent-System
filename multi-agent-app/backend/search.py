from tavily import TavilyClient
from dotenv import load_dotenv
import os

load_dotenv()

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

def search(query: str):
    response = tavily.search(query=query, max_results=3, include_raw_content=True)
    results = []
    for r in response["results"]:
        content = r.get("raw_content") or r["content"]
        results.append({
            "title": r["title"],
            "url": r["url"],
            "content": content[:2000]  # limit to first 2000 characters
        })
    return results

# Test
if __name__ == "__main__":
    results = search("AI early cancer detection accuracy results")
    for r in results:
        print(r["title"])
        print(r["url"])
        print(r["content"][:200])
        print("---")