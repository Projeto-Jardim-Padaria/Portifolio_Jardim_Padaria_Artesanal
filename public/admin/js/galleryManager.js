/**
 * GalleryManager — gerencia upload e exibição de múltiplas imagens de produto no admin.
 * Armazena URLs existentes e novos arquivos selecionados.
 * Ao salvar, faz upload dos novos arquivos e retorna o array final de URLs.
 */
class GalleryManager {
    /**
     * @param {string} containerId - ID do elemento DOM que receberá as thumbnails
     * @param {string[]} initialUrls - URLs já salvas (para modal de edição)
     */
    constructor(containerId, initialUrls = []) {
        this.containerId = containerId;
        this.existingUrls = [...initialUrls];
        this.newFiles = [];
        this.errorContainerId = containerId + 'Error';
        this.render();
    }

    /** Retorna o estado atual */
    getState() {
        return {
            existingUrls: [...this.existingUrls],
            newFiles: [...this.newFiles]
        };
    }

    /** Exibe mensagem de erro inline */
    _showError(msg) {
        const el = document.getElementById(this.errorContainerId);
        if (el) {
            el.textContent = msg;
            el.style.display = msg ? 'block' : 'none';
        }
    }

    /** Valida e adiciona novos arquivos à fila */
    addFiles(fileList) {
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
        const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

        for (const file of Array.from(fileList)) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                this._showError(`Formato não suportado: use JPEG, PNG ou WebP. (${file.name})`);
                continue;
            }
            if (file.size > MAX_SIZE) {
                this._showError(`Arquivo muito grande: máximo 5 MB por imagem. (${file.name})`);
                continue;
            }
            this.newFiles.push(file);
        }
        this.render();
    }

    /** Remove uma imagem pelo índice (existentes primeiro, depois novos arquivos) */
    removeImage(index) {
        const totalExisting = this.existingUrls.length;
        if (index < totalExisting) {
            this.existingUrls.splice(index, 1);
        } else {
            this.newFiles.splice(index - totalExisting, 1);
        }
        this.render();
    }

    /** Renderiza as thumbnails no container DOM */
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = '';

        // Thumbnails de imagens existentes (URLs já salvas)
        this.existingUrls.forEach((url, i) => {
            container.appendChild(this._createThumb(url, i, false));
        });

        // Thumbnails de novos arquivos (ainda não enviados)
        this.newFiles.forEach((file, i) => {
            const objectUrl = URL.createObjectURL(file);
            const thumb = this._createThumb(objectUrl, this.existingUrls.length + i, true);
            container.appendChild(thumb);
        });

        // Botão de adicionar mais fotos
        const addBtn = document.createElement('label');
        addBtn.className = 'gallery-add-btn';
        addBtn.title = 'Adicionar fotos';
        addBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Adicionar foto</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple style="display:none">
        `;
        addBtn.querySelector('input').addEventListener('change', (e) => {
            this._showError('');
            this.addFiles(e.target.files);
            e.target.value = ''; // reset para permitir re-selecionar o mesmo arquivo
        });
        container.appendChild(addBtn);
    }

    /** Cria um elemento thumbnail com botão de remoção */
    _createThumb(src, index, isNew) {
        const wrap = document.createElement('div');
        wrap.className = 'gallery-thumb' + (isNew ? ' gallery-thumb-new' : '');

        const img = document.createElement('img');
        img.src = src;
        img.alt = `Foto ${index + 1}`;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'gallery-thumb-remove';
        removeBtn.title = 'Remover foto';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', () => this.removeImage(index));

        if (isNew) {
            const badge = document.createElement('span');
            badge.className = 'gallery-thumb-badge';
            badge.textContent = 'Nova';
            wrap.appendChild(badge);
        }

        wrap.appendChild(img);
        wrap.appendChild(removeBtn);
        return wrap;
    }

    /**
     * Faz upload de todos os arquivos novos e retorna o array final de URLs.
     * @returns {Promise<string[]>}
     */
    async uploadAndGetUrls() {
        const uploadedUrls = [];

        for (const file of this.newFiles) {
            const reader = new FileReader();
            const fileData = await new Promise((resolve) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });

            const res = await fetch('/.netlify/functions/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    fileType: file.type,
                    fileData: fileData
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(`Erro ao enviar "${file.name}": ${data.message || 'falha no upload'}`);
            }
            uploadedUrls.push(data.imageUrl);
        }

        return [...this.existingUrls, ...uploadedUrls];
    }
}

window.GalleryManager = GalleryManager;
