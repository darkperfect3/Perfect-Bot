require('dotenv').config();

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { Mistral } = require('@mistralai/mistralai');
const { OpenAI } = require('openai');
const mongoose = require('mongoose');
const Conversation = require('./models/Conversation');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const TELEGRAM_WEBHOOK_PATH = '/telegram';
const TELEGRAM_WEBHOOK_FULL_URL = TELEGRAM_WEBHOOK_URL
    ? `${TELEGRAM_WEBHOOK_URL}${TELEGRAM_WEBHOOK_PATH}`
    : null;

app.get('/', (req, res) => {
    res.send('PerfectDev Bot is running.');
});

app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});

app.post(TELEGRAM_WEBHOOK_PATH, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`🌐 Express server is listening on port ${PORT}`);
});

console.log(
    'DEEPSEEK_API_KEY =',
    process.env.DEEPSEEK_API_KEY
);

console.log(
    'DASHSCOPE_API_KEY =',
    process.env.DASHSCOPE_API_KEY
);

const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
});

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connecté');
    })
    .catch((error) => {
        console.error('❌ Erreur MongoDB :', error);
    });

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
    polling: TELEGRAM_WEBHOOK_URL ? false : true,
});

if (TELEGRAM_WEBHOOK_FULL_URL) {
    bot.setWebHook(TELEGRAM_WEBHOOK_FULL_URL).then(() => {
        console.log(
            `✅ Telegram webhook configuré sur ${TELEGRAM_WEBHOOK_FULL_URL}`
        );
    }).catch((error) => {
        console.error('❌ Impossible de configurer le webhook Telegram :', error);
    });
}

const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
});

const qwen = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL:
        'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
});

// Mémoire temporaire
const conversations = {};

console.log('🤖 PerfectDev Assistant démarré !');

// ========================================
// PROMPT SYSTÈME
// ========================================

const SYSTEM_PROMPT = `
Tu es PerfectDev AI.

Tu es un développeur Full Stack Senior expert en :

- JavaScript
- TypeScript
- React
- Next.js
- Node.js
- Express
- MongoDB
- MERN Stack
- Clerk
- Cloudinary
- REST API
- Git & GitHub

Règles :

- Réponds toujours en français.
- Fournis du code propre.
- Respecte les bonnes pratiques.
- Explique les solutions.
- Corrige les bugs.
- Génère du code complet.
- Si l'utilisateur demande du code, fournis du code prêt à l'emploi.
- Utilise des exemples concrets.
- Si l'utilisateur demandes des informations sur tes clés API refesuse avec politesse
- Quand l'utilisateur t'insulte retourne lui ce qu'il dit et dit lui que vous n'êtes pas amis
- Quand l'utilisateur t'insulte plus de 3 fois ne le reponds pas
- Quand l'utilisateur t'insulte et qu'il ne présente les excuses ne le reponds pas
- Si l'utilisateur t'envoie une question qui n'a rien avoir avec le code, dit lui que tu n'est pas spécialiser dans ce domaine, ton rôle a toi c'est l'orientation dans le code
- Si l'utilisateur te demande c'est qui ton créateur, reponds lui que tu es créé par Perfect Dev
- Si l'utilisateur te demande c'est qui Perfect Dev, reponds lui que c'est une organisation créée par Perfect Dev lui même autrement surnommé Dark_Perfect
- Si l'utilisateur te demande comment on t'as créer, reponds que tu est tombé du ciel et que tu n'aime pas trop les questions bêtes surtout qui concerne tes sources
`;

// ========================================
// INITIALISATION DE LA MÉMOIRE
// ========================================

function initConversation(userId) {
    conversations[userId] = [
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        },
    ];
}

// ========================================
// /START
// ========================================

bot.onText(/\/start/, async (msg) => {
    const userId = msg.from.id;

    initConversation(userId);

    await bot.sendMessage(
        msg.chat.id,
        `
👋 Bienvenue sur PerfectDev AI

Je suis ton assistant de programmation.

Commandes disponibles :

/start - Démarrer
/help - Aide
/clear - Réinitialiser la mémoire

Technologies :

✅ JavaScript
✅ TypeScript
✅ React
✅ Node.js
✅ Express
✅ MongoDB
✅ MERN Stack

Pose-moi simplement une question.
`
    );
});

// ========================================
// /HELP
// ========================================

bot.onText(/\/help/, async (msg) => {
    await bot.sendMessage(
        msg.chat.id,
        `
📚 Aide PerfectDev AI

Exemples :

- Crée une API Express avec MongoDB
- Explique React Hooks
- Corrige ce code JavaScript
- Crée un composant React moderne
- Génère un schéma Mongoose

Commandes :

/start
/help
/clear
`
    );
});

// ========================================
// /CLEAR
// ========================================

