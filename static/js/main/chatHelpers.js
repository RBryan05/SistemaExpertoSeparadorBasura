// chatHelpers.js
export function escapeHtml(str) {
    return str.replace(/&/g,"&amp;")
              .replace(/</g,"&lt;")
              .replace(/>/g,"&gt;")
              .replace(/"/g,"&quot;")
              .replace(/'/g,"&#039;")
              .replace(/\n/g,"<br>");
}

export function scrollToBottom(chatMessages) {
    setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 100);
}

export function typeMessage(element, text, speed=30) {
    element.innerHTML = '';
    element.style.whiteSpace = 'pre-line';
    element.classList.add('typing-active');
    let i = 0;
    const typer = () => {
        if(i < text.length){ element.textContent += text[i]; i++; setTimeout(typer, speed); }
        else { element.classList.remove('typing-active'); element.classList.add('typing-complete'); }
    };
    typer();
}
