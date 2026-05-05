// Admin Panel JavaScript - Enhanced Version
class AdminPanel {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];
        this.allOrderItems = [];
        this.currentSort = { column: 'created_at', direction: 'desc' };
        this.currentPage = 1;
        this.pageSize = 25;
        this.totalPages = 1;
        this.currentPrintOrder = null;
        this.productCombinations = [];
        this.charts = {};
        this.selectedOrders = new Set();
        this.apiBase = window.location.origin + '/api';
        this.productAnalysis = [];
        
        // Cache para o PDF atual sendo visualizado
        this.currentPDF = {
            blob: null,
            url: null,
            filename: null
        };

        // Inicializa
        this.init();
        
        // Configura atualização automática (3 minutos)
        this.setupAutoRefresh(180000);
    }

    setupAutoRefresh(interval) {
        console.log(`🔄 Configurando atualização automática a cada ${interval/1000} segundos`);
        setInterval(async () => {
            console.log('🔄 Atualizando dados automaticamente...');
            await this.refreshDataSilently();
        }, interval);
    }

    async refreshDataSilently() {
        try {
            // Carrega pedidos sem mostrar o loading overlay para não atrapalhar o usuário
            await this.loadOrders();
            
            // Processa dados
            await this.processOrdersData();
            
            // Analisa produtos
            this.analyzeProducts();
            
            // Atualiza estatísticas
            this.updateStats();
            
            // Atualiza gráficos
            this.updateCharts();
            
            // Atualiza a visualização atual (lista de pedidos, etc)
            this.displayCurrentView();
            
            // Atualiza timestamp
            this.updateTimestamp();
            
            console.log('✅ Atualização automática concluída');
        } catch (error) {
            console.error('❌ Erro na atualização automática:', error);
        }
    }

    async init() {
        console.log('Inicializando AdminPanel Enhanced...');

        // Adiciona estilos do modal
        this.addModalStyles();

        // Configura abas
        this.setupTabs();

        // Configura listeners
        this.setupEventListeners();

        // Configura eventos globais dos modais
        this.setupGlobalModalEvents(); // Adicione esta linha

        // Carrega dados
        await this.loadAllData();

        // Atualiza timestamp
        this.updateTimestamp();

        console.log('✅ AdminPanel Enhanced inicializado');
    }

    analyzeProductCombinations() {
        const combinations = {};

        // Percorre todos os pedidos
        this.orders.forEach(order => {
            if (order.items && order.items.length > 1 && order.status !== 'cancelado') {
                const itemNames = order.items
                    .map(item => item.product_name || item.name || 'Produto')
                    .sort(); // Ordena para garantir combinação única

                // Gera todas as combinações de 2 produtos
                for (let i = 0; i < itemNames.length; i++) {
                    for (let j = i + 1; j < itemNames.length; j++) {
                        const combination = `${itemNames[i]} + ${itemNames[j]}`;
                        const combinationKey = `${itemNames[i]}|${itemNames[j]}`; // Chave única

                        if (!combinations[combinationKey]) {
                            combinations[combinationKey] = {
                                product1: itemNames[i],
                                product2: itemNames[j],
                                displayName: combination,
                                frequency: 0,
                                orders: [],
                                totalRevenue: 0,
                                avgOrderValue: 0
                            };
                        }

                        combinations[combinationKey].frequency++;
                        combinations[combinationKey].orders.push(order.order_id || order.id);

                        // Calcula receita desta combinação neste pedido
                        const orderItemsTotal = order.items.reduce((sum, item) => {
                            const quantity = item.quantity || 1;
                            const price = parseFloat(item.price || 0);
                            return sum + (parseFloat(item.total) || (quantity * price));
                        }, 0);

                        combinations[combinationKey].totalRevenue += orderItemsTotal;
                    }
                }
            }
        });

        // Converte para array e calcula valores médios
        this.productCombinations = Object.values(combinations)
            .map(comb => ({
                ...comb,
                avgOrderValue: comb.frequency > 0 ? comb.totalRevenue / comb.frequency : 0,
                orderCount: comb.orders.length
            }))
            .sort((a, b) => b.frequency - a.frequency) // Ordena por frequência
            .slice(0, 10); // Limita às 10 combinações mais frequentes

        console.log('📊 Análise de combinações concluída:', this.productCombinations.length, 'combinações');
    }


    setupGlobalModalEvents() {
        // Fechar modal com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('printOrderModal')?.style.display === 'flex') {
                    this.closePrintModal();
                }
                if (document.getElementById('orderModal')?.style.display === 'flex') {
                    this.closeModal();
                }
                if (document.getElementById('editStatusModal')?.style.display === 'flex') {
                    this.closeEditStatusModal();
                }
                if (document.getElementById('reportViewerModal')?.style.display === 'flex') {
                    this.closeReportViewer();
                }
            }
        });

        // Fechar menus de status rápido ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.quick-status-container')) {
                document.querySelectorAll('.quick-status-menu.active').forEach(menu => {
                    menu.classList.remove('active');
                });
            }

            if (e.target.classList.contains('admin-modal')) {
                const modalId = e.target.id;
                switch (modalId) {
                    case 'printOrderModal':
                        this.closePrintModal();
                        break;
                    case 'orderModal':
                        this.closeModal();
                        break;
                    case 'editStatusModal':
                        this.closeEditStatusModal();
                        break;
                    case 'reportViewerModal':
                        this.closeReportViewer();
                        break;
                }
            }
        });
    }
    setupTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();

                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                // Add active class to clicked tab
                tab.classList.add('active');

                // Show corresponding content
                const tabId = tab.dataset.tab;
                const content = document.getElementById(`tab-${tabId}`);
                if (content) {
                    content.classList.add('active');

                    // Carrega dados específicos da aba
                    this.loadTabData(tabId);
                }
            });
        });
    }

    loadTabData(tabId) {
        switch (tabId) {
            case 'orders':
                this.setupOrdersTab();
                break;


        }
    }

    async loadAllData() {
        try {
            this.showLoading(true);

            // Carrega pedidos
            await this.loadOrders();

            // Processa dados
            await this.processOrdersData();

            // Analisa produtos
            this.analyzeProducts();

            // Atualiza estatísticas
            this.updateStats();

            // Atualiza gráficos iniciais
            this.updateCharts();

            // Atualiza timestamp
            this.updateTimestamp();

           

        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async loadOrders() {
        try {
            // Tenta buscar da API local
            const response = await fetch(`${window.location.origin}/.netlify/functions/get-all-orders`);

            if (response.ok) {
                const result = await response.json();

                if (result.success && result.orders) {
                    this.orders = result.orders;
                    console.log(`✅ ${this.orders.length} pedidos carregados da API`);

                    // Se não houver pedidos na API, usa os de exemplo para preencher a tela
                    if (this.orders.length === 0) {
                        console.log('⚠️ API retornou 0 pedidos, usando dados de exemplo para demonstração');
                        this.orders = this.getSampleOrders();
                    }
                    return;
                }
            }

            // Se não conseguir da API, usa dados de exemplo
            this.orders = this.getSampleOrders();
            console.log(`⚠️ Usando dados de exemplo: ${this.orders.length} pedidos`);

        } catch (error) {
            console.error('❌ Erro ao carregar pedidos:', error);

            // Fallback para dados de exemplo
            this.orders = this.getSampleOrders();
            console.log(`⚠️ Usando dados de exemplo (fallback): ${this.orders.length} pedidos`);
        }
    }

    // Dados de exemplo para demonstração
    getSampleOrders() {
        const statuses = ['pendente', 'preparando', 'pronto', 'entregue', 'cancelado'];
        const paymentMethods = ['pix', 'cartao', 'dinheiro'];
        const deliveryOptions = ['entrega', 'retirada'];
        const clientNames = ['Maria Silva', 'João Santos', 'Ana Oliveira', 'Pedro Costa', 'Carla Rodrigues'];
        const products = [
            { name: 'Pão Francês', price: 0.50 },
            { name: 'Pão de Queijo', price: 2.50 },
            { name: 'Croissant', price: 4.00 },
            { name: 'Bolo de Cenoura', price: 8.00 },
            { name: 'Torta de Frango', price: 6.50 },
            { name: 'Café Expresso', price: 3.00 },
            { name: 'Suco Natural', price: 5.00 },
            { name: 'Brigadeiro', price: 1.50 }
        ];

        const orders = [];
        const now = new Date();

        for (let i = 1; i <= 50; i++) {
            const orderDate = new Date();
            orderDate.setDate(now.getDate() - Math.floor(Math.random() * 30));
            orderDate.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));

            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const itemCount = 1 + Math.floor(Math.random() * 4);
            let total = 0;
            const items = [];

            for (let j = 0; j < itemCount; j++) {
                const product = products[Math.floor(Math.random() * products.length)];
                const quantity = 1 + Math.floor(Math.random() * 3);
                const itemTotal = product.price * quantity;
                total += itemTotal;

                items.push({
                    product_name: product.name,
                    quantity: quantity,
                    price: product.price,
                    total: itemTotal
                });
            }

            // Adiciona taxa de entrega se for entrega
            const deliveryOption = deliveryOptions[Math.floor(Math.random() * deliveryOptions.length)];
            if (deliveryOption === 'entrega') {
                total += 5.00; // Taxa de entrega
            }

            orders.push({
                id: `ORD${String(i).padStart(4, '0')}`,
                order_id: `ORD${String(i).padStart(4, '0')}`,
                client_name: clientNames[Math.floor(Math.random() * clientNames.length)],
                client_phone: `1198765${String(1000 + i).substring(1)}`,
                total: total.toFixed(2),
                total_amount: total.toFixed(2),
                status: status,
                payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                delivery_option: deliveryOption,
                created_at: orderDate.toISOString(),
                observation: i % 3 === 0 ? 'Sem cebola' : i % 4 === 0 ? 'Entrega rápida' : '',
                items: items,
                address: deliveryOption === 'entrega' ? `Rua Exemplo, ${i}00, Centro` : ''
            });
        }

        return orders;
    }

    renderProductCombinations() {
        const container = document.getElementById('combinationsContainer');
        if (!container) return;

        if (this.productCombinations.length === 0) {
            container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--muted-foreground);">
                <i class="fas fa-chart-pie fa-2x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>Nenhuma combinação frequente encontrada.</p>
                <p style="font-size: 0.9rem;">Os clientes geralmente compram apenas um item por pedido.</p>
            </div>
        `;
            return;
        }

        // Encontra a combinação mais frequente para referência
        const maxFrequency = Math.max(...this.productCombinations.map(c => c.frequency));

        container.innerHTML = this.productCombinations.map((combination, index) => {
            // Calcula porcentagem em relação à combinação mais frequente
            const percentage = maxFrequency > 0 ? (combination.frequency / maxFrequency) * 100 : 0;

            // Cor baseada na posição (ranking)
            let badgeColor = '#3498db'; // Azul padrão
            let badgeText = 'Frequente';

            if (index === 0) {
                badgeColor = '#e74c3c'; // Vermelho para o primeiro
                badgeText = 'Top 1';
            } else if (index === 1) {
                badgeColor = '#f39c12'; // Laranja para o segundo
                badgeText = 'Top 2';
            } else if (index === 2) {
                badgeColor = '#2ecc71'; // Verde para o terceiro
                badgeText = 'Top 3';
            } else if (percentage > 50) {
                badgeColor = '#9b59b6'; // Roxo para altas frequências
                badgeText = 'Popular';
            }

            return `
            <div class="combination-item" style="
                background: white;
                border-radius: 10px;
                border: 1px solid var(--border);
                padding: 1.25rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                transition: transform 0.2s ease;
                position: relative;
                overflow: hidden;
            ">
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: ${percentage}%;
                    height: 4px;
                    background: ${badgeColor};
                    transition: width 0.3s ease;
                "></div>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="
                                background: ${badgeColor};
                                color: white;
                                padding: 0.25rem 0.75rem;
                                border-radius: 1rem;
                                font-size: 0.75rem;
                                font-weight: 600;
                            ">${badgeText}</span>
                            <span style="font-size: 0.85rem; color: var(--muted-foreground);">
                                #${index + 1}
                            </span>
                        </div>
                        <h4 style="margin: 0; color: var(--primary); font-size: 1rem;">
                            ${combination.displayName}
                        </h4>
                    </div>
                    <div style="
                        background: ${badgeColor}15;
                        color: ${badgeColor};
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 700;
                        font-size: 1.1rem;
                    ">
                        ${combination.frequency}
                    </div>
                </div>
                
                <div style="
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.75rem;
                    margin-top: 1rem;
                    font-size: 0.85rem;
                ">
                    <div style="
                        background: var(--accent-light);
                        padding: 0.75rem;
                        border-radius: 6px;
                        border: 1px solid var(--accent);
                    ">
                        <div style="font-weight: 600; color: var(--muted-foreground); margin-bottom: 0.25rem;">
                            Frequência
                        </div>
                        <div style="font-weight: 700; color: var(--primary);">
                            ${combination.frequency} pedido${combination.frequency !== 1 ? 's' : ''}
                        </div>
                    </div>
                    
                    <div style="
                        background: var(--accent-light);
                        padding: 0.75rem;
                        border-radius: 6px;
                        border: 1px solid var(--accent);
                    ">
                        <div style="font-weight: 600; color: var(--muted-foreground); margin-bottom: 0.25rem;">
                            Receita Total
                        </div>
                        <div style="font-weight: 700; color: var(--primary);">
                            R$ ${combination.totalRevenue.toFixed(2)}
                        </div>
                    </div>
                    
                    <div style="
                        background: var(--accent-light);
                        padding: 0.75rem;
                        border-radius: 6px;
                        border: 1px solid var(--accent);
                        grid-column: 1 / -1;
                    ">
                        <div style="font-weight: 600; color: var(--muted-foreground); margin-bottom: 0.25rem;">
                            Ticket Médio
                        </div>
                        <div style="font-weight: 700; color: var(--primary);">
                            R$ ${combination.avgOrderValue.toFixed(2)} por pedido
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 1rem; font-size: 0.8rem; color: var(--muted-foreground);">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-shopping-cart"></i>
                        <span>Comprados juntos em ${combination.orderCount} pedido${combination.orderCount !== 1 ? 's' : ''} diferentes</span>
                    </div>
                </div>
                
                ${combination.orders.length > 0 ? `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                    <div style="font-size: 0.8rem; color: var(--muted-foreground); margin-bottom: 0.5rem;">
                        <i class="fas fa-hashtag"></i> Pedidos mais recentes:
                    </div>
                    <div style="
                        display: flex;
                        gap: 0.5rem;
                        flex-wrap: wrap;
                    ">
                        ${combination.orders.slice(0, 3).map(orderId => `
                            <span style="
                                background: var(--accent-light);
                                padding: 0.25rem 0.5rem;
                                border-radius: 4px;
                                font-size: 0.75rem;
                                border: 1px solid var(--accent);
                            ">${orderId}</span>
                        `).join('')}
                        ${combination.orders.length > 3 ? `
                            <span style="
                                background: var(--accent-light);
                                padding: 0.25rem 0.5rem;
                                border-radius: 4px;
                                font-size: 0.75rem;
                                border: 1px solid var(--accent);
                                color: var(--muted-foreground);
                            ">+${combination.orders.length - 3} mais</span>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        }).join('');

        this.generateCombinationsInsights();
        this.updateCombinationsChart();
    }

    async processOrdersData() {
        try {
            // Converte datas e adiciona propriedades úteis
            this.orders.forEach(order => {
                // Garante que temos uma data válida
                if (!order.created_at) {
                    order.created_at = new Date().toISOString();
                }

                order.dateObj = new Date(order.created_at);
                order.total_numeric = parseFloat(order.total || order.total_amount || 0) || 0;
                order.status = order.status || 'pendente';
                order.dayOfWeek = order.dateObj.getDay();
                order.hourOfDay = order.dateObj.getHours();
                order.monthYear = `${order.dateObj.getFullYear()}-${(order.dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
            });

            // Ordena por data mais recente primeiro
            this.orders.sort((a, b) => b.dateObj - a.dateObj);

            // Inicializa filteredOrders com todos os pedidos
            this.filteredOrders = [...this.orders];

            this.analyzeProducts(); // Já chama analyzeProductCombinations internamente

            console.log(`📊 ${this.orders.length} pedidos processados`);

        } catch (error) {
            console.error('❌ Erro ao processar dados dos pedidos:', error);
            throw error;
        }
    }

    analyzeProducts() {
        const productSales = {};

        this.orders.forEach(order => {
            if (!order.items) return;
            // Ignora pedidos cancelados na análise de produtos
            if ((order.status || '').toLowerCase() === 'cancelado') return;

            order.items.forEach(item => {
                const key = item.product_name;
                if (!productSales[key]) {
                    productSales[key] = {
                        name: key,
                        quantity: 0,
                        revenue: 0,
                        orders: new Set()
                    };
                }

                const quantity = parseInt(item.quantity) || 1;
                const price = parseFloat(item.price || 0);
                // Usa o total do item se disponível, senão calcula
                const total = parseFloat(item.total) || (quantity * price);

                productSales[key].quantity += quantity;
                productSales[key].revenue += total;
                productSales[key].orders.add(order.id);
            });
        });

        // Converte para array e ordena
        this.productAnalysis = Object.values(productSales)
            .map(p => ({
                ...p,
                orderCount: p.orders.size,
                avgOrderValue: p.orderCount > 0 ? p.revenue / p.orderCount : 0
            }))
            .sort((a, b) => b.quantity - a.quantity); // Ordena por quantidade vendida (mais populares primeiro)

        console.log('📊 Análise de produtos concluída:', this.productAnalysis.length, 'produtos');

        // ADICIONE ESTA LINHA:
        this.analyzeProductCombinations(); // Analisa combinações após produtos
    }

    updateStats() {
        const stats = this.calculateLocalStats();
        this.displayStats(stats);
    }

    calculateLocalStats() {
        const stats = {
            total: 0,
            pendente: 0,
            preparando: 0,
            pronto: 0,
            entregue: 0,
            cancelado: 0,
            total_value: 0,
            avg_ticket: 0
        };

               this.orders.forEach(order => {
            stats.total++;

            const status = (order.status || 'pendente').toLowerCase();
            if (stats[status] !== undefined) {
                stats[status]++;
            }

            const value = parseFloat(order.total || order.total_amount || 0);
            if (!isNaN(value) && status !== 'cancelado') {
                stats.total_value += value;
            }
        });

        const nonCancelledOrders = stats.total - stats.cancelado;
        stats.avg_ticket = nonCancelledOrders > 0 ? stats.total_value / nonCancelledOrders : 0;

        return stats;
    }

    displayStats(stats) {
        // Atualiza os elementos da visão geral
        const elements = {
            totalOrders: stats.total,
            pendingOrders: stats.pendente,
            preparingOrders: stats.preparando,
            readyOrders: stats.pronto,
            deliveredOrders: stats.entregue,
            totalValue: `R$ ${stats.total_value.toFixed(2)}`,
            avgOrderValue: `R$ ${stats.avg_ticket.toFixed(2)}`
        };

        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        });
    }

    updateCharts() {
        // Gráfico de status
        this.updateStatusChart();

        // Gráfico de vendas diárias
        this.updateDailySalesChart();
    }

    updateStatusChart() {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;

        const statusCounts = {
            pendente: 0,
            preparando: 0,
            pronto: 0,
            entregue: 0,
            cancelado: 0
        };

        this.orders.forEach(order => {
            const status = order.status || 'pendente';
            if (statusCounts[status] !== undefined) {
                statusCounts[status]++;
            }
        });

        if (this.charts.status) {
            this.charts.status.destroy();
        }

        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pendente', 'Preparando', 'Pronto', 'Entregue', 'Cancelado'],
                datasets: [{
                    data: [
                        statusCounts.pendente,
                        statusCounts.preparando,
                        statusCounts.pronto,
                        statusCounts.entregue,
                        statusCounts.cancelado
                    ],
                    backgroundColor: [
                        '#FFE0B2',
                        '#BBDEFB',
                        '#C8E6C9',
                        '#A5D6A7',
                        '#FFCDD2'
                    ],
                    borderColor: [
                        '#FFB74D',
                        '#64B5F6',
                        '#81C784',
                        '#66BB6A',
                        '#EF5350'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                }
            }
        });
    }

    updateDailySalesChart() {
        const ctx = document.getElementById('dailySalesChart');
        if (!ctx) return;

        // Agrupa vendas por dia (últimos 7 dias)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push(date.toISOString().split('T')[0]);
        }

        const dailySales = last7Days.map(date => {
            const dayOrders = this.orders.filter(order => {
                const orderDate = new Date(order.created_at).toISOString().split('T')[0];
                return orderDate === date && order.status !== 'cancelado';
            });

            return dayOrders.reduce((sum, order) => {
                return sum + parseFloat(order.total || order.total_amount || 0);
            }, 0);
        });

        if (this.charts.dailySales) {
            this.charts.dailySales.destroy();
        }

        this.charts.dailySales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days.map(date => {
                    const d = new Date(date);
                    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
                }),
                datasets: [{
                    label: 'Vendas (R$)',
                    data: dailySales,
                    borderColor: 'rgb(28, 61, 45)',
                    backgroundColor: 'rgba(28, 61, 45, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return 'R$ ' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    // TAB: Todos os Pedidos
    setupOrdersTab() {
        console.log('📋 Configurando aba de Pedidos');

        // Se já foi configurado, apenas atualiza a visualização
        if (this.ordersTabInitialized) {
            this.displayCurrentView();
            return;
        }

        // Aplica filtros iniciais
        this.applyFilters();

        // Configura visualizações (apenas uma vez)
        this.setupViewOptions();

        // Configura paginação
        this.setupPagination();

        // Configura seleção
        this.setupSelection();

        this.ordersTabInitialized = true;
    }

    setupViewOptions() {
        const viewButtons = document.querySelectorAll('.view-btn');
        const views = ['table', 'cards', 'timeline'];

        const updateViewVisibility = (activeView) => {
            views.forEach(view => {
                // Tenta encontrar o container pelo ID padrão (ex: tableView, cardsView, timelineView)
                // Se não encontrar tableView, tenta ordersTable (que é o ID da tabela no HTML)
                let viewElement = document.getElementById(`${view}View`);
                if (view === 'table' && !viewElement) {
                    viewElement = document.getElementById('ordersTable');
                }

                if (viewElement) {
                    if (view === activeView) {
                        viewElement.style.display = (view === 'table') ? 'table' : 'block';
                    } else {
                        viewElement.style.display = 'none';
                    }
                }
            });
        };

        // Sincroniza a visibilidade inicial com o botão ativo
        const activeBtn = Array.from(viewButtons).find(btn => btn.classList.contains('active'));
        if (activeBtn) {
            updateViewVisibility(activeBtn.dataset.view);
        }

        // Remove event listeners existentes primeiro (para evitar duplicação)
        viewButtons.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });

        // Seleciona os novos botões
        const newViewButtons = document.querySelectorAll('.view-btn');

        newViewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();

                // Remove active class from all buttons
                newViewButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');

                // Atualiza visibilidade dos containers
                const selectedView = btn.dataset.view;
                updateViewVisibility(selectedView);

                // Update content for selected view
                this.displayCurrentView();
            });
        });
    }


    setupPagination() {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageSizeSelect = document.getElementById('pageSize');

        // Remove event listeners existentes
        const newPrevBtn = prevBtn.cloneNode(true);
        const newNextBtn = nextBtn.cloneNode(true);
        const newPageSizeSelect = pageSizeSelect.cloneNode(true);

        if (prevBtn && nextBtn && pageSizeSelect) {
            prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
            nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
            pageSizeSelect.parentNode.replaceChild(newPageSizeSelect, pageSizeSelect);
        }

        // Adiciona novos event listeners
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.displayCurrentView();
                this.updatePaginationInfo();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.displayCurrentView();
                this.updatePaginationInfo();
            }
        });

        document.getElementById('pageSize').addEventListener('change', () => {
            this.pageSize = parseInt(document.getElementById('pageSize').value);
            this.currentPage = 1;
            this.calculateTotalPages();
            this.displayCurrentView();
            this.updatePaginationInfo();
        });
    }


    calculateTotalPages() {
        this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);
    }

    updatePaginationInfo() {
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        if (pageInfo) {
            pageInfo.textContent = `Página ${this.currentPage} de ${this.totalPages}`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage === 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage === this.totalPages;
        }
    }

    setupSelection() {
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.order-select');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    const orderId = cb.dataset.orderId;
                    if (e.target.checked) {
                        this.selectedOrders.add(orderId);
                    } else {
                        this.selectedOrders.delete(orderId);
                    }
                });

                this.updateSelectionUI();
            });
        }
    }

    updateSelectionUI() {
        const selectedCount = document.getElementById('selectedCount');
        const batchActions = document.getElementById('batchActions');

        if (selectedCount) {
            selectedCount.textContent = `${this.selectedOrders.size} selecionado${this.selectedOrders.size !== 1 ? 's' : ''}`;
        }

        if (batchActions) {
            batchActions.style.display = this.selectedOrders.size > 0 ? 'flex' : 'none';
        }
    }

    applyFilters() {
        const filters = this.getCurrentFilters();
        this.filteredOrders = this.applyAdvancedFilters(this.orders, filters);
        this.calculateTotalPages();
        this.currentPage = 1;
        this.displayCurrentView();
        this.updatePaginationInfo();
        this.updateFilterStats();
    }

    getCurrentFilters() {
        const statusCheckboxes = document.querySelectorAll('.status-checkbox:checked');
        const paymentCheckboxes = document.querySelectorAll('.payment-checkbox:checked');

        return {
            startDate: document.getElementById('startDate')?.value || '',
            endDate: document.getElementById('endDate')?.value || '',
            minValue: document.getElementById('minValue')?.value ?
                parseFloat(document.getElementById('minValue').value) : null,
            maxValue: document.getElementById('maxValue')?.value ?
                parseFloat(document.getElementById('maxValue').value) : null,
            statuses: Array.from(statusCheckboxes).map(cb => cb.value),
            deliveryType: document.querySelector('input[name="delivery"]:checked')?.value || 'todos',
            paymentMethods: Array.from(paymentCheckboxes).map(cb => cb.value),
            searchTerm: document.getElementById('searchInput')?.value.toLowerCase() || ''
        };
    }

    applyAdvancedFilters(orders, filters) {
        return orders.filter(order => {
            // Filtro por data
            if (filters.startDate || filters.endDate) {
                const orderDate = new Date(order.created_at);

                if (filters.startDate) {
                    const startDate = new Date(filters.startDate);
                    startDate.setHours(0, 0, 0, 0);
                    if (orderDate < startDate) return false;
                }

                if (filters.endDate) {
                    const endDate = new Date(filters.endDate);
                    endDate.setHours(23, 59, 59, 999);
                    if (orderDate > endDate) return false;
                }
            }

            // Filtro por valor
            const orderValue = order.total_numeric || 0;
            if (filters.minValue !== null && orderValue < filters.minValue) return false;
            if (filters.maxValue !== null && orderValue > filters.maxValue) return false;

            // Filtro por status
            if (filters.statuses.length > 0 && !filters.statuses.includes(order.status || 'pendente')) {
                return false;
            }

            // Filtro por tipo de entrega
            const deliveryOption = (order.delivery_option || 'entrega').toLowerCase();
            if (filters.deliveryType !== 'todos' && deliveryOption !== filters.deliveryType) {
                return false;
            }

            // Filtro por método de pagamento
            if (filters.paymentMethods.length > 0) {
                const paymentMethod = (order.payment_method || 'pix').toLowerCase();
                const matchesPayment = filters.paymentMethods.some(method => {
                    return paymentMethod.includes(method.toLowerCase());
                });
                if (!matchesPayment) return false;
            }

            // Filtro de busca
            if (filters.searchTerm) {
                const searchableText = `
                    ${order.order_id || order.id || ''}
                    ${order.client_name || ''}
                    ${order.client_phone || ''}
                    ${order.observation || ''}
                    ${order.address || ''}
                `.toLowerCase();

                if (!searchableText.includes(filters.searchTerm)) return false;
            }

            return true;
        });
    }

    updateFilterStats() {
        const orderCount = document.getElementById('orderCount');
        const filteredValue = document.getElementById('filteredValue');

        if (orderCount) {
            orderCount.textContent = `${this.filteredOrders.length} pedido${this.filteredOrders.length !== 1 ? 's' : ''}`;
        }

        if (filteredValue) {
            const totalValue = this.filteredOrders.reduce((sum, order) => {
                // Ignora pedidos cancelados no total filtrado
                if ((order.status || '').toLowerCase() === 'cancelado') return sum;
                return sum + (order.total_numeric || 0);
            }, 0);
            filteredValue.textContent = `Total: R$ ${totalValue.toFixed(2)}`;
        }
    }

    displayCurrentView() {
        const activeView = document.querySelector('.view-btn.active')?.dataset.view || 'cards';

        // Limpa os containers antes de adicionar novos elementos
        const containers = {
            table: document.getElementById('ordersBody'),
            cards: document.getElementById('cardsContainer'),
            timeline: document.getElementById('timelineContainer')
        };

        // Limpa todos os containers primeiro
        Object.values(containers).forEach(container => {
            if (container) container.innerHTML = '';
        });

        switch (activeView) {
            case 'table':
                this.displayOrders();
                break;
            case 'cards':
                this.displayOrdersAsCards();
                break;
            case 'timeline':
                this.displayOrdersAsTimeline();
                break;
        }

        this.updateNoOrdersMessage();
    }

    displayOrders() {
        const tbody = document.getElementById('ordersBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.filteredOrders.length === 0) {
            this.updateNoOrdersMessage();
            return;
        }

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageOrders = this.filteredOrders.slice(startIndex, endIndex);

        pageOrders.forEach(order => {
            const row = this.createOrderRow(order);
            tbody.appendChild(row);
        });
    }

    createOrderModal() {
        const modal = document.createElement('div');
        modal.id = 'orderModal';
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="modal-container">
                <div id="modalContent" class="modal-content"></div>
            </div>
        `;
        document.body.appendChild(modal);

        // Adiciona evento para fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        return modal;
    }

    createEditStatusModal() {
        const modal = document.createElement('div');
        modal.id = 'editStatusModal';
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> Alterar Status</h2>
                    <span class="modal-close" onclick="window.AdminPanel.closeEditStatusModal()">&times;</span>
                </div>
                <div id="editStatusContent" class="modal-content"></div>
            </div>
        `;
        document.body.appendChild(modal);

        // Adiciona evento para fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeEditStatusModal();
        });

        return modal;
    }

    createOrderRow(order) {
        const row = document.createElement('tr');
        const orderId = order.order_id || order.id;

        const date = new Date(order.created_at);
        const formattedDate = date.toLocaleDateString('pt-BR');
        const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const total = order.total_numeric || 0;
        const deliveryOption = order.delivery_option || 'entrega';
        const paymentMethod = order.payment_method || 'pix';
        const isSelected = this.selectedOrders.has(orderId);

        if (isSelected) {
            row.classList.add('selected');
        }

        row.innerHTML = `
            <td data-label="Selecionar">
                <input type="checkbox" class="order-select" 
                       data-order-id="${orderId}"
                       ${isSelected ? 'checked' : ''}
                       onchange="window.AdminPanel.toggleOrderSelection('${orderId}', this.checked)">
            </td>
            <td data-label="ID Pedido">
                <a href="#" class="order-id-link" title="Ver detalhes do pedido" onclick="window.AdminPanel.openOrderDetails('${orderId}'); return false;">
                    <strong>${orderId}</strong>
                </a>
            </td>
            <td data-label="Cliente">
                <div class="customer-cell">
                    <strong>${order.client_name || 'N/A'}</strong>
                    ${order.client_phone ? `
                    <br><small class="phone-hint" title="${this.formatPhone(order.client_phone)}">
                        📞 ${this.formatPhone(order.client_phone)}
                    </small>` : ''}
                </div>
            </td>
            <td data-label="Telefone">
                <span class="phone-number" title="${order.client_phone || ''}">
                    ${this.formatPhone(order.client_phone)}
                </span>
            </td>
            <td data-label="Valor">
                <strong class="order-value">R$ ${total.toFixed(2)}</strong>
            </td>
            <td data-label="Status">
                <div class="quick-status-container">
                    <span class="status-badge status-${order.status || 'pendente'}" 
                          onclick="this.nextElementSibling.classList.toggle('active')" 
                          style="cursor: pointer" 
                          title="Clique para mudar o status rápido">
                        ${this.getStatusText(order.status || 'pendente')}
                        <i class="fas fa-chevron-down" style="font-size: 0.7rem; margin-left: 4px; opacity: 0.7"></i>
                    </span>
                    <div class="quick-status-menu">
                        <div class="quick-status-option" onclick="window.AdminPanel.quickUpdateStatus('${orderId}', 'pendente')">
                            <span class="status-dot status-pendente"></span> Pendente
                        </div>
                        <div class="quick-status-option" onclick="window.AdminPanel.quickUpdateStatus('${orderId}', 'preparando')">
                            <span class="status-dot status-preparando"></span> Preparando
                        </div>
                        <div class="quick-status-option" onclick="window.AdminPanel.quickUpdateStatus('${orderId}', 'pronto')">
                            <span class="status-dot status-pronto"></span> Pronto
                        </div>
                        <div class="quick-status-option" onclick="window.AdminPanel.quickUpdateStatus('${orderId}', 'entregue')">
                            <span class="status-dot status-entregue"></span> Entregue
                        </div>
                        <div class="quick-status-option" onclick="window.AdminPanel.quickUpdateStatus('${orderId}', 'cancelado')">
                            <span class="status-dot status-cancelado"></span> Cancelado
                        </div>
                    </div>
                </div>
            </td>a na Loja"><i class="fas fa-store"></i> Retirada</span>' :
	                '<span class="delivery-type" title="Entrega em Domicílio"><i class="fas fa-motorcycle"></i> Entrega</span>'}
	            </td>
	            <td data-label="Pagamento">
	                ${paymentMethod === 'pix' ? '<span title="Pagamento via Pix"><i class="fas fa-qrcode"></i> Pix</span>' :
	                paymentMethod === 'cartao' ? '<span title="Pagamento com Cartão"><i class="far fa-credit-card"></i> Cartão</span>' :
	                    '<span title="Pagamento em Dinheiro"><i class="fas fa-money-bill-wave"></i> Dinheiro</span>'}
	            </td>
	            <td data-label="Data/Hora">
	                <span class="date-time" title="${date.toLocaleString('pt-BR')}">
	                    <i class="far fa-calendar"></i> ${formattedDate}
	                    <br><i class="far fa-clock"></i> ${formattedTime}
	                </span>
	            </td>
	            <td data-label="Ações">
	    <div class="btn-group">
	        <button class="action-btn btn-primary" 
	                title="Ver detalhes do pedido" 
	                onclick="window.AdminPanel.openOrderDetails('${orderId}')">
	            <i class="fas fa-eye"></i>
	        </button>
	        <button class="action-btn btn-ghost" 
	                title="Ver página do cliente" 
	                onclick="window.open('../order.html?orderId=${orderId}', '_blank')">
	            <i class="fas fa-external-link-alt"></i>
	        </button>
	        <button class="action-btn btn-info" 
	                title="Alterar status do pedido" 
	                onclick="window.AdminPanel.openEditStatus('${orderId}')">
	            <i class="fas fa-edit"></i>
	        </button>
	        ${order.client_phone ? `
	        <button class="action-btn btn-success" 
	                title="Enviar mensagem no WhatsApp" 
	                onclick="window.open('https://api.whatsapp.com/send?phone=${order.client_phone}', '_blank')">
	            <i class="fab fa-whatsapp"></i>
	        </button>
	        ` : ''}
	    </div>
	</td>
	        `;

        return row;
    }

    async openOrderDetails(orderId) {
        try {
            this.showLoading(true);

            console.log(`🔍 Buscando detalhes do pedido: ${orderId}`);

            // Primeiro, tenta buscar da API
            const apiBase = window.location.origin;
            let order = null;
            let apiError = null;

            try {
                // Tenta buscar do novo endpoint get-order
                const response = await fetch(`${window.location.origin}/.netlify/functions/get-order?id=${orderId}`);

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.orderData) {
                        order = this.formatOrderForDetails(result.orderData, orderId);
                        console.log('✅ Pedido encontrado na API:', orderId);
                    }
                } else {
                    apiError = 'API não respondeu com sucesso';
                }
            } catch (fetchError) {
                apiError = fetchError.message;
                console.log('⚠️ API falhou, buscando localmente:', apiError);
            }

            // Se a API falhou, busca nos dados locais
            if (!order) {
                order = this.orders.find(o => (o.order_id || o.id) === orderId);
                if (order) {
                    console.log('✅ Pedido encontrado localmente:', orderId);
                }
            }

            if (!order) {
                this.showError('Pedido não encontrado');
                return;
            }

            // Criar ou atualizar o modal
            let modal = document.getElementById('orderModal');
            if (!modal) {
                modal = this.createOrderModal();
            }

            const content = document.getElementById('modalContent');
            if (!content) {
                this.showError('Erro ao carregar modal');
                return;
            }

            // Formatar a data
            const date = new Date(order.created_at);
            const formattedDate = date.toLocaleDateString('pt-BR');
            const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Formatar itens
            let itemsHtml = '';
            if (order.items && order.items.length > 0) {
                itemsHtml = `
                <h3><i class="fas fa-shopping-basket"></i> Itens do Pedido</h3>
                <div class="order-items-container">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <div class="item-name">${item.product_name || item.name || 'Produto'}</div>
                            <div class="item-quantity">${item.quantity}x</div>
                            <div class="item-price">R$ ${parseFloat(item.price || 0).toFixed(2)}</div>
                            <div class="item-total">R$ ${parseFloat(item.total || (item.price * item.quantity) || 0).toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="order-items-summary">
                    <div>Subtotal: <strong>R$ ${parseFloat(order.subtotal || order.total_numeric || 0).toFixed(2)}</strong></div>
                    ${order.delivery_fee > 0 ? `<div>Taxa de entrega: <strong>R$ ${parseFloat(order.delivery_fee).toFixed(2)}</strong></div>` : ''}
                    <div class="order-total">Total: <strong>R$ ${parseFloat(order.total_numeric || order.total || 0).toFixed(2)}</strong></div>
                </div>
            `;
            }

            // Formatar cliente e endereço
            const address = order.address || (order.client ? order.client.address : '') || '';
            const clientPhone = order.client_phone || (order.client ? order.client.phone : '') || '';

            content.innerHTML = `
            <div class="modal-header">
                <h2><i class="fas fa-receipt"></i> Pedido ${order.order_id || order.id}</h2>
                <span class="modal-close" onclick="window.AdminPanel.closeModal()">&times;</span>
            </div>
            
            <div class="order-details-grid">
                <div class="details-section">
                    <h3><i class="fas fa-user"></i> Cliente</h3>
                    <div class="detail-row">
                        <strong>Nome:</strong> ${order.client_name || (order.client ? order.client.name : 'N/A')}
                    </div>
                    <div class="detail-row">
                        <strong>Telefone:</strong> ${this.formatPhone(clientPhone)}
                        ${clientPhone ? `<button class="btn-whatsapp-small" onclick="window.open('https://api.whatsapp.com/send?phone=55${clientPhone.replace(/\D/g, '')}', '_blank')">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </button>` : ''}
                    </div>
                    <div class="detail-row">
                        <strong>Entrega:</strong> 
                        ${order.delivery_option === 'retirada' ?
                    '<span class="status-badge status-entregue"><i class="fas fa-store"></i> Retirada na loja</span>' :
                    `<span class="status-badge status-preparando"><i class="fas fa-truck"></i> Entrega</span>`
                }
                    </div>
                </div>
                
                <div class="details-section">
                    <h3><i class="fas fa-info-circle"></i> Informações do Pedido</h3>
                    <div class="detail-row">
                        <strong>Status:</strong> 
                        <span class="status-badge status-${order.status || 'pendente'}">
                            ${this.getStatusText(order.status || 'pendente')}
                        </span>
                    </div>
                    <div class="detail-row">
                        <strong>Pagamento:</strong> 
                        ${this.formatPaymentMethod(order.payment_method || 'pix')}
                    </div>
                    <div class="detail-row">
                        <strong>Data:</strong> ${formattedDate} às ${formattedTime}
                    </div>
                </div>
            </div>
            
            ${address && order.delivery_option !== 'retirada' ? `
            <div class="details-section">
                <h3><i class="fas fa-map-marker-alt"></i> Endereço de Entrega</h3>
                <div class="address-details">
                    ${address}
                    ${order.client && order.client.neighborhood ? `<br><small>Bairro: ${order.client.neighborhood}</small>` : ''}
                    ${order.client && order.client.city ? `<br><small>Cidade: ${order.client.city}</small>` : ''}
                </div>
            </div>
            ` : ''}
            
            ${itemsHtml}
            
            ${order.observation ? `
            <div class="details-section">
                <h3><i class="fas fa-comment"></i> Observações</h3>
                <div class="order-observation">
                    <p>${order.observation}</p>
                </div>
            </div>
            ` : ''}
            
<div class="modal-footer">
    <div class="modal-actions">
        <div class="modal-action-btn" onclick="window.AdminPanel.openEditStatus('${orderId}')">
            <i class="fas fa-exchange-alt"></i>
            <div class="action-title">Alterar Status</div>
            <div class="action-desc">Atualize o status do pedido</div>
        </div>
        
        ${order.client_phone ? `
        <div class="modal-action-btn" onclick="window.open('https://api.whatsapp.com/send?phone=${clientPhone}', '_blank')">
            <i class="fab fa-whatsapp"></i>
            <div class="action-title">Contato</div>
            <div class="action-desc">Enviar mensagem</div>
        </div>
        ` : ''}
        
        <div class="modal-action-btn" onclick="window.open('../order.html?orderId=${orderId}', '_blank')">
            <i class="fas fa-external-link-alt"></i>
            <div class="action-title">Página do Cliente</div>
            <div class="action-desc">Abrir em nova aba</div>
        </div>
        
        <div class="modal-action-btn" onclick="window.AdminPanel.openPrintOrder('${orderId}')">
            <i class="fas fa-print"></i>
            <div class="action-title">Imprimir</div>
            <div class="action-desc">Gerar cópia física</div>
        </div>
    </div>
    
    <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border);">
        <button class="btn btn-danger" onclick="window.AdminPanel.deleteOrder('${orderId}')">
            <i class="fas fa-trash"></i> Excluir Pedido
        </button>
    </div>
</div>
        `;

            modal.style.display = 'flex';

        } catch (error) {
            console.error('❌ Erro ao carregar detalhes:', error);
            this.showError('Erro ao carregar detalhes: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    createActionButton(config) {
        const button = document.createElement('button');
        button.className = `action-btn ${config.className || ''}`;
        button.innerHTML = config.icon ? `<i class="${config.icon}"></i>` : '';
        button.title = config.title || '';

        if (config.text) {
            button.classList.add('with-text');
            button.innerHTML += `<span>${config.text}</span>`;
        }

        if (config.onClick) {
            button.addEventListener('click', config.onClick);
        }

        if (config.href) {
            button.addEventListener('click', () => window.open(config.href, '_blank'));
        }

        return button;
    }

    // 2. Adicionar método auxiliar para formatar pedido
    formatOrderForDetails(orderData, orderId) {
        if (!orderData) return null;

        const customer = orderData.customer || orderData.client || {};
        const order = orderData.order || {};

        return {
            id: orderId,
            order_id: orderId,
            client_name: customer.name || customer.full_name || '',
            client_phone: customer.phone || '',
            address: customer.address || order.address || '',
            total_numeric: parseFloat(order.total || 0),
            total: parseFloat(order.total || 0).toFixed(2),
            subtotal: parseFloat(order.subtotal || order.total || 0),
            delivery_fee: parseFloat(order.delivery_fee || order.deliveryFee || 0),
            payment_method: order.payment_method || order.paymentMethod || 'pix',
            delivery_option: order.delivery_option || order.deliveryOption || 'entrega',
            status: order.status || 'pendente',
            observation: order.observation || customer.observation || '',
            created_at: order.created_at || new Date().toISOString(),
            items: orderData.items || [],
            client: customer
        };
    }

    // 3. Adicionar método para formatar método de pagamento
    formatPaymentMethod(method) {
        const methods = {
            'pix': '<span class="payment-badge pix"><i class="fas fa-qrcode"></i> PIX</span>',
            'cartao': '<span class="payment-badge cartao"><i class="far fa-credit-card"></i> Cartão</span>',
            'dinheiro': '<span class="payment-badge dinheiro"><i class="fas fa-money-bill-wave"></i> Dinheiro</span>'
        };

        return methods[method.toLowerCase()] || method;
    }

    openEditStatus(orderId) {
        const order = this.orders.find(o => (o.order_id || o.id) === orderId);
        if (!order) return;

        let modal = document.getElementById('editStatusModal');
        if (!modal) {
            modal = this.createEditStatusModal();
        }

        const content = document.getElementById('editStatusContent');

        const statusOptions = [
            { value: 'pendente', label: 'Pendente', icon: 'fas fa-clock', color: '#E67E22', desc: 'Aguardando processamento' },
            { value: 'preparando', label: 'Preparando', icon: 'fas fa-utensils', color: '#1976D2', desc: 'Em preparação na cozinha' },
            { value: 'pronto', label: 'Pronto', icon: 'fas fa-check-circle', color: '#2E7D32', desc: 'Pronto para entrega/retirada' },
            { value: 'entregue', label: 'Entregue', icon: 'fas fa-truck', color: '#1B5E20', desc: 'Pedido entregue ao cliente' },
            { value: 'cancelado', label: 'Cancelado', icon: 'fas fa-times-circle', color: '#C62828', desc: 'Pedido cancelado' }
        ];

        content.innerHTML = `
        <div class="modal-header">
            <h2><i class="fas fa-exchange-alt"></i> Alterar Status do Pedido</h2>
            <span class="modal-close" onclick="window.AdminPanel.closeEditStatusModal()">&times;</span>
        </div>
        
        <div style="padding: 1.5rem;">
            <div style="background: var(--accent-light); padding: 1rem; border-radius: 8px; margin-bottom: 2rem;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div>
                        <strong>Pedido:</strong> ${orderId}<br>
                        <strong>Cliente:</strong> ${order.client_name || 'N/A'}
                    </div>
                    <div style="margin-left: auto;">
                        <span class="status-badge status-${order.status || 'pendente'}">
                            ${this.getStatusText(order.status || 'pendente')}
                        </span>
                    </div>
                </div>
            </div>
            
            <h3 style="margin-bottom: 1rem; color: var(--primary);">Selecione o novo status:</h3>
            
            <div class="status-options-grid">
                ${statusOptions.map(option => `
                    <label class="status-option-card ${order.status === option.value ? 'selected' : ''}">
                        <input type="radio" name="newStatus" value="${option.value}" 
                               ${order.status === option.value ? 'checked' : ''}>
                        <div class="status-option-content">
                            <div class="status-option-icon" style="color: ${option.color};">
                                <i class="${option.icon}"></i>
                            </div>
                            <div class="status-option-text">
                                <div class="status-option-label">${option.label}</div>
                                <div class="status-option-desc">${option.desc}</div>
                            </div>
                            ${order.status === option.value ?
                '<div class="status-current"><i class="fas fa-check-circle"></i> Atual</div>' : ''}
                        </div>
                    </label>
                `).join('')}
            </div>
            
            <div class="modal-footer" style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="window.AdminPanel.closeEditStatusModal()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button class="btn btn-primary" onclick="window.AdminPanel.updateOrderStatus('${orderId}')">
                    <i class="fas fa-save"></i> Salvar Alteração
                </button>
            </div>
        </div>
    `;

        modal.style.display = 'flex';

        // Adiciona interatividade às opções
        content.querySelectorAll('.status-option-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.matches('input')) {
                    const radio = card.querySelector('input[type="radio"]');
                    radio.checked = true;
                    content.querySelectorAll('.status-option-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                }
            });
        });
    }

    updateOrderStatusLocally(orderId, newStatus) {
        const order = this.orders.find(o => (o.order_id || o.id) === orderId);
        if (order) {
            order.status = newStatus;
            // Também atualiza em filteredOrders se necessário
            const filteredOrder = this.filteredOrders.find(o => (o.order_id || o.id) === orderId);
            if (filteredOrder) filteredOrder.status = newStatus;
        }
    }

    async updateOrderStatus(orderId) {
        const selectedStatus = document.querySelector('input[name="newStatus"]:checked')?.value;
        if (!selectedStatus) {
            this.showError('Selecione um status');
            return;
        }

        try {
            this.showLoading(true);

            console.log(`🔄 Atualizando status do pedido ${orderId} para ${selectedStatus}`);

            const apiBase = window.location.origin;
            const response = await fetch(`${apiBase}/.netlify/functions/update-order-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    status: selectedStatus
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('✅ Status atualizado com sucesso!');

                // Atualiza localmente
                this.updateOrderStatusLocally(orderId, selectedStatus);

                // Fecha os modais
                this.closeEditStatusModal();
                this.closeModal();

                // Atualiza a interface sem recarregar tudo
                this.updateStats();
                this.updateCharts();
                this.displayCurrentView();

            } else {
                throw new Error(result.message || 'Erro ao atualizar status');
            }

        } catch (error) {
            console.error('❌ Erro ao atualizar status:', error);
            this.showError('Erro ao atualizar status: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async quickUpdateStatus(orderId, newStatus) {
        try {
            this.showLoading(true);
            const apiBase = window.location.origin;
            const response = await fetch(`${apiBase}/.netlify/functions/update-order-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status: newStatus })
            });

            const result = await response.json();
            if (response.ok && result.success) {
                this.showSuccess('✅ Status atualizado!');
                this.updateOrderStatusLocally(orderId, newStatus);
                this.updateStats();
                this.updateCharts();
                this.displayCurrentView();
            } else {
                throw new Error(result.message || 'Erro ao atualizar status');
            }
        } catch (error) {
            console.error('❌ Erro:', error);
            this.showError('Erro: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    addModalStyles() {
        const style = document.createElement('style');
        style.textContent = `
        /* Quick Status Styles */
        .quick-status-container {
            position: relative;
            display: inline-block;
        }
        .quick-status-menu {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            z-index: 100;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            border: 1px solid var(--border);
            min-width: 150px;
            margin-top: 5px;
            overflow: hidden;
            animation: fadeIn 0.2s ease;
        }
        .quick-status-menu.active {
            display: block;
        }
        .quick-status-option {
            padding: 0.75rem 1rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--foreground);
            transition: background 0.2s;
        }
        .quick-status-option:hover {
            background: var(--accent-light);
        }
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        .status-dot.status-pendente { background: #E67E22; }
        .status-dot.status-preparando { background: #1976D2; }
        .status-dot.status-pronto { background: #2E7D32; }
        .status-dot.status-entregue { background: #1B5E20; }
        .status-dot.status-cancelado { background: #C62828; }

        .modal-content h2 {
            color: var(--primary);
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid var(--border);
        }
        
        .modal-close {
            font-size: 2rem;
            cursor: pointer;
            color: var(--muted-foreground);
            transition: color 0.2s;
        }
        
        .modal-close:hover {
            color: var(--primary);
        }
        
        .order-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }
        
        .details-section {
            background: var(--accent-light);
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid var(--border);
        }
        
        .details-section h3 {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            color: var(--primary);
            font-size: 1.1rem;
        }
        
        .detail-row {
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        
        .detail-row strong {
            min-width: 80px;
            color: var(--muted-foreground);
        }
        
        .btn-whatsapp-small {
            padding: 0.25rem 0.75rem;
            background: #25D366;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 0.8rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            margin-left: 0.5rem;
        }
        
        .btn-whatsapp-small:hover {
            background: #128C7E;
        }
        
        .payment-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .payment-badge.pix {
            background: linear-gradient(135deg, #32BCAD, #006AFF);
            color: white;
        }
        
        .payment-badge.cartao {
            background: linear-gradient(135deg, #FF6B6B, #FF8E53);
            color: white;
        }
        
        .payment-badge.dinheiro {
            background: linear-gradient(135deg, #4CAF50, #2E7D32);
            color: white;
        }
        
        .order-items-container {
            margin: 1.5rem 0;
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .order-item {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 1rem;
            padding: 1rem;
            border-bottom: 1px solid var(--border);
            align-items: center;
        }
        
        .order-item:last-child {
            border-bottom: none;
        }
        
        .order-items-summary {
            background: var(--accent-light);
            padding: 1rem 1.5rem;
            border-radius: 8px;
            margin-top: 1rem;
            text-align: right;
        }
        
        .order-total {
            font-size: 1.2rem;
            color: var(--primary);
            margin-top: 0.5rem;
            padding-top: 0.5rem;
            border-top: 2px solid var(--border);
        }
        
        .address-details {
            background: white;
            padding: 1rem;
            border-radius: 6px;
            border: 1px solid var(--border);
            margin-top: 0.5rem;
        }
        
        .order-observation {
            background: white;
            padding: 1rem;
            border-radius: 6px;
            border: 1px solid var(--border);
            margin-top: 0.5rem;
            font-style: italic;
        }
        
        .modal-footer {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 2px solid var(--border);
        }
        
        .footer-actions {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        
        @media (max-width: 768px) {
            .order-details-grid {
                grid-template-columns: 1fr;
            }
            
            .order-item {
                grid-template-columns: 1fr;
                text-align: center;
            }
            
            .footer-actions {
                flex-direction: column;
            }
        }
    `;
        document.head.appendChild(style);
    }


    async deleteOrder(orderId) {
        if (!confirm(`Tem certeza que deseja excluir o pedido ${orderId}? Esta ação não pode ser desfeita.`)) {
            return;
        }

        try {
            this.showLoading(true);
            const response = await fetch(`${window.location.origin}/.netlify/functions/delete-order/${orderId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showSuccess('Pedido excluído com sucesso!');
                this.closeModal();
                await this.loadAllData();
            } else {
                throw new Error('Erro ao excluir pedido');
            }
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    displayOrdersAsCards() {
        const container = document.getElementById('cardsContainer');
        if (!container) return;

        container.innerHTML = '';

        if (this.filteredOrders.length === 0) {
            return;
        }

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageOrders = this.filteredOrders.slice(startIndex, endIndex);

        pageOrders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card';

            const date = new Date(order.created_at);
            const formattedDate = date.toLocaleDateString('pt-BR');
            const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const total = order.total_numeric || 0;
            const deliveryOption = order.delivery_option || 'entrega';
            const paymentMethod = order.payment_method || 'pix';

            card.innerHTML = `
                <div class="order-card-header">
                    <div class="order-card-id">Pedido ${order.order_id || order.id}</div>
                    <input type="checkbox" class="order-select" 
                           data-order-id="${order.order_id || order.id}"
                           onchange="window.AdminPanel.toggleOrderSelection('${order.order_id || order.id}', this.checked)">
                </div>
                <div class="order-card-client">
                    <div class="order-card-client-name">${order.client_name || 'Cliente'}</div>
                    <div class="order-card-client-phone">${this.formatPhone(order.client_phone)}</div>
                </div>
                <div class="order-card-details">
                    <div class="order-card-detail">
                        <i class="fas fa-money-bill"></i>
                        R$ ${total.toFixed(2)}
                    </div>
                    <div class="order-card-detail">
                        <i class="fas fa-truck"></i>
                        ${deliveryOption === 'retirada' ? 'Retirada' : 'Entrega'}
                    </div>
                    <div class="order-card-detail">
                        <i class="fas fa-credit-card"></i>
                        ${paymentMethod === 'pix' ? 'PIX' :
                    paymentMethod === 'cartao' ? 'Cartão' : 'Dinheiro'}
                    </div>
                </div>
                <div class="order-card-status">
                    <span class="status-badge status-${order.status || 'pendente'}">
                        ${this.getStatusText(order.status || 'pendente')}
                    </span>
                </div>
               <div class="order-card-actions">
    <button class="action-btn btn-primary small with-text" 
            onclick="window.AdminPanel.openOrderDetails('${order.order_id || order.id}')" title="Ver Detalhes">
        <i class="fas fa-eye"></i> Ver
    </button>
    <button class="action-btn btn-info small with-text" 
            onclick="window.AdminPanel.openEditStatus('${order.order_id || order.id}')" title="Editar Status">
        <i class="fas fa-edit"></i> Status
    </button>
    <button class="action-btn btn-success small" 
            onclick="window.open('https://api.whatsapp.com/send?phone=${order.client_phone}', '_blank')"
            title="WhatsApp">
        <i class="fab fa-whatsapp"></i>
    </button>
</div>
                <div class="order-card-time">
                    <small><i class="fas fa-clock"></i> ${formattedDate} ${formattedTime}</small>
                </div>
            `;

            container.appendChild(card);
        });
    }

    createReportViewerModal() {
        const modal = document.createElement('div');
        modal.id = 'reportViewerModal';
        modal.className = 'admin-modal report-viewer-modal';
        modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h2><i class="fas fa-file-alt"></i> Visualizar Relatório</h2>
                <span class="modal-close" onclick="window.AdminPanel.closeReportViewer()">&times;</span>
            </div>
            <div id="reportViewerContent" class="report-viewer-content">
                <!-- Conteúdo será injetado aqui -->
            </div>
        </div>
    `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeReportViewer();
        });

        return modal;
    }


    closeReportViewer() {
        const modal = document.getElementById('reportViewerModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    downloadReport(type, format) {
        const reportNames = {
            'daily': 'Relatório Diário',
            'weekly': 'Relatório Semanal',
            'monthly': 'Relatório Mensal',
            'financial': 'Relatório Financeiro',
            'products': 'Relatório de Produtos',
            'Relatório Diário': 'Relatório Diário',
            'Relatório Semanal': 'Relatório Semanal',
            'Relatório Financeiro': 'Relatório Financeiro',
            'Relatório de Produtos': 'Relatório de Produtos'
        };

        const reportName = reportNames[type] || type || 'Relatório';

        if (format === 'pdf') {
            this.exportToPDF(this.orders, reportName);
        } else if (format === 'xlsx') {
            this.exportToExcel(this.orders, reportName);
        } else {
            this.exportToCSV(this.orders, reportName);
        }

        this.showSuccess(`📥 ${reportName} baixado com sucesso!`);
    }


    // Adicione também no final do arquivo, nos métodos estáticos:
    static viewReport(reportData) {
        if (window.AdminPanel) {
            window.AdminPanel.viewReport(reportData);
        }
    }

    static closeReportViewer() {
        if (window.AdminPanel) {
            window.AdminPanel.closeReportViewer();
        }
    }

    static generateFinancialReport() {
        if (window.AdminPanel) {
            window.AdminPanel.generateTemplateReport('financial');
        }
    }

    static generateClientsReport() {
        if (window.AdminPanel) {
            window.AdminPanel.generateClientsPDF();
        }
    }

    static generateProductsReport() {
        if (window.AdminPanel) {
            window.AdminPanel.generateProductsPDF();
        }
    }

    displayOrdersAsTimeline() {
        const container = document.getElementById('timelineContainer');
        if (!container) return;

        container.innerHTML = '';

        if (this.filteredOrders.length === 0) {
            return;
        }

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageOrders = this.filteredOrders.slice(startIndex, endIndex);

        pageOrders.forEach(order => {
            const item = document.createElement('div');
            item.className = `timeline-item ${order.status || 'pendente'}`;

            const date = new Date(order.created_at);
            const formattedDate = date.toLocaleDateString('pt-BR');
            const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const total = order.total_numeric || 0;

            item.innerHTML = `
                <div class="timeline-time">
                    <i class="fas fa-clock"></i> ${formattedDate} ${formattedTime}
                </div>
                <div class="timeline-content">
                    <div>
                        <strong>Pedido ${order.order_id || order.id}</strong>
                        <br>${order.client_name || 'Cliente'}
                        <br><small>${this.formatPhone(order.client_phone)}</small>
                    </div>
                    <div style="text-align: right;">
                        <div><strong>R$ ${total.toFixed(2)}</strong></div>
                        <div>
                            <span class="status-badge status-${order.status || 'pendente'}">
                                ${this.getStatusText(order.status || 'pendente')}
                            </span>
                        </div>
                        <div style="margin-top: 0.5rem;">
                            <button class="action-btn btn-primary small" title="Ver detalhes" onclick="window.AdminPanel.openOrderDetails('${order.order_id || order.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(item);
        });
    }

    toggleOrderSelection(orderId, selected) {
        if (selected) {
            this.selectedOrders.add(orderId);
        } else {
            this.selectedOrders.delete(orderId);
        }

        this.updateSelectionUI();
    }

    // TAB: Análises
    setupAnalyticsTab() {
        console.log('📈 Configurando aba de Análises');

        // Atualiza gráficos de análise
        this.updateAnalyticsCharts();

        // Gera insights
        this.generateInsights();

        // Configura período de análise
        this.setupAnalyticsPeriod();
    }

    updateAnalyticsCharts() {
        this.updatePeakHoursChart();
        this.updateWeekdayChart();
        this.updatePaymentMethodsChart();
        this.updateDeliveryChart();
        this.updateClientsChart();
        this.updateSalesTrendChart();
    }

    updatePeakHoursChart() {
        const ctx = document.getElementById('peakHoursChart');
        if (!ctx) return;

        const hourCounts = Array(24).fill(0);
        const hourRevenue = Array(24).fill(0);

        this.orders.forEach(order => {
            // Ignora pedidos cancelados na análise por hora
            if ((order.status || '').toLowerCase() === 'cancelado') return;

            const hour = new Date(order.created_at).getHours();
            const value = parseFloat(order.total || order.total_amount || 0);

            hourCounts[hour]++;
            hourRevenue[hour] += value;
        });

        if (this.charts.peakHours) {
            this.charts.peakHours.destroy();
        }

        const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

        this.charts.peakHours = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Número de Pedidos',
                    data: hourCounts,
                    backgroundColor: 'rgba(28, 61, 45, 0.6)',
                    borderColor: 'rgba(28, 61, 45, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de Pedidos'
                        }
                    }
                }
            }
        });

        // Atualiza resumo
        const summaryDiv = document.getElementById('peakHoursSummary');
        if (summaryDiv) {
            let maxCount = 0;
            let maxHour = 0;
            hourCounts.forEach((count, hour) => {
                if (count > maxCount) {
                    maxCount = count;
                    maxHour = hour;
                }
            });

            summaryDiv.innerHTML = `
                <p><strong>Horário de Pico:</strong> ${maxHour}:00</p>
                <p><strong>Pedidos no pico:</strong> ${maxCount}</p>
            `;
        }
    }

    updateWeekdayChart() {
        const ctx = document.getElementById('weekdayChart');
        if (!ctx) return;

        const weekdayCounts = Array(7).fill(0);

        this.orders.forEach(order => {
            // Ignora pedidos cancelados na análise por dia da semana
            if ((order.status || '').toLowerCase() === 'cancelado') return;

            const weekday = new Date(order.created_at).getDay();
            weekdayCounts[weekday]++;
        });

        if (this.charts.weekday) {
            this.charts.weekday.destroy();
        }

        const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        this.charts.weekday = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: weekdayNames,
                datasets: [{
                    label: 'Número de Pedidos',
                    data: weekdayCounts,
                    backgroundColor: 'rgba(28, 61, 45, 0.7)',
                    borderColor: 'rgba(28, 61, 45, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Atualiza resumo
        const summaryDiv = document.getElementById('weekdaySummary');
        if (summaryDiv) {
            let maxCount = 0;
            let maxDay = 0;
            weekdayCounts.forEach((count, day) => {
                if (count > maxCount) {
                    maxCount = count;
                    maxDay = day;
                }
            });

            summaryDiv.innerHTML = `
                <p><strong>Melhor dia:</strong> ${weekdayNames[maxDay]}</p>
                <p><strong>Pedidos:</strong> ${maxCount}</p>
            `;
        }
    }

    updatePaymentMethodsChart() {
        const ctx = document.getElementById('paymentMethodsChart');
        if (!ctx) return;

        const paymentMethods = {
            'pix': { label: 'Pix', count: 0, value: 0 },
            'cartao': { label: 'Cartão', count: 0, value: 0 },
            'dinheiro': { label: 'Dinheiro', count: 0, value: 0 }
        };

        this.orders.forEach(order => {
            // Ignora pedidos cancelados na análise de pagamento
            if ((order.status || '').toLowerCase() === 'cancelado') return;

            const method = (order.payment_method || 'pix').toLowerCase();
            const value = parseFloat(order.total || order.total_amount || 0);

            if (method.includes('pix')) {
                paymentMethods.pix.count++;
                paymentMethods.pix.value += value;
            } else if (method.includes('cart') || method.includes('card')) {
                paymentMethods.cartao.count++;
                paymentMethods.cartao.value += value;
            } else if (method.includes('cash') || method.includes('money') || method.includes('dinheiro')) {
                paymentMethods.dinheiro.count++;
                paymentMethods.dinheiro.value += value;
            } else {
                paymentMethods.pix.count++;
                paymentMethods.pix.value += value;
            }
        });

        if (this.charts.paymentMethods) {
            this.charts.paymentMethods.destroy();
        }

        this.charts.paymentMethods = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.values(paymentMethods).map(p => p.label),
                datasets: [{
                    data: Object.values(paymentMethods).map(p => p.count),
                    backgroundColor: [
                        'rgba(28, 61, 45, 0.8)',
                        'rgba(216, 166, 94, 0.8)',
                        'rgba(230, 126, 34, 0.8)'
                    ],
                    borderColor: [
                        'rgb(28, 61, 45)',
                        'rgb(216, 166, 94)',
                        'rgb(230, 126, 34)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                }
            }
        });

        // Atualiza resumo
        const summaryDiv = document.getElementById('paymentSummary');
        if (summaryDiv) {
            let html = '<ul style="list-style: none; padding: 0;">';
            Object.values(paymentMethods).forEach(method => {
                if (method.count > 0) {
                    const avg = method.value / method.count;
                    html += `
                        <li style="margin-bottom: 0.5rem;">
                            <strong>${method.label}:</strong>
                            <br>${method.count} pedidos
                            <br>R$ ${method.value.toFixed(2)}
                        </li>
                    `;
                }
            });
            html += '</ul>';
            summaryDiv.innerHTML = html;
        }
    }

     updateDeliveryChart() {
        const ctx = document.getElementById('deliveryChart');
        if (!ctx) return;

        const deliveryTypes = {
            'entrega': { label: 'Entrega', count: 0, value: 0 },
            'retirada': { label: 'Retirada', count: 0, value: 0 }
        };

        this.orders.forEach(order => {
        // Ignora pedidos cancelados na análise de entrega
        if ((order.status || '').toLowerCase() === 'cancelado') return;

        const type = (order.delivery_option || 'entrega').toLowerCase();
        const value = parseFloat(order.total || order.total_amount || 0);

        if (deliveryTypes[type]) {
            deliveryTypes[type].count++;
            deliveryTypes[type].value += value;
        } else if (type.includes('retirada') || type.includes('pickup')) {
            deliveryTypes.retirada.count++;
            deliveryTypes.retirada.value += value;
        } else {
            deliveryTypes.entrega.count++;
            deliveryTypes.entrega.value += value;
        }
        });

        if (this.charts.delivery) {
            this.charts.delivery.destroy();
        }

        this.charts.delivery = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.values(deliveryTypes).map(d => d.label),
                datasets: [{
                    data: Object.values(deliveryTypes).map(d => d.count),
                    backgroundColor: [
                        'rgba(28, 61, 45, 0.8)',
                        'rgba(216, 166, 94, 0.8)'
                    ],
                    borderColor: [
                        'rgb(28, 61, 45)',
                        'rgb(216, 166, 94)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                }
            }
        });

        // Atualiza resumo
        const summaryDiv = document.getElementById('deliverySummary');
        if (summaryDiv) {
            let html = '<ul style="list-style: none; padding: 0;">';
            Object.values(deliveryTypes).forEach(type => {
                if (type.count > 0) {
                    const avg = type.value / type.count;
                    html += `
                        <li style="margin-bottom: 0.5rem;">
                            <strong>${type.label}:</strong>
                            <br>${type.count} pedidos
                            <br>R$ ${type.value.toFixed(2)}
                        </li>
                    `;
                }
            });
            html += '</ul>';
            summaryDiv.innerHTML = html;
        }
    }

    updateClientsChart() {
        const ctx = document.getElementById('clientsChart');
        if (!ctx) return;

        const clientOrders = {};

        this.orders.forEach(order => {
            // Ignora pedidos cancelados na análise de clientes
            if ((order.status || '').toLowerCase() === 'cancelado') return;

            const clientPhone = order.client_phone;
            const clientName = order.client_name;

            if (clientPhone) {
                if (!clientOrders[clientPhone]) {
                    clientOrders[clientPhone] = {
                        name: clientName,
                        phone: clientPhone,
                        orderCount: 0,
                        totalSpent: 0
                    };
                }

                clientOrders[clientPhone].orderCount++;
                clientOrders[clientPhone].totalSpent += parseFloat(order.total || order.total_amount || 0);
            }
        }); 

        // Converte para array e ordena
        const clientsArray = Object.values(clientOrders)
            .sort((a, b) => b.orderCount - a.orderCount); // Ordena por número de pedidos (mais populares primeiro)

        if (this.charts.clients) {
            this.charts.clients.destroy();
        }

        this.charts.clients = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: clientsArray.map(c => c.name.substring(0, 10) + (c.name.length > 10 ? '...' : '')),
                datasets: [{
                    label: 'Número de Pedidos',
                    data: clientsArray.map(c => c.orderCount),
                    backgroundColor: 'rgba(28, 61, 45, 0.7)',
                    borderColor: 'rgba(28, 61, 45, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Atualiza resumo
        const summaryDiv = document.getElementById('clientsSummary');
        if (summaryDiv && clientsArray.length > 0) {
            const topClient = clientsArray[0];

            summaryDiv.innerHTML = `
                <p><strong>Cliente mais fiel:</strong> ${topClient.name}</p>
                <p><strong>Pedidos:</strong> ${topClient.orderCount}</p>
                <p><strong>Total gasto:</strong> R$ ${topClient.totalSpent.toFixed(2)}</p>
            `;
        }
    }

    updateSalesTrendChart() {
        const ctx = document.getElementById('salesTrendChart');
        if (!ctx) return;

        const monthlyData = {};

        this.orders.forEach(order => {
            // Ignora pedidos cancelados na análise de tendência de vendas
            if ((order.status || '').toLowerCase() === 'cancelado') return;

            const date = new Date(order.created_at);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            const value = parseFloat(order.total || order.total_amount || 0);

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    month: monthKey,
                    orders: 0,
                    revenue: 0
                };
            }

            monthlyData[monthKey].orders++;
            monthlyData[monthKey].revenue += value;
        }); 

        // Ordena por data
        const sortedMonths = Object.entries(monthlyData)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-6); // Últimos 6 meses

        if (this.charts.salesTrend) {
            this.charts.salesTrend.destroy();
        }

        const monthNames = sortedMonths.map(([key]) => {
            const [year, month] = key.split('-');
            return `${month}/${year.substring(2)}`;
        });

        const revenueData = sortedMonths.map(([_, data]) => data.revenue);

        this.charts.salesTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthNames,
                datasets: [{
                    label: 'Faturamento (R$)',
                    data: revenueData,
                    borderColor: 'rgb(28, 61, 45)',
                    backgroundColor: 'rgba(28, 61, 45, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return 'R$ ' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    generateInsights() {
        const insightsContainer = document.getElementById('insightsContainer');
        if (!insightsContainer) return;

        const insights = [];

        // 1. Insight sobre status pendentes
        const pendingOrders = this.orders.filter(o => o.status === 'pendente');
        if (pendingOrders.length > 3) {
            insights.push({
                type: 'warning',
                title: '⚠️ Pedidos Pendentes',
                message: `${pendingOrders.length} pedidos aguardando processamento.`,
                action: 'Ver pendentes'
            });
        }

        // 2. Insight sobre produtos populares
        if (this.productAnalysis.length > 0) {
            const topProduct = this.productAnalysis[0];
            insights.push({
                type: 'positive',
                title: '⭐ Produto Estrela',
                message: `"${topProduct.name}" é o mais vendido: ${topProduct.quantity} unidades.`,
                action: 'Ver produtos'
            });
        }

        // 3. Insight sobre ticket médio
        const nonCancelledOrders = this.orders.filter(o => (o.status || '').toLowerCase() !== 'cancelado');
        const totalRevenue = nonCancelledOrders.reduce((sum, order) => {
            return sum + parseFloat(order.total || order.total_amount || 0);
        }, 0);

        const avgTicket = nonCancelledOrders.length > 0 ? totalRevenue / nonCancelledOrders.length : 0;
        insights.push({
            type: 'info',
            title: '💰 Ticket Médio',
            message: `Ticket médio de R$ ${avgTicket.toFixed(2)} por pedido.`,
            action: 'Ver análise'
        });

        // Renderiza insights
        insightsContainer.innerHTML = '';
        insights.forEach(insight => {
            const insightEl = document.createElement('div');
            insightEl.className = `insight-card ${insight.type}`;
            insightEl.innerHTML = `
                <h4 style="margin: 0 0 0.5rem 0;">${insight.title}</h4>
                <p style="margin: 0 0 0.5rem 0; font-size: 0.9em;">${insight.message}</p>
            `;
            insightsContainer.appendChild(insightEl);
        });
    }

    setupAnalyticsPeriod() {
        const periodSelect = document.getElementById('analyticsPeriod');
        if (periodSelect) {
            periodSelect.addEventListener('change', () => {
                const value = periodSelect.value;
                const customPeriod = document.getElementById('customPeriod');

                if (value === 'custom') {
                    if (customPeriod) customPeriod.style.display = 'flex';
                } else {
                    if (customPeriod) customPeriod.style.display = 'none';
                    // Atualiza gráficos com novo período
                    this.updateAnalyticsCharts();
                }
            });
        }
    }

    // TAB: Produtos
    setupProductsTab() {
        console.log('📦 Configurando aba de Produtos');

        // Atualiza análise de produtos
        this.updateProductsAnalysis();

        // Atualiza gráficos de produtos
        this.updateProductsCharts();

        // Configura período de produtos
        this.setupProductsPeriod();
    }

    updateProductsAnalysis() {
        const tbody = document.getElementById('productsRankingBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.productAnalysis.slice(0, 10).forEach((product, index) => {
            const row = document.createElement('tr');

            row.innerHTML = `
            <td><strong>#${index + 1}</strong></td>
            <td><strong>${product.name}</strong><br>
                <small>${product.orderCount} pedidos</small></td>
            <td>${product.quantity} unidades</td>
            <td><strong>R$ ${product.revenue.toFixed(2)}</strong></td>
            <td>
                ${index < 3 ?
                    '<span style="color: #27ae60;"><i class="fas fa-chart-line"></i> Alta</span>' :
                    index < 7 ?
                        '<span style="color: #f39c12;"><i class="fas fa-minus"></i> Estável</span>' :
                        '<span style="color: #e74c3c;"><i class="fas fa-chart-line"></i> Baixa</span>'}
            </td>
        `;

            tbody.appendChild(row);
        });

        // ADICIONE ESTA LINHA para renderizar combinações:
        this.renderProductCombinations();
    }

    // Método para criar gráfico de combinações
    updateCombinationsChart() {
        const ctx = document.getElementById('combinationsChart');
        if (!ctx) return;

        if (this.productCombinations.length === 0) {
            // Remove o gráfico se existir
            if (this.charts.combinations) {
                this.charts.combinations.destroy();
                delete this.charts.combinations;
            }
            return;
        }

        // Limita a 8 combinações para o gráfico
        const topCombinations = this.productCombinations.slice(0, 8);

        if (this.charts.combinations) {
            this.charts.combinations.destroy();
        }

        // Cria um novo canvas se não existir
        let canvas = ctx;
        if (ctx.tagName !== 'CANVAS') {
            canvas = document.createElement('canvas');
            canvas.id = 'combinationsChart';
            ctx.parentNode.appendChild(canvas);
            ctx.parentNode.removeChild(ctx);
        }

        this.charts.combinations = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: topCombinations.map(c => {
                    // Abrevia nomes longos
                    const name = c.displayName;
                    return name.length > 30 ? name.substring(0, 27) + '...' : name;
                }),
                datasets: [{
                    label: 'Frequência de Combinação',
                    data: topCombinations.map(c => c.frequency),
                    backgroundColor: [
                        'rgba(231, 76, 60, 0.7)',   // Vermelho
                        'rgba(243, 156, 18, 0.7)',  // Laranja
                        'rgba(46, 204, 113, 0.7)',  // Verde
                        'rgba(52, 152, 219, 0.7)',  // Azul
                        'rgba(155, 89, 182, 0.7)',  // Roxo
                        'rgba(241, 196, 15, 0.7)',  // Amarelo
                        'rgba(230, 126, 34, 0.7)',  // Laranja escuro
                        'rgba(149, 165, 166, 0.7)'  // Cinza
                    ],
                    borderColor: [
                        'rgb(231, 76, 60)',
                        'rgb(243, 156, 18)',
                        'rgb(46, 204, 113)',
                        'rgb(52, 152, 219)',
                        'rgb(155, 89, 182)',
                        'rgb(241, 196, 15)',
                        'rgb(230, 126, 34)',
                        'rgb(149, 165, 166)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const combination = topCombinations[context.dataIndex];
                                return [
                                    `Frequência: ${combination.frequency} pedidos`,
                                    `Receita: R$ ${combination.totalRevenue.toFixed(2)}`,
                                    `Ticket médio: R$ ${combination.avgOrderValue.toFixed(2)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de Pedidos'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }

    // Atualize o método updateProductsCharts para incluir o gráfico de combinações:
    updateProductsCharts() {
        this.updateTopProductsChart();
        this.updateCategoriesChart();
        this.updateCombinationsChart(); // Adicione esta linha
    }

    generateCombinationsInsights() {
        const container = document.getElementById('combinationsInsights');
        if (!container || this.productCombinations.length === 0) return;

        const insights = [];

        // 1. Insight sobre a combinação mais frequente
        const topCombination = this.productCombinations[0];
        if (topCombination) {
            insights.push({
                type: 'success',
                icon: 'fas fa-crown',
                title: 'Combinação Campeã',
                message: `${topCombination.displayName} é a combinação mais vendida, aparecendo em ${topCombination.frequency} pedidos.`,
                suggestion: 'Considere criar um combo promocional com estes produtos.'
            });
        }

        // 2. Insight sobre receita de combinações
        const totalCombinationRevenue = this.productCombinations.reduce((sum, c) => sum + c.totalRevenue, 0);
        const totalProductRevenue = this.productAnalysis.reduce((sum, p) => sum + p.revenue, 0);
        const revenuePercentage = totalProductRevenue > 0 ? (totalCombinationRevenue / totalProductRevenue) * 100 : 0;

        if (revenuePercentage > 20) {
            insights.push({
                type: 'info',
                icon: 'fas fa-money-bill-wave',
                title: 'Receita Significativa',
                message: `${revenuePercentage.toFixed(1)}% da receita vem de combinações de produtos.`,
                suggestion: 'Incentive mais combinações com descontos progressivos.'
            });
        }

        // 3. Insight sobre produtos que combinam com vários outros
        const productConnections = {};
        this.productCombinations.forEach(comb => {
            productConnections[comb.product1] = (productConnections[comb.product1] || 0) + 1;
            productConnections[comb.product2] = (productConnections[comb.product2] || 0) + 1;
        });

        const mostConnectedProduct = Object.entries(productConnections)
            .sort((a, b) => b[1] - a[1])[0];

        if (mostConnectedProduct && mostConnectedProduct[1] >= 3) {
            insights.push({
                type: 'warning',
                icon: 'fas fa-link',
                title: 'Produto Versátil',
                message: `${mostConnectedProduct[0]} combina com ${mostConnectedProduct[1]} outros produtos diferentes.`,
                suggestion: 'Use este produto como carro-chefe para combos variados.'
            });
        }

        // 4. Insight sobre frequência média
        const avgFrequency = this.productCombinations.reduce((sum, c) => sum + c.frequency, 0) / this.productCombinations.length;

        if (avgFrequency >= 5) {
            insights.push({
                type: 'primary',
                icon: 'fas fa-chart-line',
                title: 'Clientes Combinam Muito',
                message: `Cada combinação aparece em média ${avgFrequency.toFixed(1)} vezes.`,
                suggestion: 'Os clientes já estão habituados a combinar produtos.'
            });
        } else {
            insights.push({
                type: 'secondary',
                icon: 'fas fa-exclamation-circle',
                title: 'Oportunidade de Crescimento',
                message: `As combinações ainda são pouco exploradas (média de ${avgFrequency.toFixed(1)} ocorrências).`,
                suggestion: 'Crie sugestões de combinação durante o checkout.'
            });
        }

        // Renderiza os insights
        container.innerHTML = insights.map(insight => `
        <div style="
            background: ${insight.type === 'success' ? '#d4edda' :
                insight.type === 'warning' ? '#fff3cd' :
                    insight.type === 'info' ? '#d1ecf1' : '#e2e3e5'};
            border-left: 4px solid ${insight.type === 'success' ? '#28a745' :
                insight.type === 'warning' ? '#ffc107' :
                    insight.type === 'info' ? '#17a2b8' : '#6c757d'};
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 0 8px 8px 0;
        ">
            <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                <div style="
                    background: white;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: ${insight.type === 'success' ? '#28a745' :
                insight.type === 'warning' ? '#ffc107' :
                    insight.type === 'info' ? '#17a2b8' : '#6c757d'};
                    flex-shrink: 0;
                ">
                    <i class="${insight.icon}"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: var(--primary); margin-bottom: 0.25rem;">
                        ${insight.title}
                    </div>
                    <div style="font-size: 0.9rem; margin-bottom: 0.5rem;">
                        ${insight.message}
                    </div>
                    <div style="
                        font-size: 0.8rem;
                        color: var(--muted-foreground);
                        background: rgba(255,255,255,0.7);
                        padding: 0.5rem;
                        border-radius: 4px;
                        border-left: 2px solid ${insight.type === 'success' ? '#28a745' :
                insight.type === 'warning' ? '#ffc107' :
                    insight.type === 'info' ? '#17a2b8' : '#6c757d'};
                    ">
                        <strong>Sugestão:</strong> ${insight.suggestion}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    }

    updateProductsCharts() {
        this.updateTopProductsChart();
        this.updateCategoriesChart();
    }

    updateTopProductsChart() {
        const ctx = document.getElementById('topProductsChart');
        if (!ctx) return;

        const top10 = this.productAnalysis.slice(0, 10);

        if (this.charts.topProducts) {
            this.charts.topProducts.destroy();
        }

        this.charts.topProducts = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top10.map(p => p.name.substring(0, 15) + (p.name.length > 15 ? '...' : '')),
                datasets: [{
                    label: 'Faturamento (R$)',
                    data: top10.map(p => p.revenue),
                    backgroundColor: 'rgba(28, 61, 45, 0.7)',
                    borderColor: 'rgba(28, 61, 45, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return 'R$ ' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    updateCategoriesChart() {
        const ctx = document.getElementById('categoriesChart');
        if (!ctx) return;

        // Categorias baseadas no menu
        const categories = {
            'Pães': 0,
            'Ciabattas': 0,
            'Focaccias': 0,
            'Doces': 0,
            'Pronta-Entrega': 0
        };

        this.productAnalysis.forEach(product => {
            const name = product.name.toLowerCase();
            if (name.includes('pão') || name.includes('baguete') || name.includes('italiano')) {
                categories['Pães'] += product.quantity;
            } else if (name.includes('ciabatta')) {
                categories['Ciabattas'] += product.quantity;
            } else if (name.includes('focaccia')) {
                categories['Focaccias'] += product.quantity;
            } else if (name.includes('doce') || name.includes('roll') || name.includes('sonho') || name.includes('brioche')) {
                categories['Doces'] += product.quantity;
            } else if (name.includes('muffin')) {
                categories['Pronta-Entrega'] += product.quantity;
            }
        });

        // Remove categorias que não possuem produtos na análise
        Object.keys(categories).forEach(key => {
            if (categories[key] === 0) {
                delete categories[key];
            }
        });

        if (this.charts.categories) {
            this.charts.categories.destroy();
        }

        this.charts.categories = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: [
                        'rgba(28, 61, 45, 0.8)',
                        'rgba(216, 166, 94, 0.8)',
                        'rgba(230, 126, 34, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(149, 165, 166, 0.8)'
                    ],
                    borderColor: [
                        'rgb(28, 61, 45)',
                        'rgb(216, 166, 94)',
                        'rgb(230, 126, 34)',
                        'rgb(155, 89, 182)',
                        'rgb(52, 152, 219)',
                        'rgb(149, 165, 166)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                }
            }
        });
    }

    setupProductsPeriod() {
        const periodSelect = document.getElementById('productsPeriod');
        const refreshBtn = document.getElementById('refreshProducts');

        if (periodSelect) {
            periodSelect.addEventListener('change', () => {
                // Aqui você pode filtrar produtos por período
                console.log('Período de produtos alterado:', periodSelect.value);
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.showSuccess('📦 Análise de produtos atualizada');
                this.updateProductsAnalysis();
                this.updateProductsCharts();
            });
        }
    }

    // TAB: Relatórios
    setupReportsTab() {
        console.log('📄 Configurando aba de Relatórios');

        // Configura botões de relatórios
        this.setupReportButtons();

        // Carrega histórico de relatórios
        this.loadReportsHistory();

        // Configura formulário personalizado
        this.setupCustomReportForm();
    }

    setupCustomReportForm() {
        const form = document.getElementById('customReportForm');
        if (form) {
            // Remove listener anterior
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);

            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const startDate = document.getElementById('customStartDate')?.value;
                const endDate = document.getElementById('customEndDate')?.value;
                const format = document.getElementById('customFormat')?.value || 'pdf';

                if (!startDate || !endDate) {
                    this.showError('Selecione as datas inicial e final');
                    return;
                }

                try {
                    this.showLoading(true);
                    const response = await fetch(`${window.location.origin}/.netlify/functions/reports-generate?type=custom&startDate=${startDate}&endDate=${endDate}`);
                    const result = await response.json();

                    if (result.success) {
                        const { metrics, data, period } = result;
                        const reportName = `Relatório Personalizado`;
                        const periodText = `${new Date(period.start).toLocaleDateString('pt-BR')} - ${new Date(period.end).toLocaleDateString('pt-BR')}`;

                        if (format === 'pdf') {
                            this.exportEnhancedPDF(data.orders, metrics, reportName, periodText);
                        } else if (format === 'xlsx') {
                            this.exportToExcel(data.orders, reportName);
                        } else {
                            this.exportToCSV(data.orders, reportName);
                        }

                        this.addToReportsHistory(reportName, format, periodText, 'custom');
                        this.closeCustomReport();
                        this.showSuccess(`📄 ${reportName} gerado!`);
                    } else {
                        this.showError(result.message);
                    }
                } catch (error) {
                    this.showError('Erro ao gerar relatório personalizado: ' + error.message);
                } finally {
                    this.showLoading(false);
                }
            });
        }

        // Define datas padrão
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);

        const startDateInput = document.getElementById('customStartDate');
        const endDateInput = document.getElementById('customEndDate');

        if (startDateInput && !startDateInput.value) {
            startDateInput.value = lastWeek.toISOString().split('T')[0];
        }
        if (endDateInput && !endDateInput.value) {
            endDateInput.value = today.toISOString().split('T')[0];
        }
    }

    setupReportButtons() {
        // Botão gerar relatório principal
        const generateBtn = document.getElementById('generateReport');
        if (generateBtn) {
            // Remove listener anterior
            const newBtn = generateBtn.cloneNode(true);
            generateBtn.parentNode.replaceChild(newBtn, generateBtn);

            newBtn.addEventListener('click', () => {
                this.generateReport();
            });
        }

        // Botões de templates - CORRIGIDO
        const templateButtons = document.querySelectorAll('.btn-template');
        templateButtons.forEach(btn => {
            // Remove listeners anteriores
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            // Adiciona novo listener
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const card = newBtn.closest('.template-card');
                const template = card ? card.dataset.template : null;

                if (template === 'custom') {
                    this.openCustomReport();
                } else if (template) {
                    this.generateTemplateReport(template);
                }
            });
        });

        // Botão atualizar histórico
        const refreshBtn = document.getElementById('refreshReports');
        if (refreshBtn) {
            refreshBtn.onclick = () => {
                this.loadReportsHistory();
                this.showSuccess('✅ Histórico atualizado');
            };
        }
    }

    async generateReport() {
        const reportType = document.getElementById('reportType').value;
        if (reportType === 'custom') {
            this.openCustomReport();
            return;
        }

        try {
            this.showLoading(true);
            const response = await fetch(`${window.location.origin}/.netlify/functions/reports-generate?type=${reportType}`);
            const result = await response.json();

            if (result.success) {
                const { metrics, data, period } = result;
                const reportName = document.getElementById('reportType').options[document.getElementById('reportType').selectedIndex].text;
                const periodText = `${new Date(period.start).toLocaleDateString('pt-BR')} - ${new Date(period.end).toLocaleDateString('pt-BR')}`;
                
                this.exportEnhancedPDF(data.orders, metrics, reportName, periodText);
                this.addToReportsHistory(reportName, 'pdf', periodText, reportType);
            } else {
                this.showError(result.message);
            }
        } catch (error) {
            this.showError('Erro ao gerar relatório: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    generatePDFDocument(orders, metrics, title, period, type = 'general') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurações de cores
        const primaryColor = [28, 61, 45];
        const secondaryColor = [245, 245, 240];
        
        // Cabeçalho Estilizado
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 45, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('Jardim Padaria Artesanal', 14, 22);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(title.toUpperCase(), 14, 32);
        doc.text(`PERÍODO: ${period}`, 14, 38);
        
        // Data de Geração no topo direito
        doc.setFontSize(9);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 196, 15, { align: 'right' });

        // Seção de Métricas (Cards)
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('INDICADORES DE DESEMPENHO', 14, 60);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 63, 196, 63);

        // Desenhar "Cards" de métricas
        const cardWidth = 58;
        const cardHeight = 25;
        const cardY = 68;
        
        const drawCard = (x, label, value, color = primaryColor) => {
            doc.setFillColor(...secondaryColor);
            doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'F');
            doc.setTextColor(...color);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(label, x + 5, cardY + 8);
            doc.setFontSize(14);
            doc.text(value, x + 5, cardY + 18);
        };

        // Métricas dinâmicas baseadas no tipo
        if (type === 'products') {
            drawCard(14, 'TOTAL PRODUTOS', metrics.totalProducts?.toString() || '0');
            drawCard(76, 'MAIS VENDIDO', metrics.topProduct || 'N/A');
            drawCard(138, 'RECEITA TOTAL', `R$ ${metrics.totalRevenue.toFixed(2)}`);
        } else if (type === 'client') {
            drawCard(14, 'TOTAL CLIENTES', metrics.totalClients?.toString() || '0');
            drawCard(76, 'CLIENTE TOP', metrics.topClient || 'N/A');
            drawCard(138, 'TICKET MÉDIO', `R$ ${metrics.avgOrderValue.toFixed(2)}`);
        } else {
            drawCard(14, 'TOTAL DE PEDIDOS', metrics.totalOrders.toString());
            drawCard(76, 'FATURAMENTO BRUTO', `R$ ${metrics.totalRevenue.toFixed(2)}`);
            drawCard(138, 'TICKET MÉDIO', `R$ ${metrics.avgOrderValue.toFixed(2)}`);
        }

        let currentY = 105;

        // Lógica específica por tipo de relatório
        if (type === 'products' && metrics.productSales) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('RANKING DE PRODUTOS MAIS VENDIDOS', 14, currentY);
            
            const productData = metrics.productSales.map((p, index) => [
                index + 1,
                p.name,
                p.quantity,
                `R$ ${p.revenue.toFixed(2)}`,
                `${((p.revenue / metrics.totalRevenue) * 100).toFixed(1)}%`
            ]);

            doc.autoTable({
                startY: currentY + 5,
                head: [['#', 'Produto', 'Qtd', 'Receita', '% Part.']],
                body: productData,
                theme: 'grid',
                headStyles: { fillColor: primaryColor, fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 10 },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 35, halign: 'right' },
                    4: { cellWidth: 25, halign: 'right' }
                }
            });
            currentY = doc.lastAutoTable.finalY + 15;
        } else if (type === 'client' && metrics.clientRanking) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('RANKING DE CLIENTES', 14, currentY);
            
            const clientData = metrics.clientRanking.map((c, index) => [
                index + 1,
                c.name,
                c.orders,
                `R$ ${c.totalSpent.toFixed(2)}`,
                `R$ ${c.avgTicket.toFixed(2)}`
            ]);

            doc.autoTable({
                startY: currentY + 5,
                head: [['#', 'Cliente', 'Pedidos', 'Total Gasto', 'Ticket Médio']],
                body: clientData,
                theme: 'grid',
                headStyles: { fillColor: primaryColor, fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 10 },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 35, halign: 'right' },
                    4: { cellWidth: 35, halign: 'right' }
                }
            });
            currentY = doc.lastAutoTable.finalY + 15;
        }

        // Tabela de Pedidos (Sempre presente como detalhamento, exceto se for relatório de produtos puro)
        if (type !== 'products' || orders.length > 0) {
            if (currentY > 240) { doc.addPage(); currentY = 20; }
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('DETALHAMENTO DOS PEDIDOS', 14, currentY);
            
            const tableData = orders.map(o => {
                const client = o.client || o.clients || {};
                const clientName = o.client_name || client.name || 'N/A';
                const paymentMethod = o.payment_method || client.payment_method || client.paymentMethod || 'N/A';
                
                return [
                    o.order_id || o.id,
                    new Date(o.created_at || o.date).toLocaleDateString('pt-BR'),
                    clientName,
                    paymentMethod,
                    `R$ ${parseFloat(o.total_numeric || o.total || o.total_amount || 0).toFixed(2)}`,
                    o.status.toUpperCase()
                ];
            });

            doc.autoTable({
                startY: currentY + 5,
                head: [['ID', 'Data', 'Cliente', 'Pagamento', 'Total', 'Status']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: primaryColor, fontStyle: 'bold' },
                columnStyles: {
                    4: { halign: 'right' },
                    5: { halign: 'center' }
                },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 5) {
                        const status = data.cell.raw.toLowerCase();
                        if (status === 'cancelado') data.cell.styles.textColor = [220, 53, 69];
                        if (status === 'entregue' || status === 'concluído') data.cell.styles.textColor = [40, 167, 69];
                    }
                }
            });
        }

        // Rodapé com numeração de páginas
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.text(`Jardim Padaria Artesanal - Relatório Administrativo`, 14, 287);
            doc.text(`Página ${i} de ${pageCount}`, 196, 287, { align: 'right' });
        }

        return doc;
    }

    exportEnhancedPDF(orders, metrics, title, period, type = 'general') {
        const doc = this.generatePDFDocument(orders, metrics, title, period, type);
        doc.save(`${title.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
        this.showSuccess('Relatório profissional gerado com sucesso!');
    }

    async generateTemplateReport(template) {
        const templateNames = {
            'daily': 'Relatório Diário',
            'weekly': 'Relatório Semanal',
            'monthly': 'Relatório Mensal',
            'financial': 'Relatório Financeiro',
            'products': 'Relatório de Produtos',
            'kitchen': 'Pedidos para Cozinha',
            'delivery': 'Rota de Entregas',
            'client': 'Clientes Frequentes'
        };

        const reportName = templateNames[template] || 'Relatório';

        try {
            this.showLoading(true);
            
            // Tenta usar a API para dados frescos, mas tem fallback local
            try {
                const response = await fetch(`${window.location.origin}/.netlify/functions/reports-generate?type=${template}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        const { metrics, data, period } = result;
                        const periodText = `${new Date(period.start).toLocaleDateString('pt-BR')} - ${new Date(period.end).toLocaleDateString('pt-BR')}`;
                        
                        if (template === 'financial') {
                            this.exportToExcel(data.orders, `Financeiro_${periodText.replace(/\//g, '-')}`);
                        } else if (template === 'kitchen') {
                            this.generateKitchenReport();
                        } else if (template === 'delivery') {
                            this.generateDeliveryPDF();
                        } else if (template === 'client') {
                            this.generateClientsPDF();
                        } else if (template === 'products') {
                            this.generateProductsPDF();
                        } else {
                            this.exportEnhancedPDF(data.orders, metrics, reportName, periodText, template);
                        }
                        this.addToReportsHistory(reportName, template === 'financial' ? 'xlsx' : 'pdf', 'Hoje', template);
                        return;
                    }
                }
            } catch (e) {
                console.warn('API de relatórios indisponível, usando processamento local');
            }

            // Fallback Local se a API falhar ou não estiver disponível
            if (template === 'kitchen') {
                this.generateKitchenReport();
            } else if (template === 'delivery') {
                this.generateDeliveryPDF();
            } else if (template === 'client') {
                this.generateClientsPDF();
            } else if (template === 'products') {
                this.generateProductsPDF();
            } else if (template === 'financial') {
                this.exportToExcel(this.orders, `Financeiro_Local_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`);
            } else {
                this.exportToPDF(this.orders, reportName.toLowerCase().replace(/\s+/g, '_'));
            }
            
            this.addToReportsHistory(reportName, template === 'financial' ? 'xlsx' : 'pdf', 'Hoje', template);
        } catch (error) {
            this.showError('Erro ao gerar template: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    generateDailyReport() {
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = this.orders.filter(o => o.created_at.startsWith(today));

        if (todayOrders.length === 0) {
            this.showError('Nenhum pedido encontrado para hoje');
            return;
        }

        this.exportToPDF(todayOrders, `relatorio_diario_${today}`);
        this.showSuccess(`Relatório diário gerado: ${todayOrders.length} pedidos`);
    }

    generateWeeklyReport() {
        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);

        const weekOrders = this.orders.filter(o => {
            const orderDate = new Date(o.created_at);
            return orderDate >= weekAgo && orderDate <= today;
        });

        if (weekOrders.length === 0) {
            this.showError('Nenhum pedido encontrado na última semana');
            return;
        }

        this.exportToPDF(weekOrders, 'relatorio_semanal');
        this.showSuccess(`Relatório semanal gerado: ${weekOrders.length} pedidos`);
    }

    generateMonthlyReport() {
        const today = new Date();
        const monthAgo = new Date();
        monthAgo.setDate(today.getDate() - 30);

        const monthOrders = this.orders.filter(o => {
            const orderDate = new Date(o.created_at);
            return orderDate >= monthAgo && orderDate <= today;
        });

        if (monthOrders.length === 0) {
            this.showError('Nenhum pedido encontrado no último mês');
            return;
        }

        this.exportToPDF(monthOrders, 'relatorio_mensal');
        this.showSuccess(`Relatório mensal gerado: ${monthOrders.length} pedidos`);
    }



    loadReportsHistory() {
        const tbody = document.getElementById('reportsHistoryBody');
        if (!tbody) return;

        // Tenta carregar do localStorage
        let reports = JSON.parse(localStorage.getItem('admin_reports_history') || '[]');

        // Se não houver histórico, cria exemplos
        if (reports.length === 0) {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const lastWeek = new Date(today);
            lastWeek.setDate(lastWeek.getDate() - 7);

            reports = [
                {
                    id: '1',
                    date: today.toISOString().split('T')[0],
                    type: 'Relatório Diário',
                    period: today.toLocaleDateString('pt-BR'),
                    file: `relatorio_diario_${today.toISOString().split('T')[0]}.pdf`,
                    format: 'pdf',
                    template: 'daily'
                },
                {
                    id: '2',
                    date: yesterday.toISOString().split('T')[0],
                    type: 'Relatório Semanal',
                    period: `${lastWeek.toLocaleDateString('pt-BR')} - ${yesterday.toLocaleDateString('pt-BR')}`,
                    file: 'relatorio_semanal.pdf',
                    format: 'pdf',
                    template: 'weekly'
                },
                {
                    id: '3',
                    date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
                    type: 'Relatório Financeiro',
                    period: today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
                    file: 'relatorio_financeiro.xlsx',
                    format: 'xlsx',
                    template: 'financial'
                },
                {
                    id: '4',
                    date: new Date(today.getFullYear(), today.getMonth() - 1, 15).toISOString().split('T')[0],
                    type: 'Relatório de Produtos',
                    period: 'Análise Mensal',
                    file: 'relatorio_produtos.pdf',
                    format: 'pdf',
                    template: 'products'
                }
            ];

            localStorage.setItem('admin_reports_history', JSON.stringify(reports));
        }

        tbody.innerHTML = '';

        reports.forEach(report => {
            const row = document.createElement('tr');

            const reportDate = new Date(report.date);

            row.innerHTML = `
            <td>${reportDate.toLocaleDateString('pt-BR')}</td>
            <td>
                <span class="report-type-badge report-type-${report.type.toLowerCase().includes('diário') ? 'daily' :
                    report.type.toLowerCase().includes('semanal') ? 'weekly' :
                        report.type.toLowerCase().includes('mensal') ? 'monthly' :
                            report.type.toLowerCase().includes('financeiro') ? 'financial' :
                                report.type.toLowerCase().includes('produtos') ? 'products' :
                                    report.type.toLowerCase().includes('cozinha') ? 'kitchen' :
                                        report.type.toLowerCase().includes('entrega') ? 'delivery' :
                                            report.type.toLowerCase().includes('cliente') ? 'client' : 'custom'}">
                    ${report.type}
                </span>
            </td>
            <td>${report.period}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-file-${report.format === 'pdf' ? 'pdf' :
                    report.format === 'xlsx' ? 'excel' :
                        'alt'}"></i>
                    <span>${report.file}</span>
                </div>
            </td>
            <td>
                <div style="display: flex; gap: 0.25rem;">
                    <button class="action-btn btn-primary small btn-view-report" 
                            title="Visualizar relatório"
                            data-report-id="${report.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-info small btn-download-report" 
                            title="Baixar relatório"
                            data-report-id="${report.id}">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </td>
        `;

            tbody.appendChild(row);
        });

        // Adiciona event listeners
        this.setupReportsHistoryEvents(reports);
    }

    setupReportsHistoryEvents(reports) {
        document.querySelectorAll('.btn-view-report').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const id = e.currentTarget.dataset.reportId;
                this.viewReport(id);
            };
        });

        document.querySelectorAll('.btn-download-report').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const id = e.currentTarget.dataset.reportId;
                AdminPanel.downloadReport(id);
            };
        });
    }

    addToReportsHistory(reportName, format = 'pdf', period = 'Hoje', template = 'general') {
        const tbody = document.getElementById('reportsHistoryBody');
        if (!tbody) return;

        const today = new Date();
        const fileName = `${reportName.toLowerCase().replace(/ /g, '_')}_${today.toISOString().split('T')[0]}.${format}`;

        const newReport = {
            id: `rpt-${Date.now()}`,
            name: reportName,
            type: reportName,
            template: template,
            period: period,
            format: format,
            file: fileName,
            date: today.toISOString()
        };

        // Salva no localStorage
        let history = JSON.parse(localStorage.getItem('admin_reports_history') || '[]');
        history.unshift(newReport);
        localStorage.setItem('admin_reports_history', JSON.stringify(history.slice(0, 20)));

        // Recarrega o histórico
        this.loadReportsHistory();
    }

    // Métodos de utilidade
    getStatusText(status) {
        const statusMap = {
            'pendente': 'Pendente',
            'preparando': 'Preparando',
            'pronto': 'Pronto',
            'entregue': 'Entregue',
            'cancelado': 'Cancelado'
        };

        return statusMap[status.toLowerCase()] || status;
    }

    formatPhone(phone) {
        if (!phone) return 'N/A';

        let clean = phone.toString().replace(/\D/g, '');

        // Remove código do país se tiver
        if (clean.length > 10) {
            clean = clean.slice(2);
        }

        // Formata: (XX) XXXXX-XXXX
        return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    updateTimestamp() {
        const timestampElement = document.getElementById('lastUpdate');
        if (timestampElement) {
            timestampElement.textContent = `Última atualização: ${new Date().toLocaleTimeString('pt-BR')}`;
        }
    }

    updateNoOrdersMessage() {
        const noOrdersElement = document.getElementById('noOrdersMessage');
        const tableContainer = document.getElementById('tableContainer');

        if (noOrdersElement && tableContainer) {
            if (this.filteredOrders.length === 0) {
                noOrdersElement.style.display = 'block';
                tableContainer.style.display = 'none';
            } else {
                noOrdersElement.style.display = 'none';
                tableContainer.style.display = 'block';
            }
        }
    }

    exportToExcel(orders, filename) {
        if (orders.length === 0) {
            this.showError('Não há dados para exportar');
            return;
        }

        try {
            const data = orders.map(o => {
                const client = o.client || o.clients || {};
                const clientName = o.client_name || client.name || 'N/A';
                const clientPhone = o.client_phone || client.phone || 'N/A';
                
                // Lógica robusta para endereço
                let address = o.address || client.address;
                if (!address || address === 'N/A') {
                    if (client.street) {
                        address = `${client.street}, ${client.number || client.address_number || ''}`;
                        if (client.neighborhood) address += ` - ${client.neighborhood}`;
                        if (client.city) address += `, ${client.city}`;
                    } else {
                        address = 'N/A';
                    }
                }

                return {
                    'ID Pedido': o.order_id || o.id,
                    'Data': new Date(o.created_at || o.date).toLocaleString('pt-BR'),
                    'Cliente': clientName,
                    'Telefone': clientPhone,
                    'Total (R$)': parseFloat(o.total_numeric || o.total || o.total_amount || 0).toFixed(2),
                    'Status': this.getStatusText(o.status),
                    'Pagamento': o.payment_method || client.paymentMethod || 'N/A',
                    'Endereço': address
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos");

            // Ajusta largura das colunas
            const wscols = [
                { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 40 }
            ];
            worksheet['!cols'] = wscols;

            XLSX.writeFile(workbook, `${filename}.xlsx`);
            this.showSuccess(`Arquivo ${filename}.xlsx exportado com sucesso!`);
        } catch (error) {
            console.error('Erro ao exportar Excel:', error);
            // Fallback para CSV se XLSX falhar
            let csv = 'ID,Data,Cliente,Telefone,Total,Status,Pagamento,Entrega\n';
            orders.forEach(o => {
                csv += `${o.order_id || o.id},${o.created_at},${o.client_name},${o.client_phone},${o.total_numeric},${o.status},${o.payment_method},${o.delivery_option}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}.csv`;
            link.click();
        }
    }

    exportToPDF(orders, filename) {
        if (orders.length === 0) {
            this.showError('Não há dados para exportar');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Título
        doc.setFontSize(18);
        doc.text('Jardim Padaria Artesanal - Relatório de Pedidos', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
        doc.text(`Total de pedidos: ${orders.length}`, 14, 36);

        const tableData = orders.map(o => {
            const client = o.client || o.clients || {};
            const clientName = o.client_name || client.name || 'N/A';
            return [
                o.order_id || o.id,
                new Date(o.created_at || o.date).toLocaleDateString('pt-BR'),
                clientName,
                `R$ ${parseFloat(o.total_numeric || o.total || o.total_amount || 0).toFixed(2)}`,
                this.getStatusText(o.status)
            ];
        });

        doc.autoTable({
            startY: 45,
            head: [['ID', 'Data', 'Cliente', 'Total', 'Status']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [28, 61, 45] }
        });

        doc.save(`${filename}.pdf`);
        this.showSuccess(`Relatório ${filename}.pdf gerado com sucesso!`);
    }

    generateDeliveryPDF() {
        const pendingOrders = this.orders.filter(o => o.delivery_option === 'entrega' && o.status !== 'cancelado');
        if (pendingOrders.length === 0) {
            this.showError('Não há entregas pendentes');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Rota de Entregas', 14, 22);

        const tableData = pendingOrders.map(o => {
            const client = o.client || o.clients || {};
            const clientName = o.client_name || client.name || 'N/A';
            const address = o.address || client.address || (client.street ? `${client.street}, ${client.number || client.address_number || ''} ${client.neighborhood || ''}` : 'N/A');
            const clientPhone = o.client_phone || client.phone || 'N/A';

            return [
                o.order_id || o.id,
                clientName,
                address,
                clientPhone
            ];
        });

        doc.autoTable({
            startY: 30,
            head: [['ID', 'Cliente', 'Endereço', 'Telefone']],
            body: tableData,
            headStyles: { fillColor: [28, 61, 45] }
        });

        doc.save('rota_entregas.pdf');
        this.showSuccess('Rota de entregas gerada com sucesso!');
    }

    generateKitchenReport() {
        // Filtra todos os pedidos pendentes ou preparando, independente da data
        const activeOrders = this.orders.filter(o => ['pendente', 'preparando'].includes(o.status));
        
        if (activeOrders.length === 0) {
            this.showError('Não há pedidos pendentes ou em preparação para a cozinha');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const today = new Date().toLocaleDateString('pt-BR');

        // Título principal
        doc.setFontSize(18);
        doc.setFont(undefined, 'normal');
        doc.text(`Pedidos para Cozinha - ${today}`, 14, 22);

        let yPos = 35;
        activeOrders.forEach((order, index) => {
            // Verifica se precisa de nova página
            if (yPos > 260) {
                doc.addPage();
                yPos = 20;
            }

            // Cabeçalho do Pedido: Pedido: ID - Nome do Cliente
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            const clientName = order.client_name || (order.client ? order.client.name : 'Cliente');
            const statusText = this.getStatusText(order.status || 'pendente');
            doc.text(`Pedido: ${order.order_id || order.id} - ${clientName} (${statusText})`, 14, yPos);
            yPos += 7;

            // Itens do Pedido
            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            if (order.items) {
                order.items.forEach(item => {
                    if (yPos > 280) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(`• ${item.quantity}x ${item.product_name || item.name}`, 20, yPos);
                    yPos += 6;
                });
            }

            // Observação
            if (order.observation) {
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.setFont(undefined, 'italic');
                doc.text(`Obs: ${order.observation}`, 20, yPos);
                yPos += 6;
            }

            // Linha separadora
            yPos += 4;
            doc.setDrawColor(200, 200, 200);
            doc.line(14, yPos, 196, yPos);
            yPos += 12;
        });

        doc.save(`pedidos_cozinha_${new Date().toISOString().split('T')[0]}.pdf`);
        this.showSuccess(`Relatório para cozinha gerado com sucesso! (${activeOrders.length} pedidos)`);
    }

    generateTodayOrdersReport() {
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = this.orders.filter(order => {
            const orderDate = new Date(order.created_at).toISOString().split('T')[0];
            return orderDate === today;
        });

        if (todayOrders.length === 0) {
            this.showError('Nenhum pedido realizado hoje');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Pedidos de Hoje - ' + new Date().toLocaleDateString('pt-BR'), 14, 22);

        let yPos = 35;
        todayOrders.forEach((order, index) => {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            const clientName = order.client_name || (order.client ? order.client.name : 'Cliente');
            const statusText = this.getStatusText(order.status || 'pendente');
            doc.text(`Pedido: ${order.order_id || order.id} - ${clientName} (${statusText})`, 14, yPos);
            yPos += 7;

            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            if (order.items) {
                order.items.forEach(item => {
                    doc.text(`• ${item.quantity}x ${item.product_name || item.name}`, 20, yPos);
                    yPos += 6;
                });
            }

            if (order.observation) {
                doc.setFont(undefined, 'italic');
                doc.text(`Obs: ${order.observation}`, 20, yPos);
                yPos += 6;
            }

            yPos += 5;
            doc.line(14, yPos, 196, yPos);
            yPos += 10;
        });

        doc.save(`pedidos_hoje_${today}.pdf`);
        this.showSuccess(`📋 Relatório de hoje gerado: ${todayOrders.length} pedidos`);
    }

    generateClientsPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const clientMap = {};

        this.orders.forEach(o => {
            if ((o.status || '').toLowerCase() === 'cancelado') return;

            const clientName = o.client_name || 'Cliente';
            const clientPhone = o.client_phone || 'N/A';

            if (!clientMap[clientName]) {
                clientMap[clientName] = { name: clientName, phone: clientPhone, count: 0, total: 0 };
            }
            clientMap[clientName].count++;
            clientMap[clientName].total += parseFloat(o.total_numeric || o.total || 0);
        });

        const clients = Object.values(clientMap).sort((a, b) => b.total - a.total);

        if (clients.length === 0) {
            this.showError('Não há dados de clientes para gerar o relatório');
            return;
        }

        doc.setFontSize(18);
        doc.text('Relatório de Clientes Frequentes', 14, 22);
        doc.setFontSize(11);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

        const tableData = clients.map(c => [
            c.name,
            c.phone,
            c.count,
            `R$ ${c.total.toFixed(2)}`
        ]);

        doc.autoTable({
            startY: 35,
            head: [['Cliente', 'Telefone', 'Pedidos', 'Total Gasto']],
            body: tableData,
            headStyles: { fillColor: [28, 61, 45] }
        });

        doc.save('clientes_frequentes.pdf');
        this.showSuccess('Relatório de clientes gerado com sucesso!');
    }
    generateProductsPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const productMap = {};

        this.orders.forEach(o => {
            if ((o.status || '').toLowerCase() === 'cancelado') return;

            if (o.items && Array.isArray(o.items)) {
                o.items.forEach(item => {
                    const name = item.product_name || item.name || 'Produto';
                    if (!productMap[name]) {
                        productMap[name] = { name: name, qty: 0, total: 0 };
                    }
                    productMap[name].qty += parseInt(item.quantity || 0);
                    productMap[name].total += parseFloat(item.total || (item.price * item.quantity) || 0);
                });
            }
        });

        const products = Object.values(productMap).sort((a, b) => b.qty - a.qty);

        if (products.length === 0) {
            this.showError('Não há dados de produtos para gerar o relatório');
            return;
        }

        doc.setFontSize(18);
        doc.text('Relatório de Produtos Mais Vendidos', 14, 22);
        doc.setFontSize(11);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

        const tableData = products.map(p => [
            p.name,
            p.qty,
            `R$ ${p.total.toFixed(2)}`
        ]);

        doc.autoTable({
            startY: 35,
            head: [['Produto', 'Quantidade Vendida', 'Total em Vendas']],
            body: tableData,
            headStyles: { fillColor: [28, 61, 45] }
        });

        doc.save('produtos_mais_vendidos.pdf');
        this.showSuccess('Relatório de produtos gerado com sucesso!');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    // Métodos de UI
    showLoading(show) {
        let loadingEl = document.getElementById('loadingOverlay');

        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.id = 'loadingOverlay';
            loadingEl.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255,255,255,0.8);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                flex-direction: column;
            `;

            loadingEl.innerHTML = `
                <div class="spinner" style="
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #1C3D2D;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                "></div>
                <div style="color: #1C3D2D; font-weight: 600;">Carregando...</div>
            `;

            document.body.appendChild(loadingEl);
        }

        loadingEl.style.display = show ? 'flex' : 'none';
    }

    showNotification(message, type = 'info') {
        let notificationBar = document.getElementById('notificationBar');

        if (!notificationBar) {
            notificationBar = document.createElement('div');
            notificationBar.id = 'notificationBar';
            notificationBar.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
            `;
            document.body.appendChild(notificationBar);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            animation: slideIn 0.3s ease;
            border-left: 4px solid ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#1C3D2D'};
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' :
                type === 'success' ? 'check-circle' :
                    type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button style="background: none; border: none; color: #666; cursor: pointer; padding: 0.25rem; margin-left: 1rem;" 
                    onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        notificationBar.appendChild(notification);

        // Remove automaticamente após 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    // Event Listeners
    setupEventListeners() {
        // Botão de refresh
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadAllData();
                this.showSuccess('🔄 Dados atualizados');
            });
        }

        // Botão Exportar Geral
        const exportAllBtn = document.getElementById('exportAllBtn');
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', () => {
                this.exportToExcel(this.filteredOrders, 'todos_os_pedidos');
            });
        }

        // Botão Relatório Diário (Ação Rápida)
        const generateDailyReportBtn = document.getElementById('generateDailyReport');
        if (generateDailyReportBtn) {
            generateDailyReportBtn.addEventListener('click', () => {
                this.generateDailyReport();
                this.addToReportsHistory('Relatório Diário', 'pdf', 'Hoje', 'daily');
            });
        }



        // Botões de filtro rápido de data
        document.querySelectorAll('.date-quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const days = parseInt(e.target.dataset.days);
                this.setQuickDateFilter(days);
            });
        });

        // Botão aplicar filtros
        const applyFiltersBtn = document.getElementById('applyFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        // Botão limpar filtros
        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // Filtros em tempo real
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                if (searchTimeout) clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.applyFilters(), 500);
            });
        }

        // Checkboxes de status
        document.querySelectorAll('.status-checkbox').forEach(cb => {
            cb.addEventListener('change', () => this.applyFilters());
        });

        // Radios de entrega
        document.querySelectorAll('input[name="delivery"]').forEach(radio => {
            radio.addEventListener('change', () => this.applyFilters());
        });

        // Checkboxes de pagamento
        document.querySelectorAll('.payment-checkbox').forEach(cb => {
            cb.addEventListener('change', () => this.applyFilters());
        });

        // Ações em lote
        const applyBatchActionBtn = document.getElementById('applyBatchAction');
        if (applyBatchActionBtn) {
            applyBatchActionBtn.addEventListener('click', () => {
                this.applyBatchAction();
            });
        }

        // Botões de ação rápida
        const printTodayBtn = document.getElementById('printTodayOrders');
        if (printTodayBtn) {
            printTodayBtn.addEventListener('click', () => {
                this.generateTodayOrdersReport();
            });
        }

        const viewPendingBtn = document.getElementById('viewPendingOrders');
        if (viewPendingBtn) {
            viewPendingBtn.addEventListener('click', () => {
                this.filterPendingOrders();
            });
        }

        const kitchenReportBtn = document.getElementById('generateKitchenReportBtn');
        if (kitchenReportBtn) {
            kitchenReportBtn.addEventListener('click', () => {
                this.generateKitchenReport();
            });
        }
    }

    setQuickDateFilter(days) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (days - 1));

        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');

        if (startDateInput && endDateInput) {
            startDateInput.value = startDate.toISOString().split('T')[0];
            endDateInput.value = endDate.toISOString().split('T')[0];

            this.applyFilters();
        }
    }

    clearAllFilters() {
        // Limpa datas
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        if (startDate) startDate.value = '';
        if (endDate) endDate.value = '';

        // Limpa valores
        const minValue = document.getElementById('minValue');
        const maxValue = document.getElementById('maxValue');
        if (minValue) minValue.value = '';
        if (maxValue) maxValue.value = '';

        // Limpa busca
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';

        // Reseta status (marca todos exceto cancelado)
        document.querySelectorAll('.status-checkbox').forEach(cb => {
            cb.checked = cb.value !== 'cancelado';
        });

        // Reseta entrega
        const todosRadio = document.querySelector('input[name="delivery"][value="todos"]');
        if (todosRadio) todosRadio.checked = true;

        // Reseta pagamento
        document.querySelectorAll('.payment-checkbox').forEach(cb => {
            cb.checked = true;
        });

        // Aplica filtros
        this.applyFilters();
        this.showSuccess('✅ Filtros limpos');
    }

    filterPendingOrders() {
        // Marca apenas 'preparando'
        document.querySelectorAll('.status-checkbox').forEach(cb => {
            cb.checked = cb.value === 'preparando';
        });

        // Limpa filtros de data para ver todos os que estão em preparo, independente do dia
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');

        if (startDate && endDate) {
            startDate.value = '';
            endDate.value = '';
        }

        // Aplica os filtros básicos
        const filters = this.getCurrentFilters();
        this.filteredOrders = this.applyAdvancedFilters(this.orders, filters);
        
        // Ordena por data (mais antigos primeiro) para urgência
        this.filteredOrders.sort((a, b) => {
            const dateA = new Date(a.created_at || a.date);
            const dateB = new Date(b.created_at || b.date);
            return dateA - dateB;
        });

        this.calculateTotalPages();
        this.currentPage = 1;
        this.displayCurrentView();
        this.updatePaginationInfo();
        this.updateFilterStats();

        this.showSuccess('✅ Mostrando pedidos em preparação (mais antigos primeiro)');
    }

    applyBatchAction() {
        const actionSelect = document.getElementById('batchActionSelect');
        if (!actionSelect) return;

        const action = actionSelect.value;
        if (!action || this.selectedOrders.size === 0) {
            this.showError('Selecione uma ação e pelo menos um pedido');
            return;
        }

        const selectedIds = Array.from(this.selectedOrders);

        switch (action) {
            case 'status_preparando':
                this.batchUpdateStatus(selectedIds, 'preparando');
                break;
            case 'status_pronto':
                this.batchUpdateStatus(selectedIds, 'pronto');
                break;
            case 'status_entregue':
                this.batchUpdateStatus(selectedIds, 'entregue');
                break;
            case 'export_selected':
                const selectedOrdersData = this.orders.filter(o => selectedIds.includes(o.order_id || o.id));
                this.exportToExcel(selectedOrdersData, 'pedidos_selecionados');
                break;
            case 'print_selected':
                this.showInfo('Preparando impressão para ' + selectedIds.length + ' pedidos...');
                // Simulação de impressão
                break;
            default:
                this.showError('Ação não implementada');
        }
    }

    batchUpdateStatus(orderIds, newStatus) {
        if (!confirm(`Deseja alterar o status de ${orderIds.length} pedido(s) para "${this.getStatusText(newStatus)}"?`)) {
            return;
        }

        // Atualiza localmente (simulação)
        orderIds.forEach(orderId => {
            const order = this.orders.find(o => (o.order_id || o.id) === orderId);
            if (order) {
                order.status = newStatus;
            }
        });

        // Atualiza filteredOrders também
        this.filteredOrders.forEach(order => {
            if (orderIds.includes(order.order_id || order.id)) {
                order.status = newStatus;
            }
        });

        // Limpa seleção
        this.selectedOrders.clear();
        this.updateSelectionUI();

        // Atualiza visualização
        this.applyFilters();
        this.updateStats();

        this.showSuccess(`✅ ${orderIds.length} pedido(s) atualizado(s) para ${this.getStatusText(newStatus)}`);
    }



    // Métodos estáticos para acesso global
    static handleInsightAction(action) {
        console.log('Ação de insight:', action);
        // Implementar ações específicas se necessário
    }

    // Adicione no final do arquivo, nos métodos estáticos:
    static openPrintOrder(orderId) {

        if (window.AdminPanel) {
            window.AdminPanel.openPrintOrder(orderId);
        }
    }

    static closePrintModal() {
        if (window.AdminPanel && typeof window.AdminPanel.closePrintModal === 'function') {
            window.AdminPanel.closePrintModal();
        }
    }

    static generateKitchenReport() {
        if (window.AdminPanel) {
            window.AdminPanel.generateKitchenReport();
        }
    }

    static generateDeliveryReport() {
        if (window.AdminPanel) {
            window.AdminPanel.generateDeliveryPDF();
        }
    }



    openCustomReport() {
        const section = document.getElementById('customReportSection');
        if (section) {
            section.style.display = 'block';

            // Rola para a seção
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    closeCustomReport() {
        const section = document.getElementById('customReportSection');
        if (section) {
            section.style.display = 'none';
        }
    }

    // Métodos estáticos para acesso global
    static openCustomReport() {
        if (window.AdminPanel) {
            window.AdminPanel.openCustomReport();
        }
    }

    static closeCustomReport() {
        if (window.AdminPanel) {
            window.AdminPanel.closeCustomReport();
        }
    }

    static closeCustomReportModal() {
        const modal = document.getElementById('customReportModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    exportToCSV(orders, filename) {
        if (orders.length === 0) {
            this.showError('Não há dados para exportar');
            return;
        }

        try {
            // Cabeçalhos do CSV
            let csv = 'ID Pedido,Data,Cliente,Telefone,Total,Status,Pagamento,Entrega,Endereço\n';

            // Adiciona cada pedido
            orders.forEach(order => {
                const date = new Date(order.created_at);
                const row = [
                    `"${order.order_id || order.id}"`,
                    `"${date.toLocaleString('pt-BR')}"`,
                    `"${order.client_name || ''}"`,
                    `"${order.client_phone || ''}"`,
                    `"${parseFloat(order.total_numeric || 0).toFixed(2)}"`,
                    `"${this.getStatusText(order.status || 'pendente')}"`,
                    `"${order.payment_method || ''}"`,
                    `"${order.delivery_option || ''}"`,
                    `"${order.address || ''}"`
                ].join(',');

                csv += row + '\n';
            });

            // Cria blob e faz download
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}.csv`;
            link.click();

            this.showSuccess(`Arquivo ${filename}.csv exportado com sucesso!`);
        } catch (error) {
            console.error('Erro ao exportar CSV:', error);
            this.showError('Erro ao exportar CSV: ' + error.message);
        }
    }

    createPrintModal() {
        const modal = document.createElement('div');
        modal.id = 'printOrderModal';
        modal.className = 'admin-modal print-order-modal';
        modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h2><i class="fas fa-print"></i> Imprimir Pedido</h2>
                <span class="modal-close" id="closePrintModalBtn">&times;</span>
            </div>
            <div id="printOrderContent" class="print-order-content">
                <!-- Conteúdo do pedido para impressão será injetado aqui -->
            </div>
            <div class="print-actions">
                <button class="btn btn-primary" id="printActionBtn">
                    <i class="fas fa-print"></i> Imprimir
                </button>
                <button class="btn btn-secondary" id="downloadPDFBtn">
                    <i class="fas fa-download"></i> Salvar como PDF
                </button>
                <button class="btn btn-ghost" id="cancelPrintBtn">
                    <i class="fas fa-times"></i> Fechar
                </button>
            </div>
        </div>
    `;
        document.body.appendChild(modal);

        // Evento único para todo o modal
        modal.addEventListener('click', (e) => {
            // Fechar modal
            if (e.target === modal ||
                e.target.id === 'closePrintModalBtn' ||
                e.target.id === 'cancelPrintBtn') {
                e.stopPropagation();
                this.closePrintModal();
                return;
            }

            // Botão de imprimir
            if (e.target.id === 'printActionBtn' || e.target.closest('#printActionBtn')) {
                e.stopPropagation();
                window.print();
                return;
            }

            // Botão de download PDF
            if (e.target.id === 'downloadPDFBtn' || e.target.closest('#downloadPDFBtn')) {
                e.stopPropagation();
                this.downloadPrintPDF();
                return;
            }

            // Se clicar no container do modal (não no conteúdo), fecha
            if (e.target.classList.contains('modal-container')) {
                e.stopPropagation();
                this.closePrintModal();
            }
        });

        // Adiciona também evento de tecla ESC
        const handleEscape = (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                this.closePrintModal();
            }
        };

        document.addEventListener('keydown', handleEscape);

        // Guarda a referência para remover depois
        modal._escapeHandler = handleEscape;

        return modal;
    }

    openPrintOrder(orderId) {
        const order = this.orders.find(o => (o.order_id || o.id) === orderId);
        if (!order) {
            this.showError('Pedido não encontrado');
            return;
        }

        let modal = document.getElementById('printOrderModal');
        if (!modal) {
            modal = this.createPrintModal();
        }

        const content = document.getElementById('printOrderContent');
        if (!content) {
            this.showError('Erro ao carregar modal de impressão');
            return;
        }

        const orderDate = new Date(order.created_at);
        const formattedDate = orderDate.toLocaleDateString('pt-BR');
        const formattedTime = orderDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Calcular total dos itens
        let itemsTotal = 0;
        let itemsHtml = '';

        if (order.items && order.items.length > 0) {
            itemsHtml = `
            <table class="print-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantidade</th>
                        <th>Preço Unit.</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => {
                const quantity = item.quantity || 1;
                const price = parseFloat(item.price || 0);
                const total = parseFloat(item.total) || (quantity * price);
                itemsTotal += total;

                return `
                            <tr>
                                <td>${item.product_name || item.name || 'Produto'}</td>
                                <td>${quantity}</td>
                                <td>R$ ${price.toFixed(2)}</td>
                                <td>R$ ${total.toFixed(2)}</td>
                            </tr>
                        `;
            }).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="text-align: right;"><strong>Subtotal:</strong></td>
                        <td><strong>R$ ${itemsTotal.toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        `;
        }

        // Calcular taxas e total final
        const deliveryFee = order.delivery_option === 'entrega' ? 5.00 : 0;
        const orderTotal = itemsTotal + deliveryFee;

        content.innerHTML = `
        <div class="print-header">
            <h2>Jardim Padaria Artesanal</h2>
            <p>Comprovação de Pedido</p>
            <div class="print-subheader">
                <div>
                    <strong>Data:</strong> ${formattedDate}
                </div>
                <div>
                    <strong>Hora:</strong> ${formattedTime}
                </div>
                <div>
                    <strong>Pedido:</strong> ${order.order_id || order.id}
                </div>
            </div>
        </div>
        
        <div class="print-body">
            <div class="print-grid">
                <div class="print-section">
                    <h3><i class="fas fa-user"></i> Informações do Cliente</h3>
                    <div class="print-item">
                        <span class="print-label">Nome:</span>
                        <span class="print-value">${order.client_name || 'Não informado'}</span>
                    </div>
                    <div class="print-item">
                        <span class="print-label">Telefone:</span>
                        <span class="print-value">${this.formatPhone(order.client_phone) || 'Não informado'}</span>
                    </div>
                </div>
                
                <div class="print-section">
                    <h3><i class="fas fa-info-circle"></i> Detalhes do Pedido</h3>
                    <div class="print-item">
                        <span class="print-label">Status:</span>
                        <span class="print-value">
                            <span class="status-badge status-${order.status || 'pendente'}">
                                ${this.getStatusText(order.status || 'pendente')}
                            </span>
                        </span>
                    </div>
                    <div class="print-item">
                        <span class="print-label">Tipo de Entrega:</span>
                        <span class="print-value">
                            ${order.delivery_option === 'retirada' ?
                '<i class="fas fa-store"></i> Retirada na loja' :
                '<i class="fas fa-truck"></i> Entrega em domicílio'}
                        </span>
                    </div>
                    <div class="print-item">
                        <span class="print-label">Forma de Pagamento:</span>
                        <span class="print-value">
                            ${order.payment_method === 'pix' ? 'PIX' :
                order.payment_method === 'cartao' ? 'Cartão de Crédito/Débito' :
                    'Dinheiro'}
                        </span>
                    </div>
                </div>
            </div>
            
            ${order.delivery_option === 'entrega' && order.address ? `
            <div class="print-section">
                <h3><i class="fas fa-map-marker-alt"></i> Endereço de Entrega</h3>
                <div class="print-item">
                    <span class="print-value">${order.address}</span>
                </div>
                ${order.client && order.client.neighborhood ? `
                <div class="print-item">
                    <span class="print-label">Bairro:</span>
                    <span class="print-value">${order.client.neighborhood}</span>
                </div>
                ` : ''}
                ${order.client && order.client.city ? `
                <div class="print-item">
                    <span class="print-label">Cidade:</span>
                    <span class="print-value">${order.client.city}</span>
                </div>
                ` : ''}
            </div>
            ` : ''}
            
            <div class="print-section">
                <h3><i class="fas fa-shopping-basket"></i> Itens do Pedido</h3>
                ${itemsHtml || '<p>Nenhum item encontrado</p>'}
            </div>
            
            <div class="print-summary">
                <h3><i class="fas fa-calculator"></i> Resumo Financeiro</h3>
                <div class="print-grid">
                    <div class="print-item">
                        <span class="print-label">Subtotal dos Itens:</span>
                        <span class="print-value">R$ ${itemsTotal.toFixed(2)}</span>
                    </div>
                    ${deliveryFee > 0 ? `
                    <div class="print-item">
                        <span class="print-label">Taxa de Entrega:</span>
                        <span class="print-value">R$ ${deliveryFee.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="print-item">
                        <span class="print-label">Total do Pedido:</span>
                        <span class="print-value" style="font-size: 1.2rem; font-weight: 700; color: var(--primary);">
                            R$ ${orderTotal.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
            
            ${order.observation ? `
            <div class="print-section">
                <h3><i class="fas fa-comment"></i> Observações</h3>
                <div class="print-item">
                    <span class="print-value" style="font-style: italic;">${order.observation}</span>
                </div>
            </div>
            ` : ''}
            
            <div class="qr-code-container">
                <div class="qr-code">
                    <i class="fas fa-qrcode" style="font-size: 2rem; color: var(--primary);"></i>
                </div>
                <div class="qr-code-text">
                    Código do pedido: ${order.order_id || order.id}
                </div>
            </div>
        </div>
        
        <div class="print-footer">
            <p><strong>Jardim Padaria Artesanal</strong></p>
            <p>Horário de Funcionamento: Segunda a Sábado, 7h às 19h</p>
            <p>Telefone: (11) 99999-9999 | Email: contato@jardimpadaria.com</p>
            <p>Documento gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
    `;
        modal.style.display = 'flex';

        // Bloqueia o scroll da página
        document.body.style.overflow = 'hidden';

        this.currentPrintOrder = order;

        // Foca no modal para eventos de teclado funcionarem
        modal.focus();
    }

    // No método openPrintOrder, atualize a geração do conteúdo:
    renderPrintContent(order) {
        const orderDate = new Date(order.created_at);
        const formattedDate = orderDate.toLocaleDateString('pt-BR');
        const formattedTime = orderDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Calcular total dos itens
        let itemsTotal = 0;
        let itemsHtml = '';

        if (order.items && order.items.length > 0) {
            itemsHtml = order.items.map(item => {
                const quantity = item.quantity || 1;
                const price = parseFloat(item.price || 0);
                const total = parseFloat(item.total) || (quantity * price);
                itemsTotal += total;

                return `
                <tr>
                    <td>${item.product_name || item.name || 'Produto'}</td>
                    <td style="text-align: center;">${quantity}</td>
                    <td style="text-align: right;">R$ ${price.toFixed(2)}</td>
                    <td style="text-align: right;">R$ ${total.toFixed(2)}</td>
                </tr>
            `;
            }).join('');
        }

        // Calcular taxas e total final
        const deliveryFee = order.delivery_option === 'entrega' ? 5.00 : 0;
        const orderTotal = itemsTotal + deliveryFee;

        // Divide o conteúdo em páginas se tiver muitos itens
        const itemsPerPage = 15; // Itens por página
        const totalPages = Math.ceil(order.items?.length / itemsPerPage) || 1;

        let pagesHtml = '';

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const startIdx = (pageNum - 1) * itemsPerPage;
            const endIdx = pageNum * itemsPerPage;
            const pageItems = order.items?.slice(startIdx, endIdx) || [];

            // Calcular subtotal da página
            let pageSubtotal = pageItems.reduce((sum, item) => {
                const quantity = item.quantity || 1;
                const price = parseFloat(item.price || 0);
                return sum + (parseFloat(item.total) || (quantity * price));
            }, 0);

            pagesHtml += `
            <div class="print-page" data-page="${pageNum}" ${pageNum > 1 ? 'style="page-break-before: always;"' : ''}>
                ${pageNum === 1 ? `
                <div class="print-header">
                    <h2>Jardim Padaria Artesanal</h2>
                    <p>Comprovação de Pedido</p>
                    <div class="print-subheader">
                        <div>
                            <strong>Data:</strong> ${formattedDate}
                        </div>
                        <div>
                            <strong>Hora:</strong> ${formattedTime}
                        </div>
                        <div>
                            <strong>Pedido:</strong> ${order.order_id || order.id}
                        </div>
                    </div>
                </div>
                
                <div class="print-body">
                    <div class="print-grid">
                        <div class="print-section">
                            <h3><i class="fas fa-user"></i> Informações do Cliente</h3>
                            <div class="print-item">
                                <span class="print-label">Nome:</span>
                                <span class="print-value">${order.client_name || 'Não informado'}</span>
                            </div>
                            <div class="print-item">
                                <span class="print-label">Telefone:</span>
                                <span class="print-value">${this.formatPhone(order.client_phone) || 'Não informado'}</span>
                            </div>
                        </div>
                        
                        <div class="print-section">
                            <h3><i class="fas fa-info-circle"></i> Detalhes do Pedido</h3>
                            <div class="print-item">
                                <span class="print-label">Status:</span>
                                <span class="print-value">
                                    <span class="status-badge status-${order.status || 'pendente'}">
                                        ${this.getStatusText(order.status || 'pendente')}
                                    </span>
                                </span>
                            </div>
                            <div class="print-item">
                                <span class="print-label">Tipo de Entrega:</span>
                                <span class="print-value">
                                    ${order.delivery_option === 'retirada' ?
                        '<i class="fas fa-store"></i> Retirada na loja' :
                        '<i class="fas fa-truck"></i> Entrega em domicílio'}
                                </span>
                            </div>
                            <div class="print-item">
                                <span class="print-label">Forma de Pagamento:</span>
                                <span class="print-value">
                                    ${order.payment_method === 'pix' ? 'PIX' :
                        order.payment_method === 'cartao' ? 'Cartão de Crédito/Débito' :
                            'Dinheiro'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    ${order.delivery_option === 'entrega' && order.address ? `
                    <div class="print-section">
                        <h3><i class="fas fa-map-marker-alt"></i> Endereço de Entrega</h3>
                        <div class="print-item">
                            <span class="print-value">${order.address}</span>
                        </div>
                        ${order.client && order.client.neighborhood ? `
                        <div class="print-item">
                            <span class="print-label">Bairro:</span>
                            <span class="print-value">${order.client.neighborhood}</span>
                        </div>
                        ` : ''}
                        ${order.client && order.client.city ? `
                        <div class="print-item">
                            <span class="print-label">Cidade:</span>
                            <span class="print-value">${order.client.city}</span>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                ` : ''}
                
                <div class="print-section">
                    <h3><i class="fas fa-shopping-basket"></i> Itens do Pedido ${totalPages > 1 ? `(Página ${pageNum} de ${totalPages})` : ''}</h3>
                    <table class="print-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th style="width: 60px;">Qtd</th>
                                <th style="width: 100px;">Preço Unit.</th>
                                <th style="width: 100px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pageItems.map(item => {
                                const quantity = item.quantity || 1;
                                const price = parseFloat(item.price || 0);
                                const total = parseFloat(item.total) || (quantity * price);

                                return `
                                    <tr>
                                        <td>${item.product_name || item.name || 'Produto'}</td>
                                        <td style="text-align: center;">${quantity}</td>
                                        <td style="text-align: right;">R$ ${price.toFixed(2)}</td>
                                        <td style="text-align: right;">R$ ${total.toFixed(2)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        ${pageNum === totalPages ? `
                        <tfoot>
                            <tr>
                                <td colspan="3" style="text-align: right;"><strong>Subtotal:</strong></td>
                                <td style="text-align: right;"><strong>R$ ${itemsTotal.toFixed(2)}</strong></td>
                            </tr>
                            ${deliveryFee > 0 ? `
                            <tr>
                                <td colspan="3" style="text-align: right;"><strong>Taxa de Entrega:</strong></td>
                                <td style="text-align: right;"><strong>R$ ${deliveryFee.toFixed(2)}</strong></td>
                            </tr>
                            ` : ''}
                            <tr style="font-weight: 700; background: var(--accent-light);">
                                <td colspan="3" style="text-align: right;"><strong>Total do Pedido:</strong></td>
                                <td style="text-align: right; font-size: 1.1em; color: var(--primary);">
                                    <strong>R$ ${orderTotal.toFixed(2)}</strong>
                                </td>
                            </tr>
                        </tfoot>
                        ` : `
                        <tfoot>
                            <tr>
                                <td colspan="3" style="text-align: right;"><strong>Subtotal (Página ${pageNum}):</strong></td>
                                <td style="text-align: right;"><strong>R$ ${pageSubtotal.toFixed(2)}</strong></td>
                            </tr>
                        </tfoot>
                        `}
                    </table>
                </div>
                
                ${pageNum === totalPages ? `
                <div class="print-summary">
                    <h3><i class="fas fa-calculator"></i> Resumo Financeiro</h3>
                    <div class="print-grid">
                        <div class="print-item">
                            <span class="print-label">Subtotal dos Itens:</span>
                            <span class="print-value">R$ ${itemsTotal.toFixed(2)}</span>
                        </div>
                        ${deliveryFee > 0 ? `
                        <div class="print-item">
                            <span class="print-label">Taxa de Entrega:</span>
                            <span class="print-value">R$ ${deliveryFee.toFixed(2)}</span>
                        </div>
                        ` : ''}
                        <div class="print-item">
                            <span class="print-label">Total do Pedido:</span>
                            <span class="print-value" style="font-size: 1.2rem; font-weight: 700; color: var(--primary);">
                                R$ ${orderTotal.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
                
                ${order.observation ? `
                <div class="print-section">
                    <h3><i class="fas fa-comment"></i> Observações</h3>
                    <div class="print-item">
                        <span class="print-value" style="font-style: italic;">${order.observation}</span>
                    </div>
                </div>
                ` : ''}
                
                <div class="qr-code-container">
                    <div class="qr-code">
                        <i class="fas fa-qrcode" style="font-size: 2rem; color: var(--primary);"></i>
                    </div>
                    <div class="qr-code-text">
                        Código do pedido: ${order.order_id || order.id}
                    </div>
                </div>
                
                <div class="print-footer">
                    <p><strong>Jardim Padaria Artesanal</strong></p>
                    <p>Horário de Funcionamento: Segunda a Sábado, 7h às 19h</p>
                    <p>Telefone: (11) 99999-9999 | Email: contato@jardimpadaria.com</p>
                    <p>Página ${pageNum} de ${totalPages} | Documento gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                </div>
                ` : ''}
            </div>
        </div>
        `;
        }

        return pagesHtml;
    }

    closePrintModal() {
        const modal = document.getElementById('printOrderModal');
        if (modal) {
            modal.style.display = 'none';

            // Remove o evento ESC
            if (modal._escapeHandler) {
                document.removeEventListener('keydown', modal._escapeHandler);
                delete modal._escapeHandler;
            }

            // Restaura o scroll da página
            document.body.style.overflow = 'auto';
        }
        this.currentPrintOrder = null;
    }

    downloadPrintPDF() {
        if (!this.currentPrintOrder) {
            this.showError('Nenhum pedido selecionado para exportar');
            return;
        }

        this.exportOrderToPDF(this.currentPrintOrder);
    }

    exportOrderToPDF(order) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Configurações da página
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 15;
            let yPos = 20;
            let currentPage = 1;

            // Função para adicionar nova página
            const addNewPage = () => {
                doc.addPage();
                currentPage++;
                yPos = 20;
                addPageHeader();
            };

            // Função para verificar se precisa de nova página
            const checkNewPage = (spaceNeeded = 10) => {
                if (yPos + spaceNeeded > pageHeight - margin) {
                    addNewPage();
                    return true;
                }
                return false;
            };

            // Função para adicionar cabeçalho em cada página
            const addPageHeader = () => {
                doc.setFontSize(12);
                doc.setTextColor(28, 61, 45);
                doc.text('Jardim Padaria Artesanal', pageWidth / 2, 10, { align: 'center' });

                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(`Pedido: ${order.order_id || order.id}`, margin, 15);
                doc.text(`Página ${currentPage}`, pageWidth - margin, 15, { align: 'right' });

                // Linha divisória
                doc.setDrawColor(200);
                doc.setLineWidth(0.3);
                doc.line(margin, 18, pageWidth - margin, 18);
            };

            // Cabeçalho da primeira página
            addPageHeader();
            yPos = 25;

            // Título principal
            doc.setFontSize(16);
            doc.setTextColor(28, 61, 45);
            doc.text('COMPROVANTE DE PEDIDO', pageWidth / 2, yPos, { align: 'center' });

            yPos += 10;

            // Informações básicas
            doc.setFontSize(10);
            doc.setTextColor(0);

            const orderDate = new Date(order.created_at);
            doc.text(`Data: ${orderDate.toLocaleDateString('pt-BR')}`, margin, yPos);
            doc.text(`Hora: ${orderDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin, yPos, { align: 'right' });

            yPos += 8;
            doc.text(`Status: ${this.getStatusText(order.status || 'pendente')}`, margin, yPos);

            yPos += 15;

            // Informações do cliente
            doc.setFont(undefined, 'bold');
            doc.text('CLIENTE:', margin, yPos);
            doc.setFont(undefined, 'normal');
            doc.text(order.client_name || 'Não informado', margin + 20, yPos);

            yPos += 6;
            doc.setFont(undefined, 'bold');
            doc.text('TELEFONE:', margin, yPos);
            doc.setFont(undefined, 'normal');
            doc.text(this.formatPhone(order.client_phone) || 'Não informado', margin + 25, yPos);

            yPos += 6;
            doc.setFont(undefined, 'bold');
            doc.text('ENTREGA:', margin, yPos);
            doc.setFont(undefined, 'normal');
            doc.text(order.delivery_option === 'retirada' ? 'Retirada na loja' : 'Entrega em domicílio', margin + 25, yPos);

            yPos += 6;
            doc.setFont(undefined, 'bold');
            doc.text('PAGAMENTO:', margin, yPos);
            doc.setFont(undefined, 'normal');
            doc.text(order.payment_method === 'pix' ? 'PIX' :
                order.payment_method === 'cartao' ? 'Cartão' : 'Dinheiro', margin + 30, yPos);

            yPos += 10;

            // Endereço (se for entrega)
            if (order.delivery_option === 'entrega' && order.address) {
                checkNewPage(15);

                doc.setFont(undefined, 'bold');
                doc.text('ENDEREÇO DE ENTREGA:', margin, yPos);
                doc.setFont(undefined, 'normal');

                yPos += 6;

                // Divide o endereço em linhas se for muito longo
                const addressLines = doc.splitTextToSize(order.address, pageWidth - (margin * 2) - 10);
                addressLines.forEach(line => {
                    checkNewPage(6);
                    doc.text(line, margin + 5, yPos);
                    yPos += 5;
                });

                yPos += 5;
            }

            yPos += 5;
            checkNewPage();

            // Itens do pedido
            doc.setFont(undefined, 'bold');
            doc.text('ITENS DO PEDIDO:', margin, yPos);
            yPos += 8;

            let itemsTotal = 0;
            const itemHeight = 6; // Altura estimada por linha de item

            if (order.items && order.items.length > 0) {
                // Cabeçalho da tabela
                checkNewPage(15);

                doc.setFontSize(9);
                doc.setTextColor(255);
                doc.setFillColor(28, 61, 45);
                doc.rect(margin, yPos, pageWidth - (margin * 2), 6, 'F');

                doc.text('Item', margin + 2, yPos + 4);
                doc.text('Qtd', pageWidth - 50, yPos + 4, { align: 'right' });
                doc.text('Unit.', pageWidth - 30, yPos + 4, { align: 'right' });
                doc.text('Total', pageWidth - margin - 2, yPos + 4, { align: 'right' });

                yPos += 8;
                doc.setTextColor(0);

                // Processa cada item
                order.items.forEach((item, index) => {
                    const quantity = item.quantity || 1;
                    const price = parseFloat(item.price || 0);
                    const total = parseFloat(item.total) || (quantity * price);
                    itemsTotal += total;

                    // Divide o nome do item se for muito longo
                    const itemName = item.product_name || item.name || 'Produto';
                    const maxNameWidth = pageWidth - (margin * 2) - 60; // 60px para as colunas à direita

                    const nameLines = doc.splitTextToSize(itemName, maxNameWidth);

                    // Verifica espaço para todas as linhas do item
                    const spaceNeeded = (nameLines.length * 5) + 2;
                    if (checkNewPage(spaceNeeded)) {
                        // Adiciona cabeçalho da tabela na nova página
                        doc.setFontSize(9);
                        doc.setTextColor(255);
                        doc.setFillColor(28, 61, 45);
                        doc.rect(margin, yPos, pageWidth - (margin * 2), 6, 'F');

                        doc.text('Item', margin + 2, yPos + 4);
                        doc.text('Qtd', pageWidth - 50, yPos + 4, { align: 'right' });
                        doc.text('Unit.', pageWidth - 30, yPos + 4, { align: 'right' });
                        doc.text('Total', pageWidth - margin - 2, yPos + 4, { align: 'right' });

                        yPos += 8;
                        doc.setTextColor(0);
                    }

                    // Nome do item (pode ser múltiplas linhas)
                    nameLines.forEach((line, lineIndex) => {
                        doc.text(line, margin + 2, yPos);

                        // Apenas na primeira linha, mostra quantidade, preço e total
                        if (lineIndex === 0) {
                            doc.text(`${quantity}`, pageWidth - 50, yPos, { align: 'right' });
                            doc.text(`R$ ${price.toFixed(2)}`, pageWidth - 30, yPos, { align: 'right' });
                            doc.text(`R$ ${total.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: 'right' });
                        }

                        yPos += 5;
                    });

                    yPos += 2; // Espaço entre itens
                });
            }

            yPos += 5;
            checkNewPage(20);

            // Linha divisória
            doc.setDrawColor(200);
            doc.setLineWidth(0.3);
            doc.line(margin, yPos, pageWidth - margin, yPos);

            yPos += 10;

            // Resumo financeiro
            const deliveryFee = order.delivery_option === 'entrega' ? 5.00 : 0;
            const orderTotal = itemsTotal + deliveryFee;

            doc.setFont(undefined, 'bold');
            doc.text('Subtotal:', pageWidth - 60, yPos, { align: 'right' });
            doc.text(`R$ ${itemsTotal.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: 'right' });

            yPos += 7;

            if (deliveryFee > 0) {
                doc.text('Taxa de Entrega:', pageWidth - 60, yPos, { align: 'right' });
                doc.text(`R$ ${deliveryFee.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: 'right' });
                yPos += 7;
            }

            doc.setFontSize(11);
            doc.setTextColor(28, 61, 45);
            doc.text('TOTAL DO PEDIDO:', pageWidth - 60, yPos, { align: 'right' });
            doc.text(`R$ ${orderTotal.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: 'right' });

            yPos += 15;
            checkNewPage(30);

            // Observações
            if (order.observation) {
                doc.setFontSize(9);
                doc.setTextColor(100);
                doc.setFont(undefined, 'italic');

                doc.text('OBSERVAÇÕES:', margin, yPos);
                yPos += 5;

                // Divide observações em múltiplas linhas se necessário
                const observationLines = doc.splitTextToSize(order.observation, pageWidth - (margin * 2));

                observationLines.forEach(line => {
                    checkNewPage(6);
                    doc.text(line, margin, yPos);
                    yPos += 5;
                });

                yPos += 5;
            }

            // Informações da empresa (em todas as páginas)
            const addCompanyInfo = () => {
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.setFont(undefined, 'normal');

                const footerY = pageHeight - 15;

                doc.text('Jardim Padaria Artesanal', pageWidth / 2, footerY - 12, { align: 'center' });
                doc.text('Horário: Segunda a Sábado, 7h às 19h', pageWidth / 2, footerY - 8, { align: 'center' });
                doc.text('Telefone: (11) 99999-9999 | Email: contato@jardimpadaria.com', pageWidth / 2, footerY - 4, { align: 'center' });
                doc.text(`Documento gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, footerY, { align: 'center' });
            };

            // Adiciona informações da empresa em todas as páginas
            for (let i = 1; i <= currentPage; i++) {
                doc.setPage(i);
                addCompanyInfo();
            }

            // Salvar PDF
            const fileName = `Pedido_${order.order_id || order.id}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
            doc.save(fileName);

            this.showSuccess(`PDF do pedido gerado com sucesso! (${currentPage} página${currentPage > 1 ? 's' : ''})`);

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            this.showError('Erro ao gerar PDF: ' + error.message);
        }
    }

    closePrintModal() {
        const modal = document.getElementById('printOrderModal');
        if (modal) {
            modal.style.display = 'none';

            // Remove o evento ESC
            if (modal._escapeHandler) {
                document.removeEventListener('keydown', modal._escapeHandler);
                delete modal._escapeHandler;
            }

            // Restaura o scroll da página
            document.body.style.overflow = 'auto';
        }
        this.currentPrintOrder = null;
    }

    closeEditStatusModal() {
        const modal = document.getElementById('editStatusModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    closeModal() {
        const modal = document.getElementById('orderModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // --- NOVAS FUNÇÕES DE RELATÓRIOS ---

    viewReport(reportData) {
        const modal = document.getElementById('reportViewerModal');
        const content = document.getElementById('reportViewerContent');
        
        if (!modal || !content) {
            console.error('Elementos do visualizador de relatório não encontrados');
            return;
        }

        // Se reportData for uma string (ID), busca no histórico
        let report = reportData;
        if (typeof reportData === 'string') {
            const history = JSON.parse(localStorage.getItem('admin_reports_history') || '[]');
            report = history.find(r => r.id === reportData);
        }

        if (!report) {
            this.showError('Relatório não encontrado');
            return;
        }

        // Se for PDF, tentamos gerar um blob para visualização
        if (report.format === 'pdf') {
            this.previewPDFReport(report);
            return;
        }

        content.innerHTML = `
            <div class="report-preview">
                <div class="report-preview-header">
                    <h3>${report.type}</h3>
                    <p><strong>Período:</strong> ${report.period}</p>
                    <p><strong>Gerado em:</strong> ${new Date(report.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div class="report-preview-body">
                    <div class="report-placeholder">
                        <i class="fas fa-file-${report.format === 'pdf' ? 'pdf' : 'excel'} fa-4x"></i>
                        <p>Visualização prévia do arquivo: <strong>${report.file}</strong></p>
                        <div class="report-actions" style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center;">
                            <button class="btn btn-primary" onclick="AdminPanel.downloadReport('${report.id}')">
                                <i class="fas fa-download"></i> Baixar Arquivo
                            </button>
                            <button class="btn btn-secondary" onclick="AdminPanel.closeReportViewer()">
                                <i class="fas fa-times"></i> Fechar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    async previewPDFReport(report) {
        const modal = document.getElementById('reportViewerModal');
        const content = document.getElementById('reportViewerContent');
        
        this.showLoading(true);
        
        // Limpa cache anterior
        if (this.currentPDF.url) {
            URL.revokeObjectURL(this.currentPDF.url);
        }
        
        try {
            let reportType = report.template || 'general';
            
            if (reportType === 'general' || reportType === report.type) {
                const typeLower = report.type.toLowerCase();
                if (typeLower.includes('diário')) reportType = 'daily';
                else if (typeLower.includes('semanal')) reportType = 'weekly';
                else if (typeLower.includes('mensal')) reportType = 'monthly';
                else if (typeLower.includes('financeiro')) reportType = 'financial';
                else if (typeLower.includes('produtos')) reportType = 'products';
                else if (typeLower.includes('cozinha')) reportType = 'kitchen';
                else if (typeLower.includes('entrega')) reportType = 'delivery';
                else if (typeLower.includes('cliente')) reportType = 'client';
            }

            const response = await fetch(`${window.location.origin}/.netlify/functions/reports-generate?type=${reportType}`);
            const result = await response.json();

            if (result.success) {
                const { metrics, data, period } = result;
                const periodText = `${new Date(period.start).toLocaleDateString('pt-BR')} - ${new Date(period.end).toLocaleDateString('pt-BR')}`;
                
                // Gera o PDF uma única vez
                const doc = this.generatePDFDocument(data.orders, metrics, report.type, periodText, reportType);
                const pdfBlob = doc.output('blob');
                const pdfUrl = URL.createObjectURL(pdfBlob);
                const filename = `${report.type.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;

                // Salva no cache da instância
                this.currentPDF = {
                    blob: pdfBlob,
                    url: pdfUrl,
                    filename: filename
                };

                content.innerHTML = `
                    <div class="report-toolbar">
                        <div class="report-info">
                            <h3>${report.type}</h3>
                            <p>${periodText} | Gerado em: ${new Date(report.date).toLocaleString('pt-BR')}</p>
                        </div>
                        <div class="report-actions">
                            <button class="btn btn-primary" onclick="window.open('${pdfUrl}', '_blank')">
                                <i class="fas fa-external-link-alt"></i> Abrir em Nova Aba
                            </button>
                            <button class="btn btn-secondary" onclick="window.AdminPanel.printCurrentPDF()">
                                <i class="fas fa-print"></i> Imprimir
                            </button>
                            <button class="btn btn-info" onclick="window.AdminPanel.downloadCurrentPDF()">
                                <i class="fas fa-download"></i> Baixar
                            </button>
                        </div>
                    </div>
                    <div class="report-viewer" style="flex: 1; height: 100%;">
                        <iframe src="${pdfUrl}" width="100%" height="100%" style="border: none;"></iframe>
                    </div>
                `;
                
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Erro ao visualizar PDF:', error);
            this.showError('Não foi possível carregar a visualização do PDF.');
        } finally {
            this.showLoading(false);
        }
    }

    printCurrentPDF() {
        if (this.currentPDF.url) {
            AdminPanel.printPDF(this.currentPDF.url);
        }
    }

    downloadCurrentPDF() {
        if (this.currentPDF.blob && this.currentPDF.filename) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(this.currentPDF.blob);
            link.download = this.currentPDF.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    static printPDF(url) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            iframe.contentWindow.print();
        };
    }

    closeReportViewer() {
        const modal = document.getElementById('reportViewerModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    static async downloadReport(reportId) {
        const history = JSON.parse(localStorage.getItem('admin_reports_history') || '[]');
        const report = history.find(r => r.id === reportId);
        
        if (report && window.AdminPanel) {
            if (report.format === 'pdf') {
                // Se o PDF já estiver em cache (sendo visualizado), usa ele
                if (window.AdminPanel.currentPDF.blob) {
                    window.AdminPanel.downloadCurrentPDF();
                    return;
                }

                window.AdminPanel.showLoading(true);
                try {
                    let reportType = report.template || 'general';
                    const response = await fetch(`${window.location.origin}/.netlify/functions/reports-generate?type=${reportType}`);
                    const result = await response.json();

                    if (result.success) {
                        const { metrics, data, period } = result;
                        const periodText = `${new Date(period.start).toLocaleDateString('pt-BR')} - ${new Date(period.end).toLocaleDateString('pt-BR')}`;
                        window.AdminPanel.exportEnhancedPDF(data.orders, metrics, report.type, periodText, reportType);
                    }
                } catch (e) {
                    window.AdminPanel.showError('Erro ao baixar relatório');
                } finally {
                    window.AdminPanel.showLoading(false);
                }
            } else {
                window.AdminPanel.showSuccess(`Iniciando download de: ${report.file}`);
            }
        }
    }

    static printPDF(url) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            iframe.contentWindow.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        };
    }

    static deleteReport(reportId) {
        if (!confirm('Deseja realmente excluir este relatório do histórico?')) return;
        
        let history = JSON.parse(localStorage.getItem('admin_reports_history') || '[]');
        history = history.filter(r => r.id !== reportId);
        localStorage.setItem('admin_reports_history', JSON.stringify(history));
        
        if (window.AdminPanel) {
            window.AdminPanel.loadReportsHistory();
            window.AdminPanel.showSuccess('Relatório removido do histórico');
        }
    }
}

// Inicializa quando o DOM carrega
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado, inicializando AdminPanel Enhanced...');
    window.AdminPanel = new AdminPanel();

    // Adiciona animação CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
});