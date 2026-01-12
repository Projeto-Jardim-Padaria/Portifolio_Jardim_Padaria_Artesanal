// ============================================
// ESTADO DA APLICAÇÃO
// ============================================
let currentPage = "inicio";
let Cart = null;
let Modal = null;

// ============================================
// FUNÇÕES PARA CONTROLE DO MODAL DE CHECKOUT
// ============================================
function openCheckoutModal() {
    if (window.Cart && typeof window.Cart.openCheckoutModal === 'function') {
        window.Cart.openCheckoutModal();
    } else {
        const checkoutModal = document.getElementById('checkoutModal');
        if (checkoutModal) {
            checkoutModal.classList.add('active');
            checkoutModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
}

function closeCheckoutModal() {
    if (window.Cart && typeof window.Cart.closeCheckoutModal === 'function') {
        window.Cart.closeCheckoutModal();
    } else {
        const checkoutModal = document.getElementById('checkoutModal');
        if (checkoutModal) {
            checkoutModal.classList.remove('active');
            checkoutModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        // Registra o service worker
        navigator.serviceWorker.register('/service-worker.js')
            .then(function (registration) {
                console.log('Service Worker registrado com sucesso:', registration.scope);

                // Verifica se há uma nova versão
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('Nova versão do Service Worker encontrada!');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            // Nova versão instalada, recarrega a página
                            if (navigator.serviceWorker.controller) {
                                console.log('Nova versão pronta. Recarregando página...');
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch(function (error) {
                console.log('Falha no registro do Service Worker:', error);
            });

        // Força verificação de atualizações a cada carregamento
        navigator.serviceWorker.ready.then(registration => {
            registration.update();
        });
    });

    // Escuta mensagens do Service Worker
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data === 'skipWaiting') {
            console.log('Pulando espera do Service Worker...');
            window.location.reload();
        }
    });
}

// O cache agora é gerenciado de forma mais inteligente pelo Service Worker
// Não é mais necessário forçar a limpeza total em cada unload

async function initializeApp() {
    console.log('🚀 Inicializando aplicação Jardim Padaria...');
    console.log('📅 Simulação: Hoje é QUARTA-FEIRA');

    // 1. Inicializa navegação primeiro (não depende de imports)
    initializeNavigation();

    try {
        // 2. Carrega componentes dinamicamente
        await loadComponents();

        // 3. Inicializa componentes se estiverem disponíveis
        if (Modal && typeof Modal.initialize === 'function') {
            Modal.initialize();
            console.log('✅ Modal inicializado');
        }

        if (Cart && typeof Cart.initialize === 'function') {
            Cart.initialize();
            console.log('✅ Carrinho inicializado');
        }

        // 4. Configura eventos do checkout modal
        setupCheckoutModalEvents();

        // 5. Inicializa a página atual
        initializePageComponents(currentPage);

        console.log('🎉 Aplicação inicializada com sucesso!');

    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showNotification('Erro ao carregar a aplicação. Recarregue a página.', 5000, 'error');
    }
}

// ============================================
// CARREGAR COMPONENTES DINAMICAMENTE
// ============================================
async function loadComponents() {
    try {
        console.log('📦 Carregando componentes...');

        // Carrega Modal
        const modalModule = await import('./components/modal.js');
        Modal = modalModule.default || modalModule.Modal;
        window.Modal = Modal;

        // Carrega Cart
        const cartModule = await import('./components/cart.js');
        Cart = cartModule.default || cartModule.Cart;
        window.Cart = Cart;

        // Carrega Carousel
        const carouselModule = await import('./components/carousel.js');
        window.Carousel = carouselModule.default || carouselModule.Carousel;

        console.log('✅ Componentes carregados:', {
            Modal: !!Modal,
            Cart: !!Cart,
            Carousel: !!window.Carousel
        });

    } catch (error) {
        console.error('❌ Erro ao carregar componentes:', error);
        // Tenta carregar novamente após 2 segundos
        setTimeout(() => loadComponents(), 2000);
        throw error;
    }
}

// ============================================
// CONFIGURAÇÃO DE EVENTOS DO CHECKOUT MODAL
// ============================================
function setupCheckoutModalEvents() {
    // Botão de fechar do checkout
    const closeCheckoutBtn = document.getElementById('closeCheckoutModal');
    if (closeCheckoutBtn) {
        closeCheckoutBtn.addEventListener('click', closeCheckoutModal);
    }
    
    // Overlay do checkout
    const checkoutOverlay = document.getElementById('checkoutModalOverlay');
    if (checkoutOverlay) {
        checkoutOverlay.addEventListener('click', closeCheckoutModal);
    }
    
    // Botão de finalizar compra do carrinho
const checkoutBtn = document.querySelector('.checkout-btn');
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Verifica se há itens no carrinho
        if (Cart && Cart.cartItems && Cart.cartItems.length > 0) {
            // Abre o modal de checkout
            openCheckoutModal();
        } else {
            showNotification('Adicione itens ao carrinho antes de finalizar a compra.', 3000, 'warning');
        }
    });
}
    
    // Tecla ESC para fechar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const checkoutModal = document.getElementById('checkoutModal');
            if (checkoutModal && checkoutModal.classList.contains('active')) {
                closeCheckoutModal();
            }
        }
    });
}

