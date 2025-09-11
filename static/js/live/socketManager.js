// socketManager.js
export class SocketManager {
    constructor(uiManager, liveAnalyzer) {
        this.socket = io();
        this.uiManager = uiManager;
        this.liveAnalyzer = liveAnalyzer;
        this.socketConnected = false;
        this.bindEvents();
    }

    bindEvents() {
        this.socket.on("connect", () => {
            console.log("Socket conectado");
            this.socketConnected = true;
            
            // Procesar análisis pendiente si existe
            if (this.liveAnalyzer) {
                this.liveAnalyzer.processPendingAnalysis();
            }
            
            if (!this.uiManager.isAnalyzing()) {
                this.uiManager.setStatus('connected', 'Conectado');
            }
        });

        this.socket.on("disconnect", () => {
            console.log("Socket desconectado");
            this.socketConnected = false;
            if (!this.uiManager.isAnalyzing()) {
                this.uiManager.setStatus('disconnected', 'Desconectado');
            }
        });

        // Evento cuando comienza el análisis (desde el backend)
        this.socket.on("inicio_analisis", () => {
            console.log("Recibido evento inicio_analisis del backend");
            this.uiManager.showAnalyzingState();
        });

        // Evento cuando se completa el análisis
        this.socket.on("nueva_imagen", (data) => {
            console.log("Recibido evento nueva_imagen", data);
            this.uiManager.mostrarImagen(data.url, data.etiqueta, data.confianza);
        });

        // Evento para errores de análisis
        this.socket.on("analisis_error", (data) => {
            console.log("Recibido evento analisis_error", data);
            this.uiManager.showError(data.error);
        });
    }

    isConnected() {
        return this.socketConnected;
    }

    emit(event, data) {
        this.socket.emit(event, data);
    }
}