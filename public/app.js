// ================================================
// Crystal AI - Application Logic
// ================================================

class CrystalAI {
    constructor() {
        this.token = localStorage.getItem('crystal_token');
        this.username = localStorage.getItem('crystal_user');
        this.presentation = null;
        this.currentSlide = 0;
        this.selectedTheme = 'crystal';
        this.selectedModel = 'cry-5.2-kx3d';
        this.selectedTransition = 'fade';
        this.currentStep = 1;
        this.chatData = {};
        this.editingSlideIndex = null;
        this.liked = false;
        this.disliked = false;

        this.init();
    }

    init() {
        this.bindAuthEvents();
        this.createParticles();
        if (this.token) {
            this.verifyToken();
        } else {
            this.showAuth();
        }
    }

    // ================================================
    // AUTH
    // ================================================
    showAuth() {
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('appScreen').style.display = 'none';
    }

    showApp() {
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'block';
        document.getElementById('userGreeting').textContent = `Hoşgeldin, ${this.username}`;
        this.bindAppEvents();
        this.startAIChat();
    }

    async verifyToken() {
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            if (data.success) {
                this.username = data.username;
                this.showApp();
            } else {
                this.clearAuth();
                this.showAuth();
            }
        } catch {
            this.clearAuth();
            this.showAuth();
        }
    }

    clearAuth() {
        this.token = null;
        this.username = null;
        localStorage.removeItem('crystal_token');
        localStorage.removeItem('crystal_user');
    }

    bindAuthEvents() {
        try {
            // Default to REGISTER view
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');

            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'block';

            const showRegBtn = document.getElementById('showRegister');
            const showLogBtn = document.getElementById('showLogin');

            if (showRegBtn) {
                showRegBtn.onclick = (e) => {
                    e.preventDefault();
                    if (loginForm) loginForm.style.display = 'none';
                    if (registerForm) registerForm.style.display = 'block';
                };
            }

            if (showLogBtn) {
                showLogBtn.onclick = (e) => {
                    e.preventDefault();
                    if (registerForm) registerForm.style.display = 'none';
                    if (loginForm) loginForm.style.display = 'block';
                };
            }

            if (loginForm) {
                loginForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const email = document.getElementById('loginEmail').value;
                    const password = document.getElementById('loginPassword').value;
                    const btn = document.getElementById('loginBtn');

                    if (btn) {
                        btn.disabled = true;
                        const originalText = btn.innerHTML;
                        btn.innerHTML = '<span>Giriş yapılıyor...</span>';
                    }

                    try {
                        const res = await fetch('/api/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password })
                        });
                        const data = await res.json();
                        if (data.success) {
                            this.token = data.token;
                            this.username = data.username;
                            localStorage.setItem('crystal_token', data.token);
                            localStorage.setItem('crystal_user', data.username);
                            this.showApp();
                        } else {
                            this.showToast(data.error || 'Giriş başarısız', 'error');
                        }
                    } catch (err) {
                        console.error('Login error:', err);
                        this.showToast('Sunucuya bağlanılamadı', 'error');
                    }

                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
                        </svg>
                        <span>Giriş Yap</span>
                        <div class="btn-shimmer"></div>`;
                    }
                };
            }

            if (registerForm) {
                registerForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const username = document.getElementById('regUsername').value;
                    const email = document.getElementById('regEmail').value;
                    const password = document.getElementById('regPassword').value;
                    const btn = document.getElementById('registerBtn');

                    if (btn) {
                        btn.disabled = true;
                        const originalText = btn.innerHTML;
                        btn.innerHTML = '<span>Kayıt olunuyor...</span>';
                    }

                    try {
                        const res = await fetch('/api/auth/register', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username, email, password })
                        });
                        const data = await res.json();
                        if (data.success) {
                            this.token = data.token;
                            this.username = data.username;
                            localStorage.setItem('crystal_token', data.token);
                            localStorage.setItem('crystal_user', data.username);
                            this.showToast('Hesap oluşturuldu!', 'success');
                            this.showApp();
                        } else {
                            this.showToast(data.error || 'Kayıt başarısız', 'error');
                        }
                    } catch (err) {
                        console.error('Register error:', err);
                        this.showToast('Sunucuya bağlanılamadı', 'error');
                    }

                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
                        </svg>
                        <span>Kayıt Ol</span>
                        <div class="btn-shimmer"></div>`;
                    }
                };
            }

            console.log('✅ Auth events bound successfully');
        } catch (err) {
            console.error('❌ Auth events binding failed:', err);
        }
    }

    createParticles() {
        const container = document.getElementById('crystalParticles');
        if (!container) return;
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.style.cssText = `
                position:absolute;
                width:${Math.random() * 4 + 2}px;
                height:${Math.random() * 4 + 2}px;
                background:rgba(124,58,237,${Math.random() * 0.4 + 0.1});
                border-radius:50%;
                left:${Math.random() * 100}%;
                top:${Math.random() * 100}%;
                animation: particleFloat ${Math.random() * 10 + 10}s ease-in-out infinite ${Math.random() * 5}s;
            `;
            container.appendChild(p);
        }
        // Add particle keyframe
        if (!document.getElementById('particleStyle')) {
            const style = document.createElement('style');
            style.id = 'particleStyle';
            style.textContent = `
                @keyframes particleFloat {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
                    25% { transform: translate(${Math.random() * 40 - 20}px, ${Math.random() * 40 - 20}px) scale(1.3); opacity: 0.6; }
                    50% { transform: translate(${Math.random() * 60 - 30}px, ${Math.random() * 60 - 30}px) scale(0.8); opacity: 0.2; }
                    75% { transform: translate(${Math.random() * 40 - 20}px, ${Math.random() * 40 - 20}px) scale(1.1); opacity: 0.5; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ================================================
    // APP EVENTS
    // ================================================
    bindAppEvents() {
        const bind = (id, event, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, handler);
        };

        bind('logoutBtn', 'click', () => {
            this.clearAuth();
            this.showAuth();
            this.showToast('Çıkış yapıldı', 'info');
        });

        // Chat input
        bind('sendBtn', 'click', () => this.handleChatInput());
        bind('chatInput', 'keydown', (e) => {
            if (e.key === 'Enter') this.handleChatInput();
        });

        // Slide navigation
        bind('prevSlideBtn', 'click', () => this.navigateSlide(-1));
        bind('nextSlideBtn', 'click', () => this.navigateSlide(1));

        // Toolbar buttons
        bind('previewBtn', 'click', () => this.enterFullscreen());
        bind('editSlideBtn', 'click', () => this.openEditPanel());
        bind('downloadPdfBtn', 'click', () => this.exportPDF());
        bind('newPresBtn', 'click', () => this.resetToWelcome());

        // Transition select
        bind('transitionSelect', 'change', (e) => {
            this.selectedTransition = e.target.value;
        });

        // Edit panel
        bind('closeEditPanel', 'click', () => this.closeEditPanel());
        bind('cancelEditBtn', 'click', () => this.closeEditPanel());
        bind('saveEditBtn', 'click', () => this.saveSlideEdit());
        bind('enhanceBtn', 'click', () => this.enhanceCurrentSlide());

        // Fullscreen
        bind('fsPrevBtn', 'click', () => this.navigateSlide(-1, true));
        bind('fsNextBtn', 'click', () => this.navigateSlide(1, true));
        bind('fsExitBtn', 'click', () => this.exitFullscreen());

        // Keyboard nav
        document.addEventListener('keydown', (e) => {
            if (this.presentation) {
                if (e.key === 'ArrowLeft') this.navigateSlide(-1);
                if (e.key === 'ArrowRight') this.navigateSlide(1);
                if (e.key === 'Escape') this.exitFullscreen();
            }
        });

        // Slide canvas click
        bind('slideCanvas', 'click', () => {
            if (this.presentation) this.openEditPanel();
        });

        console.log('✅ App events bound successfully');
    }

    // ================================================
    // AI CHAT SYSTEM
    // ================================================
    startAIChat() {
        this.currentStep = 1;
        this.chatData = {};
        this.updateProgressSteps();
        this.addAIMessage('Merhaba! 💎 Ben Crystal AI asistanınız. Muhteşem bir sunum oluşturmana yardımcı olacağım.\n\nSunumunun konusu ne olsun?', [
            'Yapay Zeka', 'Teknoloji Trendleri', 'İş Planı', 'Eğitim'
        ]);
    }

    updateProgressSteps() {
        document.querySelectorAll('.progress-step').forEach(step => {
            const num = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');
            if (num < this.currentStep) step.classList.add('completed');
            if (num === this.currentStep) step.classList.add('active');
        });
    }

    addAIMessage(text, actions = []) {
        const chat = document.getElementById('chatMessages');
        const msg = document.createElement('div');
        msg.className = 'chat-msg chat-msg-ai';

        let actionsHTML = '';
        if (actions.length > 0) {
            actionsHTML = `<div class="chat-actions">${actions.map(a =>
                `<button class="chat-action-btn" data-value="${a}">${a}</button>`
            ).join('')}</div>`;
        }

        msg.innerHTML = `<div class="msg-label">Crystal AI</div><div>${text.replace(/\n/g, '<br>')}</div>${actionsHTML}`;
        chat.appendChild(msg);

        // Bind action buttons
        msg.querySelectorAll('.chat-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.addUserMessage(btn.dataset.value);
                this.processStep(btn.dataset.value);
            });
        });

        this.scrollChat();
    }

    addUserMessage(text) {
        const chat = document.getElementById('chatMessages');
        const msg = document.createElement('div');
        msg.className = 'chat-msg chat-msg-user';
        msg.textContent = text;
        chat.appendChild(msg);
        this.scrollChat();
    }

    addTypingIndicator() {
        const chat = document.getElementById('chatMessages');
        const msg = document.createElement('div');
        msg.className = 'chat-msg chat-msg-ai';
        msg.id = 'typingMsg';
        msg.innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
        chat.appendChild(msg);
        this.scrollChat();
    }

    removeTypingIndicator() {
        const el = document.getElementById('typingMsg');
        if (el) el.remove();
    }

    scrollChat() {
        const chat = document.getElementById('aiChat');
        setTimeout(() => { chat.scrollTop = chat.scrollHeight; }, 100);
    }

    handleChatInput() {
        const input = document.getElementById('chatInput');
        const value = input.value.trim();
        if (!value) return;
        input.value = '';
        this.addUserMessage(value);
        this.processStep(value);
    }

    processStep(value) {
        switch (this.currentStep) {
            case 1: // Topic
                this.chatData.topic = value;
                this.currentStep = 2;
                this.updateProgressSteps();
                setTimeout(() => {
                    this.addAIMessage(`"${value}" harika bir konu! 🎯\n\nBu sunum kime hitap edecek?`, [
                        'İş Dünyası', 'Öğrenciler', 'Genel Kitle', 'Teknik Ekip'
                    ]);
                }, 600);
                break;

            case 2: // Audience
                this.chatData.audience = value;
                this.currentStep = 3;
                this.updateProgressSteps();
                setTimeout(() => {
                    this.addAIMessage(`${value} için optimize edeceğim! 👥\n\nKaç slayt olsun ve hangi stili tercih edersin?`, [
                        '6 Slayt - Minimal', '8 Slayt - Profesyonel', '10 Slayt - Detaylı', '12 Slayt - Kapsamlı'
                    ]);
                }, 600);
                break;

            case 3: // Slide settings
                const parts = value.split(' - ');
                this.chatData.slideCount = parseInt(parts[0]) || 8;
                this.chatData.style = (parts[1] || 'professional').toLowerCase();
                const styleMap = { 'minimal': 'minimal', 'profesyonel': 'professional', 'detaylı': 'educational', 'kapsamlı': 'storytelling' };
                this.chatData.style = styleMap[this.chatData.style] || 'professional';
                this.currentStep = 4;
                this.updateProgressSteps();
                setTimeout(() => {
                    this.addAIMessage('Mükemmel! 🤖 Hangi Crystal AI modelini kullanmak istersin?', [
                        'Cry 5.2 KX3D (En Güçlü)', 'Cry 4.6 KX1D (Dengeli)', 'Cry 2.3 KY1D (Hızlı)'
                    ]);
                }, 600);
                break;

            case 4: // Model selection
                if (value.includes('5.2')) this.selectedModel = 'cry-5.2-kx3d';
                else if (value.includes('4.6')) this.selectedModel = 'cry-4.6-kx1d';
                else this.selectedModel = 'cry-2.3-ky1d';

                const modelLabel = this.getModelLabel(this.selectedModel);
                document.querySelector('.model-label').textContent = modelLabel;

                this.currentStep = 5;
                this.updateProgressSteps();
                setTimeout(() => {
                    this.addAIMessage(`${modelLabel} seçildi! ⚡\n\nSunum oluşturuluyor... Bu biraz zaman alabilir.`);
                    this.generatePresentation();
                }, 600);
                break;
        }
    }

    getModelLabel(model) {
        const map = {
            'cry-5.2-kx3d': 'Cry 5.2 KX3D',
            'cry-4.6-kx1d': 'Cry 4.6 KX1D',
            'cry-2.3-ky1d': 'Cry 2.3 KY1D'
        };
        return map[model] || model;
    }

    // ================================================
    // PRESENTATION GENERATION
    // ================================================
    async generatePresentation() {
        this.addTypingIndicator();

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    topic: this.chatData.topic,
                    slideCount: this.chatData.slideCount || 8,
                    style: this.chatData.style || 'professional',
                    model: this.selectedModel,
                    audience: this.chatData.audience
                })
            });

            const data = await res.json();
            this.removeTypingIndicator();

            if (!res.ok) throw new Error(data.error || 'Sunum oluşturulamadı');

            this.presentation = data.presentation;
            this.currentSlide = 0;
            this.liked = false;
            this.disliked = false;

            this.addAIMessage(`Sunumunuz hazır! 🎉 "${this.presentation.title}" başlığıyla ${this.presentation.slides.length} slayt oluşturuldu.\n\nSağdaki alanı tıklayarak düzenleyebilir, geçiş efekti seçebilir ve PDF olarak indirebilirsiniz!`);
            this.showPresentation();
            this.showToast('Sunum başarıyla oluşturuldu!', 'success');

        } catch (error) {
            this.removeTypingIndicator();
            this.addAIMessage(`Üzgünüm, bir hata oluştu: ${error.message}\n\nTekrar denemek ister misiniz?`, ['Tekrar Dene']);
            this.currentStep = 4;
            this.showToast(error.message, 'error');
        }
    }

    showPresentation() {
        document.getElementById('welcomeState').style.display = 'none';
        document.getElementById('presentationViewer').style.display = 'flex';
        document.getElementById('presTitle').textContent = this.presentation.title;
        document.getElementById('presBadge').textContent = `${this.presentation.slides.length} slayt`;
        document.getElementById('totalSlideNum').textContent = this.presentation.slides.length;
        document.getElementById('fsTotalNum').textContent = this.presentation.slides.length;

        this.renderStripThumbnails();
        this.renderCurrentSlide();
        this.updateLikeDislike();
    }

    // ================================================
    // SLIDE RENDERING
    // ================================================
    renderStripThumbnails() {
        const list = document.getElementById('slideStripList');
        list.innerHTML = '';

        this.presentation.slides.forEach((slide, i) => {
            const thumb = document.createElement('div');
            thumb.className = `strip-thumb ${i === this.currentSlide ? 'active' : ''}`;
            thumb.innerHTML = `
                <span class="strip-num">${slide.slideNumber || i + 1}</span>
                <span class="strip-title">${slide.title}</span>
                <span class="strip-type">${this.getLayoutLabel(slide.layout)}</span>
            `;
            thumb.addEventListener('click', () => {
                this.currentSlide = i;
                this.renderCurrentSlide();
                this.updateStripActive();
            });
            list.appendChild(thumb);
        });
    }

    getLayoutLabel(layout) {
        const labels = {
            'title': 'Kapak', 'content': 'İçerik', 'two-column': 'İki Sütun',
            'image-text': 'Görsel', 'quote': 'Alıntı', 'stats': 'İstatistik', 'closing': 'Kapanış'
        };
        return labels[layout] || layout;
    }

    updateStripActive() {
        document.querySelectorAll('.strip-thumb').forEach((t, i) => {
            t.classList.toggle('active', i === this.currentSlide);
        });
        const active = document.querySelector('.strip-thumb.active');
        if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    renderCurrentSlide() {
        const slide = this.presentation.slides[this.currentSlide];
        const canvas = document.getElementById('slideCanvas');
        const render = document.getElementById('slideRender');

        // Apply transition
        canvas.className = `slide-canvas slide-transition-${this.selectedTransition}`;

        render.innerHTML = this.renderSlideHTML(slide) + `
            <div class="slide-edit-overlay">
                <span class="slide-edit-prompt">✏️ Düzenlemek için tıkla</span>
            </div>
        `;

        document.getElementById('currentSlideNum').textContent = this.currentSlide + 1;

        // Reset animation
        void render.offsetWidth;

        // Fullscreen update
        const fsContainer = document.getElementById('fsSlideContainer');
        if (document.getElementById('fullscreenPresenter').style.display !== 'none') {
            fsContainer.innerHTML = this.renderSlideHTML(slide);
            document.getElementById('fsCurrentNum').textContent = this.currentSlide + 1;
        }
    }

    renderSlideHTML(slide) {
        const themeClass = `slide-theme-${this.selectedTheme}`;
        const layoutClass = `slide-layout-${slide.layout || 'content'}`;
        let contentHTML = '';

        switch (slide.layout) {
            case 'title':
                contentHTML = `
                    <h1 class="slide-title">${slide.title}</h1>
                    ${slide.content?.length > 0 ? `<p class="slide-subtitle">${slide.content[0]}</p>` : ''}
                `;
                break;
            case 'quote':
                const qt = slide.content?.[0] || '';
                const qa = slide.content?.[1] || '';
                contentHTML = `
                    <h2 class="slide-title">${slide.title}</h2>
                    <div class="slide-quote-text">${qt}</div>
                    ${qa ? `<div class="slide-quote-author">— ${qa}</div>` : ''}
                `;
                break;
            case 'stats':
                contentHTML = `
                    <h2 class="slide-title">${slide.title}</h2>
                    <div class="slide-stats-grid">
                        ${(slide.content || []).map(item => {
                    const p = item.split('|');
                    return `<div class="stat-card"><div class="stat-value slide-accent">${p[0]}</div><div class="stat-desc">${p[1] || ''}</div></div>`;
                }).join('')}
                    </div>
                `;
                break;
            case 'two-column':
                const half = Math.ceil((slide.content || []).length / 2);
                const c1 = (slide.content || []).slice(0, half);
                const c2 = (slide.content || []).slice(half);
                contentHTML = `
                    <h2 class="slide-title">${slide.title}</h2>
                    <div class="slide-columns">
                        <div><ul class="slide-content-list">${c1.map(i => `<li>${i}</li>`).join('')}</ul></div>
                        <div><ul class="slide-content-list">${c2.map(i => `<li>${i}</li>`).join('')}</ul></div>
                    </div>
                `;
                break;
            case 'closing':
                contentHTML = `
                    <h2 class="slide-title">${slide.title}</h2>
                    ${slide.content?.length > 0 ? `<p class="slide-closing-text">${slide.content.join('<br>')}</p>` : ''}
                `;
                break;
            default:
                contentHTML = `
                    <h2 class="slide-title">${slide.title}</h2>
                    <ul class="slide-content-list">
                        ${(slide.content || []).map(i => `<li>${i}</li>`).join('')}
                    </ul>
                `;
                break;
        }

        return `
            <div class="slide-display ${themeClass} ${layoutClass}">
                <div class="slide-decoration slide-decoration-1"></div>
                <div class="slide-decoration slide-decoration-2"></div>
                ${contentHTML}
                <span class="slide-number-badge">${slide.slideNumber || ''}</span>
            </div>
        `;
    }

    // ================================================
    // NAVIGATION
    // ================================================
    navigateSlide(dir, isFs = false) {
        if (!this.presentation) return;
        const next = this.currentSlide + dir;
        if (next < 0 || next >= this.presentation.slides.length) return;
        this.currentSlide = next;
        this.renderCurrentSlide();
        this.updateStripActive();
    }

    // ================================================
    // LIKE / DISLIKE
    // ================================================
    updateLikeDislike() {
        const likeBtn = document.getElementById('likeBtn');
        const dislikeBtn = document.getElementById('dislikeBtn');
        if (!likeBtn || !dislikeBtn) return;

        likeBtn.classList.toggle('active-like', this.liked);
        dislikeBtn.classList.toggle('active-dislike', this.disliked);
    }

    toggleLike() {
        this.liked = !this.liked;
        if (this.liked) this.disliked = false;
        this.updateLikeDislike();
        if (this.liked) this.showToast('Sunumu beğendiniz! 👍', 'success');
    }

    toggleDislike() {
        this.disliked = !this.disliked;
        if (this.disliked) this.liked = false;
        this.updateLikeDislike();
        if (this.disliked) this.showToast('Geri bildiriminiz alındı 👎', 'info');
    }

    // ================================================
    // EDIT PANEL
    // ================================================
    openEditPanel() {
        if (!this.presentation) return;
        this.editingSlideIndex = this.currentSlide;
        const slide = this.presentation.slides[this.currentSlide];
        document.getElementById('editTitle').value = slide.title;
        document.getElementById('editContent').value = (slide.content || []).join('\n');
        document.getElementById('editNotes').value = slide.notes || '';
        document.getElementById('enhanceInput').value = '';
        document.getElementById('editPanelOverlay').style.display = 'flex';
    }

    closeEditPanel() {
        document.getElementById('editPanelOverlay').style.display = 'none';
        this.editingSlideIndex = null;
    }

    saveSlideEdit() {
        if (this.editingSlideIndex === null) return;
        const slide = this.presentation.slides[this.editingSlideIndex];
        slide.title = document.getElementById('editTitle').value;
        slide.content = document.getElementById('editContent').value.split('\n').filter(l => l.trim());
        slide.notes = document.getElementById('editNotes').value;
        this.renderCurrentSlide();
        this.renderStripThumbnails();
        this.closeEditPanel();
        this.showToast('Slayt güncellendi ✨', 'success');
    }

    async enhanceCurrentSlide() {
        if (this.editingSlideIndex === null) return;
        const instruction = document.getElementById('enhanceInput').value.trim();
        if (!instruction) { this.showToast('Talimat girin', 'error'); return; }

        const slide = this.presentation.slides[this.editingSlideIndex];
        const btn = document.getElementById('enhanceBtn');
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner-sm"></div>';

        try {
            const res = await fetch('/api/enhance-slide', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ slide, instruction, model: this.selectedModel })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            this.presentation.slides[this.editingSlideIndex] = {
                ...this.presentation.slides[this.editingSlideIndex],
                ...data.slide
            };
            this.openEditPanel();
            this.renderCurrentSlide();
            this.renderStripThumbnails();
            this.showToast('Slayt AI ile geliştirildi! ⚡', 'success');
        } catch (err) {
            this.showToast('Geliştirme hatası: ' + err.message, 'error');
        }
        btn.disabled = false;
        btn.innerHTML = '⚡ Geliştir';
    }

    // ================================================
    // FULLSCREEN
    // ================================================
    enterFullscreen() {
        if (!this.presentation) return;
        const fs = document.getElementById('fullscreenPresenter');
        const container = document.getElementById('fsSlideContainer');
        fs.style.display = 'flex';
        container.innerHTML = this.renderSlideHTML(this.presentation.slides[this.currentSlide]);
        document.getElementById('fsCurrentNum').textContent = this.currentSlide + 1;
        document.getElementById('fsTotalNum').textContent = this.presentation.slides.length;
        document.body.style.overflow = 'hidden';
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => { });
        }
    }

    exitFullscreen() {
        document.getElementById('fullscreenPresenter').style.display = 'none';
        document.body.style.overflow = '';
        if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
    }

    // ================================================
    // PDF EXPORT
    // ================================================
    exportPDF() {
        if (!this.presentation) return;
        this.showToast('PDF hazırlanıyor...', 'info');

        const printWindow = window.open('', '_blank');
        if (!printWindow) { this.showToast('Pop-up engellendi!', 'error'); return; }

        const slidesHTML = this.presentation.slides.map(s => {
            return `<div class="print-slide">${this.renderSlideHTML(s)}</div>`;
        }).join('');

        printWindow.document.write(`<!DOCTYPE html><html><head>
            <title>${this.presentation.title} - Crystal AI</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                body{font-family:'Outfit',sans-serif}
                .print-slide{width:100vw;height:100vh;page-break-after:always;overflow:hidden}
                .print-slide:last-child{page-break-after:auto}
                .slide-display{width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;padding:8%;position:relative;overflow:hidden}
                .slide-theme-crystal{background:linear-gradient(135deg,#0f0520,#1a0d3a,#0d1f3c);color:#e8e0ff}
                .slide-theme-dark{background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);color:#f1f5f9}
                .slide-theme-light{background:linear-gradient(135deg,#fff,#f8fafc);color:#334155}
                .slide-theme-gradient{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
                .slide-theme-corporate{background:linear-gradient(135deg,#1a365d,#2563eb);color:#e2e8f0}
                .slide-theme-neon{background:linear-gradient(135deg,#0a0a1f,#1a0a2e);color:#e0e0ff}
                .slide-theme-crystal .slide-title{color:#c4b5fd}
                .slide-theme-dark .slide-title{color:#fff}
                .slide-theme-light .slide-title{color:#0f172a}
                .slide-theme-gradient .slide-title{color:#fff}
                .slide-theme-corporate .slide-title{color:#fff}
                .slide-theme-neon .slide-title{color:#00ff88}
                .slide-theme-crystal .slide-accent{color:#22d3ee}
                .slide-theme-dark .slide-accent{color:#a78bfa}
                .slide-theme-light .slide-accent{color:#6366f1}
                .slide-title{font-weight:800;margin-bottom:5%;line-height:1.2}
                .slide-layout-title{align-items:center;text-align:center;justify-content:center}
                .slide-layout-title .slide-title{font-size:2.5em;margin-bottom:3%}
                .slide-layout-title .slide-subtitle{font-size:1.1em;opacity:.7}
                .slide-layout-content .slide-title{font-size:1.8em}
                .slide-layout-closing{align-items:center;text-align:center;justify-content:center}
                .slide-layout-closing .slide-title{font-size:2.2em}
                .slide-layout-quote{align-items:center;text-align:center}
                .slide-content-list{list-style:none;display:flex;flex-direction:column;gap:14px}
                .slide-content-list li{display:flex;align-items:flex-start;gap:12px;font-size:1.05em;line-height:1.5}
                .slide-content-list li::before{content:'';width:8px;height:8px;border-radius:50%;background:currentColor;opacity:.5;margin-top:10px;flex-shrink:0}
                .slide-columns{display:grid;grid-template-columns:1fr 1fr;gap:8%}
                .slide-quote-text{font-size:1.5em;font-style:italic;font-weight:300;line-height:1.6;margin-bottom:20px;padding:0 10%;position:relative}
                .slide-quote-text::before{content:'"';position:absolute;top:-20px;left:5%;font-size:4em;opacity:.15}
                .slide-quote-author{font-size:1em;font-weight:600;opacity:.7}
                .slide-stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:20px}
                .stat-card{text-align:center;padding:20px;background:rgba(255,255,255,.04);border-radius:8px}
                .stat-value{font-size:2em;font-weight:800;font-family:'JetBrains Mono',monospace}
                .stat-desc{font-size:.85em;opacity:.7;margin-top:4px}
                .slide-decoration,.slide-number-badge,.slide-edit-overlay{display:none}
                .slide-closing-text{font-size:1.1em;opacity:.7}
                @media print{.print-slide{page-break-after:always}.print-slide:last-child{page-break-after:auto}}
            </style>
        </head><body>${slidesHTML}</body></html>`);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            this.showToast('PDF yazdırma penceresi açıldı', 'success');
        }, 500);
    }

    // ================================================
    // RESET
    // ================================================
    resetToWelcome() {
        this.presentation = null;
        this.currentSlide = 0;
        this.liked = false;
        this.disliked = false;
        document.getElementById('presentationViewer').style.display = 'none';
        document.getElementById('welcomeState').style.display = 'flex';
        document.getElementById('chatMessages').innerHTML = '';
        this.currentStep = 1;
        this.chatData = {};
        this.updateProgressSteps();
        this.startAIChat();
    }

    // ================================================
    // TOAST
    // ================================================
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { success: '✓', error: '✕', info: 'ℹ' };
        toast.innerHTML = `<span style="font-size:1.1rem">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.crystalAI = new CrystalAI();
});