// ============================================
// NAVEGAÇÃO
// ============================================
function initializeNavigation() {
    // Menu mobile toggle
    const menuToggle = document.getElementById("menuToggle");
    const mobileMenu = document.getElementById("mobileMenu");
    const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");

    if (menuToggle && mobileMenu && mobileMenuOverlay) {
        menuToggle.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openMobileMenu();
        });

        // Fechar menu ao clicar no overlay
        mobileMenuOverlay.addEventListener("click", (e) => {
            e.preventDefault();
            closeMobileMenu();
        });

        // Fechar menu ao pressionar ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeMobileMenu();
            }
        });
    }

    // Navegação entre páginas - PARA DESKTOP E MOBILE
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        const page = link.dataset.page;

        // Libera o React
        if (href && href.startsWith('/feedback')) {
            return;
        }

        // SPA interno
        if (page) {
            e.preventDefault();
            navigateToPage(page);
            closeMobileMenu();
        }
    });
}


function openMobileMenu() {
    const mobileMenu = document.getElementById("mobileMenu");
    const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");

    if (mobileMenu && mobileMenuOverlay) {
        mobileMenu.classList.add("active");
        mobileMenuOverlay.classList.add("active");
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById("mobileMenu");
    const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");

    if (mobileMenu && mobileMenuOverlay) {
        mobileMenu.classList.remove("active");
        mobileMenuOverlay.classList.remove("active");
        document.body.style.overflow = '';
    }
}

function navigateToPage(page) {
    // Desmonta o app React se estiver saindo da página de feedbacks
    if (currentPage === "feedbacks" && window.unmountFeedbacksApp) {
        window.unmountFeedbacksApp();
    }
    // Adiciona transição de saída na página atual
    const currentActivePage = document.querySelector('.page.active');
    if (currentActivePage) {
        currentActivePage.style.opacity = '0';
        currentActivePage.style.transform = 'translateY(20px)';
    }

    setTimeout(() => {
        // Esconde todas as páginas
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
            p.style.opacity = '0';
            p.style.transform = 'translateY(20px)';
        });

        // Mostra a página selecionada
        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) {
            targetPage.classList.add('active');
            currentPage = page;

            // Força o reflow para garantir a transição
            targetPage.offsetHeight;

            // Aplica a transição de entrada
            setTimeout(() => {
                targetPage.style.opacity = '1';
                targetPage.style.transform = 'translateY(0)';
            }, 50);

            // Atualiza navegação
            updateNavigation(page);

            // Inicializa componentes da página
            initializePageComponents(page);

            // Se a página de feedbacks for ativada, renderize o app React
            if (page === "feedbacks" && window.renderFeedbacksApp) {
                window.renderFeedbacksApp();
            }

            // Scroll para o topo
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, 200);
}

