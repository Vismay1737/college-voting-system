import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    action = Column(String(100), nullable=False, index=True)
    actor_type = Column(String(20), nullable=False)  # "admin" or "voter" or "system"
    actor_id = Column(Integer, nullable=True)
    actor_name = Column(String(200), nullable=True)
    details = Column(Text, nullable=True)
    ip_hash = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}')>"
