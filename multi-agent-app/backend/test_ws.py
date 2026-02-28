import asyncio
import websockets
import json

async def test():
    uri = "ws://127.0.0.1:8000/ws"
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({"goal": "test"}))
        print("Connected and sent goal!")
        async for message in ws:
            data = json.loads(message)
            print(data)

asyncio.run(test())