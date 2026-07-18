const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Configuração do Supabase
    const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase credentials missing');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Supabase não configurado' 
            })
        };
    }

    try {
        console.log('📋 Buscando todos os pedidos...');
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Busca todos os pedidos com dados do cliente e itens
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                *,
                clients!orders_client_id_fkey (
                    name,
                    phone,
                    address,
                    street,
                    address_number,
                    neighborhood,
                    city,
                    complement,
                    cep
                ),
                order_items (
                    id,
                    product_id,
                    product_name,
                    quantity,
                    price,
                    total
                )
            `)
            .order('created_at', { ascending: false });

        if (ordersError) {
            console.error('❌ Erro ao buscar pedidos:', ordersError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Erro ao buscar pedidos',
                    error: ordersError.message 
                })
            };
        }

        // Função para formatar o telefone no padrão brasileiro
        const formatPhone = (phone) => {
            if (!phone) return '';
            
            // Converte para string e remove todos os caracteres não numéricos
            let phoneStr = String(phone).replace(/\D/g, '');
            
            // Se estiver vazio após limpeza, retorna vazio
            if (!phoneStr) return '';
            
            // Remove o código do país se existir (55)
            if (phoneStr.length > 10 && phoneStr.startsWith('55')) {
                phoneStr = phoneStr.substring(2);
            }
            
            // Formatação baseada no comprimento do número
            if (phoneStr.length === 10) {
                // Formato para telefone fixo: (83) 3214-5678
                return `(${phoneStr.substring(0,2)}) ${phoneStr.substring(2,6)}-${phoneStr.substring(6)}`;
            } else if (phoneStr.length === 11) {
                // Formato para celular: (83) 98719-4754
                return `(${phoneStr.substring(0,2)}) ${phoneStr.substring(2,7)}-${phoneStr.substring(7)}`;
            } else if (phoneStr.length === 8 || phoneStr.length === 9) {
                // Formato antigo (sem DDD): 3214-5678 ou 98719-4754
                if (phoneStr.length === 8) {
                    return `${phoneStr.substring(0,4)}-${phoneStr.substring(4)}`;
                } else {
                    return `${phoneStr.substring(0,5)}-${phoneStr.substring(5)}`;
                }
            }
            
            // Retorna o número sem formatação se não corresponder aos padrões
            return phoneStr;
        };

        // Formata os pedidos
        const formattedOrders = (orders || []).map(order => {
            // Se não tiver cliente relacionado, tenta usar os campos diretos
            const clientData = order.clients || {};
            
            // Obtém o telefone do cliente
            const rawPhone = clientData.phone || order.client_phone || '';
            const formattedPhone = formatPhone(rawPhone);
            
            return {
                id: order.id,
                order_id: order.order_id,
                client_id: order.client_id,
                client_name: clientData.name || order.client_name || 'N/A',
                // Usa o telefone formatado
                client_phone: formattedPhone,
                total: order.total || order.total_amount || 0,
                total_amount: order.total_amount || order.total || 0,
                subtotal: order.subtotal,
                delivery_fee: order.delivery_fee || order.deliveryFee || 0,
                delivery_option: order.delivery_option || order.deliveryOption || 'entrega',
                payment_method: order.payment_method || order.paymentMethod || 'pix',
                address: order.address || clientData.address || '',
                observation: order.observation || '',
                status: order.status || 'pendente',
                created_at: order.created_at,
                items: order.order_items || [],
                client: {
                    name: clientData.name || '',
                    phone: formattedPhone, // Usa o mesmo telefone formatado
                    address: clientData.address || '',
                    street: clientData.street || '',
                    number: clientData.address_number || '',
                    neighborhood: clientData.neighborhood || '',
                    city: clientData.city || '',
                    complement: clientData.complement || '',
                    cep: clientData.cep || ''
                }
            };
        });

        console.log(`✅ ${formattedOrders.length} pedidos encontrados`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                orders: formattedOrders,
                count: formattedOrders.length
            })
        };

    } catch (error) {
        console.error('❌ Erro no get-all-orders:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Erro interno ao buscar pedidos',
                error: error.message 
            })
        };
    }
};