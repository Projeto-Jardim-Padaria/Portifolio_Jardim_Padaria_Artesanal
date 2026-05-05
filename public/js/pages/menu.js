import Cart from '../components/cart.js';

// ============================================
// PÁGINA MENU
// ============================================
const MenuPage = {
    initialize() {
        this.menuInstance = new MenuInstance();
        this.menuInstance.initialize();
        window.MenuPage = this;
    },

    previousDay() {
        if (this.menuInstance) {
            this.menuInstance.previousDay();
        }
    },

    nextDay() {
        if (this.menuInstance) {
            this.menuInstance.nextDay();
        }
    }
};

// Classe para gerenciar o estado do menu
class MenuInstance {
    constructor() {
        this.dias = ["quarta", "quinta", "sexta", "sabado"];
        this.nomesDias = ["Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        // Usa getTodayIndex do main.js
        this.currentDayIndex = window.getTodayIndex ? window.getTodayIndex() : this.getTodayIndexFallback();
        this.allProducts = [];
    }

    initialize() {
        this.renderCardapio(this.currentDayIndex);
        this.setupEventListeners();
    }

    // Fallback caso getTodayIndex não exista
    getTodayIndexFallback() {
        const hoje = new Date();
        const diaSemana = hoje.getDay();
        const diaParaIndice = {
            3: 0, // quarta -> índice 0
            4: 1, // quinta -> índice 1
            5: 2, // sexta -> índice 2
            6: 3  // sábado -> índice 3
        };
        return diaParaIndice[diaSemana] !== undefined ? diaParaIndice[diaSemana] : -1;
    }

    async renderCardapio(dayIndex) {
        // Sempre busca produtos frescos do Supabase para garantir que mudanças apareçam instantaneamente
        this.allProducts = await this.getProductsFromSupabase();
        
        const containerCardapio = document.getElementById("container-cardapio");
        const semFornadas = document.getElementById("sem-fornadas");
        const tituloDia = document.getElementById("titulo-dia");
        const diaAtual = document.getElementById("dia-atual");

        if (!containerCardapio || !semFornadas || !tituloDia || !diaAtual) return;

        // Limpar container
        containerCardapio.innerHTML = '';
        semFornadas.style.display = 'none';

        // Verificar se está mostrando o cardápio do dia atual
        const hojeIndex = window.getTodayIndex ? window.getTodayIndex() : this.getTodayIndexFallback();
        const isMostrandoHoje = dayIndex === hojeIndex && hojeIndex !== -1;

        if (dayIndex >= 0 && dayIndex < this.dias.length) {
            // Se não for o dia atual, mas o dia atual for um dia de fornada, avisar que não pode comprar
            const avisoNaoPodeComprar = !isMostrandoHoje && hojeIndex !== -1;
            const dia = this.dias[dayIndex];
            const produtosDoDia = await this.getProductsForDay(dia);


            // Agrupar produtos por categoria
            const produtosPorCategoria = {};
            produtosDoDia.forEach(produto => {
                const categoria = produto.category || 'Outros';
                if (!produtosPorCategoria[categoria]) {
                    produtosPorCategoria[categoria] = [];
                }
                produtosPorCategoria[categoria].push(produto);
            });

            // Atualizar títulos
            tituloDia.textContent = `Cardápio de ${this.nomesDias[dayIndex]}`;
            diaAtual.textContent = this.nomesDias[dayIndex];

            // Se não houver produtos, mostrar mensagem
            if (produtosDoDia.length === 0) {
                containerCardapio.innerHTML = `
                    <div class="sem-produtos-hoje">
                        <p>Nenhum produto disponível para ${this.nomesDias[dayIndex]}.</p>
                        <p>Confira nossos produtos de outros dias!</p>
                    </div>
                `;
                return;
            }

            // Adicionar aviso se não for o dia atual
            if (!isMostrandoHoje && hojeIndex !== -1) {
                const avisoDiv = document.createElement('div');
                avisoDiv.className = 'aviso-dia-diferente';
                avisoDiv.innerHTML = `<p>Você está visualizando o menu de <strong>${this.nomesDias[dayIndex]}</strong>. Só é possível adicionar produtos ao carrinho no dia da fornada.</p>`;
                containerCardapio.appendChild(avisoDiv);
            }

            // Renderizar categorias e produtos
            for (const [categoria, produtos] of Object.entries(produtosPorCategoria)) {
                const categoriaDiv = document.createElement('div');
                categoriaDiv.className = 'categoria-produtos';

                const tituloCategoria = document.createElement('h4');
                tituloCategoria.textContent = categoria;
                categoriaDiv.appendChild(tituloCategoria);

                const listaProdutos = document.createElement('div');
                listaProdutos.className = 'lista-produtos';

                produtos.forEach(produto => {
                    const produtoDiv = document.createElement('div');
                    produtoDiv.className = 'produto-item';
                    produtoDiv.setAttribute('data-product-id', produto.id);

                    produtoDiv.innerHTML = `
                        <div class="produto-imagem-container">
                            <img src="${produto.image || 'img/logos/Logo.png'}" alt="${produto.name}" class="produto-img-card">
                        </div>
                        <div class="produto-info">
                            <div class="produto-nome">${produto.name}</div>
                            <div class="produto-preco">R$ ${produto.price.toFixed(2).replace('.', ',')}</div>
                        </div>
                        <button class="btn-adicionar-rapido" data-product-id="${produto.id}">+</button>
                    `;

                    // Evento para abrir modal ao clicar no produto
                    produtoDiv.addEventListener('click', (e) => {
                        if (!e.target.classList.contains('btn-adicionar-rapido')) {
                            this.openProductModal(produto);
                        }
                    });

                    // Evento para adicionar rapidamente (só funciona se for o dia atual)
                    const btnRapido = produtoDiv.querySelector('.btn-adicionar-rapido');
                    btnRapido.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        const hojeIndex = window.getTodayIndex ? window.getTodayIndex() : this.getTodayIndexFallback();
                        const isAtualmenteMostrandoHoje = this.currentDayIndex === hojeIndex && hojeIndex !== -1;

                        if (isAtualmenteMostrandoHoje) {
                            console.log(`🛒 Adicionando ${produto.name} ao carrinho`);
                            Cart.addToCart(produto);
                        } else {
                            const message = `Só é possível adicionar produtos ao carrinho no dia da fornada.`;
                            window.showNotification(message, 3000, 'error');
                        }
                    });

                    listaProdutos.appendChild(produtoDiv);
                });

                categoriaDiv.appendChild(listaProdutos);
                containerCardapio.appendChild(categoriaDiv);
            }
        } else {
            // Mostrar "sem fornadas"
            tituloDia.textContent = 'Sem Fornadas Hoje';
            diaAtual.textContent = 'Hoje';
            semFornadas.innerHTML = `
                <h3>Sem fornadas hoje</h3>
                <p>Clique na setinha para verificar o menu dos próximos dias</p>
            `;
            semFornadas.style.display = 'block';
            console.log('📅 Hoje não tem fornadas (índice inválido)');
        }

