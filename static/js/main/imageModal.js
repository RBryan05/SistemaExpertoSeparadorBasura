// imageModal.js
export class ImageModal {
    static openImage(src) {
        ImageModal.showImageModal(src);
    }

    static showImageModal(src) {
        let modal = document.getElementById('imageModal');
        
        if (!modal) {
            modal = ImageModal.createModal();
        }

        modal.querySelector('.modal-image').src = src;
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        setTimeout(() => modal.style.opacity = '1', 10);
    }

    static createModal() {
        const modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <img class="modal-image" src="" alt="Imagen ampliada">
                <div class="modal-info">
                    <span class="modal-filename"></span>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        ImageModal.bindModalEvents(modal);
        return modal;
    }

    static bindModalEvents(modal) {
        // Cerrar con botón X
        modal.querySelector('.modal-close').onclick = () => {
            ImageModal.closeModal(modal);
        };

        // Cerrar haciendo click fuera de la imagen
        modal.onclick = (e) => {
            if (e.target === modal) {
                ImageModal.closeModal(modal);
            }
        };

        // Prevenir cierre al hacer click en la imagen
        modal.querySelector('.modal-image').onclick = (e) => {
            e.stopPropagation();
        };
    }

    static closeModal(modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.style.display = 'none', 300);
    }
}