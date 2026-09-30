import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    voters = relationship("Voter", back_populates="class_rel", lazy="selectin")

    def __repr__(self):
        return f"<Class(id={self.id}, name='{self.name}')>"


class Voter(Base):
    __tablename__ = "voters"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    usn = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    has_voted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )

    class_rel = relationship("Class", back_populates="voters", lazy="selectin")
    participations = relationship("VoterParticipation", back_populates="voter", lazy="selectin")

    def __repr__(self):
        return f"<Voter(id={self.id}, usn='{self.usn}')>"
