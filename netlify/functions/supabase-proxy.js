// netlify/functions/supabase-proxy.js

const { createClient } = require('@supabase/supabase-js');

// ============================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================

// Tenta obter das variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.SITE_URL || 'https://jardim-padaria.netlify.app';

// Detecta ambiente
const isNetlify = process.env.NETLIFY === 'true' || process.env.NETLIFY_DEV === 'true';
const isLocalDev = process.env.NETLIFY_DEV === 'true' || !process.env.NETLIFY;

console.log('🚀 Inicializando Supabase Proxy');
console.log('📊 Ambiente:', isLocalDev ? 'Desenvolvimento Local' : 'Produção Netlify');
console.log('🔗 SUPABASE_URL:', supabaseUrl ? `✓ ${supabaseUrl.substring(0, 30)}...` : '✗ Não configurado');
console.log('🔑 Service Key:', supabaseKey ? '✓ Configurada' : '✗ Não configurada');

// Inicializa Supabase (se tiver credenciais)
let supabase = null;
let supabaseConnected = false;

if (supabaseUrl && supabaseKey) {
    try {
        console.log('🔄 Conectando ao Supabase...');
        supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            },
            db: {
                schema: 'public'
            }
        });
        
        console.log('✅ Cliente Supabase criado');
        supabaseConnected = true;
        
    } catch (error) {
        console.error('❌ Erro ao criar cliente Supabase:', error.message);
        supabaseConnected = false;
    }
} else {
    console.error('❌ Credenciais do Supabase não configuradas!');
    console.error('⚠️ Configure SUPABASE_URL e SUPABASE_SERVICE_KEY nas variáveis de ambiente');
    supabaseConnected = false;
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

exports.handler = async (event, context) => {
    console.log(`\n🌐 ${new Date().toISOString()} - ${event.httpMethod} ${event.path}`);
    
    // Configura CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Trata requisições OPTIONS (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Roteamento baseado no path
        const path = event.path.replace('/.netlify/functions/supabase-proxy', '');
        
        console.log(`📍 Rota solicitada: ${path}`);
        console.log(`🔧 Supabase: ${supabaseConnected ? 'CONECTADO' : 'NÃO CONECTADO'}`);

        // Log do body (para debug)
        if (event.body && event.httpMethod === 'POST') {
            try {
                const body = JSON.parse(event.body);
                console.log('📦 Body recebido:', {
                    hasClient: !!body.client,
                    hasOrder: !!body.order,
                    itemsCount: body.items?.length || 0
                });
            } catch (e) {
                console.log('📦 Body (não JSON):', event.body?.substring(0, 200));
            }
        }

        // Verifica se o Supabase está conectado para rotas que precisam dele
        if (!supabaseConnected && (path === '/save-order' || path === '/save-client' || path.startsWith('/get-order/'))) {
            console.error('❌ Supabase não conectado para rota:', path);
            return {
                statusCode: 503,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Serviço de banco de dados indisponível',
                    message: 'O Supabase não está configurado ou não conseguiu conectar',
                    instructions: 'Verifique as variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY'
                })
            };
        }

        // Roteamento
        switch(true) {
            case path === '/health':
                return await handleHealthCheck(event, headers);
                
            case path === '/get-products':
                return await handleGetProducts(event, headers);
                
            case path === '/save-order':
                return await handleSaveOrder(event, headers);
                
            case path === '/save-client':
                return await handleSaveClient(event, headers);
                
            case path.startsWith('/get-order/'):
                return await handleGetOrder(event, headers);
                
            default:
                console.log(`❌ Rota não encontrada: ${path}`);
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ 
                        success: false, 
                        error: 'Rota não encontrada',
                        path: path,
                        available_routes: [
                            '/health',
                            '/get-products',
                            '/save-order', 
                            '/save-client',
                            '/get-order/:id'
                        ]
                    })
                };
        }
        
    } catch (error) {
        console.error('❌ Erro não tratado no handler:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Erro interno do servidor',
                message: error.message,
                stack: isLocalDev ? error.stack : undefined
            })
        };
    }
};

// ============================================
// HANDLERS
// ============================================

