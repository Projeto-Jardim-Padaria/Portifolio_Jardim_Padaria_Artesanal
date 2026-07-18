const { createClient } = require('@supabase/supabase-js');

// Função auxiliar para stats vazios
const getEmptyStats = () => {
    return {
        total: 0,
        pendente: 0,
        preparando: 0,
        pronto: 0,
        entregue: 0,
        cancelado: 0,
        total_value: 0
    };
};

// Função para calcular stats
const calculateStats = (orders) => {
    try {
        const stats = getEmptyStats();
        stats.total = orders.length;

        orders.forEach(order => {
            const status = order.status || 'pendente';
            
            // Conta por status
            switch(status.toLowerCase()) {
                case 'pendente':
                    stats.pendente++;
                    break;
                case 'preparando':
                    stats.preparando++;
                    break;
                case 'pronto':
                    stats.pronto++;
                    break;
                case 'entregue':
                    stats.entregue++;
                    break;
                case 'cancelado':
                    stats.cancelado++;
                    break;
                default:
                    stats.pendente++;
            }

            // Soma valores - tenta diferentes nomes de coluna
            let value = 0;
            if (order.total_amount !== undefined && order.total_amount !== null) {
                value = parseFloat(order.total_amount);
            } else if (order.total !== undefined && order.total !== null) {
                value = parseFloat(order.total);
            } else if (order.value !== undefined && order.value !== null) {
                value = parseFloat(order.value);
            }
            
            if (!isNaN(value) && status.toLowerCase() !== 'cancelado') {
                stats.total_value += value;
            }
        });

        return stats;
    } catch (e) {
        console.warn('Erro ao calcular stats:', e);
        return getEmptyStats();
    }
};

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        console.log('📊 Iniciando get-admin-stats...');
        
        const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();
        
        if (!supabaseUrl || !supabaseKey) {
            console.log('⚠️ Credenciais do Supabase não encontradas');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    stats: getEmptyStats(),
                    message: 'Usando stats locais'
                })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        
        try {
            // Tenta buscar pedidos com diferentes nomes de coluna
            let orders = [];
            let error = null;
            
            // Tenta primeiro com total_amount
            const result1 = await supabase
                .from('orders')
                .select('status, total_amount')
                .limit(1000);
                
            if (!result1.error && result1.data) {
                orders = result1.data;
                console.log('✅ Stats buscados com total_amount');
            } else {
                // Tenta com total (outro nome possível)
                const result2 = await supabase
                    .from('orders')
                    .select('status, total')
                    .limit(1000);
                    
                if (!result2.error && result2.data) {
                    orders = result2.data;
                    console.log('✅ Stats buscados com total');
                } else {
                    // Tenta apenas com status
                    const result3 = await supabase
                        .from('orders')
                        .select('status')
                        .limit(1000);
                        
                    if (!result3.error && result3.data) {
                        orders = result3.data.map(o => ({ ...o, total: 0, total_amount: 0 }));
                        console.log('✅ Stats buscados apenas com status');
                    } else {
                        error = result1.error || result2.error || result3.error;
                    }
                }
            }

            if (error) {
                console.warn('⚠️ Erro ao buscar pedidos para stats:', error.message);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ 
                        success: true, 
                        stats: getEmptyStats(),
                        message: 'Erro ao buscar pedidos, usando stats vazios'
                    })
                };
            }

            // Calcula estatísticas
            const stats = calculateStats(orders || []);
            
            console.log('✅ Estatísticas calculadas:', stats);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    stats: stats,
                    count: orders?.length || 0
                })
            };

        } catch (queryError) {
            console.warn('⚠️ Exceção na consulta:', queryError.message);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    stats: getEmptyStats(),
                    message: 'Exceção na consulta, usando stats vazios'
                })
            };
        }

    } catch (error) {
        console.error('❌ Erro geral em get-admin-stats:', error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                stats: getEmptyStats(),
                message: 'Erro geral, usando stats vazios',
                error: error.message
            })
        };
    }
};