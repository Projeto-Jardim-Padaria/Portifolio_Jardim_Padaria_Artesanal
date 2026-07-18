const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    try {
        const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();
        
        if (!supabaseUrl || !supabaseKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Supabase não configurado' })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Busca alguns registros de cada tabela para ver a estrutura
        const tables = ['orders', 'clients', 'order_items', 'products'];
        const results = {};
        
        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .limit(2);
                    
                if (error) {
                    results[table] = { error: error.message };
                } else if (data && data.length > 0) {
                    // Pega apenas as chaves do primeiro registro
                    results[table] = {
                        columns: Object.keys(data[0]),
                        sample: data[0]
                    };
                } else {
                    results[table] = { message: 'Tabela vazia' };
                }
            } catch (e) {
                results[table] = { error: e.message };
            }
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                tables: results,
                message: 'Estrutura das tabelas analisada'
            })
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack 
            })
        };
    }
};