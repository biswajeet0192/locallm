# backend/routes/chat.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from services.ollama_service import OllamaService
from services.chat_service import ChatService
from database.database import get_db
from database.models import ChatSession as ChatSessionModel, ChatMessage as ChatMessageModel
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()
ollama_service = OllamaService()
chat_service = ChatService()

class GenerateRequest(BaseModel):
    prompt: str
    model: str
    session_id: Optional[str] = None
    max_context_messages: int = Field(default=10, ge=1, le=50)

class SessionCreateRequest(BaseModel):
    model: str
    title: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    title: str
    model: str
    created_at: datetime
    updated_at: datetime
    message_count: int

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    timestamp: datetime

@router.get("/models")
async def get_models():
    """Get all available Ollama models"""
    try:
        models = await ollama_service.get_models()
        return {"models": models}
    except Exception as e:
        logger.error(f"Error fetching models: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")

@router.post("/sessions", response_model=SessionResponse)
async def create_session(request: SessionCreateRequest, db: Session = Depends(get_db)):
    """Create a new chat session"""
    try:
        session = chat_service.create_session(db, request.model, request.title)
        return SessionResponse(
            id=session.id,
            title=session.title,
            model=session.model,
            created_at=session.created_at,
            updated_at=session.updated_at,
            message_count=0
        )
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@router.get("/sessions", response_model=List[SessionResponse])
async def get_sessions(db: Session = Depends(get_db)):
    """Get all active chat sessions"""
    try:
        sessions = chat_service.get_active_sessions(db)
        session_responses = []
        
        for session in sessions:
            message_count = len(session.messages)
            session_responses.append(SessionResponse(
                id=session.id,
                title=session.title,
                model=session.model,
                created_at=session.created_at,
                updated_at=session.updated_at,
                message_count=message_count
            ))
        
        return session_responses
    except Exception as e:
        logger.error(f"Error fetching sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sessions: {str(e)}")

@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get a specific chat session"""
    try:
        session = chat_service.get_session(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return SessionResponse(
            id=session.id,
            title=session.title,
            model=session.model,
            created_at=session.created_at,
            updated_at=session.updated_at,
            message_count=len(session.messages)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch session: {str(e)}")

@router.get("/sessions/{session_id}/messages", response_model=List[MessageResponse])
async def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    """Get all messages for a chat session"""
    try:
        session = chat_service.get_session(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        messages = chat_service.get_conversation_history(db, session_id)
        return [
            MessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                timestamp=msg.timestamp
            )
            for msg in messages
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch messages: {str(e)}")

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a chat session"""
    try:
        success = chat_service.delete_session(db, session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"message": "Session deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")

@router.post("/generate")
async def generate_response(request: GenerateRequest, db: Session = Depends(get_db)):
    """Generate response from Ollama model with streaming and context"""
    try:
        if not await ollama_service.is_server_running():
            raise HTTPException(status_code=503, detail="Ollama server is not running")
        
        # If session_id is provided, get context and save messages
        context_messages = []
        if request.session_id:
            # Verify session exists
            session = chat_service.get_session(db, request.session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            
            # Get conversation context
            context_messages = chat_service.get_context_messages(
                db, request.session_id, request.max_context_messages
            )
            
            # Save user message to database
            chat_service.add_message(db, request.session_id, "user", request.prompt)
        
        # Generate streaming response
        async def generate_stream():
            collected_response = ""
            try:
                async for chunk in ollama_service.generate_stream(
                    request.prompt, 
                    request.model, 
                    context_messages
                ):
                    if chunk:
                        collected_response += chunk
                        # Format as SSE (Server-Sent Events)
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # Save AI response to database if session exists
                if request.session_id and collected_response:
                    chat_service.add_message(db, request.session_id, "assistant", collected_response)
                
                yield f"data: {json.dumps({'done': True})}\n\n"
                
            except Exception as e:
                logger.error(f"Error in stream generation: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/plain; charset=utf-8"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.get("/server-status")
async def get_server_status():
    """Check if Ollama server is running"""
    try:
        is_running = await ollama_service.is_server_running()
        return {"running": is_running}
    except Exception as e:
        logger.error(f"Error checking server status: {str(e)}")
        return {"running": False, "error": str(e)}

@router.post("/start-server")
async def start_server():
    """Start Ollama server"""
    try:
        success = await ollama_service.start_server()
        if success:
            return {"success": True, "message": "Ollama server started successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to start Ollama server")
    except Exception as e:
        logger.error(f"Error starting server: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start server: {str(e)}")