async function handleHealthCheck(event, headers) {
    console.log('🩺 Health check request');
    
    let supabaseStatus = 'disconnected';
    
    if (supabaseConnected && supabase) {
        try {
            // Testa conexão real com o Supabase
            const { data, error } = await supabase
                .from('products')
                .select('id')
                .limit(1);
            
            if (error) {
                console.error('❌ Erro ao testar conexão com Supabase:', error);
                supabaseStatus = 'error';
            } else {
                supabaseStatus = 'connected';
                console.log('✅ Teste de conexão com Supabase bem-sucedido');
            }
        } catch (testError) {
            console.error('❌ Erro no teste de conexão:', testError);
            supabaseStatus = 'error';
        }
    }
    
    const healthStatus = {
        success: true,
        message: 'API funcionando',
        timestamp: new Date().toISOString(),
        environment: isLocalDev ? 'development' : 'production',
        supabase: supabaseStatus,
        supabaseConnected: supabaseConnected,
        supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'not configured',
        siteUrl: siteUrl
    };
    
    if (supabaseStatus !== 'connected') {
        healthStatus.warning = 'Supabase não está conectado corretamente';
        healthStatus.instructions = 'Verifique SUPABASE_URL e SUPABASE_SERVICE_KEY nas variáveis de ambiente';
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(healthStatus)
    };
}

async function handleGetProducts(event, headers) {
    console.log('📦 Buscando produtos do Supabase...');
    
    try {
        const params = event.queryStringParameters || {};
        const limit = params.limit ? parseInt(params.limit) : null;
        const filterColumn = params.filter_column;
        const filterValue = params.filter_value ? JSON.parse(params.filter_value) : null;
        
        console.log('🔍 Parâmetros:', { limit, filterColumn, filterValue });
        
        if (!supabaseConnected || !supabase) {
            throw new Error('Supabase não está conectado');
        }
        
        // Query base
        let query = supabase
            .from('products')
            .select('*');
        
        // Sempre filtrar produtos que não estão disponíveis hoje para o frontend
        query = query.neq('is_available', false);
        
        // Aplica filtro se especificado
        if (filterColumn === 'available_days' && filterValue) {
            console.log(`🔍 Filtrando por dia: ${filterValue}`);
            query = query.contains('available_days', [filterValue]);
        }
        
        // Ordenação padrão
        query = query.order('category', { ascending: true })
                     .order('name', { ascending: true });
        
        // Aplica limite se especificado
        if (limit && limit > 0) {
            query = query.limit(limit);
        }
        
        const { data: products, error } = await query;
        
        if (error) {
            console.error('❌ Erro do Supabase:', error);
            throw error;
        }
        
        console.log(`✅ ${products?.length || 0} produtos encontrados no banco`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                products: products || [],
                count: products?.length || 0,
                source: 'supabase',
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('❌ Erro ao buscar produtos:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: error.message,
                message: 'Erro ao buscar produtos do banco de dados'
            })
        };
    }
}

async function handleSaveOrder(event, headers) {
    console.log('💾 Salvando pedido no Supabase...');
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Método não permitido. Use POST.' 
            })
        };
    }
    
    try {
        const body = JSON.parse(event.body || '{}');
        const { client, order, items } = body;
        
        if (!client || !order) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Dados do pedido incompletos' 
                })
            };
        }
        
        if (!supabaseConnected || !supabase) {
            throw new Error('Supabase não está conectado');
        }
        
        console.log('👤 Cliente:', client.name);
        console.log('📱 Telefone:', client.phone);
        console.log('📦 Itens do pedido:', order.items?.length || items?.length || 0);
        console.log('💰 Total: R$', order.total);
        
        // ============================================
        // PASSO 1: Verifica/Insere o cliente
        // ============================================
        
        let clientId = null;
        
        if (!client.phone) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Telefone do cliente é obrigatório' 
                })
            };
        }
        
        console.log(`🔍 Buscando cliente pelo telefone: ${client.phone}`);
        
        // Busca cliente existente
        const { data: existingClient, error: clientSearchError } = await supabase
            .from('clients')
            .select('id, name, phone, address')
            .eq('phone', client.phone)
            .maybeSingle();
        
        if (clientSearchError) {
            console.error('❌ Erro ao buscar cliente:', clientSearchError);
        }
        
        if (existingClient) {
            console.log('✅ Cliente encontrado, ID:', existingClient.id);
            clientId = existingClient.id;
            
            // Atualiza dados do cliente
            const updateData = {
                name: client.name || existingClient.name,
                updated_at: new Date().toISOString()
            };
            
            // Atualiza endereço se fornecido
            if (client.address) {
                updateData.address = client.address;
                updateData.cep = client.cep || '';
                updateData.street = client.street || '';
                updateData.address_number = client.number || client.address_number || '';
                updateData.neighborhood = client.neighborhood || '';
                updateData.city = client.city || client.city_state || '';
                updateData.complement = client.complement || '';
            }
            
            if (client.observation) {
                updateData.observation = client.observation;
            }
            
            console.log('🔄 Atualizando dados do cliente...');
            const { error: updateError } = await supabase
                .from('clients')
                .update(updateData)
                .eq('id', clientId);
            
            if (updateError) {
                console.error('❌ Erro ao atualizar cliente:', updateError);
                // Continua mesmo com erro na atualização
            }
            
        } else {
            console.log('➕ Criando novo cliente');
            
            // Prepara dados do cliente
            const clientData = {
                name: client.name || '',
                phone: client.phone,
                address: client.address || '',
                cep: client.cep || '',
                street: client.street || '',
                address_number: client.number || client.address_number || '',
                neighborhood: client.neighborhood || '',
                city: client.city || client.city_state || '',
                complement: client.complement || '',
                observation: client.observation || ''
            };
            
            // Remove campos undefined
            Object.keys(clientData).forEach(key => {
                if (clientData[key] === undefined) clientData[key] = '';
            });
            
            console.log('📄 Dados do cliente para inserção:', clientData);
            
            const { data: newClient, error: createError } = await supabase
                .from('clients')
                .insert([clientData])
                .select()
                .single();
            
            if (createError) {
                console.error('❌ Erro ao criar cliente:', createError);
                throw new Error(`Erro ao criar cliente: ${createError.message}`);
            }
            
            console.log('✅ Novo cliente criado, ID:', newClient.id);
            clientId = newClient.id;
        }
        
        // ============================================
        // PASSO 2: Cria o pedido
        // ============================================
        
        console.log('📝 Criando pedido para cliente ID:', clientId);
        
        // Gera ID único para o pedido
        const orderId = 'JD' + Date.now().toString().slice(-6) + 
                       Math.random().toString(36).substr(2, 3).toUpperCase();
        
