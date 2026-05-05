console.log('🔧 Supabase Client carregando...');

// Classe para simular o query builder do Supabase
class SupabaseQueryBuilder {
    constructor(table, apiBase) {
        this.table = table;
        this.apiBase = apiBase;
        this.filters = {};
        this.options = {};
    }

    select(columns = '*') {
        this.columns = columns;
        return this;
    }

    contains(column, value) {
        this.filters.contains = { column, value };
        return this;
    }

    eq(column, value) {
        this.filters.eq = { column, value };
        return this;
    }

    limit(count) {
        this.options.limit = count;
        return this;
    }

    order(column, options = {}) {
        this.options.order = { column, options };
        return this;
    }

    async then(callback) {
        try {
            let endpoint = '';
            let params = {};
            
            if (this.table === 'products') {
                endpoint = 'get-products';
                
                // Adiciona filtros se existirem
                if (this.filters.contains) {
                    const { column, value } = this.filters.contains;
                    params = { ...params, filter_column: column, filter_value: JSON.stringify(value) };
                }
                
                if (this.options.limit) {
                    params = { ...params, limit: this.options.limit };
                }
            }
            
            const queryString = Object.keys(params).length > 0 
                ? '?' + new URLSearchParams(params).toString()
                : '';
            
            const response = await fetch(`${this.apiBase}/${endpoint}${queryString}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            // Estrutura o resultado no formato esperado pelo código
            const formattedResult = {
                data: result.success ? (result.products || result.data || []) : [],
                error: result.success === false ? new Error(result.error || 'Erro desconhecido') : null
            };
            
            return callback(formattedResult);
            
        } catch (error) {
            console.error(`❌ Erro na requisição para ${this.table}:`, error);
            return callback({ data: [], error });
        }
    }

    // Para compatibilidade com o padrão then() do Supabase
    single() {
        return this.then(result => {
            if (result.data && result.data.length > 0) {
                return { data: result.data[0], error: null };
            }
            return { data: null, error: new Error('Nenhum registro encontrado') };
        });
    }

    maybeSingle() {
        return this.single();
    }
}

// Tenta carregar o Supabase real
async function initializeSupabase() {
    try {
        // URL base da API (Netlify Functions)
        // No Netlify Dev, a porta padrão é 8888. Se estivermos no localhost mas não na 8888, tentamos forçar a 8888 para as funções.
        let origin = window.location.origin;
        if (window.location.hostname === 'localhost' && window.location.port !== '8888') {
            origin = window.location.protocol + '//' + window.location.hostname + ':8888';
        }
        const API_BASE = origin + '/.netlify/functions/supabase-proxy';
        
        console.log('🔗 Testando conexão com API...');
        
        try {
            const testResponse = await fetch(`${API_BASE}/health`);
            if (testResponse.ok) {
                console.log('✅ API Netlify Functions funcionando');
                
                // Cria cliente Supabase para uso via proxy
                const supabase = {
                    from: (table) => {
                        console.log(`📊 Criando query builder para tabela: ${table}`);
                        return new SupabaseQueryBuilder(table, API_BASE);
                    },
                    
                    // Método insert
                    fromInsert: (table) => ({
                        insert: (data, options = {}) => ({
                            select: (columns = '*') => ({
                                single: async () => {
                                    try {
                                        let endpoint = '';
                                        let method = 'POST';
                                        
                                        if (table === 'orders') {
                                            endpoint = 'save-order';
                                        } else if (table === 'clients') {
                                            endpoint = 'save-client';
                                        }
                                        
                                        if (endpoint) {
                                            console.log(`📝 Enviando dados para ${endpoint}:`, data);
                                            const response = await fetch(`${API_BASE}/${endpoint}`, {
                                                method: method,
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(data)
                                            });
                                            
                                            const result = await response.json();
                                            return {
                                                data: result.success ? (result.orderId ? { id: result.orderId } : result.client) : null,
                                                error: result.success === false ? new Error(result.error) : null
                                            };
                                        }
                                        
                                        return { data: { id: 'mock_' + Date.now() }, error: null };
                                    } catch (error) {
                                        return { data: null, error };
                                    }
                                }
                            })
                        })
                    }),
                    
                    // Método rpc (simulado)
                    rpc: (fnName, params) => {
                        console.log(`🔄 RPC: ${fnName}`, params);
                        return {
                            then: async (callback) => {
                                callback({ data: null, error: null });
                            }
                        };
                    }
                };
                
                // Adiciona insert como método direto para compatibilidade
                supabase.insert = (table, data) => supabase.fromInsert(table).insert(data);
                
                console.log('✅ Supabase via API inicializado');
                return supabase;
            }
        } catch (apiError) {
            console.warn('⚠️ API não disponível, usando mock:', apiError.message);
        }
        
        // Se API não funcionar, usa mock
        console.log('🔄 Usando Supabase Mock');
        return createMockSupabase();
        
    } catch (error) {
        console.warn('⚠️ Não foi possível inicializar Supabase, usando mock:', error.message);
        return createMockSupabase();
    }
}

// Função de fallback (mock)
function createMockSupabase() {
    console.log('🔄 Usando Supabase Mock para desenvolvimento');
    
    // Classe mock do query builder
    class MockQueryBuilder {
        constructor(table) {
            this.table = table;
            this.filters = {};
            this.options = {};
        }

        select(columns = '*') {
            this.columns = columns;
            return this;
        }

        contains(column, value) {
            this.filters.contains = { column, value };
            return this;
        }

        eq(column, value) {
            this.filters.eq = { column, value };
            return this;
        }

        limit(count) {
            this.options.limit = count;
            return this;
        }

        order(column, options = {}) {
            this.options.order = { column, options };
            return this;
        }

        single() {
            return Promise.resolve({ data: null, error: null });
        }

        maybeSingle() {
            return this.single();
        }

        async then(callback) {
            const mockData = getMockData(this.table, this.filters, this.options);
            return callback({ data: mockData, error: null });
        }
    }
    
    return {
        from: (table) => {
            console.log(`📊 Mock: query builder para ${table}`);
            return new MockQueryBuilder(table);
        },
        
        insert: (table, data) => {
            console.log(`📝 Mock: insert em ${table}`, data);
            return {
                then: async (callback) => {
                    callback({ data: [{ id: 'mock_' + Date.now() }], error: null });
                }
            };
        },
        
        rpc: (fnName, params) => {
            console.log(`🔄 Mock RPC: ${fnName}`, params);
            return {
                then: async (callback) => {
                    callback({ data: null, error: null });
                }
            };
        }
    };
}

// Dados mock
function getMockData(table, filters = {}, options = {}) {
    if (table === 'products') {
        const allProducts = [
            { 
                id: '1', 
                name: 'Ciabatta Clássica', 
                price: 8.00, 
                category: 'Pães', 
                available_days: ['quarta', 'quinta', 'sexta', 'sabado'], 
                description: 'Ciabatta de fermentação natural', 
                ingredients: 'Farinha, água, sal, fermento natural' 
            },
            { 
                id: '2', 
                name: 'Brioche Tradicional', 
                price: 10.00, 
                category: 'Pães', 
                available_days: ['quarta', 'quinta', 'sexta', 'sabado'], 
                description: 'Brioche macio e amanteigado', 
                ingredients: 'Farinha, ovos, manteiga, açúcar, fermento' 
            },
            { 
                id: '3', 
                name: 'Cinnamon Roll', 
                price: 12.00, 
                category: 'Doces', 
                available_days: ['quarta', 'quinta', 'sexta', 'sabado'], 
                description: 'Enrolado de canela com cobertura de cream cheese', 
                ingredients: 'Massa de brioche, canela, açúcar, cream cheese' 
            }
        ];
        
        // Aplica filtros
        let filteredProducts = [...allProducts];
        
        if (filters.contains) {
            const { column, value } = filters.contains;
            filteredProducts = filteredProducts.filter(product => {
                return product[column] && product[column].includes(value);
            });
        }
        
        // Aplica limite
        if (options.limit) {
            filteredProducts = filteredProducts.slice(0, options.limit);
        }
        
        return filteredProducts;
    }
    return [];
}

// Inicializa e exporta a Promise de inicialização
const supabasePromise = initializeSupabase();

// Torna o cliente Supabase disponível globalmente
supabasePromise.then(client => {
    window.supabase = client;
    console.log('Supabase disponível globalmente como window.supabase');
    
    // Dispara evento para que outros scripts saibam que o Supabase está pronto
    window.dispatchEvent(new CustomEvent('supabase-ready', { detail: client }));
});

// Exporta um objeto vazio para satisfazer imports
export const supabase = {};