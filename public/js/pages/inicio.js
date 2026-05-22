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

        // O conteúdo é injetado dentro do info-content do card
        const content = document.getElementById('cardFeirinhasContent');

        if (!content) {
            console.log('Container #cardFeirinhasContent não encontrado');
            return;
        }

        try {
            const res = await fetch("/.netlify/functions/get-avisos");
            const data = await res.json();

            if (!data.avisos || data.avisos.length === 0) {
                // Mantém o estado padrão (já está no HTML)
                return;
            }

            // Filtra avisos: só exibe se a data do evento for hoje ou futura.
            // Comparação apenas por data (sem hora) — some no dia seguinte ao evento.
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const parseDataAviso = (str) => {
                if (!str) return null;
                if (str.includes('/')) {
                    const [d, m, a] = str.split('/');
                    const dt = new Date(Number(a), Number(m) - 1, Number(d));
                    dt.setHours(0, 0, 0, 0);
                    return dt;
                }
                // Formato "YYYY-MM-DD" — sufixo T12:00 evita off-by-one de fuso horário
                const dt = new Date(str + 'T12:00:00');
                dt.setHours(0, 0, 0, 0);
                return dt;
            };

            const avisosFuturos = data.avisos.filter(aviso => {
                const dt = parseDataAviso(aviso.data);
                return dt && dt >= hoje;
            });

            if (avisosFuturos.length === 0) {
                // Nenhum evento futuro — mantém mensagem padrão
                console.log('Nenhuma feirinha futura — exibindo mensagem padrão');
                return;
            }

            // Ordena por data (mais próximas primeiro)
            avisosFuturos.sort((a, b) => {
                const da = parseDataAviso(a.data);
                const db = parseDataAviso(b.data);
                return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
            });

            // Formata data para exibição amigável
            const formatarData = (str) => {
                if (!str) return str;
                const meses = ['janeiro','fevereiro','março','abril','maio','junho',
                               'julho','agosto','setembro','outubro','novembro','dezembro'];
                let d, m, a;
                if (str.includes('/')) {
                    [d, m, a] = str.split('/');
                } else {
                    const pts = str.split('-');
                    a = pts[0]; m = pts[1]; d = pts[2];
                }
                return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${a}`;
            };

            const eHoje = (str) => {
                const dt = parseDataAviso(str);
                return dt && dt.getTime() === hoje.getTime();
            };

            const googleMapsUrl = (local) => {
                if (!local) return '';
                return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}`;
            };

            // Monta os avisos dentro do info-content
            const avisosHtml = avisosFuturos.map(aviso => {
                const isHoje = eHoje(aviso.data);
                const mapsUrl = googleMapsUrl(aviso.local);
                const dataFormatada = formatarData(aviso.data);

                const badgeHtml = isHoje
                    ? `<span class="feirinha-badge-hoje">🔥 Hoje!</span> `
                    : '';

                const mapsAttrs = mapsUrl
                    ? `style="cursor:pointer" onclick="window.open('${mapsUrl}','_blank','noopener')" title="Ver no Google Maps"`
                    : '';

                return `
                    <div class="feirinha-aviso-item ${isHoje ? 'feirinha-aviso-hoje' : ''}" ${mapsAttrs}>
                        <p class="feirinha-aviso-titulo">${badgeHtml}<strong>${aviso.titulo}</strong></p>
                        <p class="feirinha-info"><strong>📅</strong> ${dataFormatada}</p>
                        ${aviso.horario ? `<p class="feirinha-info"><strong>🕐</strong> ${aviso.horario}</p>` : ''}
                        ${aviso.local ? `<p class="feirinha-info"><strong>📍</strong> ${aviso.local}${mapsUrl ? ' <span class="feirinha-maps-hint">↗ mapa</span>' : ''}</p>` : ''}
                    </div>
                `;
            }).join('<hr class="feirinha-divider">');

            content.innerHTML = `
                <h4>Avisos de Feirinha 🎪</h4>
                ${avisosHtml}
            `;

            console.log(`✅ ${avisosFuturos.length} aviso(s) de feirinha carregado(s)`);

        } catch (err) {
            console.error("Erro ao carregar feirinhas:", err);
            // Em caso de erro mantém o conteúdo padrão
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