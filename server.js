const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

const { Mistral } = require('@mistralai/mistralai');

const app = express();
const PORT = process.env.PORT || 2000;
const JWT_SECRET = process.env.JWT_SECRET || 'crystal-ai-secret-key-2024';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ================================================
// JSON DATABASE ADAPTER
// ================================================
class JsonDatabase {
    constructor() {
        // Vercel only allows writing to /tmp
        this.dbPath = process.env.VERCEL || process.env.NODE_ENV === 'production'
            ? '/tmp/crystal_db.json'
            : path.join(__dirname, 'crystal_db.json');

        this.data = {
            users: [],
            presentations: [],
            usage_stats: []
        };

        this.init();
    }

    init() {
        try {
            if (fs.existsSync(this.dbPath)) {
                console.log(`Loading DB from ${this.dbPath}`);
                const fileData = fs.readFileSync(this.dbPath, 'utf8');
                this.data = JSON.parse(fileData);
            } else {
                console.log(`Creating new DB at ${this.dbPath}`);
                this.save();
            }
        } catch (error) {
            console.error('DB Init Error:', error);
            // Fallback to empty
            this.data = { users: [], presentations: [], usage_stats: [] };
        }
    }

    save() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('DB Save Error:', error);
        }
    }

    // --- Helpers ---
    findUserByEmail(email) {
        return this.data.users.find(u => u.email === email);
    }

    findUserById(id) {
        return this.data.users.find(u => u.id === id);
    }

    createUser(username, email, password) {
        const id = this.data.users.length + 1;
        const user = { id, username, email, password, created_at: new Date().toISOString() };
        this.data.users.push(user);
        this.save();
        return user;
    }

    getUsage(userId, date) {
        return this.data.usage_stats.find(s => s.user_id === userId && s.date === date);
    }

    incrementUsage(userId, date, count) {
        let usage = this.getUsage(userId, date);
        if (!usage) {
            usage = { id: this.data.usage_stats.length + 1, user_id: userId, date, count: 0 };
            this.data.usage_stats.push(usage);
        }
        usage.count += count;
        this.save();
        return usage;
    }

    addPresentation(userId, title, data, theme) {
        const id = this.data.presentations.length + 1;
        const pres = {
            id,
            user_id: userId,
            title,
            data,
            theme,
            created_at: new Date().toISOString()
        };
        this.data.presentations.push(pres);
        this.save();
        return pres;
    }

    getUserPresentations(userId) {
        return this.data.presentations
            .filter(p => p.user_id === userId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
}

const db = new JsonDatabase();

// Mistral AI
const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY
});

// Model mapping
const MODEL_MAP = {
    'cry-5.2-kx3d': 'mistral-large-2411',
    'cry-4.6-kx1d': 'mistral-medium',
    'cry-2.3-ky1d': 'mistral-small-2402'
};

const DAILY_SLIDE_LIMIT = 20;

// Helper: Check and Increment Usage
function checkLimit(userId, slideCount) {
    const today = new Date().toISOString().split('T')[0];
    const usage = db.getUsage(userId, today) || { count: 0 };

    if (usage.count + slideCount > DAILY_SLIDE_LIMIT) {
        throw new Error(`Günlük slayt limitiniz (${DAILY_SLIDE_LIMIT}) doldu. Bugün ${usage.count} slayt oluşturdunuz.`);
    }

    return () => {
        db.incrementUsage(userId, today, slideCount);
    };
}

// Auth middleware
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.username = decoded.username;
        next();
    } catch {
        return res.status(401).json({ error: 'Geçersiz token' });
    }
}

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
        }

        const existingUser = db.data.users.find(u => u.email === email || u.username === username);
        if (existingUser) {
            return res.status(400).json({ error: 'Bu kullanıcı adı veya e-posta zaten kullanılıyor' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = db.createUser(username, email, hashedPassword);

        const token = jwt.sign({ userId: newUser.id, username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, username });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Kayıt sırasında bir hata oluştu' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'E-posta ve şifre gerekli' });
        }

        const user = db.findUserByEmail(email);
        if (!user) {
            return res.status(400).json({ error: 'Geçersiz e-posta veya şifre' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Geçersiz e-posta veya şifre' });
        }

        const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Giriş sırasında bir hata oluştu' });
    }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({ success: true, username: req.username, userId: req.userId });
});

// Get user stats (limits)
app.get('/api/user/status', authMiddleware, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const usage = db.getUsage(req.userId, today);
    const used = usage ? usage.count : 0;

    res.json({
        success: true,
        used: used,
        limit: DAILY_SLIDE_LIMIT,
        remaining: DAILY_SLIDE_LIMIT - used
    });
});

