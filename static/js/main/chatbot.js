// chatbot.js
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

    initialize() {
        bindChatEvents(this);
        this.adjustTextareaHeight();
        this.reiniciarHistorial(); // Reiniciar historial al cargar la página
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

    async reiniciarHistorial() {
        await HistorialManager.inicializarHistorialEnNuevaSesion();
    }

    // Delegación al ImageModal
    static openImage(src) {
        ImageModal.openImage(src);
    }
}