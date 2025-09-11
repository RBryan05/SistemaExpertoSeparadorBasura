// imageHandler.js
export class ImageHandler {
    constructor(bot) {
        this.bot = bot;
        this.selectedImages = [];
    }

    detectImageUrls() {
        const text = this.bot.messageInput.value;
        const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|heic|avif)(\?[^\s]*)?)/gi;
        const urls = text.match(urlRegex) || [];

        // Filtrar imágenes existentes, mantener solo las que siguen en el texto
        this.selectedImages = this.selectedImages.filter(img => {
            if (img.type === 'url' && !urls.includes(img.url)) return false;
            return true;
        });

        // Agregar nuevas URLs encontradas
        urls.forEach(url => {
            if (!this.selectedImages.some(img => img.type === 'url' && img.url === url)) {
                this.selectedImages.push({ type: 'url', url: url, preview: url });
            }
        });
        
        this.updateImagePreviews();
    }

    handleFileSelect(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.selectedImages.push({
                        type: 'file',
                        file: file,
                        preview: e.target.result,
                        name: file.name
                    });
                    this.updateImagePreviews();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    updateImagePreviews() {
        if (this.selectedImages.length === 0) {
            this.bot.imagePreviewContainer.style.display = 'none';
            return;
        }

        this.bot.imagePreviewContainer.style.display = 'flex';
        this.bot.imagePreviewContainer.innerHTML = '';

        this.selectedImages.forEach((img, index) => {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview';

            const imgElement = document.createElement('img');
            imgElement.src = img.preview;
            imgElement.className = 'preview-image';
            imgElement.alt = img.name || 'Imagen';

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => this.removeImage(index);

            previewDiv.appendChild(imgElement);
            previewDiv.appendChild(removeBtn);
            this.bot.imagePreviewContainer.appendChild(previewDiv);
        });
    }

    removeImage(index) {
        const img = this.selectedImages[index];
        if (img.type === 'url') {
            const currentText = this.bot.messageInput.value;
            const newText = currentText.replace(img.url, '').replace(/\s+/g, ' ').trim();
            this.bot.messageInput.value = newText;
        }
        this.selectedImages.splice(index, 1);
        this.updateImagePreviews();
    }

    createImageElements(images, isUser) {
        if (!images.length) return '';

        const files = images.filter(img => img.type === 'file');
        const urls = images.filter(img => img.type === 'url');
        const orderedImages = [...files, ...urls];

        if (isUser) {
            return `<div class="message-images">
                ${orderedImages.map((img, index) => `
                    <div class="message-image-container">
                        <span class="image-number">${index + 1}</span>
                        <img src="${img.preview}" class="message-image" alt="${img.name || 'Imagen'}" 
                             onclick="ChatBot.openImage('${img.preview}')">
                    </div>
                `).join('')}
            </div>`;
        } else {
            return `<div class="message-images">
                ${orderedImages.map(img => `
                    <img src="${img.preview}" class="message-image" alt="${img.name || 'Imagen'}" 
                         onclick="ChatBot.openImage('${img.preview}')">
                `).join('')}
            </div>`;
        }
    }
}