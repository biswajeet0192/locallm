# backend/services/chat_service.py
from sqlalchemy.orm import Session
from database.models import ChatSession, ChatMessage
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self):
        logger.info("ChatService initialized")
    
    def create_session(self, db: Session, model: str, title: Optional[str] = None) -> ChatSession:
        """Create a new chat session"""
        logger.info(f"create_session called with inputs - model: {model}, title: {title}")
        
        session = ChatSession(
            model=model,
            title=title or f"Chat - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
        logger.info(f"create_session output - session_id: {session.id}, title: {session.title}, model: {session.model}")
        return session
    
    def get_session(self, db: Session, session_id: str) -> Optional[ChatSession]:
        """Get a chat session by ID"""
        logger.info(f"get_session called with input - session_id: {session_id}")
        
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        
        if session:
            logger.info(f"get_session output - Found session: {session.id}, title: {session.title}, active: {session.is_active}")
        else:
            logger.warning(f"get_session output - Session not found for id: {session_id}")
        
        return session
    
    def get_active_sessions(self, db: Session, limit: int = 20) -> List[ChatSession]:
        """Get list of active chat sessions"""
        logger.info(f"get_active_sessions called with input - limit: {limit}")
        
        sessions = db.query(ChatSession)\
                     .filter(ChatSession.is_active == True)\
                     .order_by(ChatSession.updated_at.desc())\
                     .limit(limit)\
                     .all()
        
        session_ids = [s.id for s in sessions]
        logger.info(f"get_active_sessions output - Found {len(sessions)} active sessions: {session_ids}")
        
        return sessions
    
    def add_message(self, db: Session, session_id: str, role: str, content: str) -> ChatMessage:
        """Add a message to a chat session"""
        content_preview = content[:100] + "..." if len(content) > 100 else content
        logger.info(f"add_message called with inputs - session_id: {session_id}, role: {role}, content_length: {len(content)}, content_preview: '{content_preview}'")
        
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
            logger.debug(f"Updated session {session_id} timestamp")
        else:
            logger.warning(f"Session {session_id} not found when adding message")
        
        db.commit()
        db.refresh(message)
        
        logger.info(f"add_message output - message_id: {message.id}, role: {message.role}, timestamp: {message.timestamp}")
        return message
    
    def get_conversation_history(self, db: Session, session_id: str, limit: Optional[int] = None) -> List[ChatMessage]:
        """Get conversation history for a session"""
        logger.info(f"get_conversation_history called with inputs - session_id: {session_id}, limit: {limit}")
        
        query = db.query(ChatMessage)\
                  .filter(ChatMessage.session_id == session_id)\
                  .order_by(ChatMessage.timestamp.asc())
        
        total_count = query.count()
        
        if limit:
            # Get the last N messages
            query = query.offset(max(0, total_count - limit))
        
        messages = query.all()
        
        logger.info(f"get_conversation_history output - Retrieved {len(messages)} messages (total in session: {total_count})")
        if messages:
            logger.debug(f"Message roles: {[m.role for m in messages]}")
        
        return messages
    
    def get_context_messages(self, db: Session, session_id: str, max_messages: int = 10) -> List[Dict[str, Any]]:
        """Get recent messages formatted for AI context"""
        logger.info(f"get_context_messages called with inputs - session_id: {session_id}, max_messages: {max_messages}")
        
        messages = self.get_conversation_history(db, session_id, limit=max_messages)
        
        context_messages = []
        for msg in messages:
            context_messages.append({
                "role": "user" if msg.role == "user" else "assistant",
                "content": msg.content
            })
        
        logger.info(f"get_context_messages output - Formatted {len(context_messages)} messages for AI context")
        logger.debug(f"Context message roles: {[m['role'] for m in context_messages]}")
        
        return context_messages
    
    def delete_session(self, db: Session, session_id: str) -> bool:
        """Delete a chat session"""
        logger.info(f"delete_session called with input - session_id: {session_id}")
        
        session = self.get_session(db, session_id)
        if session:
            db.delete(session)
            db.commit()
            logger.info(f"delete_session output - Successfully deleted session: {session_id}")
            return True
        
        logger.warning(f"delete_session output - Failed to delete, session not found: {session_id}")
        return False
    
    def update_session_title(self, db: Session, session_id: str, title: str) -> Optional[ChatSession]:
        """Update session title"""
        logger.info(f"update_session_title called with inputs - session_id: {session_id}, title: '{title}'")
        
        session = self.get_session(db, session_id)
        if session:
            old_title = session.title
            session.title = title
            session.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(session)
            
            logger.info(f"update_session_title output - Updated title from '{old_title}' to '{title}' for session: {session_id}")
            return session
        
        logger.warning(f"update_session_title output - Session not found: {session_id}")
        return None
    
    def search_messages(self, db: Session, query: str, limit: int = 50) -> List[ChatMessage]:
        """Search messages by content"""
        logger.info(f"search_messages called with inputs - query: '{query}', limit: {limit}")
        
        messages = db.query(ChatMessage)\
                     .filter(ChatMessage.content.contains(query))\
                     .order_by(ChatMessage.timestamp.desc())\
                     .limit(limit)\
                     .all()
        
        logger.info(f"search_messages output - Found {len(messages)} messages matching query '{query}'")
        if messages:
            session_ids = list(set([m.session_id for m in messages]))
            logger.debug(f"Messages found in sessions: {session_ids}")
        
        return messages