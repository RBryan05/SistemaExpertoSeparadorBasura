import os, json
from flask import jsonify
from config import HISTORIAL_LIVE_FILE
from sessionManager import SessionManager

session_manager = SessionManager(sessions_dir="static/sessions", cleanup_hours=24)

def register_admin_routes(app):
    @app.route("/admin/limpiar_sesiones", methods=["POST"])
    def limpiar_sesiones():
        try:
            sesiones_eliminadas = session_manager.force_cleanup()
            return jsonify({
                "success": True,
                "message": f"Limpieza completada: {sesiones_eliminadas} sesiones eliminadas"
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)})

    @app.route("/admin/estadisticas_detalladas")
    def estadisticas_detalladas():
        """Obtener estadísticas detalladas del sistema - SOLO PARA ADMINISTRADORES"""
        try:
            session_stats = session_manager.get_session_stats()
            
            # Obtener lista de sesiones con detalles
            sessions_dir = session_manager.sessions_dir
            session_details = []
            
            if os.path.exists(sessions_dir):
                session_files = [f for f in os.listdir(sessions_dir) if f.startswith('session_') and f.endswith('.json')]
                
                for session_file in session_files:
                    session_path = os.path.join(sessions_dir, session_file)
                    try:
                        with open(session_path, 'r', encoding='utf-8') as f:
                            session_data = json.load(f)
                        
                        session_details.append({
                            "session_id": session_data.get("session_id"),
                            "created": session_data.get("created"),
                            "last_activity": session_data.get("last_activity"),
                            "total_analyses": session_data.get("total_images_analyzed", 0)
                        })
                    except:
                        continue
            
            # Estadísticas live
            live_total = 0
            if os.path.exists(HISTORIAL_LIVE_FILE):
                with open(HISTORIAL_LIVE_FILE, 'r', encoding='utf-8') as f:
                    historial_live = json.load(f)
                live_total = historial_live.get("total_images_analyzed", 0)
            
            return jsonify({
                "sesiones": {
                    "total_activas": session_stats["active_sessions"],
                    "total_analisis": session_stats["total_analyses"],
                    "detalles": session_details
                },
                "live": {
                    "total_analisis": live_total
                },
                "sistema": {
                    "cleanup_hours": session_stats["cleanup_hours"],
                    "directorio_sesiones": sessions_dir
                }
            })
        except Exception as e:
            return jsonify({"error": f"Error al obtener estadísticas detalladas: {str(e)}"})