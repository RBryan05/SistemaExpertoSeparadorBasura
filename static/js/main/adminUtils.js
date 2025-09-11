// adminUtils.js - Utilidades para administración del sistema de sesiones
// Este archivo contiene funciones que pueden ejecutarse desde la consola del navegador
// para administrar el sistema de sesiones

export class AdminUtils {
    
    // Obtener estadísticas generales del sistema
    static async obtenerEstadisticas() {
        try {
            const response = await fetch('/estadisticas_historial');
            if (response.ok) {
                const stats = await response.json();
                console.log('📊 ESTADÍSTICAS GENERALES:', stats);
                return stats;
            }
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
        }
    }

    // Obtener estadísticas detalladas (solo para administradores)
    static async obtenerEstadisticasDetalladas() {
        try {
            const response = await fetch('/admin/estadisticas_detalladas');
            if (response.ok) {
                const stats = await response.json();
                console.log('🔍 ESTADÍSTICAS DETALLADAS:', stats);
                
                // Mostrar de forma organizada
                console.group('📋 Resumen del Sistema');
                console.log(`🏠 Sesiones activas: ${stats.sesiones.total_activas}`);
                console.log(`📸 Total análisis en sesiones: ${stats.sesiones.total_analisis}`);
                console.log(`📡 Total análisis live: ${stats.live.total_analisis}`);
                console.log(`🧹 Limpieza cada: ${stats.sistema.cleanup_hours} horas`);
                console.groupEnd();
                
                if (stats.sesiones.detalles && stats.sesiones.detalles.length > 0) {
                    console.group('📑 Detalles de Sesiones');
                    stats.sesiones.detalles.forEach(sesion => {
                        console.log(`🔑 ID: ${sesion.session_id.substring(0, 8)}... | 📸 Análisis: ${sesion.total_analyses} | 🕐 Última actividad: ${new Date(sesion.last_activity).toLocaleString()}`);
                    });
                    console.groupEnd();
                }
                
                return stats;
            } else {
                console.warn('❌ No se pudieron obtener estadísticas detalladas (acceso restringido)');
            }
        } catch (error) {
            console.error('Error al obtener estadísticas detalladas:', error);
        }
    }

    // Forzar limpieza de sesiones antiguas
    static async limpiarSesionesAntiguas() {
        try {
            const response = await fetch('/admin/limpiar_sesiones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('🧹 LIMPIEZA COMPLETADA:', result.message);
                } else {
                    console.error('❌ Error en limpieza:', result.error);
                }
                return result;
            } else {
                console.warn('❌ No se pudo realizar la limpieza (acceso restringido)');
            }
        } catch (error) {
            console.error('Error al limpiar sesiones:', error);
        }
    }

    // Mostrar información de la sesión actual del usuario
    static async mostrarSesionActual() {
        const sessionId = sessionStorage.getItem('chatbot_session_id');
        if (!sessionId) {
            console.log('❌ No hay sesión activa');
            return;
        }

        try {
            const response = await fetch(`/historial?session_id=${sessionId}`);
            if (response.ok) {
                const historial = await response.json();
                
                console.group('🔑 Información de Sesión Actual');
                console.log(`📝 ID: ${historial.session_id}`);
                console.log(`📅 Creada: ${new Date(historial.created).toLocaleString()}`);
                console.log(`🕐 Última actividad: ${new Date(historial.last_activity).toLocaleString()}`);
                console.log(`📸 Imágenes analizadas: ${historial.total_images_analyzed}`);
                console.log(`📊 Análisis registrados: ${historial.analyses.length}`);
                console.groupEnd();
                
                if (historial.analyses.length > 0) {
                    console.group('📋 Últimos 5 Análisis');
                    historial.analyses.slice(-5).forEach((analisis, idx) => {
                        console.log(`${idx + 1}. ${analisis.resultado.etiqueta} (${analisis.resultado.confianza_porcentaje}) - ${new Date(analisis.timestamp).toLocaleString()}`);
                    });
                    console.groupEnd();
                }
                
                return historial;
            } else {
                console.log('❌ No se pudo obtener información de la sesión');
            }
        } catch (error) {
            console.error('Error al obtener información de sesión:', error);
        }
    }

    // Verificar el estado del sistema
    static async verificarSistema() {
        console.log('🔍 VERIFICANDO ESTADO DEL SISTEMA...');
        console.log('');
        
        // Verificar estadísticas generales
        await this.obtenerEstadisticas();
        console.log('');
        
        // Verificar sesión actual
        await this.mostrarSesionActual();
        console.log('');
        
        // Verificar historial live
        try {
            const response = await fetch('/historial_live');
            if (response.ok) {
                const live = await response.json();
                console.log('📡 HISTORIAL LIVE:', `${live.total_images_analyzed} imágenes analizadas`);
            }
        } catch (error) {
            console.warn('⚠️ Error al verificar historial live:', error);
        }
        
        console.log('✅ Verificación completada');
    }

    // Simular múltiples sesiones para pruebas (solo desarrollo)
    static async simularSesiones(cantidad = 3) {
        console.log(`🧪 SIMULANDO ${cantidad} SESIONES PARA PRUEBAS...`);
        
        const sesiones = [];
        
        for (let i = 0; i < cantidad; i++) {
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
                        sesiones.push(result.session_id);
                        console.log(`✅ Sesión ${i + 1} creada: ${result.session_id.substring(0, 8)}...`);
                    }
                }
            } catch (error) {
                console.error(`❌ Error al crear sesión ${i + 1}:`, error);
            }
            
            // Pequeña pausa entre creaciones
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`🎯 ${sesiones.length} sesiones creadas exitosamente`);
        return sesiones;
    }

    // Mostrar ayuda de comandos
    static ayuda() {
        console.log('📖 COMANDOS DE ADMINISTRACIÓN DISPONIBLES:');
        console.log('');
        console.log('📊 AdminUtils.obtenerEstadisticas()');
        console.log('   → Muestra estadísticas generales del sistema');
        console.log('');
        console.log('🔍 AdminUtils.obtenerEstadisticasDetalladas()');
        console.log('   → Muestra estadísticas detalladas (solo admin)');
        console.log('');
        console.log('🧹 AdminUtils.limpiarSesionesAntiguas()');
        console.log('   → Fuerza limpieza de sesiones antiguas (solo admin)');
        console.log('');
        console.log('🔑 AdminUtils.mostrarSesionActual()');
        console.log('   → Muestra información de la sesión actual del usuario');
        console.log('');
        console.log('🔍 AdminUtils.verificarSistema()');
        console.log('   → Ejecuta verificación completa del sistema');
        console.log('');
        console.log('🧪 AdminUtils.simularSesiones(cantidad)');
        console.log('   → Crea sesiones de prueba para testing');
        console.log('');
        console.log('💡 Tip: Ejecuta estos comandos desde la consola del navegador');
    }
}

// Hacer disponible globalmente para uso en consola
window.AdminUtils = AdminUtils;

// Mostrar ayuda automáticamente al cargar
if (typeof window !== 'undefined') {
    console.log('🔧 AdminUtils cargado. Ejecuta AdminUtils.ayuda() para ver comandos disponibles.');
}