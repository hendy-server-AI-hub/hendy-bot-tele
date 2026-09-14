const TelegramBotModule = require('node-telegram-bot-api');
const TelegramBot = TelegramBotModule.default || TelegramBotModule;
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// ==========================================
// ⚙️ CẤU HÌNH HỆ THỐNG
// ==========================================
const WS_PORT = process.env.PORT || 8080;
const currentToken = process.env.BOT_TOKEN || '8689114890:AAFBFM0rNtZWpOtAovIPHPVQTJVp0odU1DQ';
const ADMIN_ID = process.env.ADMIN_ID || '6138197737';
const CHANNEL_ID = process.env.CHANNEL_ID || '-100xxxxxxxxx';

const DB_FILE = path.join(__dirname, 'database.json');
let users = {};
let masterWebSocket = null;
let bot = null;

const DEFAULT_LINKED_ACCOUNTS = {
    SC88: [],
    C168: [],
    CM88: [],
    F8BET: [],
    QQ88: [],
    "78WIN": []
};

// Danh mục dịch vụ mạng tích hợp mới
const SMM_SERVICES = {
    coin_master: {
        title: '🎲 SPIN COIN MASTER',
        items: [
            { name: 'Spin Coin Master', price: 1000 },
            { name: 'Spin Coin Master (Extra)', price: 1500 },
            { name: 'Sự Kiện Mời Đối Tác', price: 5000 }
        ]
    },
    facebook: {
        title: '📘 DỊCH VỤ FACEBOOK',
        items: [
            { name: 'Tăng Like Facebook', price: 100 },
            { name: 'Tăng Follow Facebook', price: 150 },
            { name: 'Tăng Lượt Xem Story', price: 50 },
            { name: 'Tăng Share Bài Viết', price: 200 },
            { name: 'Tăng Like / Follow Fanpage', price: 180 },
            { name: 'Tăng View Live Stream', price: 300 },
            { name: 'Tăng Member Facebook', price: 120 },
            { name: 'Tăng Bình Luận Facebook', price: 250 },
            { name: 'Tăng Lượt Xem Video', price: 40 }
        ]
    },
    tiktok: {
        title: '🎵 DỊCH VỤ TIKTOK',
        items: [
            { name: 'Tăng Tim Tiktok', price: 80 },
            { name: 'Tăng Follow Tiktok', price: 120 },
            { name: 'Tăng View Tiktok', price: 20 },
            { name: 'Tăng Share Tiktok', price: 100 },
            { name: 'Tăng Save Tiktok', price: 90 },
            { name: 'Tăng Bình Luận Tiktok', price: 200 },
            { name: 'Tăng Mắt Live Tiktok', price: 350 }
        ]
    },
    instagram: {
        title: '📸 DỊCH VỤ INSTAGRAM',
        items: [
            { name: 'Tăng Tim Bài Viết INS', price: 90 },
            { name: 'Tăng Theo Dõi Instagram', price: 140 }
        ]
    },
    youtube: {
        title: '▶️ DỊCH VỤ YOUTUBE',
        items: [
            { name: 'Tăng Subscribe Youtube', price: 300 },
            { name: 'Tăng View Youtube', price: 50 },
            { name: 'Tăng Like Youtube', price: 100 }
        ]
    },
    shopee: {
        title: '🛍️ DỊCH VỤ SHOPEE',
        items: [
            { name: 'Tăng Theo Dõi Shopee', price: 150 },
            { name: 'Tăng Tim Shopee', price: 80 },
            { name: 'Tăng Mắt Live Shopee', price: 400 }
        ]
    },
    twitter_x: {
        title: '𝕏 DỊCH VỤ X (TWITTER)',
        items: [
            { name: 'Tăng Like X', price: 110 },
            { name: 'Tăng Follow X', price: 160 },
            { name: 'Tăng Lượt Xem X', price: 30 }
        ]
    },
    bigo: {
        title: '🐥 DỊCH VỤ BIGO LIVE',
        items: [
            { name: 'Tăng Mắt Xem Bigo Live', price: 500 }
        ]
    },
    telegram: {
        title: '✈️ DỊCH VỤ TELEGRAM',
        items: [
            { name: 'Tăng Member Telegram Group/Channel', price: 130 },
            { name: 'Tăng View Bài Viết Telegram', price: 25 }
        ]
    },
    thread: {
        title: '🌀 DỊCH VỤ THREAD',
        items: [
            { name: 'Tăng Follow Thread', price: 150 },
            { name: 'Tăng Like Thread', price: 100 }
        ]
    }
};