// ==================== PRESENTATION ROUTES ====================
app.post('/api/generate', authMiddleware, async (req, res) => {
    try {
        const { topic, slideCount, style, model, audience } = req.body;
        if (!topic) return res.status(400).json({ error: 'Konu belirtilmedi' });

        const numSlides = parseInt(slideCount) || 8;

        // 1. Check Usage Limit
        let commitUsage;
        try {
            commitUsage = checkLimit(req.userId, numSlides);
        } catch (limitErr) {
            return res.status(403).json({ error: limitErr.message });
        }

        const crystalModel = MODEL_MAP[model] || 'mistral-large-2411';
        const presentationStyle = style || 'professional';

        const styleDescriptions = {
            professional: 'profesyonel ve kurumsal bir tonda',
            creative: 'yaratıcı ve ilham verici bir tonda',
            educational: 'eğitici ve öğretici bir tonda',
            minimal: 'minimal ve öz bir tonda',
            storytelling: 'hikaye anlatımı tarzında'
        };

        const audienceDesc = audience ? `Hedef kitle: ${audience}.` : '';
        const styleDesc = styleDescriptions[presentationStyle] || styleDescriptions.professional;

        const prompt = `Sen dünya çapında bir sunum tasarım uzmanısın. "${topic}" konusunda ${numSlides} slaytlık, ${styleDesc} bir sunum oluştur.
${audienceDesc}

Her slayt için şu JSON formatında çıktı ver:
{
  "title": "Sunum Başlığı",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slayt Başlığı",
      "content": ["Madde 1", "Madde 2", "Madde 3", "Madde 4"],
      "notes": "Konuşmacı notları",
      "layout": "title|content|two-column|image-text|quote|stats|closing",
      "bgColor": "#hex renk kodu slayt arka planı için"
    }
  ]
}

Kurallar:
- İlk slayt "title" layout olmalı (kapak slaytı)
- Son slayt "closing" layout olmalı (kapanış/teşekkür)
- Her slaytın content dizisinde en fazla 5 madde olsun
- İçerik Türkçe olmalı
- Layout türlerini çeşitli kullan
- İçerik bilgilendirici, profesyonel ve etkileyici olsun
- stats layout kullanıyorsan content dizisinde "değer|açıklama" formatında yaz
- quote layout kullanıyorsan content dizisinde ilk eleman alıntı, ikinci eleman alıntı sahibi olsun
- Her slayt için uygun bgColor belirle (koyu tonlar tercih et)

SADECE JSON formatında cevap ver, başka açıklama ekleme.`;

        const chatResponse = await mistral.chat.complete({
            model: crystalModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            maxTokens: 4000
        });

        let responseText = chatResponse.choices[0].message.content;
        responseText = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const presentationData = JSON.parse(responseText);

        // 2. Commit Usage update
        commitUsage();

        // Save to database
        db.addPresentation(req.userId, presentationData.title, JSON.stringify(presentationData), 'dark');

        res.json({ success: true, presentation: presentationData, model: model });
    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ error: 'Sunum oluşturulurken bir hata oluştu', details: error.message });
    }
});

app.post('/api/enhance-slide', authMiddleware, async (req, res) => {
    try {
        const { slide, instruction, model } = req.body;
        const crystalModel = MODEL_MAP[model] || 'mistral-large-2411';

        const prompt = `Bu slaytı geliştir: ${JSON.stringify(slide)}
        
Kullanıcı talebi: "${instruction}"

Aynı JSON formatında güncellenmiş slaytı döndür:
{
  "slideNumber": ${slide.slideNumber},
  "title": "Güncel Başlık",
  "content": ["Madde 1", "Madde 2"],
  "notes": "Konuşmacı notları",
  "layout": "${slide.layout}"
}

SADECE JSON formatında cevap ver.`;

        const chatResponse = await mistral.chat.complete({
            model: crystalModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            maxTokens: 1000
        });

        let responseText = chatResponse.choices[0].message.content;
        responseText = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const updatedSlide = JSON.parse(responseText);

        res.json({ success: true, slide: updatedSlide });
    } catch (error) {
        console.error('Enhance error:', error);
        res.status(500).json({ error: 'Slayt geliştirilemedi', details: error.message });
    }
});

// Get user presentations
app.get('/api/presentations', authMiddleware, (req, res) => {
    const presentations = db.getUserPresentations(req.userId);
    // Return only necessary fields for the list
    const list = presentations.map(p => ({
        id: p.id,
        title: p.title,
        theme: p.theme,
        created_at: p.created_at
    }));
    res.json({ success: true, presentations: list });
});

app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`💎 Crystal AI sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});