const orderData = {
    client_id: clientId,
    order_id: orderId,
    total: parseFloat(order.total || 0),
    subtotal: parseFloat(order.subtotal || order.total || 0),
    delivery_fee: parseFloat(order.deliveryFee || 0),
    // CORREÇÃO: Garantir que o método de pagamento seja salvo corretamente
    payment_method: order.payment_method || order.paymentMethod || 'pix',
    delivery_option: order.delivery_option || order.deliveryOption || 'entrega',
    address: client.address || 'Retirada na Loja',
    observation: order.observation || client.observation || '',
    status: 'pendente'
};

console.log('📄 Dados do pedido salvos:', {
    total: orderData.total,
    payment_method: orderData.payment_method,
    delivery_option: orderData.delivery_option,
    address: orderData.address,
    observation: orderData.observation
});
        
        const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();
        
        if (orderError) {
            console.error('❌ Erro ao criar pedido:', orderError);
            throw new Error(`Erro ao criar pedido: ${orderError.message}`);
        }
        
        console.log('✅ Pedido criado, ID:', newOrder.id);
        
        // ============================================
        // PASSO 3: Adiciona os itens do pedido
        // ============================================
        
        const itemsToSave = items || order.items || [];
        
        if (itemsToSave.length > 0) {
            console.log(`➕ Adicionando ${itemsToSave.length} itens ao pedido...`);
            
            const orderItems = itemsToSave.map(item => ({
                order_id: newOrder.id,
                product_id: item.id || null,
                product_name: item.product_name || 'Produto',
                quantity: parseInt(item.quantity || 1),
                price: parseFloat(item.price || 0),
                total: parseFloat((item.price || 0) * (item.quantity || 1))
            }));
            
            console.log('🛒 Itens do pedido preparados:', orderItems.length);
            
            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);
            
            if (itemsError) {
                console.error('❌ Erro ao adicionar itens:', itemsError);
                // Não lança erro aqui para não perder o pedido já criado
                console.log('⚠️ Pedido criado, mas itens não foram salvos:', itemsError.message);
            } else {
                console.log('✅ Itens do pedido adicionados com sucesso');
            }
        }
        
        // Gera link para visualização do pedido
       const orderDetailLink = `${siteUrl}/order.html?orderId=${orderId}`;
        
        console.log('🔗 Link do pedido gerado:', orderDetailLink);
        console.log('🎉 Pedido salvo com sucesso no banco de dados!');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                message: 'Pedido salvo com sucesso no banco de dados',
                orderId: orderId,
                orderDbId: newOrder.id,
                clientId: clientId,
                orderDetailLink: orderDetailLink,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('❌ Erro ao salvar pedido:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: error.message,
                message: 'Erro ao salvar pedido no banco de dados'
            })
        };
    }
}

