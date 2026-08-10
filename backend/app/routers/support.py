from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict

from app.services.rag_support import query_support_faq

router = APIRouter(tags=["Support Assistant"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    history: List[ChatMessage] = []

@router.post("/api/support/chat")
async def support_chat(body: ChatRequest):
    """
    Streaming endpoint for the Candidate Support Assistant.
    """
    history_dicts = [{"role": msg.role, "content": msg.content} for msg in body.history]
    
    async def sse_generator():
        # Yield tokens from the RAG service as Server-Sent Events
        async for token in query_support_faq(body.query, history_dicts):
            # Format as SSE
            yield f"data: {token}\n\n"
        
        # End of stream indicator
        yield "data: [DONE]\n\n"
        
    return StreamingResponse(sse_generator(), media_type="text/event-stream")
