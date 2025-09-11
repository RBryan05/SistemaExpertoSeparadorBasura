// historialManager.js - Gestor para el historial de análisis
export class HistorialManager {
    static async reiniciarHistorial() {
        try {
            const response = await fetch('/reiniciar_historial', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();
            if (result.success) {
                console.log('[HISTORIAL] Historial reiniciado para nueva sesión');
                return true;
            } else {
                console.warn('[HISTORIAL] Error al reiniciar historial:', result.error);
                return false;
            }
        } catch (error) {
            console.warn('[HISTORIAL] Error de conexión al reiniciar historial:', error);
            return false;
        }
    }

    static async obtenerHistorial() {
        try {
            const response = await fetch('/historial');
            if (response.ok) {
                const historial = await response.json();
                return historial;
            } else {
                console.warn('[HISTORIAL] Error al obtener historial');
                return null;
            }
        } catch (error) {
            console.warn('[HISTORIAL] Error de conexión al obtener historial:', error);
            return null;
        }
    }

    static async inicializarHistorialEnNuevaSesion() {
        // Detectar si es una nueva sesión (recarga de página)
        const esNuevaSesion = !sessionStorage.getItem('historial_inicializado');
        
        if (esNuevaSesion) {
            await this.reiniciarHistorial();
            sessionStorage.setItem('historial_inicializado', 'true');
        }
    }
}