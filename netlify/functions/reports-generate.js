const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { type, startDate, endDate } = event.queryStringParameters || {};
        
        const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();

        if (!supabaseUrl || !supabaseKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ success: false, message: 'Supabase não configurado' })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Buscar todos os pedidos e itens para processamento local
        // Em um sistema real, faríamos filtros no banco, mas para relatórios pequenos
        // buscar tudo e processar em JS é mais flexível.
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
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ success: false, message: ordersError.message })
            };
        }

        let filteredOrders = orders || [];
        const now = new Date();
        let start = startDate ? new Date(startDate) : null;
        let end = endDate ? new Date(endDate) : new Date();
        
        // Ajustar fim do dia para incluir todo o dia selecionado
        if (end) end.setHours(23, 59, 59, 999);

        if (type === 'daily') {
            start = new Date();
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
        } else if (type === 'weekly') {
            start = new Date();
            start.setDate(now.getDate() - 7);
            start.setHours(0, 0, 0, 0);
        } else if (type === 'monthly') {
            start = new Date();
            start.setDate(now.getDate() - 30);
            start.setHours(0, 0, 0, 0);
        }

        if (start) {
            filteredOrders = filteredOrders.filter(order => {
                const orderDate = new Date(order.created_at || order.date);
                return orderDate >= start && orderDate <= end;
            });
        }

        // Calcular métricas
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount || o.total) || 0), 0);
        const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
        
        const statusCount = {};
        const paymentCount = {};
        const productSales = {};

        filteredOrders.forEach(order => {
            const status = order.status || 'pendente';
            statusCount[status] = (statusCount[status] || 0) + 1;
            
            const pm = order.payment_method || order.paymentMethod || 'não informado';
            paymentCount[pm] = (paymentCount[pm] || 0) + 1;

            (order.order_items || []).forEach(item => {
                const name = item.product_name || 'Produto';
                if (!productSales[name]) {
                    productSales[name] = { quantity: 0, revenue: 0 };
                }
                productSales[name].quantity += (item.quantity || 0);
                productSales[name].revenue += (parseFloat(item.price) || 0) * (item.quantity || 0);
            });
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                period: { start, end },
                metrics: {
                    totalOrders: filteredOrders.length,
                    totalRevenue,
                    avgOrderValue
                },
                data: {
                    orders: filteredOrders.map(o => {
                        const clientData = o.clients || {};
                        return {
                            id: o.id,
                            order_id: o.order_id,
                            created_at: o.created_at,
                            client_name: clientData.name || o.client_name || 'N/A',
                            client_phone: clientData.phone || o.client_phone || 'N/A',
                            address: o.address || clientData.address || 'N/A',
                            total: o.total_amount || o.total,
                            status: o.status,
                            payment_method: o.payment_method || o.paymentMethod || 'N/A'
                        };
                    }),
                    statusCount,
                    paymentCount,
                    productSales: Object.entries(productSales)
                        .map(([name, stats]) => ({ name, ...stats }))
                        .sort((a, b) => b.revenue - a.revenue)
                }
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Erro ao gerar relatório', error: error.message })
        };
    }
};
