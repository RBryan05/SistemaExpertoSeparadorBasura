// liveAnalyzer.js
export class LiveAnalyzer {
    constructor(socketManager, uiManager) {
        this.socketManager = socketManager;
        this.uiManager = uiManager;
        this.pendingAnalysis = null;
    }

    processAnalysis(url) {
        console.log("Procesando análisis para:", url);
        
        fetch(`/analizar_url?url=${encodeURIComponent(url)}`)
            .then(response => response.json())
            .then(data => {
                console.log("Respuesta del servidor:", data);
                if (data.error) {
                    this.uiManager.showError(data.error);
                } else if (!data.inicio_analisis) {
                    // Si no hay indicación de inicio_analisis, mostrar resultado directamente
                    console.log("Mostrando resultado directo");
                    this.uiManager.mostrarImagen(url, data.etiqueta, data.confianza);
                }
                // Si hay inicio_analisis=true, el resultado vendrá por Socket.IO
            })
            .catch(err => {
                console.error("Error en fetch:", err);
                this.uiManager.showError('Error al procesar la imagen');
            });
    }

    handleDirectAnalysis() {
        const params = new URLSearchParams(window.location.search);
        const liveUrl = params.get("live_url");
        
        if (liveUrl) {
            console.log("Detectada URL para análisis directo:", liveUrl);
            
            if (this.socketManager.isConnected()) {
                // Socket ya conectado, procesar inmediatamente
                this.processAnalysis(liveUrl);
            } else {
                // Socket no conectado, guardar para procesar después
                console.log("Socket no conectado, guardando análisis pendiente");
                this.pendingAnalysis = liveUrl;
                this.uiManager.showAnalyzingState(); // Mostrar estado mientras esperamos
            }
        }
    }

    processPendingAnalysis() {
        if (this.pendingAnalysis) {
            console.log("Procesando análisis pendiente");
            this.processAnalysis(this.pendingAnalysis);
            this.pendingAnalysis = null;
        }
    }
}