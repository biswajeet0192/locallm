# backend/routes/chat.py
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from services.ollama_service import OllamaService
from services.chat_service import ChatService
from services.web_search_service import WebSearchService
from database.database import get_db
from database.models import ChatSession as ChatSessionModel, ChatMessage as ChatMessageModel
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
import base64

logger = logging.getLogger(__name__)
router = APIRouter()
ollama_service = OllamaService()
chat_service = ChatService()
web_search_service = WebSearchService()

class GenerateRequest(BaseModel):
    prompt: str
    model: str
    session_id: Optional[str] = None
    max_context_messages: int = Field(default=10, ge=1, le=50)
    images: Optional[List[str]] = None  # Base64 encoded images
    web_search: bool = False

class WebSearchRequest(BaseModel):
    query: str
    max_results: int = Field(default=5, ge=1, le=10)

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
    logger.info("get_models endpoint called")
    try:
        models = await ollama_service.get_models()
        logger.info(f"get_models output - Retrieved {len(models)} models: {[m.get('name', 'unknown') for m in models]}")
        return {"models": models}
    except Exception as e:
        logger.error(f"get_models error - Failed to fetch models: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")

@router.post("/web-search")
async def web_search(request: WebSearchRequest):
    """Perform web search"""
    logger.info(f"web_search endpoint called with inputs - query: '{request.query}', max_results: {request.max_results}")
    try:
        results = await web_search_service.search(request.query, request.max_results)
        logger.info(f"web_search output - Found {len(results)} search results")
        if results:
            logger.debug(f"Search result titles: {[r.get('title', 'N/A') for r in results]}")
        return {"results": results}
    except Exception as e:
        logger.error(f"web_search error - Query: '{request.query}', Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Web search failed: {str(e)}")

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Upload and encode image"""
    logger.info(f"upload_image endpoint called with input - filename: '{file.filename}', content_type: {file.content_type}")
    try:
        contents = await file.read()
        file_size = len(contents)
        encoded = base64.b64encode(contents).decode('utf-8')
        encoded_size = len(encoded)
        
        logger.info(f"upload_image output - Successfully encoded image, original_size: {file_size} bytes, encoded_size: {encoded_size} chars")
        return {"encoded": encoded, "filename": file.filename}
    except Exception as e:
        logger.error(f"upload_image error - filename: '{file.filename}', Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

@router.post("/sessions", response_model=SessionResponse)
async def create_session(request: SessionCreateRequest, db: Session = Depends(get_db)):
    """Create a new chat session"""
    logger.info(f"create_session endpoint called with inputs - model: '{request.model}', title: '{request.title}'")
    try:
        session = chat_service.create_session(db, request.model, request.title)
        response = SessionResponse(
            id=session.id,
            title=session.title,
            model=session.model,
            created_at=session.created_at,
            updated_at=session.updated_at,
            message_count=0
        )
        logger.info(f"create_session output - Created session_id: {session.id}, title: '{session.title}'")
        return response
    except Exception as e:
        logger.error(f"create_session error - model: '{request.model}', Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@router.get("/sessions", response_model=List[SessionResponse])
async def get_sessions(db: Session = Depends(get_db)):
    """Get all active chat sessions"""
    logger.info("get_sessions endpoint called")
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
        
        logger.info(f"get_sessions output - Retrieved {len(session_responses)} active sessions")
        if session_responses:
            logger.debug(f"Session IDs: {[s.id for s in session_responses]}")
        
        return session_responses
    except Exception as e:
        logger.error(f"get_sessions error - {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch sessions: {str(e)}")

@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get a specific chat session"""
    logger.info(f"get_session endpoint called with input - session_id: {session_id}")
    try:
        session = chat_service.get_session(db, session_id)
        if not session:
            logger.warning(f"get_session output - Session not found: {session_id}")
            raise HTTPException(status_code=404, detail="Session not found")
        
        response = SessionResponse(
            id=session.id,
            title=session.title,
            model=session.model,
            created_at=session.created_at,
            updated_at=session.updated_at,
            message_count=len(session.messages)
        )
        logger.info(f"get_session output - Found session: {session.id}, title: '{session.title}', messages: {len(session.messages)}")
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_session error - session_id: {session_id}, Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch session: {str(e)}")

