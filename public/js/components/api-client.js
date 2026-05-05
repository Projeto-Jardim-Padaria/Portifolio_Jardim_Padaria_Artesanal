class ApiClient {
    constructor() {
        // Detecta se está rodando via Netlify Dev (porta 8888) ou servidor direto
        const isNetlify = window.location.port === '8888' || window.location.hostname.includes('netlify.app') || window.location.hostname === 'localhost';
        
        let origin = '';
        if (window.location.hostname === 'localhost' && window.location.port !== '8888') {
            origin = window.location.protocol + '//' + window.location.hostname + ':8888';
        }
        
        this.baseUrl = isNetlify ? origin + '/.netlify/functions' : '/api';
        console.log('🌐 API Client inicializado para:', this.baseUrl);
    }

    async _makeRequest(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        try {
            console.log(`📤 ${method} ${url}`, data ? 'com dados' : '');
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(` HTTP ${response.status}: ${errorText}`);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log(` ${method} ${endpoint} - Sucesso:`, result.success !== false);
            return result;
            
        } catch (error) {
            console.error(` Erro na requisição para ${endpoint}:`, error);
            throw error;
        }
    }

    async saveOrder(orderData) {
        console.log(' Salvando pedido via API...');
        
        try {
            const dataToSend = {
                client: orderData.client || {},
                order: {
                    total: orderData.order?.total || orderData.total || 0,
                    subtotal: orderData.order?.subtotal || orderData.subtotal || 0,
                    deliveryFee: orderData.order?.deliveryFee || orderData.deliveryFee || 0,
                    payment_method: orderData.order?.paymentMethod || orderData.paymentMethod || 'pix',
                    delivery_option: orderData.order?.deliveryOption || orderData.deliveryOption || 'entrega',
                    observation: orderData.order?.observation || orderData.observation || ''
                },
                items: orderData.items || [],
                // Campos para compatibilidade com server.js
                cart: orderData.cart || orderData.items || [],
                total: orderData.total || orderData.order?.total || 0
            };

            const endpoint = this.baseUrl.includes('.netlify') ? '/save-order' : '/saveOrder';
            return await this._makeRequest(endpoint, 'POST', dataToSend);
        } catch (error) {
            console.error(' Erro ao preparar pedido:', error);
            throw error;
        }
    }

    async saveClient(clientData) {
        console.log(' Salvando cliente via API...');
        return await this._makeRequest('/save-client', 'POST', clientData);
    }

    async getClient(phone) {
        console.log(' Buscando cliente via API...');
        return await this._makeRequest(`/get-client?phone=${encodeURIComponent(phone)}`, 'GET');
    }

    async getProducts() {
        console.log(' Buscando produtos via API...');
        return await this._makeRequest('/produtos', 'GET');
    }

    async getOrder(orderId) {
        console.log(` Buscando pedido ${orderId}...`);
        return await this._makeRequest(`/orders/${orderId}`, 'GET');
    }

    async healthCheck() {
        console.log(' Verificando saúde da API...');
        return await this._makeRequest('/health', 'GET');
    }

    // NOVA FUNÇÃO: Para corrigir método de pagamento
    async fixPaymentMethod(orderId, correctMethod) {
        console.log(` Corrigindo método de pagamento do pedido ${orderId} para ${correctMethod}`);
        return await this._makeRequest('/fix-payment-methods', 'POST', {
            orderId: orderId,
            correctPaymentMethod: correctMethod
        });
    }

    // NOVA FUNÇÃO: Buscar cliente por telefone (nova API)
    async getClientByPhone(phone) {
        console.log(` Buscando cliente por telefone: ${phone}`);
        return await this._makeRequest('/get-client-by-phone', 'POST', { phone: phone });
    }

    // NOVA FUNÇÃO: Buscar os últimos 3 pedidos (Geral)
    async getRecentOrders() {
        console.log(` Buscando os últimos 3 pedidos...`);
        // No Netlify o endpoint é /get-all-orders
        const endpoint = this.baseUrl.includes('.netlify') ? '/get-all-orders' : '/orders';
        return await this._makeRequest(endpoint, 'GET');
    }

    // NOVA FUNÇÃO: Buscar os últimos 3 pedidos por telefone
    async getRecentOrdersByPhone(phone) {
        console.log(` Buscando os últimos 3 pedidos para o telefone ${phone}...`);
        // No Netlify, o endpoint mapeia para o nome do arquivo da função
        const endpoint = this.baseUrl.includes('.netlify') ? `/get-orders-by-phone?phone=${encodeURIComponent(phone)}` : `/orders/by-phone?phone=${encodeURIComponent(phone)}`;
        return await this._makeRequest(endpoint, 'GET');
    }

    // Função para buscar detalhes de um pedido específico (já existe, mas ajustando o endpoint)
    async getOrderDetails(orderId) {
        console.log(` Buscando detalhes do pedido ID: ${orderId}...`);
        // O endpoint correto no Netlify é /get-order/{id}
        const endpoint = this.baseUrl.includes('.netlify') ? `/get-order/${orderId}` : `/orders/${orderId}`;
        return await this._makeRequest(endpoint, 'GET');
    }
}

// Cria instância global
const apiClient = new ApiClient();

// Exporta para uso global
window.ApiClient = apiClient;

// Export default
export default apiClient;