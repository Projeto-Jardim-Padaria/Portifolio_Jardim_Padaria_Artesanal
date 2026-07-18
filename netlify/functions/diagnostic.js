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

    try {
        const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();
        
        console.log('🔍 Diagnosticando configuração do Supabase...');
        console.log('📊 Ambiente:', process.env.NODE_ENV);
        console.log('🔗 SUPABASE_URL presente:', !!supabaseUrl);
        console.log('🔑 SUPABASE_SERVICE_KEY presente:', !!supabaseKey);
        
        if (supabaseUrl) {
            console.log('📋 SUPABASE_URL (início):', supabaseUrl.substring(0, 30) + '...');
        }
        
        if (!supabaseUrl || !supabaseKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Credenciais do Supabase faltando',
                    environment_variables: {
                        SUPABASE_URL: supabaseUrl ? 'presente' : 'ausente',
                        SUPABASE_SERVICE_KEY: supabaseKey ? 'presente' : 'ausente',
                        NODE_ENV: process.env.NODE_ENV || 'not set'
                    }
                })
            };
        }

        // Testa conexão com Supabase
        let supabase;
        try {
            supabase = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    persistSession: false
                }
            });
            console.log('✅ Cliente Supabase criado');
        } catch (clientError) {
            console.error('❌ Erro ao criar cliente Supabase:', clientError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Erro ao criar cliente Supabase',
                    error: clientError.message
                })
            };
        }

        // Testa consulta simples
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('id')
                .limit(1);

            if (error) {
                console.error('❌ Erro na consulta de teste:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Erro na consulta ao Supabase',
                        error: error.message,
                        details: error
                    })
                };
            }

            console.log('✅ Conexão com Supabase bem-sucedida');
            
            // Testa tabelas
            const tables = ['orders', 'clients', 'order_items', 'products'];
            const tableStatus = {};
            
            for (const table of tables) {
                try {
                    const { data, error } = await supabase
                        .from(table)
                        .select('count')
                        .limit(1);
                    
                    tableStatus[table] = error ? `❌ ${error.message}` : '✅ OK';
                } catch (e) {
                    tableStatus[table] = `❌ ${e.message}`;
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Diagnóstico completo',
                    supabase_connected: true,
                    supabase_url_present: true,
                    supabase_key_present: true,
                    test_query: 'OK',
                    tables: tableStatus,
                    environment: {
                        NODE_ENV: process.env.NODE_ENV || 'not set',
                        NETLIFY: process.env.NETLIFY || 'not set',
                        NETLIFY_DEV: process.env.NETLIFY_DEV || 'not set'
                    }
                })
            };

        } catch (testError) {
            console.error('❌ Erro no teste de conexão:', testError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Erro no teste de conexão',
                    error: testError.message
                })
            };
        }

    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Erro no diagnóstico',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};