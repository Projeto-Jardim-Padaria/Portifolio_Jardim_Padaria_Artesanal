/**
 * ImageCarousel — exibe múltiplas imagens de um produto com navegação por setas.
 * Usado no modal de detalhes do produto no cardápio.
 */
class ImageCarousel {
    /**
     * @param {string} containerId - ID do elemento DOM do carrossel
     * @param {string[]} imageUrls - Array de URLs de imagens
     */
    constructor(containerId, imageUrls) {
        this.containerId = containerId;
        this.imageUrls = (imageUrls && imageUrls.length > 0)
            ? imageUrls
            : []; // vazio = exibe imagem padrão
        this.currentIndex = 0;
    }

    /** Inicializa o carrossel renderizando no container */
    init() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const urls = this.imageUrls;
        const hasMultiple = urls.length > 1;
        const src = urls.length > 0 ? urls[0] : 'img/logos/Logo.png';

        container.innerHTML = `
            <div class="img-carousel">
                ${hasMultiple ? `
                <button type="button" class="img-carousel-btn img-carousel-prev" id="${this.containerId}_prev" aria-label="Foto anterior">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>` : ''}

                <div class="img-carousel-track">
                    <img id="${this.containerId}_img" src="${src}" alt="Foto do produto" class="modal-product-img img-carousel-image">
                </div>

                ${hasMultiple ? `
                <button type="button" class="img-carousel-btn img-carousel-next" id="${this.containerId}_next" aria-label="Próxima foto">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>` : ''}
            </div>
            ${hasMultiple ? `
            <div class="img-carousel-indicator" id="${this.containerId}_indicator">
                1 / ${urls.length}
            </div>` : ''}
        `;

        if (hasMultiple) {
            document.getElementById(`${this.containerId}_prev`).addEventListener('click', () => this.prev());
            document.getElementById(`${this.containerId}_next`).addEventListener('click', () => this.next());
            this._updateState();
        }
    }

    /** Avança para a próxima imagem */
    next() {
        if (this.currentIndex < this.imageUrls.length - 1) {
            this.currentIndex++;
            this._updateState();
        }
    }

    /** Volta para a imagem anterior */
    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this._updateState();
        }
    }

    /** Retorna o índice atual */
    getCurrentIndex() {
        return this.currentIndex;
    }

    /** Reseta para a primeira imagem */
    reset() {
        this.currentIndex = 0;
    }

    /** Atualiza a imagem exibida, botões e indicador */
    _updateState() {
        const img = document.getElementById(`${this.containerId}_img`);
        const prevBtn = document.getElementById(`${this.containerId}_prev`);
        const nextBtn = document.getElementById(`${this.containerId}_next`);
        const indicator = document.getElementById(`${this.containerId}_indicator`);

        if (img) img.src = this.imageUrls[this.currentIndex];
        if (prevBtn) {
            prevBtn.disabled = this.currentIndex === 0;
            prevBtn.classList.toggle('img-carousel-btn-disabled', this.currentIndex === 0);
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentIndex === this.imageUrls.length - 1;
            nextBtn.classList.toggle('img-carousel-btn-disabled', this.currentIndex === this.imageUrls.length - 1);
        }
        if (indicator) {
            indicator.textContent = `${this.currentIndex + 1} / ${this.imageUrls.length}`;
        }
    }
}

export { ImageCarousel };
export default ImageCarousel;
