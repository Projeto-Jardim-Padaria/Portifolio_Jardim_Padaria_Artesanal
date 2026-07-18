const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
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
        
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ success: false, message: error.message })
            };
        }

        const formattedProducts = (products || []).map(product => {
            const rawImageUrl = product.image_url || product.image || '';
            // Suporte a múltiplas imagens: URLs separadas por '|'
            const imageUrls = rawImageUrl
                ? rawImageUrl.split('|').map(u => u.trim()).filter(Boolean)
                : [];
            const primeiraImagem = imageUrls[0] || '/img/logos/Logo.png';

            return {
                id: product.id,
                nome: product.name,
                descricao: product.description,
                preco: product.price,
                categoria: product.category,
                imagem: primeiraImagem,
                image_urls: imageUrls,
                dias_disponiveis: product.available_days || [],
                is_available: product.is_available !== undefined ? product.is_available : true,
                name: product.name,
                description: product.description,
                price: product.price,
                category: product.category,
                available_days: product.available_days,
                image_url: rawImageUrl
            };
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                products: formattedProducts,
                count: formattedProducts.length
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};
