const { createClient } = require('@supabase/supabase-js');

// Nome da função: delete-product.js (ou o nome do arquivo)
// Deve ser colocado no diretório de funções do seu provedor (ex: netlify/functions/delete-product.js)

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        // CORREÇÃO: O método agora é DELETE, conforme o frontend
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS', 
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // CORREÇÃO: Espera-se o método DELETE
    if (event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Método não permitido. Use DELETE.' 
            })
        };
    }

    try {
        // CORREÇÃO: O ID é passado via query string (ex: /delete-product?id=...)
        const { id } = event.queryStringParameters; 
        console.log(' Excluindo produto ID:', id);
        
        if (!id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'ID do produto é obrigatório na query string.' 
                })
            };
        }

        const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();
        
        if (!supabaseUrl || !supabaseKey) {
            console.error(' Credenciais do Supabase faltando');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Supabase não configurado. Verifique as variáveis de ambiente.' 
                })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Não é estritamente necessário verificar a existência antes de deletar, 
        // mas é uma boa prática para retornar 404 se o produto não existir.
        const { data: existingProduct, error: checkError } = await supabase
            .from('products')
            .select('id')
            .eq('id', id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = No rows found
            console.error(' Erro ao verificar produto:', checkError);
            throw checkError;
        }
        
        if (!existingProduct) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Produto não encontrado para exclusão.' 
                })
            };
        }

        // Exclui o produto
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro do Supabase ao excluir produto:', error);
            throw error;
        }

        console.log('Produto excluído com sucesso');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                message: 'Produto excluído com sucesso'
            })
        };

    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Erro interno ao excluir produto',
                error: error.message 
            })
        };
    }
};