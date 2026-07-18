const { createClient } = require('@supabase/supabase-js');

const getSupabase = () => {
    const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
    // No seu ambiente, a SERVICE_ROLE_KEY (que ignora RLS) está na variável SUPABASE_SERVICE_KEY
    // enquanto a SUPABASE_SERVICE_ROLE_KEY parece conter a chave anônima.
    // Vamos priorizar a SUPABASE_SERVICE_KEY para garantir que o upload funcione.
    const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();
    
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Configurações do Supabase (URL ou Key) não encontradas no ambiente.');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
};

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido' }) };
    }

    try {
        const supabase = getSupabase();
        const body = JSON.parse(event.body);
        const { fileName, fileType, fileData } = body;

        if (!fileName || !fileData) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Dados do arquivo incompletos' }) };
        }

        // Converter base64 para Buffer
        const buffer = Buffer.from(fileData.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        
        // Gerar um nome único para o arquivo
        const timestamp = Date.now();
        const cleanFileName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const finalPath = `products/${timestamp}_${cleanFileName}`;

        // Upload para o Supabase Storage (bucket 'product-images')
        const { data, error } = await supabase.storage
            .from('product-images')
            .upload(finalPath, buffer, {
                contentType: fileType,
                upsert: true
            });

        if (error) {
            if (error.status === 404 || error.message.includes('Bucket not found')) {
                throw new Error('O bucket "product-images" não foi encontrado no Supabase. Por favor, crie um bucket público chamado "product-images" no painel do Supabase.');
            }
            throw error;
        }

        // Obter a URL pública
        const { data: publicUrlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(finalPath);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                imageUrl: publicUrlData.publicUrl 
            })
        };

    } catch (err) {
        console.error('Erro no upload:', err);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ success: false, message: err.message }) 
        };
    }
};
