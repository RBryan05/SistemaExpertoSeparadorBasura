// chatUI.js
import { escapeHtml, scrollToBottom } from './chatHelpers.js';

export function addUserMessage(bot, text, images) {
    const div = document.createElement('div');
    div.className = 'message user-message';
    div.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-content">
            ${text ? `<div class="message-text">${escapeHtml(text)}</div>` : ''}
            ${images.length ? bot.createImageElements(images, true) : ''}
        </div>
    `;
    bot.chatMessages.appendChild(div);
    scrollToBottom(bot.chatMessages);
    return div;
}

export function addBotMessage(bot, text, images = [], isTyping = false, useTypingEffect = false) {
    const div = document.createElement('div');
    div.className = `message bot-message ${isTyping ? 'typing' : ''}`;

    if (isTyping) {
        div.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="message-text">
                    <div class="loading-message">
                        <div class="loading-spinner"></div>
                        <span class="loading-text">Analizando con IA...</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.classList.add('liquid-glass');

        const cleanText = text
            .replace(/<br>/gi, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (useTypingEffect) {
            bot.typeMessage(textDiv, cleanText);
        } else {
            textDiv.textContent = cleanText;
            textDiv.style.whiteSpace = 'pre-line';
        }

        contentDiv.appendChild(textDiv);
        
        if (images.length) {
            const imagesHTML = bot.createImageElements(images, false);
            contentDiv.insertAdjacentHTML('beforeend', imagesHTML);
        }

        div.innerHTML = '<div class="message-avatar">🤖</div>';
        div.appendChild(contentDiv);

        // Agregar efecto de aparición suave
        setTimeout(() => {
            textDiv.classList.add('glass-loaded');
        }, 100);
    }

    bot.chatMessages.appendChild(div);
    scrollToBottom(bot.chatMessages);
    return div;
}

export function showCancelButton(bot, isEnabled = true) {
    bot.showCancelButton(isEnabled);
}

export function showSendButton(bot) {
    bot.showSendButton();
}