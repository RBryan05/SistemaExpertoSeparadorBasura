# sessionManager.py - Gestor de sesiones individuales para cada usuario
import os
import json
import uuid
import time
from datetime import datetime, timedelta
import threading
from typing import Optional, Dict, Any

class SessionManager:
    def __init__(self, sessions_dir="static/sessions", cleanup_hours=24):
        """
        Inicializar el gestor de sesiones
        
        Args:
            sessions_dir: Directorio donde se almacenarán los archivos de sesión
            cleanup_hours: Horas después de las cuales se eliminan sesiones inactivas
        """
        self.sessions_dir = sessions_dir
        self.cleanup_hours = cleanup_hours
        self.sessions_cache = {}  # Cache en memoria para sesiones activas
        
        # Crear directorio de sesiones si no existe
        os.makedirs(self.sessions_dir, exist_ok=True)
        
        # Iniciar limpieza automática en hilo separado
        self.start_cleanup_thread()
        
        print(f"[SESSION MANAGER] Inicializado - Directorio: {sessions_dir}, Limpieza cada: {cleanup_hours}h")
    
    def generate_session_id(self) -> str:
        """Generar un ID único para la sesión"""
        return str(uuid.uuid4())
    
    def get_session_file_path(self, session_id: str) -> str:
        """Obtener la ruta del archivo de sesión"""
        return os.path.join(self.sessions_dir, f"session_{session_id}.json")
    
    def create_session(self, session_id: Optional[str] = None) -> str:
        """
        Crear una nueva sesión
        
        Args:
            session_id: ID de sesión opcional (si no se proporciona, se genera uno nuevo)
            
        Returns:
            str: ID de la sesión creada
        """
        if session_id is None:
            session_id = self.generate_session_id()
        
        session_data = {
            "session_id": session_id,
            "created": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat(),
            "total_images_analyzed": 0,
            "analyses": []
        }
        
        # Guardar en archivo
        session_file = self.get_session_file_path(session_id)
        with open(session_file, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, indent=2, ensure_ascii=False)
        
        # Guardar en cache
        self.sessions_cache[session_id] = session_data
        
        print(f"[SESSION] Sesión creada: {session_id}")
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtener datos de una sesión
        
        Args:
            session_id: ID de la sesión
            
        Returns:
            Dict con los datos de la sesión o None si no existe
        """
        # Primero buscar en cache
        if session_id in self.sessions_cache:
            return self.sessions_cache[session_id]
        
        # Si no está en cache, buscar en archivo
        session_file = self.get_session_file_path(session_id)
        if os.path.exists(session_file):
            try:
                with open(session_file, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                
                # Actualizar cache
                self.sessions_cache[session_id] = session_data
                return session_data
            except Exception as e:
                print(f"[SESSION ERROR] Error al leer sesión {session_id}: {e}")
                return None
        
        return None
    
    def update_session_activity(self, session_id: str) -> bool:
        """
        Actualizar la última actividad de una sesión
        
        Args:
            session_id: ID de la sesión
            
        Returns:
            bool: True si se actualizó correctamente, False si no existe la sesión
        """
        session_data = self.get_session(session_id)
        if session_data is None:
            return False
        
        session_data["last_activity"] = datetime.now().isoformat()
        
        # Actualizar archivo
        session_file = self.get_session_file_path(session_id)
        try:
            with open(session_file, 'w', encoding='utf-8') as f:
                json.dump(session_data, f, indent=2, ensure_ascii=False)
            
            # Actualizar cache
            self.sessions_cache[session_id] = session_data
            return True
        except Exception as e:
            print(f"[SESSION ERROR] Error al actualizar actividad {session_id}: {e}")
            return False
    
    def add_analysis_to_session(self, session_id: str, imagen_info: Dict, 
                               etiqueta: str, confianza: float, recomendacion: str) -> bool:
        """
        Agregar un análisis a la sesión
        
        Args:
            session_id: ID de la sesión
            imagen_info: Información de la imagen analizada
            etiqueta: Resultado de la clasificación
            confianza: Nivel de confianza
            recomendacion: Recomendación específica
            
        Returns:
            bool: True si se guardó correctamente
        """
        session_data = self.get_session(session_id)
        if session_data is None:
            print(f"[SESSION ERROR] Sesión no encontrada: {session_id}")
            return False
        
        # Crear registro del análisis
        analisis = {
            "timestamp": datetime.now().isoformat(),
            "imagen": imagen_info,
            "resultado": {
                "etiqueta": etiqueta,
                "confianza": float(confianza),
                "confianza_porcentaje": f"{confianza*100:.1f}%"
            },
            "recomendacion": recomendacion
        }
        
        # Agregar al historial de la sesión
        session_data["analyses"].append(analisis)
        session_data["total_images_analyzed"] += 1
        session_data["last_activity"] = datetime.now().isoformat()
        
        # Guardar en archivo
        session_file = self.get_session_file_path(session_id)
        try:
            with open(session_file, 'w', encoding='utf-8') as f:
                json.dump(session_data, f, indent=2, ensure_ascii=False)
            
            # Actualizar cache
            self.sessions_cache[session_id] = session_data
            
            print(f"[SESSION] Análisis agregado a sesión {session_id}: {etiqueta} ({confianza*100:.1f}%)")
            return True
        except Exception as e:
            print(f"[SESSION ERROR] Error al guardar análisis en sesión {session_id}: {e}")
            return False
    
    def cleanup_old_sessions(self) -> int:
        """
        Eliminar sesiones antiguas basadas en la última actividad
        
        Returns:
            int: Número de sesiones eliminadas
        """
        if not os.path.exists(self.sessions_dir):
            return 0
        
        cutoff_time = datetime.now() - timedelta(hours=self.cleanup_hours)
        sessions_removed = 0
        
        # Obtener todos los archivos de sesión
        session_files = [f for f in os.listdir(self.sessions_dir) if f.startswith('session_') and f.endswith('.json')]
        
        for session_file in session_files:
            session_path = os.path.join(self.sessions_dir, session_file)
            
            try:
                # Leer la sesión para verificar su última actividad
                with open(session_path, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                
                last_activity_str = session_data.get("last_activity")
                if last_activity_str:
                    last_activity = datetime.fromisoformat(last_activity_str)
                    
                    if last_activity < cutoff_time:
                        # Eliminar sesión antigua
                        os.remove(session_path)
                        
                        # Eliminar del cache si existe
                        session_id = session_data.get("session_id")
                        if session_id in self.sessions_cache:
                            del self.sessions_cache[session_id]
                        
                        sessions_removed += 1
                        print(f"[SESSION CLEANUP] Sesión eliminada: {session_id} (inactiva desde {last_activity_str})")
                
            except Exception as e:
                print(f"[SESSION CLEANUP ERROR] Error al procesar {session_file}: {e}")
                # Si hay error al leer el archivo, eliminarlo también
                try:
                    os.remove(session_path)
                    sessions_removed += 1
                except:
                    pass
        
        if sessions_removed > 0:
            print(f"[SESSION CLEANUP] {sessions_removed} sesiones eliminadas")
        
        return sessions_removed
    
    def start_cleanup_thread(self):
        """Iniciar hilo de limpieza automática"""
        def cleanup_worker():
            while True:
                try:
                    time.sleep(3600)  # Ejecutar cada hora
                    self.cleanup_old_sessions()
                except Exception as e:
                    print(f"[SESSION CLEANUP ERROR] Error en limpieza automática: {e}")
        
        cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
        cleanup_thread.start()
        print("[SESSION MANAGER] Hilo de limpieza automática iniciado")
    
    def get_session_stats(self) -> Dict[str, Any]:
        """
        Obtener estadísticas de todas las sesiones activas
        
        Returns:
            Dict con estadísticas generales
        """
        if not os.path.exists(self.sessions_dir):
            return {"active_sessions": 0, "total_analyses": 0}
        
        session_files = [f for f in os.listdir(self.sessions_dir) if f.startswith('session_') and f.endswith('.json')]
        
        active_sessions = 0
        total_analyses = 0
        
        for session_file in session_files:
            session_path = os.path.join(self.sessions_dir, session_file)
            try:
                with open(session_path, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                
                active_sessions += 1
                total_analyses += session_data.get("total_images_analyzed", 0)
                
            except Exception as e:
                print(f"[SESSION STATS ERROR] Error al leer {session_file}: {e}")
        
        return {
            "active_sessions": active_sessions,
            "total_analyses": total_analyses,
            "cleanup_hours": self.cleanup_hours
        }
    
    def force_cleanup(self) -> int:
        """
        Forzar limpieza inmediata de sesiones antiguas
        
        Returns:
            int: Número de sesiones eliminadas
        """
        return self.cleanup_old_sessions()