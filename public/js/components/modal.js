// ============================================
// COMPONENTE DO MODAL
// ============================================
import ImageCarousel from './imageCarousel.js';

const Modal = {
    currentModalProduct: null,
    currentCarousel: null,

    initialize() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        const modalOverlay = document.getElementById("modalOverlay");
        const closeModal = document.getElementById("closeModal");
        const addToCartModal = document.getElementById("addToCartModal");

        if (modalOverlay) {
            modalOverlay.addEventListener("click", () => this.closeProductModal());
        }
        if (closeModal) {
            closeModal.addEventListener("click", () => this.closeProductModal());
        }
        if (addToCartModal) {
            addToCartModal.addEventListener("click", (e) => this.addToCartFromModal(e));
        }
    },

    openProductModal(product) {
        this.currentModalProduct = product;

        const modalProductName = document.getElementById("modalProductName");
        const modalProductDescription = document.getElementById("modalProductDescription");
        const modalProductIngredients = document.getElementById("modalProductIngredients");
        const modalProductPrice = document.getElementById("modalProductPrice");
        const productModal = document.getElementById("productModal");

        // Preencher dados do modal
        if (modalProductName) modalProductName.textContent = product.name;

        if (modalProductDescription) {
            const description = product.description || "Delicioso produto artesanal da Padaria Jardim.";
            modalProductDescription.innerHTML = description.replace(/\n/g, '<br>');
        }
        if (modalProductIngredients) {
            const ingredients = product.ingredients || "Ingredientes selecionados com cuidado e qualidade.";
            modalProductIngredients.innerHTML = ingredients.replace(/\n/g, '<br>');
        }
        if (modalProductPrice) modalProductPrice.textContent = `R$ ${product.price.toFixed(2).replace('.', ',')}`;

        // Inicializar carrossel de imagens
        // Suporte a múltiplas imagens via image_urls ou fallback para imagem única
        let imageUrls = [];
        if (product.image_urls && product.image_urls.length > 0) {
            imageUrls = product.image_urls;
        } else if (product.image || product.imagem) {
            // Compatibilidade: campo legado pode conter múltiplas URLs separadas por '|'
            const raw = product.image || product.imagem || '';
            imageUrls = raw.split('|').map(u => u.trim()).filter(Boolean);
        }

        this.currentCarousel = new ImageCarousel('productImageCarousel', imageUrls);
        this.currentCarousel.init();

        if (productModal) {
            productModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },

    closeProductModal() {
        const productModal = document.getElementById("productModal");
        if (productModal) {
            productModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.currentModalProduct = null;
            if (this.currentCarousel) {
                this.currentCarousel.reset();
                this.currentCarousel = null;
            }
        }
    },

    addToCartFromModal(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!this.currentModalProduct) return;

        // Verifica se o menu exibido é o do dia atual
        const hojeIndex = window.getTodayIndex ? window.getTodayIndex() : -1;
        const currentMenuDayIndex = (window.MenuPage && window.MenuPage.menuInstance)
            ? window.MenuPage.menuInstance.currentDayIndex
            : -1;

        const isMostrandoHoje = currentMenuDayIndex === hojeIndex && hojeIndex !== -1;

        if (!isMostrandoHoje) {
            const message = `Só é possível adicionar produtos ao carrinho no dia da fornada.`;
            if (window.showNotification) {
                window.showNotification(message, 3000, 'error');
            } else {
                alert(message);
            }
            return;
        }

        // Adiciona ao carrinho
        if (window.Cart && window.Cart.addToCart) {
            window.Cart.addToCart(this.currentModalProduct);
        } else {
            console.error('Cart não está disponível');
            alert('Erro ao adicionar ao carrinho. Tente novamente.');
        }

        this.closeProductModal();
    }
};

// Exporta para uso em outros módulos
export { Modal };
export default Modal;
