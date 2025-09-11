// historialManager.js - Gestor actualizado para el historial con sesiones
export class HistorialManager {
    
    // NOTA: Ya no necesitamos reiniciar historial porque cada sesión es única
    static async obtenerHistorial(sessionId) {
        if (!sessionId) {
            console.warn('[HISTORIAL] No se proporcionó session_id');
            return null;
        }

        try {
            const response = await fetch(`/historial?session_id=${sessionId}`);
            if (response.ok) {
                const historial = await response.json();
                return historial;
            } else {
                console.warn('[HISTORIAL] Error al obtener historial para sesión:', sessionId);
                return null;
            }
        } catch (error) {
            console.warn('[HISTORIAL] Error de conexión al obtener historial:', error);
            return null;
        }
    }

    static async obtenerEstadisticas() {
        try {
            const response = await fetch('/estadisticas_historial');
            if (response.ok) {
                const stats = await response.json();
                return stats;
            } else {
                console.warn('[ESTADÍSTICAS] Error al obtener estadísticas');
                return null;
            }
        } catch (error) {
            console.warn('[ESTADÍSTICAS] Error de conexión:', error);
            return null;
        }
    }

    static async obtenerHistorialLive() {
        try {
            const response = await fetch('/historial_live');
            if (response.ok) {
                const historial = await response.json();
                return historial;
            } else {
                console.warn('[HISTORIAL LIVE] Error al obtener historial live');
                return null;
            }
        } catch (error) {
            console.warn('[HISTORIAL LIVE] Error de conexión:', error);
            return null;
        }
    }

    // Método para mostrar información de la sesión actual en consola
    static async mostrarInfoSesion(sessionId) {
        if (!sessionId) {
            console.log('[SESIÓN] No hay sesión activa');
            return;
        }

        const historial = await this.obtenerHistorial(sessionId);
        if (historial) {
            console.log('[SESIÓN] Información de sesión actual:', {
                session_id: historial.session_id,
                creada: historial.created,
                última_actividad: historial.last_activity,
                imágenes_analizadas: historial.total_images_analyzed,
                análisis: historial.analyses.length
            });
        }
    }

    // Ya no necesitamos inicializar historial en nueva sesión
    // porque cada sesión es independiente desde el momento de creación
    static async inicializarHistorialEnNuevaSesion() {
        console.log('[HISTORIAL] Sistema de sesiones individuales inicializado');
        // Este método se mantiene por compatibilidad pero ya no hace falta limpiar
    }

    // Método para limpiar solo el cache local del navegador (no afecta al servidor)
    static limpiarCacheLocal() {
        sessionStorage.removeItem('chatbot_session_id');
        console.log('[HISTORIAL] Cache local limpiado');
    }

    // Método administrativo para obtener estadísticas detalladas
    static async obtenerEstadisticasDetalladas() {
        try {
            const response = await fetch('/admin/estadisticas_detalladas');
            if (response.ok) {
                const stats = await response.json();
                return stats;
            } else {
                console.warn('[ADMIN] Error al obtener estadísticas detalladas');
                return null;
            }
        } catch (error) {
            console.warn('[ADMIN] Error de conexión:', error);
            return null;
        }
    }
}