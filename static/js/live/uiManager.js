// uiManager.js
export class UIManager {
    constructor() {
        this.initializeElements();
        this.initializeState();
        this.startUptimeCounter();
    }

    initializeElements() {
        // Elementos principales
        this.imgElem = document.getElementById("imagen");
        this.resultadoElem = document.getElementById("resultado");
        this.imageOverlay = document.getElementById("imageOverlay");
        
        // Elementos de estado
        this.statusDot = document.getElementById("statusDot");
        this.statusText = document.getElementById("statusText");
        
        // Elementos de detalles
        this.resultDetails = document.getElementById("resultDetails");
        this.confidenceFill = document.getElementById("confidenceFill");
        this.confidenceText = document.getElementById("confidenceText");
        this.materialType = document.getElementById("materialType");
        this.timestamp = document.getElementById("timestamp");
        
        // Elementos de estadísticas
        this.totalAnalyzed = document.getElementById("totalAnalyzed");
        this.successRate = document.getElementById("successRate");
        this.uptime = document.getElementById("uptime");
    }

    initializeState() {
        this.analysisCount = 0;
        this.startTime = Date.now();
        this.analyzing = false;
        this.setStatus('connecting', 'Conectando...');
    }

    startUptimeCounter() {
        setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            this.uptime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    setStatus(status, text) {
        console.log(`Estado cambiado a: ${status} - ${text}`);
        this.statusDot.className = `status-dot ${status}`;
        this.statusText.textContent = text;
        this.analyzing = status === 'analyzing';
    }

    isAnalyzing() {
        return this.analyzing;
    }

    showAnalyzingState() {
        this.setStatus('analyzing', 'Analizando...');
        this.resultadoElem.innerHTML = `
            <div class="result-analyzing">
                <div class="analyzing-spinner"></div>
                <span>Analizando imagen...</span>
            </div>
        `;
        console.log("Mostrando estado de análisis");
    }

    mostrarImagen(url, etiqueta, confianza) {
        // Ocultar overlay y mostrar imagen
        this.imageOverlay.style.display = "none";
        this.imgElem.src = url;
        this.imgElem.style.display = "block";

        // Actualizar resultado principal
        this.resultadoElem.innerHTML = `
            <div class="result-success">
                <div class="result-icon">${this.getMaterialIcon(etiqueta)}</div>
                <div class="result-text">
                    <span class="material-name">${etiqueta}</span>
                    <span class="confidence-indicator">${(confianza * 100).toFixed(1)}% de confianza</span>
                </div>
            </div>
        `;

        // Mostrar detalles
        this.resultDetails.style.display = "block";

        // Actualizar barra de confianza
        const confidencePercentage = confianza * 100;
        this.confidenceFill.style.width = `${confidencePercentage}%`;
        this.confidenceText.textContent = `${confidencePercentage.toFixed(1)}%`;

        // Actualizar detalles
        this.materialType.textContent = etiqueta;
        this.timestamp.textContent = new Date().toLocaleTimeString();

        // Actualizar estadísticas
        this.analysisCount++;
        this.totalAnalyzed.textContent = this.analysisCount;
        this.successRate.textContent = `${(confianza * 100).toFixed(0)}%`;

        // Actualizar estado después de un delay
        setTimeout(() => {
            this.setStatus('connected', 'Conectado');
        }, 1000);

        // Efecto de animación en el resultado
        this.animateResult();
    }

    showError(message) {
        this.resultadoElem.innerHTML = `
            <div class="result-error">
                <div class="error-icon">⚠️</div>
                <span>Error: ${message}</span>
            </div>
        `;
        this.setStatus('error', 'Error');
    }

    animateResult() {
        this.resultadoElem.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.resultadoElem.style.transform = 'scale(1)';
        }, 100);
    }

    getMaterialIcon(material) {
        const icons = {
            'cartón': '📦',
            'carton': '📦',
            'lata': '🥤',
            'latas': '🥤',
            'papel': '📄',
            'plástico': '🍶',
            'plastico': '🍶',
            'vidrio': '🍷',
            'metal': '⚙️',
            'orgánico': '🍃',
            'organico': '🍃'
        };

        const lowerMaterial = material.toLowerCase();
        return icons[lowerMaterial] || '♻️';
    }
}