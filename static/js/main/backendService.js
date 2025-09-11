// backendService.js - Actualizado con soporte de sesiones y texto del usuario
export class BackendService {
    constructor() {
        this.baseUrl = '/';
        this.sessionId = null;
        this.initializeSession();
    }

    async initializeSession() {
        // Verificar si ya tenemos una sesión en sessionStorage
        const existingSessionId = sessionStorage.getItem('chatbot_session_id');
        
        if (existingSessionId) {
            // Verificar si la sesión sigue siendo válida
            try {
                const response = await fetch(`/historial?session_id=${existingSessionId}`);
                if (response.ok) {
                    this.sessionId = existingSessionId;
                    console.log('[SESSION] Sesión existente restaurada:', this.sessionId);
                    return;
                }
            } catch (error) {
                console.warn('[SESSION] Error al verificar sesión existente:', error);
            }
        }
        
        // Crear nueva sesión
        await this.createNewSession();
    }

    async createNewSession() {
        try {
            const response = await fetch('/nueva_sesion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                this.sessionId = result.session_id;
                sessionStorage.setItem('chatbot_session_id', this.sessionId);
                console.log('[SESSION] Nueva sesión creada:', this.sessionId);
            } else {
                throw new Error(result.error || 'Error al crear sesión');
            }
        } catch (error) {
            console.error('[SESSION] Error al crear nueva sesión:', error);
            // Generar un ID temporal como fallback
            this.sessionId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('chatbot_session_id', this.sessionId);
            console.warn('[SESSION] Usando ID temporal:', this.sessionId);
        }
    }

    async sendImages(images, userText = '') {
        // Asegurar que tenemos una sesión
        if (!this.sessionId) {
            await this.initializeSession();
        }

        const formData = this.createFormData(images, userText);
        
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: { 
                'X-Requested-With': 'XMLHttpRequest',
                'X-Session-ID': this.sessionId 
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        
        // Si el servidor devuelve un nuevo session_id, actualizarlo
        if (json.session_id && json.session_id !== this.sessionId) {
            this.sessionId = json.session_id;
            sessionStorage.setItem('chatbot_session_id', this.sessionId);
            console.log('[SESSION] ID de sesión actualizado:', this.sessionId);
        }
        
        return { resultado: json.resultado };
    }

    createFormData(images, userText = '') {
        const formData = new FormData();
        
        // Agregar session_id al FormData
        if (this.sessionId) {
            formData.append('session_id', this.sessionId);
        }
        
        // Agregar texto del usuario
        if (userText) {
            formData.append('user_text', userText);
        }
        
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
        if (!this.sessionId) {
            await this.initializeSession();
        }

        try {
            const response = await fetch(`/historial?session_id=${this.sessionId}`);
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
        // Limpiar sesión actual
        sessionStorage.removeItem('chatbot_session_id');
        this.sessionId = null;
        
        // Crear nueva sesión
        await this.createNewSession();
        
        console.log('[SESSION] Sesión reiniciada. Nueva sesión:', this.sessionId);
        return this.sessionId;
    }

    // Getter para obtener el ID de sesión actual
    getSessionId() {
        return this.sessionId;
    }
}