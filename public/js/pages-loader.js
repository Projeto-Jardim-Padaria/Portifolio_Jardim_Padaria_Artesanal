// ============================================
// CARREGADOR DE PÁGINAS
// ============================================

class PagesLoader {
    constructor() {
        this.pagesContent = {
            'inicio': this.getInicioContent(),
            'sobre': this.getSobreContent(),
            'cuidados': this.getCuidadosContent(),
            'pedidos': this.getPedidosContent(),
            'feedbacks': this.getFeedbacksContent(),
        };
        this.footerContent = this.getFooterContent();
        this.loadedPages = new Set();
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.loadAllPages();
        });
    }

    loadAllPages() {
    // Carrega conteúdo em todas as páginas apenas se não estiverem carregadas
    for (const [pageId, content] of Object.entries(this.pagesContent)) {
        const pageElement = document.getElementById(`page-${pageId}`);
        if (pageElement && !this.loadedPages.has(pageId)) {
            pageElement.innerHTML = content;
            this.loadedPages.add(pageId);
        }
    }

    // Inicializa a aplicação após carregar todo o conteúdo
    setTimeout(() => {
        if (typeof initializeApp === 'function') {
            initializeApp();
        }
        this.loadFooter();
    }, 100);
}

    loadFooter() {
        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (footerPlaceholder) {
            footerPlaceholder.innerHTML = this.getFooterContent();
        }
    }

    //removido o card visite nossa loja, pois a padaria é apenas delivery e não tem loja física
    getInicioContent() {
    return `
        <!-- Hero Section -->
        <section class="hero">
            <div class="container">
                <div class="hero-content">
                    <h2 class="hero-title">Bem-vindo ao Jardim Padaria Artesanal</h2>
                    <p class="hero-subtitle">Produtos artesanais feitos com amor e ingredientes de qualidade. Cada pão é uma obra de arte, cada doce é um carinho especial.</p>
                </div>
                
                <div class="hero-info">

                    <div class="info-card">
                        <div class="info-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" stroke-width="2" fill="none"/>
                                <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="info-content">
                            <h4>Horário de Funcionamento</h4>
                            <p>Qua a Sex: 14h – 18h</p>
                        </div>
                    </div>
                    
                    <div class="info-card" id="cardFeirinhas">
                        <div class="info-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="info-content" id="cardFeirinhasContent">
                            <h4>Avisos de Feirinha</h4>
                            <p style="color: #999; font-size: 0.9em;">Só avisos de feirinhas aparecem aqui.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

            <!-- Carrossel de Produtos -->
            <section class="products-carousel-section">
                <div class="container">
                    <h3>Nossas Delícias</h3>
                    <p class="section-subtitle">Conheça alguns dos nossos produtos artesanais</p>
                    
                    <div class="carousel-container products-carousel">
                        <div class="carousel-slide">
                            <img src="img/produtos/produto1.png" alt="cookies" class="carousel-image active">
                            <img src="img/produtos/produto2.png" alt="paos" class="carousel-image">
                            <img src="img/produtos/produto3.png" alt="pao com frutas" class="carousel-image">
                            <img src="img/produtos/produto4.png" alt="bolinhos" class="carousel-image">
                            <img src="img/produtos/produto5.png" alt="pao gigante" class="carousel-image">
                            <img src="img/produtos/produto6.png" alt="pizzas" class="carousel-image">
                            <img src="img/produtos/produto7.png" alt="bolinhos em formato de rosas" class="carousel-image">
                            <img src="img/produtos/produto8.png" alt="bolinhos verdes" class="carousel-image">
                            <img src="img/produtos/produto9.png" alt="bolo de chocolate" class="carousel-image">
                            <img src="img/produtos/produto10.png" alt="produto embalado" class="carousel-image">
                            <img src="img/produtos/produto11.png" alt="produtos embalados" class="carousel-image">
                            <img src="img/produtos/produto12.png" alt="bolinhos brancos" class="carousel-image">
                            <img src="img/produtos/produto13.png" alt="bolinhos coloridos" class="carousel-image">
                        </div>
                    </div>

                    <!-- Chamada para o Cardápio Integrada -->
                    <div class="menu-cta-integrated">
                        <p>Gostou das nossas delícias? Veja o cardápio completo e faça seu pedido!</p>
                        <a href="#" class="btn-link-menu" data-page="menu">
                            Ver cardápio e pedir agora →
                        </a>
                    </div>
                </div>
            </section>

            <!-- Benefits Section -->
        <section class="benefits-section">
            <div class="container">
                <h3>Por que Escolher a Jardim Padaria?</h3>
                <div class="benefits">
                    <div class="benefit">
                        <div class="benefit-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8a8 8 0 0 1-8 8Z" 
                                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M13 18c-4.33 0-6-1.33-6-4 0-2.67 1.67-4 6-4" 
                                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M13 14h-2" 
                                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div>
                            <p class="benefit-title">Fermentação Natural</p>
                            <p class="benefit-desc">Processo artesanal que realça o sabor e melhora a digestibilidade.</p>
                        </div>
                    </div>
                    
                    <div class="benefit">
                        <div class="benefit-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" 
                                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="12" cy="10" r="3" 
                                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div>
                            <p class="benefit-title">Ingredientes Premium</p>
                            <p class="benefit-desc">Apenas insumos selecionados de produtores locais e orgânicos.</p>
                        </div>
                    </div>
                    
                    <div class="benefit">
                        <div class="benefit-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 18h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <path d="M3 22h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <path d="M9 22v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <path d="M15 22v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <path d="M18 18c0-1.7-1.3-3-3-3h-6c-1.7 0-3 1.3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <path d="M12 15v-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <path d="M12 9V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <path d="M12 5a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div>
                            <p class="benefit-title">Técnica Artesanal</p>
                            <p class="benefit-desc">Cada produto é feito manualmente com cuidado e precisão técnica.</p>
                        </div>
                    </div>
                    
                    <div class="benefit">
                        <div class="benefit-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="1" y="3" width="15" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>
                                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" 
                                         stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                                <circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/>
                                <circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M12 8v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div>
                            <p class="benefit-title">Entrega Dedicada</p>
                            <p class="benefit-desc">Receba seus produtos frescos diretamente em sua casa com pontualidade.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

            <!-- CTA Section -->
            <section class="cta-section">
                <div class="container">
                    <div class="cta-content">
                        <h3>Pronto para Experimentar?</h3>
                        <p>Faça sua encomenda para ocasiões especiais ou converse conosco sobre parcerias.</p>
                        <div class="cta-buttons">
                        <a href="https://api.whatsapp.com/send/?phone=558399204618&text&type=phone_number&app_absent=0" class="cta-button secondary" target="_blank">
                                <img style="width: 24px; height: 24px; margin-right: 0.5rem;" src="img/logos/whatsapp.png" alt="WhatsApp">
                            Encomende aqui</a>
                            <a href="https://api.whatsapp.com/send/?phone=558399204618&text&type=phone_number&app_absent=0" class="cta-button secondary" target="_blank">
                                Vamos ser parceiros!
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    getSobreContent() {
        return `
            <section class="about-section">
                <div class="container">
                    <div class="about-content">
                        <div class="about-text">
                            <h2>Como Tudo Começou</h2>

                           <div class="text-carousel-container">

                            <button class="text-arrow text-prev">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M15 18l-6-6 6-6"/>
                                </svg>
                            </button>

                            <div class="text-slide-wrapper">
                                <div class="text-slide active">
                                    <p> A Padaria Jardim nasceu pequena, no quintal de casa em Campina Grande, mas carregando um sonho que sempre foi grande demais para ficar guardado.
                                        Somos Júlia e Washington, um casal que se conheceu na faculdade de Gastronomia (UFRPE) e descobriu, entre fornos e conversas, 
                                        que dividiríamos tanto a vida quanto os pães.
                                    </p>
                                </div>

                                <div class="text-slide">
                                    <p>Antes de existir como negócio, a Jardim existiu como desejo: o de criar alimentos honestos, 
                                    naturais e cheios de cuidado. Júlia sempre sonhou em ter uma padaria e encontrou na panificação 
                                    artesanal sua verdadeira vocação. Washington, que sempre foi um cozinheiro talentoso, 
                                    mergulhou no universo dos pães de fermentação natural ao seu lado e, juntos, desenvolvemos técnicas 
                                    próprias, afinamos receitas e construímos nossa identidade. </p>
                                </div>

                                <div class="text-slide">
                                    <p>Aqui, tudo é feito a quatro mãos. Do cultivo do fermento à última dobra da massa, cada etapa é 
                                    preparada por nós dois, com o tempo que o pão pede e o respeito que os ingredientes merecem. 
                                    Acreditamos que qualidade não se apressa e que nada é pequeno quando feito com amor: 
                                    nosso lema é a essência do Jardim. </p>
                                </div>

                                <div class="text-slide">
                                    <p>Ainda somos uma micro padaria artesanal, funcionando exclusivamente por delivery, 
                                    mais com o coração cheio de planos. Enquanto preparamos a chegada da nossa primeira filha, 
                                    seguimos alimentando também o sonho de abrir um espaço físico para acolher nossos clientes 
                                    como gostaríamos. </p>
                                </div>

                                <div class="text-slide">
                                    <p>A Padaria Jardim é isso: um projeto de vida, de família e de sabor. 
                                    Um lugar onde o que sai do forno é feito com propósito: para nutrir, 
                                    acolher e trazer um pouco mais de bem-estar ao dia de quem nos escolhe. </p>
                                </div>

                                <div class="text-slide">
                                    <p>Seja bem-vindo ao nosso Jardim. Aqui, cada pão é cuidado como merece, pois cada um é único! </p>
                                </div>
                            </div>


                            <button class="text-arrow text-next">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9 18l6-6-6-6"/>
                                </svg>
                            </button>

                    
                        </div>
                        </div>
                        <div class="about-image">
                            <div class="carousel-container">
                                <div class="carousel-slide">
                                    <img src="img/sobre/sobre_nos_1.png" alt="Imagem 1 Sobre Nós" class="carousel-image active">
                                    <img src="img/sobre/sobre_nos_2.png" alt="Imagem 2 Sobre Nós" class="carousel-image">
                                    <img src="img/sobre/sobre_nos_6.png" alt="Imagem 6 Sobre Nós" class="carousel-image">
                                    <img src="img/sobre/sobre_nos_5.png" alt="Imagem 5 Sobre Nós" class="carousel-image">
                                    <img src="img/sobre/sobre_nos_4.png" alt="Imagem 4 Sobre Nós" class="carousel-image">
                                    <img src="img/sobre/sobre_nos_7.png" alt="Imagem 7 Sobre Nós" class="carousel-image">
                                </div>
                                
                                <!-- Controles de navegação -->
                                <button class="carousel-nav carousel-prev">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M15 18l-6-6 6-6"/>
                                    </svg>
                                </button>
                                <button class="carousel-nav carousel-next">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M9 18l6-6-6-6"/>
                                    </svg>
                                </button>
                                
                                <!-- Indicadores -->
                                <div class="carousel-controls">
                                    <button class="carousel-dot active" data-slide="0"></button>
                                    <button class="carousel-dot" data-slide="1"></button>
                                    <button class="carousel-dot" data-slide="2"></button>
                                    <button class="carousel-dot" data-slide="3"></button>
                                    <button class="carousel-dot" data-slide="4"></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="purpose-section">
                        <h2>Nosso Propósito</h2>
                        <div class="purpose-cards">
                            <div class="purpose-card">
                                <h3>Paixão pela Qualidade</h3>
                                <p>Na Padaria Jardim, a produção artesanal é cultivada com a mesma paixão que um jardineiro apaixonado escolhe suas flores.</p>
                            </div>
                            <div class="purpose-card">
                                <h3>Fusão de Técnicas</h3>
                                <p>Cada pão e doce são colhidos com carinho, celebrando a fusão entre técnicas tradicionais e inovações contemporâneas.</p>
                            </div>
                            <div class="purpose-card">
                                <h3>Compromisso Sustentável</h3>
                                <p>Além dos sabores únicos, a padaria floresce com um compromisso sustentável, onde os valores se entrelaçam harmoniosamente com os sabores.</p>
                            </div>
                            <div class="purpose-card">
                                <h3>Experiência Sensorial</h3>
                                <p>Ao visitar a Padaria Jardim, os clientes são envolvidos por "Delícias que florescem, aroma que espalha e arte que encanta".</p>
                            </div>
                        </div>
                    </div>

                    <div class="differentials-section">
                        <h2>Nossos Diferenciais</h2>
                        <div class="differentials-grid">
                            <div class="differential">
                                <h3>O que é Fermentação Natural?</h3>
                                <p>O fermento natural é a <strong>essência da panificação</strong>! É a forma que os antigos faziam nos primeiros países, quando não se tinha o fermento industrializado como a gente conhece.</p>
                                <p>Ele nasce do cultivo de <strong>leveduras naturais</strong> que ao serem misturadas com farinha de trigo e água conseguem força e estrutura para fazer aquilo que precisamos: <strong>FERMENTAR!</strong></p>
                            </div>
                            <div class="differential">
                                <h3>Glúten Bom!</h3>
                                <p>O glúten é um conjunto de <strong>proteínas naturais</strong> encontradas na <strong>farinha de trigo</strong>.</p>
                                <p>Devido ao longo processo de fermentação, o glúten presente nos <strong>nossos pães</strong> sofre <strong>deterioração natural</strong> e as proteínas simples são quebradas no processo.</p>
                                <p>Ou seja, todo o <strong>trabalho que o nosso corpo</strong> iria realizar durante a digestão, <strong>não precisa mais!</strong> :) Por isso é tão gostoso e fácil de comer pão de fermentação natural <3</p>
                            </div>
                            <div class="differential">
                                <h3>Benefícios da Fermentação Natural</h3>
                                <ul class="benefits-list">
                                    <li>Seu sabor é incomparável ao do pão tradicional</li>
                                    <li>É um produto artesanal, sem adição alguma de produtos químicos</li>
                                    <li>Possui um índice glicêmico mais baixo do que outros pães</li>
                                    <li>Evita desconfortos abdominais e inchaço</li>
                                    <li>Possui uma série de nutrientes</li>
                                    <li>Fonte de vitaminas do complexo B</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    getCuidadosContent() {
        return `
            <section class="guia-cuidados-section">
                <div class="container">
                    <h2>Dicas dos Padeiros</h2>

                    <p class="guia-intro">Nossos pães chegam a vocês fresquinhos, todos os dias, alguns ainda quentes! 
                    E esse sabor saindo do forno é incomparável. Então, talvez você se pergunte: "como posso preservar esse sabor especial da melhor maneira possível?".</p>
                    <div class="guia-cards">


                      <div class="guia-card">
                            <h3>Consumo</h3>
                             <ul class="conservamento-list">
                                    <li> Temperatura ambiente: até 3 dias </li>
                                    <li> Na geladeira: até 15 dias </li>
                                    <li> No freezer: até 30 dias </li>
                            </ul>
                        </div>


                        <div class="guia-card">
                            <h3>Armazenamento Adequado</h3>
                            <ul class="armazenamento-list">
                                    <li> Embalagem bem fechada </li>
                                    <li> Recipiente com tampa </li>
                            </ul>
         
                        </div>

                       

                        <div class="guia-card">
                            <h3>Reaquecimento</h3>
                            <ul class="reaquecimento-list">
                                    <li> Para um pão congelado, indicamos que seja feito o descongelamento prévio na geladeira </li>
                                    <li>  use uma forma com água quente para umidificar o forno enquanto esquenta o pão e evitar que resseque. </li>
                                    <li> Siga o passo do Revitalizar </li>
                            </ul>
                
                        </div> 

                        <div class="guia-card">
                            <h3>Revitalizar</h3>
                            <ul class="revitalizar-list">
                                    <li> Molhe um pouco a superfície do pão com o auxílio de um spray para evitar que resseque muito.  </li>
                                    <li> Aquecimento em forno pré-aquecido (160ºC a 180 ºC) por cerca de 8 a 10 minutos.  </li>
                                   
                            </ul>
                        </div> 
                    </div>
                </div>
            </section>
        `;
    }

    // NOVO: Método para carregar a página de pedidos
    getPedidosContent() {
        return `
    <div id="react-feedback-root"></div>
`;

    }

   getFeedbacksContent() {
    // ESSE AQUI QUE TA FAZENDO O FEEDBACK FUNCIONAR
        return `
            <section class="feedback-section">
                <div class="container">
                    <div class="section-header">
                        <h2>O que Nossos Clientes Dizem</h2>
                    </div>

                    <div class="container-3colunas">
                        <!-- Coluna iFood -->
                        <div class="coluna">
                            <h3 class="col-title">iFood</h3>
                            <div class="col-scroll">
                                <div class="card">
                                    <div class="card-top">
                                        <span class="emoji">😊</span>
                                        <div>
                                            <div class="nome">Déborah</div>
                                        </div>
                                    </div>
                                    <div class="estrelas">★★★★★</div>
                                    <p class="texto">Simplesmente maravilhoso! O pão chega quentinho e o sabor é inigualável.</p>
                                </div>
                                <div class="card">
                                    <div class="card-top">
                                        <span class="emoji">🤩</span>
                                        <div>
                                            <div class="nome">Juliana</div>
                                        </div>
                                    </div>
                                    <div class="estrelas">★★★★★</div>
                                    <p class="texto">Melhor padaria artesanal de Campina Grande. Atendimento nota 10!</p>
                                </div>
                            </div>
                            <h3 class="col-footer">iFood</h3>
                        </div>

                        <!-- Coluna Google Reviews -->
                        <div class="coluna">
                            <h3 class="col-title">Google Reviews</h3>
                            <div class="col-scroll">
                                <div class="card">
                                    <div class="card-top">
                                        <span class="emoji">😄</span>
                                        <div>
                                            <div class="nome">Ketlen Mendes</div>
                                        </div>
                                    </div>
                                    <div class="estrelas">★★★★</div>
                                    <p class="texto">Produtos de ótima qualidade! Fiz pedido de uma ciabatta e Focaccia, todos os dois são incríveis, sabor maravilhoso eu AMEI, atendimento impecável e apresentação do produto também. Vale muito a pena experimentar essas delícias!</p>
                                </div>
                                <div class="card">
                                    <div class="card-top">
                                        <span class="emoji">😁</span>
                                        <div>
                                            <div class="nome">Mariana Santos</div>
                                        </div>
                                    </div>
                                    <div class="estrelas">★★★★★</div>
                                    <p class="texto">Tudo muito bem embalado, os itens são deliciosos. Não tenho muitos registros, mas estava muito bom! A foto abaixo é da ciabatta de parmesão e orégano(comprei também a clássica); coloquei queijo e esquentei na sanduicheira, o pão bem macio. Comprei um muffin de banana e doce de leite. Nossa, uma delícia! Sem falar do pastel de nata, estava com gostinho de infância. Aguardando, ansiosa, pela próxima fornada para Recife 💚💚</p>
                                </div>
                            </div>
                            <h3 class="col-footer">Google</h3>
                        </div>

                        <!-- Coluna Stories -->
                        <div class="coluna fade-in">
                            <h3 class="col-title">Stories</h3>
                            <div class="story-container" id="storyContainer" 
                                 data-videos="videos/1.mp4, videos/2.mp4, videos/4.mp4">
                                <button id="prevBtn" class="story-btn">◀</button>
                                <div class="story-content" id="storyContent">
                                    <!-- Conteúdo injetado via JS -->
                                </div>
                                <button id="nextBtn" class="story-btn">▶</button>
                            </div>
                            <div class="story-progress-bar">
                                <div id="progressBar" class="story-progress-fill" style="width: 0%;"></div>
                            </div>
                            <h3 class="col-footer">Stories</h3>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    getFooterContent() {
        return `
            <footer>
                <div class="footer-content">
                    <!-- Sobre -->
                    <section class="footer-section">
                        <h3>Padaria Jardim</h3>
                        <p>Sabor artesanal que nasce do cuidado e da tradição.</p>
                    </section>

                    <!-- Contato -->
                    <section class="footer-section">
                        <h3>Contato</h3>
                        <p>📍 Av. Joaquim Caroca, 266 - Universitário, Campina Grande - PB</p>
                        <p>📞 (83) 99920-4618</p>
                    </section>

                    <section class="footer-section">
                        <h3>Horário</h3>
                        <p>Quarta a Sexta</p>
                        <p>14h - 18h</p>
                        <br>
                        <p>Sábado</p>
                        <p>10h - 15h</p>

                    </section>

                    <!-- Formas de Pagamento -->
                    <section class="footer-section">
                        <h3>Formas de Pagamento</h3>
                        <div class="footer-payment-icons">
                            <img src="img/payment/cardVisa.png" alt="Visa">
                            <img src="img/payment/cardMastercard.png" alt="MasterCard">
                            <img src="img/payment/cardElo.png" alt="Elo">
                            <img src="img/payment/pix.png" alt="Pix">
                            <img src="img/payment/cash.png" alt="Dinheiro">
                        </div>

                    <!-- Siga-nos -->
                    <br>
                    <section class="footer-section">
                        <h3>Siga-nos</h3>
                        <div class="footer-social-icons">
                            <a href="https://www.instagram.com/jardimpadariacg/">
                                <img src="img/logos/instagram.png" alt="Instagram">
                            </a>
                            <a href="https://api.whatsapp.com/send/?phone=558399204618&text&type=phone_number&app_absent=0">
                                <img src="img/logos/whatsapp.png" alt="WhatsApp">
                            </a>
                        </div>
                    </section>
                </div>

                <div class="footer-bottom">
                    <p>© 2025 Padaria Jardim — Feito com amor e fermentação natural. <a href="/admin/inicioAdmin.html" style="opacity: 0.3; text-decoration: none; color: inherit; font-size: 0.6rem;">Admin</a></p>
                </div>
            </footer>
        `;
    }
}

new PagesLoader();