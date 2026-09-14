const TelegramBotModule = require('node-telegram-bot-api');
const TelegramBot = TelegramBotModule.default || TelegramBotModule;
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// ==========================================
// CẤU HÌNH HỆ THỐNG
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

// Cấu hình danh mục Dịch Vụ Mạng Xã Hội
const SMM_SERVICES = {
    cm: {
        title: '🎰 Spin Coin Master',
        items: ['Spin Coin Master', 'Spin Coin Master (Extra)', 'Sự Kiện Mời Đối Tác']
    },
    fb: {
        title: '👍 Dịch Vụ Facebook',
        items: ['Tăng Like Facebook', 'Tăng Follow Facebook', 'Tăng Lượt Xem Story', 'Tăng Share Bài Viết', 'Tăng Like/Follow FanPage', 'Tăng View Live Stream', 'Tăng Member Group', 'Tăng Bình Luận FB']
    },
    tt: {
        title: '🎵 Dịch Vụ TikTok',
        items: ['Tăng Tim TikTok', 'Tăng Follow TikTok', 'Tăng View TikTok', 'Tăng Share TikTok', 'Tăng Save TikTok', 'Tăng Bình Luận TikTok', 'Tăng Mắt Live TikTok']
    },
    ins: {
        title: '📸 Dịch Vụ Instagram',
        items: ['Tăng Tim Bài Viết INS', 'Tăng Theo Dõi Instagram']
    },
    yt: {
        title: '▶️ Dịch Vụ YouTube',
        items: ['Tăng Subscribe YouTube', 'Tăng View YouTube', 'Tăng Like YouTube']
    },
    tele: {
        title: '✈️ Dịch Vụ Telegram',
        items: ['Tăng Member Group/Channel', 'Tăng View Bài Viết Telegram', 'Tăng Reaction Telegram']
    }
};

let brandStatuses = {
    'SC88': { status: '🟢 Hoạt động', ping: 12 },
    'C168': { status: '🟢 Hoạt động', ping: 15 },
    'F8BET': { status: '🟢 Hoạt động', ping: 14 }
};

// ==========================================
// QUẢN LÝ DATABASE
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
// KHỞI TẠO BOT TELEGRAM
// ==========================================
function sendHomeMenu(chatId, u, isAdmin) {
    const welcomeMessage = `
🤖 *HENDY CYBERTECH PRO v2026* 🚀
Chào mừng sếp, *${u.name}*
--------------------------------------------------
💎 *Phân quyền:* ${isAdmin ? '👑 ADMIN TỐI CAO' : '👤 KHÁCH HÀNG'}
💰 **Ví Chính:** \`${u.balance.toLocaleString()} VNĐ\`
--------------------------------------------------
👉 Hệ thống tự động bảo mật & đồng bộ cao cấp.
    `;

    const inlineKeyboard = [
        [{ text: '🎟️ TRUNG TÂM MUA CODE', callback_data: 'buy_code' }],
        [{ text: '🌐 DỊCH VỤ MẠNG XÃ HỘI', callback_data: 'smm_main' }],
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
                balance: 1501,
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
        const messageId = query.message.message_id;
        const u = users[chatId];
        if (!u) return;

        // Menu Mua Code Game
        if (data === 'buy_code') {
            let textMenu = `🎟️ *TRUNG TÂM MUA CODE & NHÀ CÁI*\n☕ Chào sếp *${u.name}*\n--------------------------------------------------\n`;
            let kb = [];
            Object.keys(u.linkedAccounts).forEach(brand => {
                let count = u.linkedAccounts[brand].length;
                textMenu += `• ${brand}: [ ${count} ]\n`;
                kb.push([{ text: `▶ ${brand} (${count})`, callback_data: `page_${brand}` }]);
            });
            kb.push([{ text: '◀ Quay lại', callback_data: 'back_start' }]);
            bot.editMessageText(textMenu, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
        }
        // Menu Dịch Vụ Mạng Xã Hội (SMM Main Menu)
        else if (data === 'smm_main') {
            let textMenu = `🌐 *DANH MỤC DỊCH VỤ MẠNG XÃ HỘI*\n--------------------------------------------------\nVui lòng chọn nền tảng dịch vụ sếp muốn sử dụng:`;
            let kb = [
                [{ text: '🎰 Spin Coin Master', callback_data: 'smm_cat_cm' }, { text: '👍 Dịch Vụ Facebook', callback_data: 'smm_cat_fb' }],
                [{ text: '🎵 Dịch Vụ TikTok', callback_data: 'smm_cat_tt' }, { text: '📸 Dịch Vụ Instagram', callback_data: 'smm_cat_ins' }],
                [{ text: '▶️ Dịch Vụ YouTube', callback_data: 'smm_cat_yt' }, { text: '✈️ Dịch Vụ Telegram', callback_data: 'smm_cat_tele' }],
                [{ text: '◀ Quay lại Trang Chủ', callback_data: 'back_start' }]
            ];
            bot.editMessageText(textMenu, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
        }
        // Xem chi tiết từng nền tảng SMM
        else if (data.startsWith('smm_cat_')) {
            const catKey = data.replace('smm_cat_', '');
            const category = SMM_SERVICES[catKey];

            if (category) {
                let textMenu = `🚀 *${category.title.toUpperCase()}*\n--------------------------------------------------\nChọn dịch vụ sếp cần chạy đơn:`;
                let kb = [];
                category.items.forEach((item, index) => {
                    kb.push([{ text: `⚡ ${item}`, callback_data: `smm_item_${catKey}_${index}` }]);
                });
                kb.push([{ text: '◀ Quay lại Danh Mục SMM', callback_data: 'smm_main' }]);
                bot.editMessageText(textMenu, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
            }
        }
        // Xử lý khi chọn 1 dịch vụ cụ thể
        else if (data.startsWith('smm_item_')) {
            const parts = data.split('_');
            const catKey = parts[2];
            const itemIdx = parseInt(parts[3]);
            const category = SMM_SERVICES[catKey];

            if (category && category.items[itemIdx]) {
                const serviceName = category.items[itemIdx];
                let textDetail = `📌 *DỊCH VỤ:* ${serviceName}\n💰 *Số dư hiện tại:* \`${u.balance.toLocaleString()} VNĐ\`\n--------------------------------------------------\n👉 Để tạo đơn hàng, sếp vui lòng gửi Link bài viết/tài khoản và Số lượng theo cú pháp:\n\`Link_Hoac_ID | So_Luong\``;
                let kb = [[{ text: '◀ Quay lại', callback_data: `smm_cat_${catKey}` }]];
                bot.editMessageText(textDetail, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
            }
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
// WEBSOCKET SERVER KHỞI CHẠY
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
