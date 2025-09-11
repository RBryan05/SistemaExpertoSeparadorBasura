// backendService.js
export class BackendService {
    constructor() {
        this.baseUrl = '/';
    }

    async sendImages(images) {
        const formData = this.createFormData(images);
        
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        return { resultado: json.resultado };
    }

    createFormData(images) {
        const formData = new FormData();
        
        // Agregar archivos
        images
            .filter(img => img.type === 'file')
            .forEach(img => {
                formData.append('imagen', img.file);
            });
        
        // Agregar URLs
        images
            .filter(img => img.type === 'url')
            .forEach(img => {
                formData.append('imagen_url', img.url);
            });

        return formData;
    }
}