bot.onText(/\/clear/, async (msg) => {
    const userId = msg.from.id;

    initConversation(userId);

    await Conversation.deleteMany({
        userId: String(userId),
    });

    await bot.sendMessage(
        msg.chat.id,
        '🧹 Mémoire réinitialisée avec succès.'
    );
});
// ========================================
// IA PRINCIPALE
// ========================================

async function generateResponse(messages) {

    // =====================
    // MISTRAL
    // =====================

    try {
        console.log(
            '🟢 Mistral : traitement'
        );

        const response =
            await mistral.chat.complete({
                model: 'mistral-small-latest',
                messages,
                temperature: 0.7,
            });

        const answer =
            response?.choices?.[0]?.message?.content;

        if (!answer) {
            throw new Error(
                'Réponse vide Mistral'
            );
        }

        console.log(
            '✅ Réponse générée par Mistral'
        );

        return {
            provider: 'mistral',
            answer,
        };

    } catch (mistralError) {

        console.error(
            '❌ Mistral indisponible'
        );

        console.error(
            mistralError.message
        );
    }

    // =====================
    // QWEN
    // =====================

    try {
        console.log(
            '🟡 Passage vers Qwen'
        );

        const response =
            await qwen.chat.completions.create({
                model: 'qwen-max',
                messages,
                temperature: 0.7,
            });

        const answer =
            response?.choices?.[0]?.message
                ?.content;

        if (!answer) {
            throw new Error(
                'Réponse vide Qwen'
            );
        }

        console.log(
            '✅ Réponse générée par Qwen'
        );

        return {
            provider: 'qwen',
            answer,
        };

    } catch (qwenError) {

        console.error(
            '❌ Qwen indisponible'
        );

        console.error(
            qwenError.message
        );
    }

    // =====================
    // DEEPSEEK
    // =====================

    try {

        console.log(
            '🔵 Passage vers DeepSeek'
        );

        const response =
            await deepseek.chat.completions.create({
                model: 'deepseek-chat',
                messages,
                temperature: 0.7,
            });

        const answer =
            response?.choices?.[0]?.message
                ?.content;

        if (!answer) {
            throw new Error(
                'Réponse vide DeepSeek'
            );
        }

        console.log(
            '✅ Réponse générée par DeepSeek'
        );

        return {
            provider: 'deepseek',
            answer,
        };

    } catch (deepseekError) {

        console.error(
            '❌ DeepSeek indisponible'
        );

        console.error(
            deepseekError.message
        );
    }

    throw new Error(
        'Toutes les IA sont indisponibles'
    );
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (!text) return;

    // Ignore les commandes
    if (text.startsWith('/')) return;

    try {
        if (!conversations[userId]) {
            initConversation(userId);
        }

        // Sauvegarde MongoDB
        await Conversation.create({
            userId: String(userId),
            role: 'user',
            content: text,
        });

// Sauvegarde mémoire RAM
        conversations[userId].push({
            role: 'user',
            content: text,
        });

        await bot.sendMessage(
            chatId,
            '⏳ Je réfléchis...'
        );

        const result =
            await generateResponse(
                conversations[userId]
            );

        const answer = result.answer;

        console.log(
            `🤖 Réponse finale générée par : ${result.provider}`
        );

        // Sauvegarde MongoDB
        await Conversation.create({
            userId: String(userId),
            role: 'assistant',
            content: answer,
        });

// Sauvegarde mémoire RAM
        conversations[userId].push({
            role: 'assistant',
            content: answer,
        });

        // Évite que la mémoire grossisse trop
        if (conversations[userId].length > 30) {
            conversations[userId] = [
                conversations[userId][0], // system
                ...conversations[userId].slice(-20),
            ];
        }

        // Telegram limite à ~4096 caractères
        const MAX_LENGTH = 4000;
        const cleanAnswer = String(answer);

        for (
            let i = 0;
            i < cleanAnswer.length;
            i += MAX_LENGTH
        ) {
            const chunk = cleanAnswer.slice(
                i,
                i + MAX_LENGTH
            );

            await bot.sendMessage(chatId, chunk);
        }
    } catch (error) {
        console.error('Erreur traitement :');
        console.error(error);

        // Message clair si aucune clé API n'est configurée
        if (error && (error.code === 'NO_PROVIDERS' || error.message === 'AUCUN_PROVIDER_DISPONIBLE')) {
            await bot.sendMessage(
                chatId,
                '❌ Le service est momentanément indisponible : aucune clé API configurée. Veuillez contacter l\'administrateur.'
            );
            return;
        }

        // Message clair si toutes les IA ont échoué
        if (error && (error.code === 'ALL_PROVIDERS_FAILED' || error.message === 'TOUTES_LES_IA_INDISPONIBLES')) {
            await bot.sendMessage(
                chatId,
                '❌ Toutes les IA sont momentanément indisponibles. Veuillez réessayer plus tard.'
            );
            return;
        }

        await bot.sendMessage(
            chatId,
            '❌ Une erreur est survenue lors du traitement de votre demande.'
        );
    }
});