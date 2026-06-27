// ============================================
// PÁGINA SOBRE NÓS
// ============================================
const SobreNosPage = {
    textIndex: 0,
    carouselIndex: 0,
    textSlides: [],
    carouselImages: [],
    carouselDots: [],
    carouselInterval: null,

    initialize() {
        this.initializeTextCarousel();
        this.initializeImageCarousel();
    },

    
    initializeImageCarousel() {
        if (this.carouselInterval) {
            clearInterval(this.carouselInterval);
        }

    
        setTimeout(() => {
            const carouselContainer = document.querySelector('.about-section .carousel-container');
            if (!carouselContainer) {
                console.warn('Container do carrossel não encontrado');
                return;
            }

            this.carouselImages = document.querySelectorAll('.about-section .carousel-image');
            this.carouselDots = document.querySelectorAll('.about-section .carousel-dot');
            
            if (this.carouselImages.length === 0) {
                console.warn('Nenhuma imagem encontrada no carrossel');
                return;
            }
            this.carouselIndex = 0;

            this.showCarouselImage(this.carouselIndex);
            
            this.setupCarouselControls();
            
            this.startCarouselAutoplay();
            
            console.log(`✅ Carrossel de imagens inicializado com ${this.carouselImages.length} imagens`);
        }, 200);
    },

    setupCarouselControls() {
        const prevBtn = document.querySelector('.about-section .carousel-prev');
        const nextBtn = document.querySelector('.about-section .carousel-next');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.prevCarouselImage();
                this.resetCarouselAutoplay();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.nextCarouselImage();
                this.resetCarouselAutoplay();
            });
        }

        this.carouselDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                this.showCarouselImage(index);
                this.resetCarouselAutoplay();
            });
        });
    },

    prevCarouselImage() {
        const newIndex = (this.carouselIndex - 1 + this.carouselImages.length) % this.carouselImages.length;
        this.showCarouselImage(newIndex);
    },

    nextCarouselImage() {
        const newIndex = (this.carouselIndex + 1) % this.carouselImages.length;
        this.showCarouselImage(newIndex);
    },

    showCarouselImage(index) {
        this.carouselImages.forEach(img => {
            img.classList.remove('active');
            img.style.opacity = '0';
            img.style.zIndex = '0';
        });

        
        this.carouselIndex = index;

        const currentImage = this.carouselImages[this.carouselIndex];
        if (currentImage) {
            currentImage.classList.add('active');
            currentImage.style.opacity = '1';
            currentImage.style.zIndex = '1';
        }

        this.updateDots(this.carouselIndex);
    },

    updateDots(index) {
        this.carouselDots.forEach((dot, i) => {
            if (i === index) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    },

    startCarouselAutoplay() {
        
        if (this.carouselInterval) {
            clearInterval(this.carouselInterval);
        }
        
       
        this.carouselInterval = setInterval(() => {
            this.nextCarouselImage();
        }, 5000); 
    },

    resetCarouselAutoplay() {
        this.startCarouselAutoplay();
    },

  
    initializeTextCarousel() {
       
        this.textIndex = 0;
        
        
        setTimeout(() => {
            this.textSlides = document.querySelectorAll(".text-slide");
            
            if (!this.textSlides.length) {
                setTimeout(() => {
                    this.textSlides = document.querySelectorAll(".text-slide");
                    if (this.textSlides.length) {
                        this.setupTextCarousel();
                    }
                }, 300);
                return;
            }
            
            this.setupTextCarousel();
        }, 150);
    },

    setupTextCarousel() {
       
        this.showTextSlide(this.textIndex, true);
        
        
        const textPrevBtn = document.querySelector('.text-prev');
        const textNextBtn = document.querySelector('.text-next');
        
        if (textPrevBtn) {
            textPrevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const newIndex = (this.textIndex - 1 + this.textSlides.length) % this.textSlides.length;
                this.showTextSlide(newIndex);
            });
        }
        
        if (textNextBtn) {
            textNextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const newIndex = (this.textIndex + 1) % this.textSlides.length;
                this.showTextSlide(newIndex);
            });
        }
    },

    showTextSlide(index, immediate = false) {
        const currentSlide = this.textSlides[this.textIndex];
        const nextSlide = this.textSlides[index];
        
        if (!currentSlide || !nextSlide) return;
        
        if (immediate) {
            
            this.textSlides.forEach(slide => {
                slide.classList.remove("active");
                slide.style.opacity = '0';
            });
            
            nextSlide.classList.add("active");
            nextSlide.style.opacity = '1';
            this.textIndex = index;
            return;
        }
        
        currentSlide.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        currentSlide.style.opacity = '0';
        currentSlide.style.transform = 'translateY(5px)';
        
        setTimeout(() => {
            currentSlide.classList.remove("active");
            currentSlide.style.opacity = '0';
            currentSlide.style.transform = 'translateY(5px)';
            currentSlide.style.transition = '';
            
            nextSlide.classList.add("active");
            nextSlide.style.opacity = '0';
            nextSlide.style.transform = 'translateY(5px)';
            
          
            nextSlide.offsetHeight;
            
            nextSlide.style.transition = 'opacity 0.2s ease, transform 0.4s ease';
            setTimeout(() => {
                nextSlide.style.opacity = '1';
                nextSlide.style.transform = 'translateY(0)';
            }, 10);
            
            this.textIndex = index;
            
            setTimeout(() => {
                nextSlide.style.transition = '';
            }, 400);
        }, 400);
    },
    
  
    destroy() {
        if (this.carouselInterval) {
            clearInterval(this.carouselInterval);
            this.carouselInterval = null;
        }
        
       
        const prevBtn = document.querySelector('.about-section .carousel-prev');
        const nextBtn = document.querySelector('.about-section .carousel-next');
        
        if (prevBtn) {
            const newPrevBtn = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
        }
        
        if (nextBtn) {
            const newNextBtn = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        }
        
    
        this.carouselDots.forEach(dot => {
            const dotClone = dot.cloneNode(true);
            dot.parentNode.replaceChild(dotClone, dot);
        });
        
        this.textSlides = [];
        this.carouselImages = [];
        this.carouselDots = [];
    }
};

export default SobreNosPage;