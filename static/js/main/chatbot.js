// chatbot.js - Actualizado para sistema de cookies
import { HistorialManager } from './historialManager.js';
import { bindChatEvents } from './chatEvents.js';
import { addUserMessage, addBotMessage, showCancelButton, showSendButton } from './chatUI.js';
import { ImageHandler } from './imageHandler.js';
import { TypingAnimation } from './typingAnimation.js';
import { BackendService } from './backendService.js';
import { ImageModal } from './imageModal.js';

export class ChatBot {
    constructor() {
        this.initializeElements();
        this.initializeModules();
        this.initialize();
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.attachBtn = document.getElementById('attachBtn');
        this.fileInput = document.getElementById('fileInput');
        this.imagePreviewContainer = document.getElementById('imagePreviewContainer');
    }

    initializeModules() {
        this.imageHandler = new ImageHandler(this);
        this.typingAnimation = new TypingAnimation(this);
        this.backendService = new BackendService();
        this.originalButtonHTML = this.sendBtn.innerHTML;
    }

    async initialize() {
        bindChatEvents(this);
        this.adjustTextareaHeight();

        // Inicializar sesión (las cookies se manejan automáticamente)
        await this.backendService.initializeSession();

        // Mostrar información de sesión en consola para debugging
        console.log('[CHATBOT] Sistema de cookies activado');
        console.log('[CHATBOT] Tu historial se mantendrá entre sesiones');

        // Mostrar mensaje de bienvenida
        this.mostrarMensajeSesion();
    }

    mostrarMensajeSesion() {
        console.log('[SESIÓN] 🔒 Tu historial es persistente (cookies activadas)');
        console.log('[SESIÓN] 📅 Tu sesión se mantendrá por 30 días');
        console.log('[SESIÓN] ⏰ El servidor limpia sesiones inactivas después de 24h');

        // Opcional: Agregar indicador visual en la UI
        this.actualizarIndicadorSesion();
    }

    actualizarIndicadorSesion() {
        let indicador = document.querySelector('.session-indicator');

        if (!indicador) {
            indicador = document.createElement('div');
            indicador.className = 'session-indicator';
            indicador.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.7);
                color: #fff;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                z-index: 1000;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
            `;
            document.body.appendChild(indicador);
        }

        indicador.innerHTML = '🔒 Sesión persistente activada';

        // Ocultar después de 5 segundos
        setTimeout(() => {
            indicador.style.opacity = '0';
            setTimeout(() => {
                if (indicador.parentNode) {
                    indicador.parentNode.removeChild(indicador);
                }
            }, 300);
        }, 5000);
    }

    adjustTextareaHeight() {
        const style = window.getComputedStyle(this.messageInput);
        const padding = parseInt(style.paddingTop) + parseInt(style.paddingBottom);
        const maxHeight = 270;
        const minHeight = 20;

        this.messageInput.style.height = 'auto';
        const newHeight = Math.min(Math.max(this.messageInput.scrollHeight - padding, minHeight), maxHeight);
        this.messageInput.style.height = `${newHeight}px`;
    }

    // Delegación a ImageHandler
    get selectedImages() { return this.imageHandler.selectedImages; }
    set selectedImages(value) { this.imageHandler.selectedImages = value; }

    detectImageUrls() { this.imageHandler.detectImageUrls(); }
    handleFileSelect(files) { this.imageHandler.handleFileSelect(files); }
    updateImagePreviews() { this.imageHandler.updateImagePreviews(); }
    removeImage(index) { this.imageHandler.removeImage(index); }
    createImageElements(images, isUser) { return this.imageHandler.createImageElements(images, isUser); }

    // Delegación a TypingAnimation
    get currentTypingAnimation() { return this.typingAnimation.currentAnimation; }
    set currentTypingAnimation(value) { this.typingAnimation.currentAnimation = value; }

    typeMessage(element, text, speed = 30) { this.typingAnimation.typeMessage(element, text, speed); }
    cancelTyping() { this.typingAnimation.cancelTyping(); }

    // Métodos de botón
    showCancelButton(isEnabled = true) {
        this.sendBtn.innerHTML = '❌';
        this.sendBtn.classList.add('cancel-mode');
        this.sendBtn.onclick = isEnabled ? () => this.cancelTyping() : null;
        this.sendBtn.disabled = !isEnabled;
    }

    showSendButton() {
        this.sendBtn.innerHTML = this.originalButtonHTML;
        this.sendBtn.classList.remove('cancel-mode');
        this.sendBtn.onclick = () => this.sendMessage();
        this.sendBtn.disabled = false;
    }

    async sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text && this.selectedImages.length === 0) return;

        this.sendBtn.disabled = true;
        const cleanText = text;

        addUserMessage(this, cleanText, this.selectedImages);

        const imagesToSend = [...this.selectedImages];
        this.messageInput.value = '';
        this.selectedImages = [];
        this.updateImagePreviews();
        this.adjustTextareaHeight();
        this.fileInput.value = '';

        showCancelButton(this, false);
        const typingDiv = addBotMessage(this, '', [], true);

        try {
            const response = await this.backendService.sendImages(imagesToSend);
            typingDiv.remove();
            showCancelButton(this, true);
            addBotMessage(this, response.resultado, [], false, true);
        } catch (error) {
            typingDiv.remove();
            addBotMessage(this, 'Lo siento, hubo un error al procesar la imagen. Intenta de nuevo.', [], false, false);
            console.error("Error:", error);
            showSendButton(this);
            this.sendBtn.disabled = false;
        }
    }

    // Método para reiniciar conversación (crear nueva sesión)
    async reiniciarConversacion() {
        try {
            const nuevaSessionId = await this.backendService.resetSession();

            // Limpiar chat visualmente
            this.chatMessages.innerHTML = '';

            // Agregar mensaje de bienvenida
            addBotMessage(this, `¡Hola! 👋 Soy EcoBot, tu asistente inteligente para clasificar materiales reciclables.

✨ Puedes subir imágenes de objetos o compartir su url y te diré si son de:

• 📦 Cartón
• 🥤 Latas
• 📄 Papel
• 🍶 Plástico
• 🍷 Vidrio

También acepto enlaces de imágenes y texto descriptivo. ¡Empezamos a cuidar el planeta juntos! 🌍♻️`, [], false, false);

            this.mostrarMensajeSesion();

            console.log('[CHATBOT] Conversación reiniciada con nueva sesión:', nuevaSessionId);
            return true;
        } catch (error) {
            console.error('[CHATBOT] Error al reiniciar conversación:', error);
            return false;
        }
    }

    // Método para obtener información de la sesión actual
    async obtenerInfoSesion() {
        const sessionId = this.backendService.getSessionId();
        await HistorialManager.mostrarInfoSesion(sessionId);
        return sessionId;
    }

    // Método para obtener el historial de la sesión actual
    async obtenerHistorialSesion() {
        return await this.backendService.getSessionHistory();
    }

    // Delegación al ImageModal
    static openImage(src) {
        ImageModal.openImage(src);
    }
}