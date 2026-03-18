"""
AgOS AI Gateway — Sprint B1 Scaffold
FastAPI + LangGraph (Python implementation per Dok 5)

Status: SCAFFOLD — endpoints defined, logic to be implemented per Dok 5
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="AgOS AI Gateway", version="0.1.0-scaffold")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "scaffold"}


@app.post("/chat")
async def chat(request: Request):
    """
    WhatsApp webhook handler.
    Dok 5 §3.3: one webhook call = one LangGraph graph run (D117)
    P-AI-8: user message saved FIRST before processing
    """
    # TODO Sprint B1: implement per Dok 5 §3
    body = await request.json()
    return JSONResponse({"status": "scaffold", "received": body})


@app.post("/proactive/dispatch")
async def proactive_dispatch():
    """
    pg_cron consumer endpoint.
    Dok 5 §12: SKIP LOCKED batch=50 (L-NEW-2 — NOT advisory locks)
    """
    # TODO Sprint B4: implement per Dok 5 §12
    return {"status": "scaffold", "dispatched": 0}
