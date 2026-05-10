// js/pages/inicio.js

const InicioPage = {
    async initialize() {
        console.log('Inicializando página Início');
        await this.setupCarousel();
        await this.setupTodayProducts();
        await this.setupFeirinhas(); //NOVO
        this.setupEventListeners();
    },

    async setupCarousel() {
        console.log('Configurando carrossel...');
        
        // Pequeno delay para garantir que o HTML injetado pelo pages-loader já está no DOM
        setTimeout(() => {
            if (window.Carousel && window.Carousel.initialize) {
                console.log('Inicializando carrossel de produtos');
                window.Carousel.initialize('.products-carousel', {
                    delay: 3000,
                    autoPlay: true,
                    force: true // Força a reinicialização ao voltar para a página
                });
            } else {
                console.error('Componente Carousel não encontrado para inicializar.');
            }
        }, 200);
    },

    async setupTodayProducts() {
        console.log('Configurando produtos do dia na página inicial');
        
        const todayProductsContainer = document.getElementById('todayProducts');
        if (!todayProductsContainer) {
            console.log('Container #todayProducts não encontrado');
            return;
        }
        
        try {
            // Espera o Supabase estar disponível
            if (!window.supabase) {
                console.log('Aguardando Supabase...');
                await new Promise(resolve => {
                    const checkSupabase = () => {
                        if (window.supabase) {
                            resolve();
                        } else {
                            setTimeout(checkSupabase, 100);
                        }
                    };
                    checkSupabase();
                });
            }
            
            const today = window.getCurrentDayName ? window.getCurrentDayName() : 'quarta';
            console.log(`Buscando produtos para ${today}...`);
            
            const products = await this.getProductsForDay(today);
            
            if (products.length === 0) {
                todayProductsContainer.innerHTML = `
                    <div class="no-products">
                        <p>Nenhum produto disponível hoje. Volte amanhã!</p>
                    </div>
                `;
                return;
            }
            
            // Limita a 4 produtos para exibição
            const displayProducts = products.slice(0, 4);
            
            let html = `
                <div class="today-products-grid">
                    ${displayProducts.map(product => `
                        <div class="product-card-small">
                            <div class="product-icon">${window.getProductIcon ? window.getProductIcon(product.category) : '🥖'}</div>
                            <h4>${product.name}</h4>
                            <p class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</p>
                        </div>
                    `).join('')}
                </div>
                <p class="more-products-text">
                    <a href="#" data-page="menu" style="color: #1C3D2D; text-decoration: underline;">
                        Ver todos os ${products.length} produtos disponíveis hoje →
                    </a>
                </p>
            `;
            
            todayProductsContainer.innerHTML = html;
            
            console.log(` ${displayProducts.length} produtos exibidos na página inicial`);
            
        } catch (error) {
            console.error(' Erro ao buscar produtos do dia:', error);
            todayProductsContainer.innerHTML = `
                <div class="error-message">
                    <p>Não foi possível carregar os produtos. Tente novamente.</p>
                </div>
            `;
        }
    },

    async getProductsForDay(day) {
        console.log(`🔍 Buscando produtos para o dia: ${day}`);
        
        try {
            if (!window.supabase) {
                throw new Error('Supabase não disponível');
            }
            
            // Usa a API via proxy
            const apiClient = window.apiClient || (await import('../api-client.js')).default;
            const response = await apiClient.getProductsByDay(day);
            
            if (response.success) {
                return response.products || [];
            }
            
	            // Fallback: busca direto do Supabase
	            console.log('Tentando busca direta do Supabase...');
	            const { data, error } = await window.supabase
	                .from('products')
	                .select('*')
	                .contains('available_days', [day])
	                .neq('is_available', false);
            
            if (error) {
                console.error('Erro do Supabase:', error);
                throw error;
            }
            
            return data || [];
            
        } catch (error) {
            console.error(`Erro ao buscar produtos para ${day}:`, error);
            return [];
        }
    },

    async setupFeirinhas() {
        console.log('Carregando avisos de feirinhas...');

        const container = document.getElementById('cardFeirinhas');

        if (!container) {
            console.log('Container #cardFeirinhas não encontrado');
            return;
        }

        try {
            const res = await fetch("/.netlify/functions/get-avisos");
            const data = await res.json();

            if (!data.avisos || data.avisos.length === 0) {
                container.innerHTML = `
                    <h4>Avisos de Feirinha</h4>
                    <p style="color: #999; font-size: 0.9em;">Nenhuma feirinha cadastrada no momento.</p>
                `;
                return;
            }

            // Ordena os avisos por data (mais próximos primeiro)
            const avisos = data.avisos.sort((a, b) => new Date(a.data) - new Date(b.data));
            
            // Exibe todos os avisos
            let html = `<h4>Avisos de Feirinha</h4>`;
            
            avisos.forEach((aviso, index) => {
                const imagemHtml = aviso.imagem ? `<img src="${aviso.imagem}" style="width: 100%; margin-bottom: 10px; border-radius: 8px;">` : '';
                html += `
                    <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                        ${imagemHtml}
                        <h5 style="margin: 5px 0; color: #1C3D2D;">${aviso.titulo}</h5>
                        <p style="margin: 3px 0; font-size: 0.9em;"><strong>📅 Data:</strong> ${aviso.data}</p>
                        <p style="margin: 3px 0; font-size: 0.9em;"><strong>🕐 Horário:</strong> ${aviso.horario}</p>
                        <p style="margin: 3px 0; font-size: 0.9em;"><strong>📍 Local:</strong> ${aviso.local}</p>
                    </div>
                `;
            });
            
            // Remove a última borda
            html = html.replace(/border-bottom: 1px solid #eee;">(\s*)<\/div>\s*$/, '">$1</div>');
            
            container.innerHTML = html;
            console.log(`✅ ${avisos.length} aviso(s) de feirinha carregado(s)`);

        } catch (err) {
            console.error("Erro ao carregar feirinhas:", err);
            container.innerHTML = `
                <h4>Avisos de Feirinha</h4>
                <p style="color: #d9534f; font-size: 0.9em;">Erro ao carregar avisos. Tente novamente mais tarde.</p>
            `;
        }
    },
    setupEventListeners() {
        // Adiciona event listener para os botões que levam ao menu
        // Usamos delegação de evento para capturar cliques em qualquer elemento com data-page="menu"
        document.addEventListener('click', (e) => {
            const menuBtn = e.target.closest('[data-page="menu"]');
            if (menuBtn) {
                e.preventDefault();
                console.log('Navegando para o cardápio...');
                if (window.navigateToPage) {
                    window.navigateToPage('menu');
                }
            }
        });
        
        console.log('Event listeners da página Início configurados');
    }
};


window.apiClient = window.apiClient || {
    async getProductsByDay(day) {
        try {
            const response = await fetch(`/.netlify/functions/supabase-proxy/get-products?filter_column=available_days&filter_value=${JSON.stringify(day)}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao buscar produtos por dia:', error);
            return { success: false, products: [] };
        }
    }
};

export default InicioPage;