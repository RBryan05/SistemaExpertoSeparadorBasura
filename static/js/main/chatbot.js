// chatbot.js - Actualizado para cargar historial al inicializar
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

        // Esperar a que se inicialice la sesión
        await this.backendService.initializeSession();

        // Mostrar información de sesión en consola para debugging
        console.log('[CHATBOT] Sesión inicializada:', this.backendService.getSessionId());

        // Cargar historial de la sesión
        await this.cargarHistorial();

        // Mostrar mensaje de bienvenida con información de sesión solo si no hay historial
        if (this.chatMessages.children.length <= 1) { // Solo mensaje de bienvenida inicial
            this.mostrarMensajeSesion();
        }
    }

    async cargarHistorial() {
        const sessionId = this.backendService.getSessionId();
        if (!sessionId) return;

        try {
            const historial = await this.backendService.getSessionHistory();
            
            if (!historial || !historial.conversations || historial.conversations.length === 0) {
                console.log('[HISTORIAL] No hay historial previo para esta sesión');
                return;
            }

            // Cargar todas las conversaciones
            historial.conversations.forEach(conversacion => {
                this.cargarConversacion(conversacion);
            });

            console.log(`[HISTORIAL] ${historial.conversations.length} conversaciones cargadas`);
            
        } catch (error) {
            console.error('[HISTORIAL] Error al cargar historial:', error);
        }
    }

    cargarConversacion(conversacion) {
        // Recrear mensaje del usuario
        const userImages = this.convertirImagenesUsuario(conversacion.user_message.images);
        addUserMessage(this, conversacion.user_message.text, userImages);

        // Recrear respuestas del bot
        if (conversacion.bot_responses && conversacion.bot_responses.length > 0) {
            const textoRespuesta = this.generarTextoRespuestaBot(conversacion.bot_responses);
            // No pasamos imágenes al bot, solo el texto con las recomendaciones
            addBotMessage(this, textoRespuesta, [], false, false);
        }
    }

    convertirImagenesUsuario(imagenes) {
        if (!imagenes || imagenes.length === 0) return [];

        return imagenes.map(img => {
            if (img.tipo === 'archivo_subido') {
                return {
                    type: 'file',
                    preview: img.url_relativa,
                    name: img.filename
                };
            } else if (img.tipo === 'url_externa') {
                return {
                    type: 'url',
                    preview: img.url_relativa,
                    url: img.url_original,
                    name: img.filename
                };
            } else if (img.tipo === 'ruta_local') {
                return {
                    type: 'file',
                    preview: `/static/uploads/${img.filename}`,
                    name: img.filename
                };
            }
            return null;
        }).filter(img => img !== null);
    }

    convertirImagenesBot(botResponses) {
        // Las imágenes del bot son las mismas que las del usuario, solo las mostramos de nuevo
        const imagenes = [];
        botResponses.forEach(response => {
            if (response.imagen) {
                const img = response.imagen;
                if (img.tipo === 'archivo_subido' || img.tipo === 'url_externa') {
                    imagenes.push({
                        type: img.tipo === 'url_externa' ? 'url' : 'file',
                        preview: img.url_relativa,
                        name: img.filename
                    });
                } else if (img.tipo === 'ruta_local') {
                    imagenes.push({
                        type: 'file',
                        preview: `/static/uploads/${img.filename}`,
                        name: img.filename
                    });
                }
            }
        });
        return imagenes;
    }

    generarTextoRespuestaBot(botResponses) {
        let mensaje = "";
        
        botResponses.forEach((response, idx) => {
            mensaje += `Imagen ${idx + 1}:<br>`;
            mensaje += `Material identificado: ${response.resultado.etiqueta}<br>`;
            mensaje += `Porcentaje de confianza: ${response.resultado.confianza_porcentaje}<br>`;
            mensaje += `💡 ${response.recomendacion}<br><br>`;
        });

        return mensaje;
    }

    mostrarMensajeSesion() {
        const sessionId = this.backendService.getSessionId();
        const shortSessionId = sessionId ? sessionId.substring(0, 8) : 'N/A';

        console.log(`[SESIÓN] Tu sesión personal: ${shortSessionId}...`);
        console.log('[SESIÓN] Tus análisis son privados y se guardan solo para ti');
        console.log('[SESIÓN] La sesión se limpia automáticamente después de 24h de inactividad');

        // Opcional: Agregar indicador visual en la UI
        this.actualizarIndicadorSesion(shortSessionId);
    }

    actualizarIndicadorSesion(shortSessionId) {
        // Buscar si ya existe el indicador
        let indicador = document.querySelector('.session-indicator');

        if (!indicador) {
            // Crear indicador de sesión
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
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(indicador);

            // Ocultar después de 5 segundos
            setTimeout(() => {
                indicador.style.opacity = '0';
                setTimeout(() => indicador.remove(), 300);
            }, 5000);
        }

        indicador.innerHTML = `🔒 Sesión: ${shortSessionId}`;
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
            // NUEVO: Enviar también el texto del usuario al backend
            const response = await this.backendService.sendImages(imagesToSend, cleanText);
            typingDiv.remove();
            showCancelButton(this, true);
            addBotMessage(this, response.resultado, [], false, true);
            
            // Log para debugging
            console.log('[CHATBOT] Mensaje enviado:', {
                texto_usuario: cleanText,
                imagenes: imagesToSend.length,
                session_id: this.backendService.getSessionId()
            });
            
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
        const historial = await this.backendService.getSessionHistory();
        
        // Log detallado del historial para debugging
        if (historial && historial.conversations) {
            console.log('[CHATBOT] Historial de conversaciones:');
            historial.conversations.forEach((conv, idx) => {
                console.log(`[CONV ${idx + 1}]`, {
                    timestamp: conv.timestamp,
                    texto_usuario: conv.user_message.text,
                    imagenes_usuario: conv.user_message.images.length,
                    respuestas_bot: conv.bot_responses.length
                });
            });
        }
        
        return historial;
    }

    // Delegación al ImageModal
    static openImage(src) {
        ImageModal.openImage(src);
    }
}