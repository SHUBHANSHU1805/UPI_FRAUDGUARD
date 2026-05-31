"""
Auth Blueprint
POST /api/auth/register   → create account
POST /api/auth/login      → get access + refresh tokens
POST /api/auth/refresh    → rotate access token
GET  /api/auth/me         → current user info (protected)
POST /api/auth/logout     → client-side token drop (stateless)
"""

from datetime import datetime, timezone
from flask     import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity,
    get_jwt
)

from database import db, bcrypt, User

auth_bp = Blueprint("auth", __name__)


# ── Helpers ───────────────────────────────────────────────────────────────────
def _validate_register(data):
    errors = []
    if not data.get("name",  "").strip():          errors.append("Name is required.")
    if not data.get("email", "").strip():          errors.append("Email is required.")
    if "@" not in data.get("email", ""):           errors.append("Invalid email.")
    pw = data.get("password", "")
    if len(pw) < 8:                                errors.append("Password must be ≥ 8 characters.")
    if not any(c.isdigit() for c in pw):           errors.append("Password must contain a number.")
    if not any(c.isalpha() for c in pw):           errors.append("Password must contain a letter.")
    return errors


# ── Register ─────────────────────────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    data   = request.get_json(force=True) or {}
    errors = _validate_register(data)
    if errors:
        return jsonify({"error": errors[0]}), 400

    email = data["email"].strip().lower()
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists."}), 409

    user = User(name=data["name"].strip(), email=email)
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    access_token  = create_access_token(identity=str(user.id),
                                         additional_claims={"role": user.role})
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "message"      : "Account created successfully.",
        "user"         : user.to_dict(),
        "access_token" : access_token,
        "refresh_token": refresh_token,
    }), 201


# ── Login ─────────────────────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data  = request.get_json(force=True) or {}
    email = data.get("email", "").strip().lower()
    pw    = data.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(pw):
        return jsonify({"error": "Invalid email or password."}), 401

    user.last_login = datetime.now(timezone.utc)
    db.session.commit()

    access_token  = create_access_token(identity=str(user.id),
                                         additional_claims={"role": user.role})
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "message"      : "Login successful.",
        "user"         : user.to_dict(),
        "access_token" : access_token,
        "refresh_token": refresh_token,
    })


# ── Refresh Token ─────────────────────────────────────────────────────────────
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity     = get_jwt_identity()
    user         = User.query.get(int(identity))
    access_token = create_access_token(identity=identity,
                                        additional_claims={"role": user.role if user else "analyst"})
    return jsonify({"access_token": access_token})


# ── Current User ──────────────────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    identity = get_jwt_identity()
    user     = User.query.get(int(identity))
    if not user:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"user": user.to_dict()})


# ── Logout (client drops tokens; stateless) ───────────────────────────────────
@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    return jsonify({"message": "Logged out. Please delete your tokens."})