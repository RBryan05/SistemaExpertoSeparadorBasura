// backendService.js - Actualizado para usar cookies automáticamente
export class BackendService {
    constructor() {
        this.baseUrl = '/';
        this.sessionId = null;
        this.initializeSession();
    }

    async initializeSession() {
        // Las cookies se envían automáticamente, no necesitamos almacenar en sessionStorage
        console.log('[SESSION] Sistema de cookies activado - Las sesiones se manejan automáticamente');
        
        // Solo para debugging, podemos verificar la sesión actual
        await this.verifyCurrentSession();
    }

    async verifyCurrentSession() {
        try {
            const response = await fetch('/historial');
            if (response.ok) {
                const historial = await response.json();
                if (historial && !historial.error) {
                    this.sessionId = historial.session_id;
                    console.log('[SESSION] Sesión verificada:', this.sessionId);
                }
            }
        } catch (error) {
            console.warn('[SESSION] No se pudo verificar sesión (puede ser normal):', error);
        }
    }

    async sendImages(images) {
        const formData = this.createFormData(images);
        
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: { 
                'X-Requested-With': 'XMLHttpRequest'
                // Las cookies se envían automáticamente por el navegador
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        
        // Actualizar sessionId si viene en la respuesta
        if (json.session_id) {
            this.sessionId = json.session_id;
            console.log('[SESSION] ID de sesión actualizado:', this.sessionId);
        }
        
        return { resultado: json.resultado };
    }

    createFormData(images) {
        const formData = new FormData();
        
        // NOTA: Ya no enviamos session_id en el FormData porque va en la cookie
        
        // Agregar archivos
        images
            .filter(img => img.type === 'file')
            .forEach(img => {
                formData.append('imagen', img.file);
            });
        
        // Agregar URLs
        images
            .filter(img => img.type === 'url')
            .forEach(img => {
                formData.append('imagen_url', img.url);
            });

        return formData;
    }

    // Método para obtener el historial de la sesión actual
    async getSessionHistory() {
        try {
            const response = await fetch('/historial');
            if (response.ok) {
                return await response.json();
            } else {
                console.warn('[SESSION] Error al obtener historial');
                return null;
            }
        } catch (error) {
            console.error('[SESSION] Error de conexión al obtener historial:', error);
            return null;
        }
    }

    // Método para crear una nueva sesión manualmente (reiniciar conversación)
    async resetSession() {
        try {
            const response = await fetch('/nueva_sesion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.sessionId = result.session_id;
                    console.log('[SESSION] Sesión reiniciada. Nueva sesión:', this.sessionId);
                    return this.sessionId;
                }
            }
            throw new Error('Error al reiniciar sesión');
        } catch (error) {
            console.error('[SESSION] Error al reiniciar sesión:', error);
            throw error;
        }
    }

    // Getter para obtener el ID de sesión actual
    getSessionId() {
        return this.sessionId;
    }
}