let brandStatuses = {
    'SC88': { status: '🟢 Hoạt động', ping: 12 },
    'C168': { status: '🟢 Hoạt động', ping: 15 },
    'F8BET': { status: '🟢 Hoạt động', ping: 14 }
};

// ==========================================
// 🗄️ QUẢN LÝ DATABASE
// ==========================================
function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            users = JSON.parse(data);
            Object.keys(users).forEach(uid => {
                if (!users[uid].linkedAccounts) {
                    users[uid].linkedAccounts = JSON.parse(JSON.stringify(DEFAULT_LINKED_ACCOUNTS));
                }
                if (users[uid].balance === undefined) {
                    users[uid].balance = 50000;
                }
            });
            console.log(`✅ Đã tải dữ liệu của ${Object.keys(users).length} khách hàng.`);
        } else {
            console.log('⚠️ Chưa có file database.json, khởi tạo database mới.');
            users = {};
            saveDatabase();
        }
    } catch (err) {
        console.error('❌ Lỗi đọc database:', err);
        users = {};
    }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 4), 'utf8');
    } catch (err) {
        console.error('❌ Lỗi lưu database:', err);
    }
}

function getSystemStatusText() {
    let report = `📡 *HENDY SYSTEM MONITOR*\n🕒 ${new Date().toLocaleTimeString('vi-VN')}\n--------------------------\n`;
    Object.keys(brandStatuses).forEach(brand => {
        const b = brandStatuses[brand];
        report += `• *${brand}:* ${b.status} (${b.ping}ms)\n`;
    });
    return report;
}

// ==========================================
// 🤖 KHỞI TẠO BOT TELEGRAM
// ==========================================
function sendHomeMenu(chatId, u, isAdmin) {
    const welcomeMessage = `
🤖 *HENDY CYBERTECH PRO v2026* 🚀
Chào mừng sếp, *${u.name}*
--------------------------------------------------
💎 *Phân quyền:* ${isAdmin ? '👑 ADMIN TỐI CAO' : '👤 KHÁCH HÀNG'}
💰 **Ví Chính:** \`${u.balance.toLocaleString()} VNĐ\`
--------------------------------------------------
👉 Chọn dịch vụ cần giao dịch bên dưới:
    `;

    const inlineKeyboard = [
        [{ text: '🌐 DỊCH VỤ MẠNG XÃ HỘI (SMM)', callback_data: 'smm_main' }],
        [{ text: '🎟️ TRUNG TÂM MUA CODE', callback_data: 'buy_code' }],
        [{ text: '💳 NẠP TIỀN TỰ ĐỘNG', callback_data: 'deposit' }, { text: '📇 TRUNG TÂM KHÁCH HÀNG', callback_data: 'customer_center' }],
        [{ text: '👥 NHÓM HỖ TRỢ', url: 'https://t.me/Hendy_Support_Group' }]
    ];

    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineKeyboard } });
}