async function handleSaveClient(event, headers) {
    console.log('👤 Salvando/atualizando cliente...');
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Método não permitido' 
            })
        };
    }
    
    try {
        const client = JSON.parse(event.body || '{}');
        
        if (!client.phone) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Telefone é obrigatório' 
                })
            };
        }
        
        if (!supabaseConnected || !supabase) {
            throw new Error('Supabase não está conectado');
        }
        
        // Busca cliente existente
        const { data: existingClient, error: searchError } = await supabase
            .from('clients')
            .select('id')
            .eq('phone', client.phone)
            .maybeSingle();
        
        let result;
        
        if (existingClient) {
            // Atualiza cliente existente
            const updateData = {
                name: client.name || '',
                address: client.address || '',
                cep: client.cep || '',
                street: client.street || '',
                address_number: client.address_number || client.number || '',
                neighborhood: client.neighborhood || '',
                city: client.city || client.city_state || '',
                complement: client.complement || '',
                observation: client.observation || '',
                updated_at: new Date().toISOString()
            };
            
            const { data: updatedClient, error: updateError } = await supabase
                .from('clients')
                .update(updateData)
                .eq('id', existingClient.id)
                .select()
                .single();
            
            if (updateError) throw updateError;
            
            result = {
                action: 'updated',
                client: updatedClient
            };
            
        } else {
            // Cria novo cliente
            const clientData = {
                name: client.name || '',
                phone: client.phone,
                address: client.address || '',
                cep: client.cep || '',
                street: client.street || '',
                address_number: client.address_number || client.number || '',
                neighborhood: client.neighborhood || '',
                city: client.city || client.city_state || '',
                complement: client.complement || '',
                observation: client.observation || ''
            };
            
            const { data: newClient, error: createError } = await supabase
                .from('clients')
                .insert([clientData])
                .select()
                .single();
            
            if (createError) throw createError;
            
            result = {
                action: 'created',
                client: newClient
            };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                ...result,
                message: `Cliente ${result.action === 'created' ? 'criado' : 'atualizado'} com sucesso`
            })
        };
        
    } catch (error) {
        console.error('❌ Erro ao salvar cliente:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: error.message,
                message: 'Erro ao salvar cliente'
            })
        };
    }
}

async function handleGetOrder(event, headers) {
    console.log('📋 Buscando pedido no banco...');
    
    try {
        const pathParts = event.path.split('/');
        let orderId = pathParts[pathParts.length - 1];
        
        if (!orderId || orderId === 'get-order') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'ID do pedido não fornecido' 
                })
            };
        }
        
        if (!supabaseConnected || !supabase) {
            throw new Error('Supabase não está conectado');
        }
        
        console.log(`🔍 Buscando pedido com ID: ${orderId}`);
        
        // Busca pedido pelo order_id
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('order_id', orderId)
            .single();
        
        if (orderError || !order) {
            console.error('❌ Pedido não encontrado:', orderError?.message || 'Nenhum resultado');
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Pedido não encontrado',
                    message: 'O pedido solicitado não existe ou foi removido'
                })
            };
        }
        
        // Busca cliente
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', order.client_id)
            .single();
        
        if (clientError) {
            console.error('❌ Erro ao buscar cliente:', clientError);
            throw clientError;
        }
        
        // Busca itens
        const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);
        
        if (itemsError) {
            console.error('❌ Erro ao buscar itens:', itemsError);
            throw itemsError;
        }
        
        // Formata resposta
const orderData = {
    client: {
        name: client.name || client.full_name || order.client_name || '',
        phone: client.phone || order.client_phone || '',
        address: order.address || '',
        cep: client.cep || '',
        street: client.street || '',
        number: client.address_number || '',
        neighborhood: client.neighborhood || '',
        city: client.city || client.city_state || '',
        complement: client.complement || '', observation: client.observation || order.observation || ''
    },
    order: {
        total: order.total_amount || order.total || 0,
        subtotal: order.subtotal || 0,
        deliveryFee: order.delivery_fee || 0,
        paymentMethod: order.payment_method || 'pix',
        deliveryOption: order.delivery_option || 'entrega', observation: order.observation || ''
    },
    items: items.map(item => ({
        id: item.id,
        name: item.product_name || 'Produto',
        price: item.price || item.unit_price || 0,
        quantity: item.quantity || 1
    }))
};
        
        console.log(`✅ Pedido encontrado: ${order.order_id} com ${items?.length || 0} itens`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                orderData: orderData,
                message: 'Pedido encontrado com sucesso'
            })
        };
        
    } catch (error) {
        console.error('❌ Erro ao buscar pedido:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: error.message,
                message: 'Erro ao buscar detalhes do pedido'
            })
        };
    }
}