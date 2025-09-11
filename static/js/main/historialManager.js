// historialManager.js - Gestor actualizado para el historial con conversaciones completas
export class HistorialManager {
    
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

    // Método mejorado para mostrar información detallada de la sesión actual en consola
    static async mostrarInfoSesion(sessionId) {
        if (!sessionId) {
            console.log('[SESIÓN] No hay sesión activa');
            return;
        }

        const historial = await this.obtenerHistorial(sessionId);
        if (historial) {
            console.group('🔍 INFORMACIÓN DETALLADA DE SESIÓN');
            console.log('📝 ID de sesión:', historial.session_id);
            console.log('📅 Creada:', new Date(historial.created).toLocaleString());
            console.log('🕐 Última actividad:', new Date(historial.last_activity).toLocaleString());
            console.log('📸 Imágenes analizadas:', historial.total_images_analyzed);
            
            // Información sobre conversaciones
            if (historial.conversations && historial.conversations.length > 0) {
                console.log('💬 Total conversaciones:', historial.conversations.length);
                
                console.group('📋 Resumen de Conversaciones');
                historial.conversations.forEach((conv, idx) => {
                    const timestamp = new Date(conv.timestamp).toLocaleString();
                    const userText = conv.user_message.text || '[Sin texto]';
                    const userImages = conv.user_message.images.length;
                    const botResponses = conv.bot_responses.length;
                    
                    console.log(`${idx + 1}. [${timestamp}]`);
                    console.log(`   👤 Usuario: "${userText}" + ${userImages} imagen(es)`);
                    console.log(`   🤖 Bot: ${botResponses} respuesta(s)`);
                    
                    // Mostrar las clasificaciones del bot
                    conv.bot_responses.forEach((resp, respIdx) => {
                        console.log(`      ${respIdx + 1}. ${resp.resultado.etiqueta} (${resp.resultado.confianza_porcentaje})`);
                    });
                });
                console.groupEnd();
            } else if (historial.analyses && historial.analyses.length > 0) {
                // Compatibilidad con formato antiguo
                console.log('📊 Análisis (formato antiguo):', historial.analyses.length);
                console.warn('⚠️ Esta sesión usa el formato antiguo. Los mensajes del usuario no están registrados.');
            } else {
                console.log('📊 No hay conversaciones registradas');
            }
            
            console.groupEnd();
        }
    }

    // Nuevo método para mostrar conversaciones de forma legible
    static async mostrarConversaciones(sessionId, limite = 10) {
        const historial = await this.obtenerHistorial(sessionId);
        
        if (!historial || !historial.conversations) {
            console.log('[CONVERSACIONES] No hay conversaciones disponibles');
            return;
        }

        const conversaciones = historial.conversations.slice(-limite); // Mostrar las últimas N
        
        console.group(`💬 ÚLTIMAS ${conversaciones.length} CONVERSACIONES`);
        
        conversaciones.forEach((conv, idx) => {
            const numero = historial.conversations.length - conversaciones.length + idx + 1;
            const timestamp = new Date(conv.timestamp).toLocaleString();
            
            console.group(`📝 Conversación ${numero} - ${timestamp}`);
            
            // Mensaje del usuario
            console.log('👤 USUARIO:');
            if (conv.user_message.text) {
                console.log(`   📝 Texto: "${conv.user_message.text}"`);
            }
            if (conv.user_message.images && conv.user_message.images.length > 0) {
                console.log(`   🖼️ Imágenes: ${conv.user_message.images.length}`);
                conv.user_message.images.forEach((img, imgIdx) => {
                    console.log(`      ${imgIdx + 1}. ${img.tipo}: ${img.filename || img.url_original || img.ruta_original}`);
                });
            }
            
            // Respuestas del bot
            console.log('🤖 BOT:');
            conv.bot_responses.forEach((resp, respIdx) => {
                console.log(`   ${respIdx + 1}. Clasificación: ${resp.resultado.etiqueta} (${resp.resultado.confianza_porcentaje})`);
                console.log(`      💡 Recomendación: ${resp.recomendacion.substring(0, 100)}${resp.recomendacion.length > 100 ? '...' : ''}`);
            });
            
            console.groupEnd();
        });
        
        if (historial.conversations.length > limite) {
            console.log(`... y ${historial.conversations.length - limite} conversaciones más`);
        }
        
        console.groupEnd();
    }

    static async inicializarHistorialEnNuevaSesion() {
        console.log('[HISTORIAL] Sistema de sesiones individuales inicializado');
        console.log('[HISTORIAL] Ahora se guardan conversaciones completas: texto del usuario + respuestas del bot');
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
                
                // Mostrar información detallada en consola
                console.group('📊 ESTADÍSTICAS DETALLADAS DEL SISTEMA');
                console.log(`🏠 Sesiones activas: ${stats.sesiones.total_activas}`);
                console.log(`📸 Total análisis en sesiones: ${stats.sesiones.total_analisis}`);
                console.log(`📡 Total análisis live: ${stats.live.total_analisis}`);
                console.log(`🧹 Limpieza automática cada: ${stats.sistema.cleanup_hours} horas`);
                console.log(`✨ ${stats.sistema.nuevo_formato}`);
                
                if (stats.sesiones.detalles && stats.sesiones.detalles.length > 0) {
                    console.group('📋 Detalles por Sesión');
                    stats.sesiones.detalles.forEach(sesion => {
                        const formatoIcon = sesion.format === 'nuevo' ? '✅' : '⚠️';
                        console.log(`${formatoIcon} ${sesion.session_id.substring(0, 8)}... | 💬 ${sesion.total_conversations} conv. | 📸 ${sesion.total_analyses} análisis | 🕐 ${new Date(sesion.last_activity).toLocaleString()}`);
                    });
                    console.groupEnd();
                }
                
                console.groupEnd();
                
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