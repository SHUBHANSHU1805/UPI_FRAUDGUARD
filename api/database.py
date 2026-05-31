"""
Database setup and User model
"""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt      import Bcrypt

db     = SQLAlchemy()
bcrypt = Bcrypt()


class User(db.Model):
    __tablename__ = "users"

    id           = db.Column(db.Integer,  primary_key=True)
    name         = db.Column(db.String(120), nullable=False)
    email        = db.Column(db.String(180), unique=True, nullable=False, index=True)
    password_hash= db.Column(db.String(256), nullable=False)
    role         = db.Column(db.String(20),  default="analyst")   # analyst | admin
    created_at   = db.Column(db.DateTime,    default=lambda: datetime.now(timezone.utc))
    last_login   = db.Column(db.DateTime,    nullable=True)

    def set_password(self, raw_password: str):
        self.password_hash = bcrypt.generate_password_hash(raw_password).decode("utf-8")

    def check_password(self, raw_password: str) -> bool:
        return bcrypt.check_password_hash(self.password_hash, raw_password)

    def to_dict(self):
        return {
            "id"        : self.id,
            "name"      : self.name,
            "email"     : self.email,
            "role"      : self.role,
            "created_at": self.created_at.isoformat(),
        }