import os
import sys

BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import Config
from extensions import db
from routes import books_bp
from seed import seed_if_empty

FRONTEND_DIR = os.path.abspath(os.path.join(BACKEND_DIR, "..", "frontend"))


def create_app(config_class: type[Config] = Config) -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    app.register_blueprint(books_bp)

    _register_frontend_routes(app)
    _register_error_handlers(app)

    with app.app_context():
        db.create_all()
        if not app.config.get("TESTING"):
            seed_if_empty(quiet=True)

    return app


def _register_frontend_routes(app: Flask) -> None:
    if not os.path.isdir(FRONTEND_DIR):
        return

    @app.get("/")
    def serve_index():
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.get("/<path:asset_path>")
    def serve_frontend_asset(asset_path: str):
        if asset_path == "api" or asset_path.startswith("api/"):
            return jsonify({"error": "Resource not found"}), 404

        full_path = os.path.abspath(os.path.join(FRONTEND_DIR, asset_path))
        if full_path.startswith(FRONTEND_DIR + os.sep) and os.path.isfile(full_path):
            return send_from_directory(FRONTEND_DIR, asset_path)

        return jsonify({"error": "Resource not found"}), 404


def _register_error_handlers(app: Flask) -> None:
    @app.errorhandler(400)
    def handle_bad_request(err):
        return jsonify({"error": getattr(err, "description", "Bad request")}), 400

    @app.errorhandler(404)
    def handle_not_found(_err):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(_err):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(HTTPException)
    def handle_http_exception(err):
        return jsonify({"error": err.description or "Request error"}), err.code or 400

    @app.errorhandler(Exception)
    def handle_unexpected_error(_err):
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