function updateNavigation(page) {
    // Desktop navigation
    document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.remove("active");
        if (link.dataset.page === page) {
            link.classList.add("active");
        }
    });

    // Mobile navigation
    document.querySelectorAll(".mobile-nav-link").forEach((link) => {
        link.classList.remove("active");
        if (link.dataset.page === page) {
            link.classList.add("active");
        }
    });
}

// ============================================
// INICIALIZAÇÃO DE COMPONENTES POR PÁGINA
// ============================================
async function initializePageComponents(pageName) {
    console.log(`📄 Inicializando página: ${pageName}`);

    try {
        switch (pageName) {
            case 'inicio':
                if (typeof InicioPage !== 'undefined') {
                    await InicioPage.initialize();
                    console.log('✅ Página Início inicializada');
                } else {
                    // Tenta carregar dinamicamente
                    const inicioModule = await import('./pages/inicio.js');
                    window.InicioPage = inicioModule.default || inicioModule.InicioPage;
                    if (window.InicioPage.initialize) {
                        await window.InicioPage.initialize();
                    }
                }
                break;

            case 'menu':
                if (typeof MenuPage !== 'undefined') {
                    MenuPage.initialize();
                    console.log('✅ Página Menu inicializada');
                } else {
                    // Tenta carregar dinamicamente
                    const menuModule = await import('./pages/menu.js');
                    window.MenuPage = menuModule.default || menuModule.MenuPage;
                    if (window.MenuPage.initialize) {
                        window.MenuPage.initialize();
                    }
                }
                break;

            case 'sobre':
                if (typeof SobreNosPage !== 'undefined') {
                    SobreNosPage.initialize();
                    console.log('✅ Página Sobre Nós inicializada');
                } else {
                    // Tenta carregar dinamicamente
                    const sobreModule = await import('./pages/sobrenos.js');
                    window.SobreNosPage = sobreModule.default || sobreModule.SobreNosPage;
                    if (window.SobreNosPage.initialize) {
                        window.SobreNosPage.initialize();
                    }
                    console.log('✅ Página Sobre Nós inicializada');
                }
                break;

            case 'cuidados':
                if (typeof CuidadosPage !== 'undefined') {
                    CuidadosPage.initialize();
                    console.log('✅ Página Cuidados inicializada');
                }
                break;

            case 'feedbacks':
                try {
                    const feedbacksModule = await import('./pages/feedbacks.js');
                    window.FeedbacksPage = feedbacksModule.default || feedbacksModule.FeedbacksPage;
                    if (window.FeedbacksPage && window.FeedbacksPage.initialize) {
                        await window.FeedbacksPage.initialize();
                    }
                    console.log('✅ Página Feedbacks inicializada');
                } catch (error) {
                    console.error('❌ Erro ao carregar página de feedbacks:', error);
                }
                break;


            case 'pedidos':
                // Carrega dinamicamente o script dos pedidos
                try {
                    const pedidosModule = await import('./pages/pedidos.js');
                    window.PedidosPage = pedidosModule.default || pedidosModule.PedidosPage;
                    if (window.PedidosPage && window.PedidosPage.initialize) {
                        await window.PedidosPage.initialize();
                    }
                    console.log('✅ Página Pedidos inicializada');
                } catch (error) {
                    console.error('❌ Erro ao carregar página de pedidos:', error);
                    // Tenta carregar novamente
                    setTimeout(async () => {
                        try {
                            const pedidosModule = await import('./pages/pedidos.js');
                            window.PedidosPage = pedidosModule.default || pedidosModule.PedidosPage;
                            if (window.PedidosPage && window.PedidosPage.initialize) {
                                await window.PedidosPage.initialize();
                            }
                        } catch (retryError) {
                            console.error('❌ Falha na segunda tentativa de carregar pedidos:', retryError);
                        }
                    }, 1000);
                }
                break;
        }
    } catch (error) {
        console.error(`❌ Erro ao inicializar página ${pageName}:`, error);
    }
}

