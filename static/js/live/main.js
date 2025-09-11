// main.js
import { UIManager } from './uiManager.js';
import { SocketManager } from './socketManager.js';
import { LiveAnalyzer } from './liveAnalyzer.js';

class LiveApp {
    constructor() {
        this.initializeApp();
    }

    initializeApp() {
        console.log("Inicializando aplicación de análisis en vivo");
        
        // Crear instancias de los managers
        this.uiManager = new UIManager();
        
        // Crear analyzer (necesita referencia a uiManager)
        this.liveAnalyzer = new LiveAnalyzer(null, this.uiManager);
        
        // Crear socket manager (necesita referencias a uiManager y liveAnalyzer)
        this.socketManager = new SocketManager(this.uiManager, this.liveAnalyzer);
        
        // Completar la referencia circular en liveAnalyzer
        this.liveAnalyzer.socketManager = this.socketManager;
        
        // Manejar análisis directo desde URL
        this.liveAnalyzer.handleDirectAnalysis();
        
        console.log("Aplicación inicializada correctamente");
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new LiveApp();
});