@router.get("/sessions/{session_id}/messages", response_model=List[MessageResponse])
async def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    """Get all messages for a chat session"""
    logger.info(f"get_session_messages endpoint called with input - session_id: {session_id}")
    try:
        session = chat_service.get_session(db, session_id)
        if not session:
            logger.warning(f"get_session_messages output - Session not found: {session_id}")
            raise HTTPException(status_code=404, detail="Session not found")
        
        messages = chat_service.get_conversation_history(db, session_id)
        message_responses = [
            MessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                timestamp=msg.timestamp
            )
            for msg in messages
        ]
        
        logger.info(f"get_session_messages output - Retrieved {len(message_responses)} messages for session: {session_id}")
        if message_responses:
            logger.debug(f"Message roles: {[m.role for m in message_responses]}")
        
        return message_responses
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_session_messages error - session_id: {session_id}, Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch messages: {str(e)}")

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a chat session"""
    logger.info(f"delete_session endpoint called with input - session_id: {session_id}")
    try:
        success = chat_service.delete_session(db, session_id)
        if not success:
            logger.warning(f"delete_session output - Session not found: {session_id}")
            raise HTTPException(status_code=404, detail="Session not found")
        
        logger.info(f"delete_session output - Successfully deleted session: {session_id}")
        return {"message": "Session deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"delete_session error - session_id: {session_id}, Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")

@router.post("/generate")
async def generate_response(request: GenerateRequest, db: Session = Depends(get_db)):
    """Generate response from Ollama model with streaming, context, images, and web search"""
    prompt_preview = request.prompt[:100] + "..." if len(request.prompt) > 100 else request.prompt
    logger.info(f"generate_response endpoint called with inputs - model: '{request.model}', session_id: {request.session_id}, "
                f"web_search: {request.web_search}, has_images: {bool(request.images)}, "
                f"prompt_length: {len(request.prompt)}, prompt_preview: '{prompt_preview}'")
    
    try:
        if not await ollama_service.is_server_running():
            logger.warning("generate_response - Ollama server is not running")
            raise HTTPException(status_code=503, detail="Ollama server is not running")
        
        # Prepare enhanced prompt with web search if requested
        enhanced_prompt = request.prompt
        if request.web_search:
            logger.info(f"generate_response - Performing web search for prompt")
            search_results = await web_search_service.search(request.prompt, 3)
            if search_results:
                logger.info(f"generate_response - Found {len(search_results)} search results, enhancing prompt")
                context = "\n\n[Web Search Results]:\n"
                for i, result in enumerate(search_results, 1):
                    context += f"{i}. {result['title']}\n{result['snippet']}\n{result['url']}\n\n"
                enhanced_prompt = f"{context}\nUser Query: {request.prompt}"
            else:
                logger.info("generate_response - No search results found")
        
        # If session_id is provided, get context and save messages
        context_messages = []
        if request.session_id:
            logger.info(f"generate_response - Loading context for session: {request.session_id}")
            session = chat_service.get_session(db, request.session_id)
            if not session:
                logger.warning(f"generate_response - Session not found: {request.session_id}")
                raise HTTPException(status_code=404, detail="Session not found")
            
            context_messages = chat_service.get_context_messages(
                db, request.session_id, request.max_context_messages
            )
            logger.info(f"generate_response - Loaded {len(context_messages)} context messages")
            
            # Save user message to database
            chat_service.add_message(db, request.session_id, "user", request.prompt)
            logger.debug(f"generate_response - Saved user message to session: {request.session_id}")
        
        # Generate streaming response
        async def generate_stream():
            collected_response = ""
            chunk_count = 0
            try:
                logger.info(f"generate_response - Starting stream generation with model: {request.model}")
                
                async for chunk in ollama_service.generate_stream(
                    enhanced_prompt, 
                    request.model, 
                    context_messages,
                    request.images
                ):
                    if chunk:
                        collected_response += chunk
                        chunk_count += 1
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                logger.info(f"generate_response - Stream completed, chunks: {chunk_count}, "
                           f"response_length: {len(collected_response)} chars")
                
                # Save AI response to database if session exists
                if request.session_id and collected_response:
                    chat_service.add_message(db, request.session_id, "assistant", collected_response)
                    logger.debug(f"generate_response - Saved assistant message to session: {request.session_id}")
                
                yield f"data: {json.dumps({'done': True})}\n\n"
                logger.info(f"generate_response output - Generation completed successfully for session: {request.session_id}")
                
            except Exception as e:
                logger.error(f"generate_response stream error - session_id: {request.session_id}, "
                           f"chunks_sent: {chunk_count}, Error: {str(e)}", exc_info=True)
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
        logger.error(f"generate_response error - model: '{request.model}', session_id: {request.session_id}, "
                    f"Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.get("/server-status")
async def get_server_status():
    """Check if Ollama server is running"""
    logger.info("get_server_status endpoint called")
    try:
        is_running = await ollama_service.is_server_running()
        logger.info(f"get_server_status output - Server running: {is_running}")
        return {"running": is_running}
    except Exception as e:
        logger.error(f"get_server_status error - {str(e)}", exc_info=True)
        return {"running": False, "error": str(e)}

@router.post("/start-server")
async def start_server():
    """Start Ollama server"""
    logger.info("start_server endpoint called")
    try:
        success = await ollama_service.start_server()
        if success:
            logger.info("start_server output - Ollama server started successfully")
            return {"success": True, "message": "Ollama server started successfully"}
        else:
            logger.error("start_server output - Failed to start Ollama server")
            raise HTTPException(status_code=500, detail="Failed to start Ollama server")
    except Exception as e:
        logger.error(f"start_server error - {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start server: {str(e)}")