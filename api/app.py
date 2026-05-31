"""
UPI FraudGuard — Flask Application Entry Point
Registers: auth blueprint, predict blueprint, JWT config
"""

import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from database import db
from auth     import auth_bp
from predict  import predict_bp

def create_app():
    app = Flask(__name__)

    # ── Config ──────────────────────────────────────────────────────────────
    app.config["SECRET_KEY"]                  = os.getenv("SECRET_KEY", "upi-fraudguard-secret-change-in-prod")
    app.config["JWT_SECRET_KEY"]              = os.getenv("JWT_SECRET_KEY", "jwt-secret-change-in-prod")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"]    = 3600          # 1 hour
    app.config["JWT_REFRESH_TOKEN_EXPIRES"]   = 86400 * 7     # 7 days
    app.config["SQLALCHEMY_DATABASE_URI"]     = "sqlite:///fraudguard.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # ── Extensions ───────────────────────────────────────────────────────────
    CORS(app, origins=["http://localhost:5173", "http://localhost:3000"],
         supports_credentials=True)
    db.init_app(app)
    JWTManager(app)

    # ── Blueprints ───────────────────────────────────────────────────────────
    app.register_blueprint(auth_bp,    url_prefix="/api/auth")
    app.register_blueprint(predict_bp, url_prefix="/api")

    # ── Create DB tables on first run ────────────────────────────────────────
    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    application = create_app()
    print("🚀 UPI FraudGuard API → http://localhost:5000")
    application.run(debug=True, host="0.0.0.0", port=5000)