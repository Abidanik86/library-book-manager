from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Typed SQLAlchemy 2.0 declarative base for Flask-SQLAlchemy models."""


db = SQLAlchemy(model_class=Base, session_options={"expire_on_commit": False})
