const TelegramBotModule = require('node-telegram-bot-api');
const TelegramBot = TelegramBotModule.default || TelegramBotModule;
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const WS_PORT = process.env.PORT || 8080;
const currentToken = process.env.BOT_TOKEN || '8689114890:AAFBFM0rNtZWpOtAovIPHPVQTJVp0odU1DQ';
const ADMIN_ID = process.env.ADMIN_ID || '6138197737';
const CHANNEL_ID = process.env.CHANNEL_ID || '-100xxxxxxxxx';

const DB_FILE = path.join(__dirname, 'database.json');
let users = {};
let adminSession = {}; 
let masterWebSocket = null;
let bot = null;

const DEFAULT_LINKED_ACCOUNTS = {
    SC88: [], C168: [], CM88: [], F8BET: [], QQ88: [], "78WIN": []
};

const SMM_SERVICES = {
    tiktok: {
        title: '🎵 DỊCH VỤ TIKTOK',
        items: [
            { name: 'Tăng Tim Tiktok', price: 80 },
            { name: 'Tăng Follow Tiktok', price: 120 }
        ]
    }
};

let brandStatuses = {
    'SC88': { status: '🟢 Hoạt động', ping: 12 },
    'C168': { status: '🟢 Hoạt động', ping: 15 },
    'F8BET': { status: '🟢 Hoạt động', ping: 14 }
};

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            users = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        } else {
            users = {};
            saveDatabase();
        }
    } catch (err) {
        users = {};
    }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 4), 'utf8');
    } catch (err) {}
}

function generateOrderId() {
    return 'ORD' + Math.floor(Math.random() * 90000 + 10000);
}

function generateServiceAccount() {
    const accId = 'bot_acc_' + Math.floor(Math.random() * 89999 + 10000);
    const passKey = 'key_' + Math.random().toString(36).substring(2, 8);
    return `${accId} | Mật khẩu/Token: ${passKey}`;
}

function sendHomeMenu(chatId, u, isAdmin) {
    const welcomeMessage = `🤖 *HỆ THỐNG DỊCH VỤ MXH PRO*\nChào sếp *${u.name}*\nVí: \`${u.balance.toLocaleString()} VNĐ\``;
    const inlineKeyboard = [
        [{ text: '🌐 DỊCH VỤ MẠNG XÃ HỘI', callback_data: 'smm_main' }]
    ];
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineKeyboard } });
}

function setupBotLogic() {
    if (!bot) return;

    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id.toString();
        const user = msg.from;
        if (!users[chatId]) {
            users[chatId] = {
                name: user.first_name || 'Khách',
                balance: 50000,
                orders: [],
                linkedAccounts: JSON.parse(JSON.stringify(DEFAULT_LINKED_ACCOUNTS))
            };
        }
        saveDatabase();
        sendHomeMenu(chatId, users[chatId], (chatId === ADMIN_ID));
    });

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id.toString();
        const text = msg.text;
        let u = users[chatId];
        if (!u || !text || text.startsWith('/start')) return;

        if (u.actionState && u.actionState.step === 'WAITING_LINK') {
            u.actionState.link = text;
            u.actionState.step = 'WAITING_QUANTITY';
            saveDatabase();
            bot.sendMessage(chatId, `🔗 Đã nhận Link. Nhập số lượng:`);
            return;
        }

        if (u.actionState && u.actionState.step === 'WAITING_QUANTITY') {
            const quantity = parseInt(text);
            const totalCost = quantity * u.actionState.price;
            u.balance -= totalCost;
            const newOrderId = generateOrderId();
            const autoAccountInfo = generateServiceAccount();

            if (!u.orders) u.orders = [];
            u.orders.push({
                id: newOrderId,
                serviceName: u.actionState.serviceName,
                link: u.actionState.link,
                quantity: quantity,
                totalCost: totalCost,
                serviceAccount: autoAccountInfo,
                status: '⏳ Đang xử lý'
            });

            delete u.actionState;
            saveDatabase();

            bot.sendMessage(chatId, `✅ ĐẶT HÀNG THÀNH CÔNG!\nMã đơn: ${newOrderId}\nTài khoản tự tạo: \`${autoAccountInfo}\``, { parse_mode: 'Markdown' });
        }
    });

    bot.on('callback_query', (query) => {
        const chatId = query.from.id.toString();
        const data = query.data;
        const u = users[chatId];
        if (!u) return;

        if (data === 'smm_main') {
            bot.sendMessage(chatId, `Chọn dịch vụ Tiktok:`, {
                reply_markup: {
                    inline_keyboard: [[{ text: '🛒 Tăng Tim Tiktok (80đ)', callback_data: 'order_tiktok_0' }]]
                }
            });
        } else if (data.startsWith('order_tiktok_0')) {
            u.actionState = { step: 'WAITING_LINK', serviceName: 'Tăng Tim Tiktok', price: 80 };
            saveDatabase();
            bot.sendMessage(chatId, `Gửi Link mục tiêu:`);
        }
        bot.answerCallbackQuery(query.id);
    });
}

function startBot(token) {
    bot = new TelegramBot(token, { polling: true });
    setupBotLogic();
}

const wss = new WebSocket.Server({ port: WS_PORT });
loadDatabase();
startBot(currentToken);