function setupBotLogic() {
    if (!bot) return;

    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id.toString();
        const user = msg.from;
        const isAdmin = (chatId === ADMIN_ID);

        if (!users[chatId]) {
            users[chatId] = {
                name: user.first_name || 'Khách',
                balance: 50000,
                voucher: 0,
                wonCodes: [],
                linkedAccounts: JSON.parse(JSON.stringify(DEFAULT_LINKED_ACCOUNTS))
            };
            saveDatabase();
        }

        sendHomeMenu(chatId, users[chatId], isAdmin);
    });

    bot.on('callback_query', (query) => {
        const chatId = query.from.id.toString();
        const data = query.data;
        const u = users[chatId];
        if (!u) return;

        // Danh mục dịch vụ mạng chính
        if (data === 'smm_main') {
            let text = `🌐 *DANH MỤC DỊCH VỤ MẠNG 86*\nVui lòng chọn nền tảng bạn muốn sử dụng:\n--------------------------------------------------\n`;
            let kb = [];
            
            Object.keys(SMM_SERVICES).forEach(key => {
                kb.push([{ text: SMM_SERVICES[key].title, callback_data: `smm_cat_${key}` }]);
            });
            kb.push([{ text: '◀ Quay lại Trang chủ', callback_data: 'back_start' }]);

            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
        }
        // Chi tiết từng nền tảng dịch vụ
        else if (data.startsWith('smm_cat_')) {
            const catKey = data.replace('smm_cat_', '');
            const category = SMM_SERVICES[catKey];

            if (category) {
                let text = `${category.title}\n--------------------------------------------------\n`;
                let kb = [];

                category.items.forEach((item, idx) => {
                    text += `• *${item.name}*: \`${item.price.toLocaleString()} VNĐ\`\n`;
                    kb.push([{ text: `🛒 Đặt hàng: ${item.name}`, callback_data: `order_${catKey}_${idx}` }]);
                });
                
                kb.push([{ text: '◀ Quay lại Danh mục', callback_data: 'smm_main' }]);

                bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
            }
        }
        // Chọn mua dịch vụ
        else if (data.startsWith('order_')) {
            const parts = data.split('_');
            const catKey = parts[1];
            const itemIdx = parseInt(parts[2]);
            const item = SMM_SERVICES[catKey]?.items[itemIdx];

            if (item) {
                bot.sendMessage(chatId, `📌 Bạn đã chọn: *${item.name}*\n💰 Giá: \`${item.price.toLocaleString()} VNĐ\`\n\n👉 Vui lòng gửi Link / ID mục tiêu để hệ thống tiến hành xử lý đơn hàng.`, { parse_mode: 'Markdown' });
            }
        }
        // Trung tâm mua code
        else if (data === 'buy_code') {
            let textMenu = `🎟️ *TRUNG TÂM MUA CODE & NHÀ CÁI*\n☕ Chào sếp *${u.name}*\n--------------------------------------------------\n`;
            let kb = [];
            Object.keys(u.linkedAccounts).forEach(brand => {
                let count = u.linkedAccounts[brand].length;
                textMenu += `• ${brand}: [ ${count} ]\n`;
                kb.push([{ text: `▶ ${brand} (${count})`, callback_data: `page_${brand}` }]);
            });
            kb.push([{ text: '◀ Quay lại', callback_data: 'back_start' }]);
            bot.editMessageText(textMenu, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
        }
        // Quay lại Menu chính
        else if (data === 'back_start') {
            sendHomeMenu(chatId, u, (chatId === ADMIN_ID));
        }

        bot.answerCallbackQuery(query.id);
    });
}

function startBot(token) {
    if (bot) {
        try { bot.stopPolling(); } catch (e) {}
        bot = null;
    }
    try {
        bot = new TelegramBot(token, { polling: true });
        setupBotLogic();
        console.log('🤖 Bot Telegram (Server) đã khởi động thành công!');

        setInterval(() => {
            try {
                if (bot && CHANNEL_ID.includes('-100')) {
                    bot.sendMessage(CHANNEL_ID, getSystemStatusText(), { parse_mode: 'Markdown' });
                }
            } catch (e) {}
        }, 3600000);

        return true;
    } catch (e) {
        console.error("❌ Lỗi khởi động bot:", e);
        return false;
    }
}

// ==========================================
// ⚡ WEBSOCKET SERVER KHỞI CHẠY
// ==========================================
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
    console.log('[+] Một Tab Worker / Client vừa kết nối WebSocket!');
    masterWebSocket = ws;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log('[WS] Nhận dữ liệu:', data);
        } catch (e) {
            console.log('[WS Tin nhắn thuần]:', message.toString());
        }
    });

    ws.on('close', () => {
        console.log('[-] Client đã ngắt kết nối WebSocket.');
        if (masterWebSocket === ws) masterWebSocket = null;
    });
});

// Khởi chạy hệ thống
loadDatabase();
startBot(currentToken);
console.log(`🚀 WebSocket Server & Bot đã chạy thành công trên cổng ${WS_PORT}!`);
