# app.py - Actualizado con soporte de cookies
from flask import Flask, make_response
from flask_socketio import SocketIO
from routes import register_routes, socketio
from admin_routes import register_admin_routes
from historial import inicializar_historial_live
from sessionManager import SessionManager

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "static/uploads"
app.config["SECRET_KEY"] = "tu_clave_secreta_aqui"  # Necesaria para cookies

# Registrar rutas
register_routes(app)
register_admin_routes(app)

if __name__ == "__main__":
    inicializar_historial_live()
    print("="*60)
    print("🚀 SERVIDOR INICIADO CON SISTEMA DE SESIONES Y COOKIES")
    print("="*60)
    session_manager = SessionManager(sessions_dir="static/sessions", cleanup_hours=24)
    print(f"📁 Directorio de sesiones: {session_manager.sessions_dir}")
    print(f"⏰ Limpieza automática cada: {session_manager.cleanup_hours} horas")
    print(f"🍪 Cookies configuradas con expiración de 30 días")
    print("="*60)

    socketio.init_app(app)
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)