// ============================================
// UTILITÁRIOS
// ============================================

// ============================================ 
// NOTIFICAÇÕES ESTILIZADAS
// ============================================
function showNotification(message, duration = 3000, type = 'info', important = false) {
    // Verifica se já existe uma barra de notificação
    let notificationBar = document.getElementById('notificationBar');

    // Se não existir, cria uma
    if (!notificationBar) {
        notificationBar = document.createElement('div');
        notificationBar.id = 'notificationBar';
        document.body.appendChild(notificationBar);
    }

    // Limpa timer anterior se existir
    if (notificationBar._timeoutId) {
        clearTimeout(notificationBar._timeoutId);
    }

    // Adiciona botão de fechar se não existir
    if (!notificationBar.querySelector('.notification-close')) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        closeBtn.addEventListener('click', () => {
            notificationBar.classList.remove('show');
            if (notificationBar._timeoutId) {
                clearTimeout(notificationBar._timeoutId);
            }
        });
        notificationBar.appendChild(closeBtn);
    }

    // Define o texto e tipo da notificação
    const textSpan = notificationBar.querySelector('span') || document.createElement('span');
    textSpan.textContent = message;

    // Se não tiver span, adiciona
    if (!notificationBar.querySelector('span')) {
        notificationBar.insertBefore(textSpan, notificationBar.querySelector('.notification-close'));
    }

    // Remove classes antigas
    notificationBar.classList.remove('info', 'success', 'error', 'warning', 'important', 'show');

    // Adiciona novas classes
    notificationBar.classList.add(type);
    if (important) {
        notificationBar.classList.add('important');
    }

    // Adiciona classe show com pequeno delay para animação
    setTimeout(() => {
        notificationBar.classList.add('show');
    }, 10);

    // Configura timeout para remover
    notificationBar._timeoutId = setTimeout(() => {
        notificationBar.classList.remove('show');

        // Remove completamente após a animação
        setTimeout(() => {
            notificationBar.textContent = '';
            notificationBar._timeoutId = null;
        }, 400);
    }, duration);

    // Log no console para debug
    const typeEmoji = {
        'info': 'ℹ️',
        'success': '✅',
        'error': '❌',
        'warning': '⚠️'
    }[type] || '📢';

    console.log(`${typeEmoji} ${message}`);
}

function getCurrentDayName() {
    // SIMULAÇÃO: Sempre retorna "quarta" para teste
    // Para voltar ao normal, descomente as linhas abaixo e apague o return "quarta";

    // const days = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    // const date = new Date();
    // const dayName = days[date.getDay()];
    // console.log(`📅 Dia atual: ${dayName}`);
    // return dayName;

    console.log('📅 [SIMULAÇÃO] Hoje é QUARTA-FEIRA');
    return "quarta";
}

function getTodayIndex() {
    // SIMULAÇÃO: Sempre retorna índice da quarta (0)
    // Para voltar ao normal, descomente as linhas abaixo:

    // const hoje = new Date();
    // const diaSemana = hoje.getDay();
    // const diaParaIndice = {
    //     3: 0, // quarta
    //     4: 1, // quinta
    //     5: 2, // sexta
    //     6: 3  // sábado
    // };
    // return diaParaIndice[diaSemana] !== undefined ? diaParaIndice[diaSemana] : -1;

    return 0; // Índice da quarta-feira
}

function getDayNameInPortuguese(dayIndex) {
    const days = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    return days[dayIndex];
}

function getProductIcon(category) {
    const categoryIcons = {
        "Pães": "🥖",
        "Ciabattas": "🥪",
        "Focaccias": "🍕",
        "Doces": "🧁",
        "Bolos": "🎂",
        "Mini Bolos": "🧁",
        "Chocolate": "🍫",
        "Pronta-Entrega": "📦"
    };
    return categoryIcons[category] || "✨";
}

// ============================================
// FUNÇÕES DE CONTATO E LOCALIZAÇÃO
// ============================================

