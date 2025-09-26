# backend/services/chat_service.py
from sqlalchemy.orm import Session
from database.models import ChatSession, ChatMessage
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self):
        pass
    
    def create_session(self, db: Session, model: str, title: Optional[str] = None) -> ChatSession:
        """Create a new chat session"""
        session = ChatSession(
            model=model,
            title=title or f"Chat - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        logger.info(f"Created new chat session: {session.id}")
        return session
    
    def get_session(self, db: Session, session_id: str) -> Optional[ChatSession]:
        """Get a chat session by ID"""
        return db.query(ChatSession).filter(ChatSession.id == session_id).first()
    
    def get_active_sessions(self, db: Session, limit: int = 20) -> List[ChatSession]:
        """Get list of active chat sessions"""
        return db.query(ChatSession)\
                 .filter(ChatSession.is_active == True)\
                 .order_by(ChatSession.updated_at.desc())\
                 .limit(limit)\
                 .all()
    
    def add_message(self, db: Session, session_id: str, role: str, content: str) -> ChatMessage:
        """Add a message to a chat session"""
        message = ChatMessage(
            session_id=session_id,
            role=role,
            content=content
        )
        db.add(message)
        
        # Update session's updated_at timestamp
        session = self.get_session(db, session_id)
        if session:
            session.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(message)
        logger.info(f"Added {role} message to session {session_id}")
        return message
    
    def get_conversation_history(self, db: Session, session_id: str, limit: Optional[int] = None) -> List[ChatMessage]:
        """Get conversation history for a session"""
        query = db.query(ChatMessage)\
                  .filter(ChatMessage.session_id == session_id)\
                  .order_by(ChatMessage.timestamp.asc())
        
        if limit:
            # Get the last N messages
            query = query.offset(max(0, query.count() - limit))
        
        return query.all()
    
    def get_context_messages(self, db: Session, session_id: str, max_messages: int = 10) -> List[Dict[str, Any]]:
        """Get recent messages formatted for AI context"""
        messages = self.get_conversation_history(db, session_id, limit=max_messages)
        
        context_messages = []
        for msg in messages:
            context_messages.append({
                "role": "user" if msg.role == "user" else "assistant",
                "content": msg.content
            })
        
        return context_messages
    
    def delete_session(self, db: Session, session_id: str) -> bool:
        """Delete a chat session"""
        session = self.get_session(db, session_id)
        if session:
            db.delete(session)
            db.commit()
            logger.info(f"Deleted chat session: {session_id}")
            return True
        return False
    
    def update_session_title(self, db: Session, session_id: str, title: str) -> Optional[ChatSession]:
        """Update session title"""
        session = self.get_session(db, session_id)
        if session:
            session.title = title
            session.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(session)
            return session
        return None
    
    def search_messages(self, db: Session, query: str, limit: int = 50) -> List[ChatMessage]:
        """Search messages by content"""
        return db.query(ChatMessage)\
                 .filter(ChatMessage.content.contains(query))\
                 .order_by(ChatMessage.timestamp.desc())\
                 .limit(limit)\
                 .all()