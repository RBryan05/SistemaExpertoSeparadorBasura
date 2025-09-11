// chatEvents.js
export function bindChatEvents(bot) {
    // Evento click del botón enviar
    bot.sendBtn.addEventListener('click', () => bot.sendMessage());
    
    // Evento keydown del input de mensaje
    bot.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            bot.sendMessage();
        }
    });
    
    // Evento input para detectar cambios en el texto
    bot.messageInput.addEventListener('input', () => {
        bot.adjustTextareaHeight();
        bot.detectImageUrls();
    });
    
    // Evento click del botón adjuntar
    bot.attachBtn.addEventListener('click', () => bot.fileInput.click());
    
    // Evento change del input de archivos
    bot.fileInput.addEventListener('change', (e) => {
        bot.handleFileSelect(e.target.files);
    });
    
    // Eventos para drag and drop
    bot.messageInput.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    bot.messageInput.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files).filter(file =>
            file.type.startsWith('image/')
        );
        if (files.length > 0) {
            bot.handleFileSelect(files);
        }
    });
}