        // Atualizar o índice atual
        this.currentDayIndex = dayIndex;
    }

     openProductModal(product) {
        if (window.Modal && typeof window.Modal.openProductModal === 'function') {
            window.Modal.openProductModal(product);
        } else {
            const modal = document.getElementById('productModal');
            const modalProductName = document.getElementById('modalProductName');
            const modalProductDescription = document.getElementById('modalProductDescription');
            const modalProductIngredients = document.getElementById('modalProductIngredients');
            const modalProductPrice = document.getElementById('modalProductPrice');
            const addToCartModal = document.getElementById('addToCartModal');

            if (modal && modalProductName && modalProductDescription && 
                modalProductIngredients && modalProductPrice && addToCartModal) {
                
                modalProductName.textContent = product.name;
                modalProductDescription.innerHTML = (product.description || 'Sem descrição disponível.').replace(/\n/g, '<br>');
                modalProductIngredients.innerHTML = (product.ingredients || 'Ingredientes não especificados.').replace(/\n/g, '<br>');
                modalProductPrice.textContent = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
                
                addToCartModal.onclick = () => {
                    const hojeIndex = window.getTodayIndex ? window.getTodayIndex() : this.getTodayIndexFallback();
                    const isMostrandoHoje = this.currentDayIndex === hojeIndex && hojeIndex !== -1;

                    if (!isMostrandoHoje) {
                        window.showNotification('Só é possível adicionar produtos ao carrinho no dia da fornada.', 3000, 'error');
                        return;
                    }
                    
                    Cart.addToCart(product);
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                };
                
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }
    }

    setupEventListeners() {
        const prevDayBtn = document.getElementById("prevDay");
        const nextDayBtn = document.getElementById("nextDay");

        if (prevDayBtn) {
            prevDayBtn.addEventListener("click", () => this.previousDay());
        }
        if (nextDayBtn) {
            nextDayBtn.addEventListener("click", () => this.nextDay());
        }
    }

    async getProductsFromSupabase() { 
        try {
            // Usa a nova implementação via API
            const result = await window.supabase
                .from('products')
                .select('*');
            
            if (result.error) {
                console.error('❌ Erro ao buscar produtos do Supabase:', result.error);
                window.showNotification('Erro ao carregar o cardápio. Tente novamente.', 3000, 'error');
                return [];
            }
            
            // Ordena localmente
            const sortedData = result.data.sort((a, b) => {
                if (a.category < b.category) return -1;
                if (a.category > b.category) return 1;
                if (a.name < b.name) return -1;
                if (a.name > b.name) return 1;
                return 0;
            });

            const normalizedProducts = sortedData.map(item => ({
                id: item.id,
                name: item.name,
                price: parseFloat(item.price) || 0,
                description: item.description,
                ingredients: item.ingredients,
                category: item.category,
                available_days: item.available_days || [],
                day: item.available_days || [],
                image: item.image_url || item.imagem || 'img/logos/Logo.png'
            }));

            // Armazena globalmente para acesso por outros componentes (como o carrinho ao repetir pedido)
            window.allProducts = normalizedProducts;

            return normalizedProducts;
            
        } catch (error) {
            console.error('❌ Erro na requisição de produtos:', error);
            window.showNotification('Erro ao carregar o cardápio. Tente novamente.', 3000, 'error');
            return [];
        }
    }

    async getProductsForDay(day) {
        if (!this.allProducts || this.allProducts.length === 0) {
            this.allProducts = await this.getProductsFromSupabase();
        }
        
        console.log(`🔍 Filtrando produtos para o dia: ${day}`);
        
        const produtosFiltrados = this.allProducts.filter(produto => {
            // Verifica se o produto está marcado como disponível hoje pelo dono
            const isAvailableToday = produto.is_available !== false;
            
            const temDia = produto.available_days && (
                produto.available_days.includes(day) || 
                produto.available_days.includes(day.toLowerCase())
            );
            
            return temDia && isAvailableToday;
        });

        return produtosFiltrados;
    }

    previousDay() {
        let newIndex = this.currentDayIndex - 1;
        if (newIndex < 0) newIndex = this.dias.length - 1;
        this.renderCardapio(newIndex);
    }

    nextDay() {
        let newIndex = this.currentDayIndex + 1;
        if (newIndex >= this.dias.length) newIndex = 0;
        this.renderCardapio(newIndex);
    }
}

export default MenuPage;
