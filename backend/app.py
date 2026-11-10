from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import Config
from extensions import db
from routes import books_bp


def create_app(config_class: type[Config] = Config) -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    app.register_blueprint(books_bp)

    _register_error_handlers(app)

    with app.app_context():
        db.create_all()

    return app


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


if __name__ == "__main__":
    application = create_app()
    application.run(host="127.0.0.1", port=5000, debug=True)