// Função para abrir o Google Maps
function abrirGoogleMaps() {
    const url = `https://www.google.com/maps/place/Jardim+-+Padaria+Artesanal/@-7.2194479,-35.9136032,17z/data=!4m15!1m8!3m7!1s0x7ac1e2848add97d:0xd1ca8485544602d4!2sAv.+Joaquim+Caroca,+266+-+Universitário,+Campina+Grande+-+PB,+58429-120!3b1!8m2!3d-7.2194479!4d-35.9136032!16s%2Fg%2F11hbgkf50h!3m5!1s0x7ac1f2513d88d7b:0x2722101e32d4a6ea!8m2!3d-7.2194373!4d-35.9136283!16s%2Fg%2F11y2q9h1q6?entry=ttu&g_ep=EgoyMDI1MTEwNS4wIKXMDSoASAFQAw%3D%3D`;
    window.open(url, '_blank');
}

// Função para abrir o WhatsApp
function abrirWhatsApp() {
    const whatsappLink = "https://api.whatsapp.com/send/?phone=558399204618&text&type=phone_number&app_absent=0";
    window.open(whatsappLink, '_blank');
}

// Função para abrir contato (agora sempre direciona para o WhatsApp)
function abrirContato() {
    abrirWhatsApp();
}

// ============================================
// FUNÇÕES AUXILIARES PARA SIMULAÇÃO

// Função para alternar o modo de simulação (apenas para debug)
function toggleSimulationMode() {
    const currentMode = getSimulationMode();
    const nextMode = currentMode === 'real' ? 'quarta' : 'real';
    localStorage.setItem('simulationMode', nextMode);
    alert(`Modo de simulação alterado para: ${nextMode}. Recarregue a página.`);
}

// Função para verificar o modo atual
function getSimulationMode() {
    return localStorage.getItem('simulationMode') || 'quarta';
}

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA QUANDO O DOM ESTIVER PRONTO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado');
    console.log(`🎮 Modo simulação: ${getSimulationMode()}`);

    // Adiciona botão de debug para alternar modo (apenas em desenvolvimento)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const debugButton = document.createElement('button');
        debugButton.style.position = 'fixed';
        debugButton.style.bottom = '10px';
        debugButton.style.right = '10px';
        debugButton.style.zIndex = '9999';
        debugButton.style.padding = '8px 12px';
        debugButton.style.background = '#1C3D2D';
        debugButton.style.color = 'white';
        debugButton.style.border = 'none';
        debugButton.style.borderRadius = '4px';
        debugButton.style.cursor = 'pointer';
        debugButton.style.fontSize = '12px';
        debugButton.style.opacity = '0.7';
        debugButton.addEventListener('click', toggleSimulationMode);
        document.body.appendChild(debugButton);
    }

    // Pequeno delay para garantir que tudo está carregado
    setTimeout(() => {
        initializeApp();
    }, 100);
});

// ============================================
// EXPORTAÇÕES PARA USO EM OUTROS MÓDULOS
// ============================================
window.navigateToPage = navigateToPage;
window.getProductIcon = getProductIcon;
window.getCurrentDayName = getCurrentDayName;
window.getTodayIndex = getTodayIndex; // Nova exportação
window.showNotification = showNotification;
window.initializeApp = initializeApp;
window.abrirGoogleMaps = abrirGoogleMaps;
window.abrirWhatsApp = abrirWhatsApp;
window.abrirContato = abrirContato;
window.toggleSimulationMode = toggleSimulationMode; // Para debug
window.getSimulationMode = getSimulationMode; // Para debug

// Novas exportações para o checkout modal
window.openCheckoutModal = openCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;

// Exporta para uso em módulos ES6
export {
    navigateToPage,
    getProductIcon,
    getCurrentDayName,
    getTodayIndex,
    showNotification,
    initializeApp,
    abrirGoogleMaps,
    abrirWhatsApp,
    abrirContato,
    openCheckoutModal,
    closeCheckoutModal
};