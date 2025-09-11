// typingAnimation.js
import { scrollToBottom } from './chatHelpers.js';

export class TypingAnimation {
    constructor(bot) {
        this.bot = bot;
        this.currentAnimation = null;
    }

    typeMessage(element, text, speed = 30) {
        element.innerHTML = '';
        element.style.whiteSpace = 'pre-line';
        element.classList.add('typing-active');

        let i = 0;

        if (this.currentAnimation) {
            clearTimeout(this.currentAnimation);
        }

        const typer = () => {
            if (i < text.length) {
                element.textContent += text[i];
                i++;
                scrollToBottom(this.bot.chatMessages);

                if (i % 10 === 0) {
                    element.style.transform = 'scale(1.002)';
                    setTimeout(() => {
                        element.style.transform = 'scale(1)';
                    }, 100);
                }

                this.currentAnimation = setTimeout(typer, speed);
            } else {
                this.finishTyping(element);
            }
        };

        typer();
    }

    finishTyping(element) {
        element.classList.remove('typing-active');
        element.classList.add('typing-complete');

        element.style.transform = 'scale(1.005)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);

        this.bot.showSendButton();
        this.bot.sendBtn.disabled = false;
    }

    cancelTyping() {
        if (this.currentAnimation) {
            clearTimeout(this.currentAnimation);
            this.currentAnimation = null;
        }
        this.bot.showSendButton();
        console.log("Tipeo cancelado por el usuario");
    }
}