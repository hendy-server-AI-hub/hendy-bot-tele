const express = require('express');
const http = require('http');
const path = require('path');
const TelegramBotModule = require('node-telegram-bot-api');
const TelegramBot = TelegramBotModule.default || TelegramBotModule;
const WebSocket = require('ws');
const fs = require('fs');

// ==========================================
// ⚙️ CẤU HÌNH HỆ THỐNG
// ==========================================
const PORT = process.env.PORT || 8080;
const currentToken = process.env.BOT_TOKEN || '8689114890:AAFBFM0rNtZWpOtAovIPHPVQTJVp0odU1DQ';
const ADMIN_ID = process.env.ADMIN_ID || '6138197737';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const DB_FILE = path.join(__dirname, 'database.json');
let users = {};
let adminSession = {}; 
let bot = null;

const DEFAULT_LINKED_ACCOUNTS = {
    SC88: [],
    C168: [],
    CM88: [],
    F8BET: [],
    QQ88: [],
    "78WIN": []
};

// ==========================================
// 📦 DANH MỤC DỊCH VỤ MXH (SMM)
// ==========================================
const SMM_SERVICES = {
    coin_master: {
        title: '🎲 SPIN COIN MASTER',
        items: [
            { name: 'Spin Coin Master', price: 1000 },
            { name: 'Spin Coin Master (Extra)', price: 1500 }
        ]
    },
    facebook: {
        title: '📘 DỊCH VỤ FACEBOOK',
        items: [
            { name: 'Tăng Like Facebook', price: 100 },
            { name: 'Tăng Follow Facebook', price: 150 },
            { name: 'Tăng Share Bài Viết', price: 200 }
        ]
    },
    tiktok: {
        title: '🎵 DỊCH VỤ TIKTOK',
        items: [
            { name: 'Tăng Tim Tiktok', price: 80 },
            { name: 'Tăng Follow Tiktok', price: 120 },
            { name: 'Tăng View Tiktok', price: 20 }
        ]
    },
    telegram: {
        title: '✈️ DỊCH VỤ TELEGRAM',
        items: [
            { name: 'Tăng Member Telegram Group/Channel', price: 130 },
            { name: 'Tăng View Bài Viết Telegram', price: 25 }
        ]
    }
};

// ==========================================
// 🗄️ QUẢN LÝ DATABASE FILE
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
                if (!users[uid].orders) {
                    users[uid].orders = [];
                }
            });
            console.log(`✅ Đã tải dữ liệu của ${Object.keys(users).length} khách hàng.`);
        } else {
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

function generateOrderId() {
    return 'ORD' + Math.floor(Math.random() * 90000 + 10000);
}

// ==========================================
// 🤖 BOT TELEGRAM LOGIC
// ==========================================
function sendHomeMenu(chatId, u, isAdmin) {
    const welcomeMessage = `
🤖 *MASTER CONTROL PANEL - HENDY & HADES V6100* 🚀
Chào mừng sếp, *${u.name}*
--------------------------------------------------
💎 *Phân quyền:* ${isAdmin ? '👑 ADMIN TỐI CAO' : '👤 KHÁCH HÀNG'}
💰 **Ví Chính:** \`${u.balance.toLocaleString()} VNĐ\`
--------------------------------------------------
👉 Chọn dịch vụ cần giao dịch bên dưới:
    `;

    const inlineKeyboard = [
        [{ text: '🌐 DỊCH VỤ MẠNG XÃ HỘI', callback_data: 'smm_main' }],
        [{ text: '🎟️ TRUNG TÂM MUA CODE', callback_data: 'buy_code' }],
        [{ text: '📇 TRUNG TÂM KHÁCH HÀNG', callback_data: 'customer_center' }],
        ...(isAdmin ? [[{ text: '🛡️ TRUNG TÂM ADMIN (QUẢN LÝ)', callback_data: 'admin_center' }]] : []),
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
                orders: [],
                linkedAccounts: JSON.parse(JSON.stringify(DEFAULT_LINKED_ACCOUNTS))
            };
        }
        
        if (users[chatId].actionState) delete users[chatId].actionState;
        if (adminSession[chatId]) delete adminSession[chatId];
        saveDatabase();

        sendHomeMenu(chatId, users[chatId], isAdmin);
    });

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id.toString();
        const text = msg.text;
        let u = users[chatId];
        
        if (!u || !text || text.startsWith('/start')) return;

        if (text === '/cancel') {
            if (u.actionState) delete u.actionState;
            if (adminSession[chatId]) delete adminSession[chatId];
            saveDatabase();
            bot.sendMessage(chatId, '🚫 Đã hủy thao tác hiện tại.');
            sendHomeMenu(chatId, u, (chatId === ADMIN_ID));
            return;
        }

        if (chatId === ADMIN_ID && adminSession[chatId]) {
            const session = adminSession[chatId];
            const amount = parseInt(text.replace(/[,.]/g, ''));

            if (isNaN(amount) || amount <= 0) {
                bot.sendMessage(chatId, '❌ Số tiền không hợp lệ. Vui lòng nhập số dương (VD: 50000). Gõ /cancel để hủy.');
                return;
            }

            const targetUser = users[session.targetId];
            if (!targetUser) {
                bot.sendMessage(chatId, '❌ Không tìm thấy thông tin khách hàng này.');
                delete adminSession[chatId];
                return;
            }

            if (session.action === 'ADD') {
                targetUser.balance += amount;
                saveDatabase();
                bot.sendMessage(chatId, `✅ Đã CỘNG thành công \`${amount.toLocaleString()} VNĐ\` cho khách *${targetUser.name}*.\n💰 Số dư mới: \`${targetUser.balance.toLocaleString()} VNĐ\``, { parse_mode: 'Markdown' });
                try {
                    bot.sendMessage(session.targetId, `💳 *TÀI KHOẢN ĐƯỢC CỘNG TIỀN!*\n\n💰 Số tiền: \`+${amount.toLocaleString()} VNĐ\`\n💎 Số dư: \`${targetUser.balance.toLocaleString()} VNĐ\``, { parse_mode: 'Markdown' });
                } catch (e) {}
            } else if (session.action === 'SUB') {
                targetUser.balance -= amount;
                saveDatabase();
                bot.sendMessage(chatId, `✅ Đã TRỪ \`${amount.toLocaleString()} VNĐ\` của khách *${targetUser.name}*.\n💰 Số dư mới: \`${targetUser.balance.toLocaleString()} VNĐ\``, { parse_mode: 'Markdown' });
            }

            delete adminSession[chatId];
            return;
        }

        if (u.actionState && u.actionState.step === 'WAITING_LINK') {
            u.actionState.link = text;
            u.actionState.step = 'WAITING_QUANTITY';
            saveDatabase();
            bot.sendMessage(chatId, `🔗 Đã nhận Link mục tiêu.\n\n👉 *Vui lòng nhập số lượng bạn muốn tăng:* (Chỉ nhập số, VD: 1000)\n\n_(Gõ /cancel để hủy)_`, { parse_mode: 'Markdown' });
            return;
        }

        if (u.actionState && u.actionState.step === 'WAITING_QUANTITY') {
            const quantity = parseInt(text);
            if (isNaN(quantity) || quantity <= 0) {
                bot.sendMessage(chatId, '❌ Số lượng không hợp lệ. Vui lòng nhập số dương.');
                return;
            }

            const totalCost = quantity * u.actionState.price;
            if (u.balance < totalCost) {
                bot.sendMessage(chatId, `❌ Tài khoản không đủ tiền!\n💰 Số dư: \`${u.balance.toLocaleString()} VNĐ\`\n📉 Yêu cầu: \`${totalCost.toLocaleString()} VNĐ\``, { parse_mode: 'Markdown' });
                delete u.actionState;
                saveDatabase();
                return;
            }

            u.balance -= totalCost;
            const orderDetail = u.actionState;
            const newOrderId = generateOrderId();
            if (!u.orders) u.orders = [];

            const newOrder = {
                id: newOrderId,
                serviceName: orderDetail.serviceName,
                link: orderDetail.link,
                quantity: quantity,
                totalCost: totalCost,
                status: '✅ Đã hoàn thành',
                date: new Date().toLocaleString('vi-VN')
            };

            u.orders.push(newOrder);
            delete u.actionState;
            saveDatabase();

            // 🚀 BẮT SÓNG WEBSOCKET ĐẨY VỀ WEB DASHBOARD
            const wsPayload = JSON.stringify({
                type: 'NEW_SMM_ORDER',
                order: newOrder,
                user: { chatId: chatId, name: u.name, balance: u.balance }
            });

            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(wsPayload);
                }
            });

            bot.sendMessage(chatId, `✅ *ĐẶT HÀNG THÀNH CÔNG!* 🚀\n🏷️ Mã đơn: *${newOrderId}*\n📌 Dịch vụ: *${orderDetail.serviceName}*\n📊 SL: ${quantity}\n💸 Tổng tiền: \`-${totalCost.toLocaleString()} VNĐ\`\n💰 Số dư còn lại: \`${u.balance.toLocaleString()} VNĐ\``, { parse_mode: 'Markdown' });
        }
    });

    bot.on('callback_query', (query) => {
        const chatId = query.from.id.toString();
        const data = query.data;
        const u = users[chatId];
        if (!u) return;

        if (data === 'smm_main') {
            let text = `🌐 *DANH MỤC DỊCH VỤ MXH*\nVui chọn nền tảng:\n`;
            let kb = [];
            Object.keys(SMM_SERVICES).forEach(key => {
                kb.push([{ text: SMM_SERVICES[key].title, callback_data: `smm_cat_${key}` }]);
            });
            kb.push([{ text: '◀ Trang chủ', callback_data: 'back_start' }]);
            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
        }
        else if (data.startsWith('smm_cat_')) {
            const catKey = data.replace('smm_cat_', '');
            const category = SMM_SERVICES[catKey];
            if (category) {
                let text = `${category.title}\n`;
                let kb = [];
                category.items.forEach((item, idx) => {
                    text += `• *${item.name}*: \`${item.price}đ/lượt\`\n`;
                    kb.push([{ text: `🛒 Đặt: ${item.name}`, callback_data: `order_${catKey}_${idx}` }]);
                });
                kb.push([{ text: '◀ Quay lại', callback_data: 'smm_main' }]);
                bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
            }
        }
        else if (data.startsWith('order_')) {
            const parts = data.split('_');
            const catKey = parts[1];
            const itemIdx = parseInt(parts[2]);
            const item = SMM_SERVICES[catKey]?.items[itemIdx];
            if (item) {
                u.actionState = { step: 'WAITING_LINK', serviceName: item.name, price: item.price };
                saveDatabase();
                bot.sendMessage(chatId, `📌 Bạn đang đặt: *${item.name}*\n\n👉 *Dán Link mục tiêu vào đây:* (Gõ /cancel để hủy)`, { parse_mode: 'Markdown' });
            }
        }
        else if (data === 'customer_center') {
            if (!u.orders) u.orders = [];
            let text = `📇 *TRUNG TÂM KHÁCH HÀNG*\n👤 ${u.name} \vert{} 💰 ${u.balance.toLocaleString()}đ\n\n📦 *15 Đơn gần nhất:*\n`;
            u.orders.slice().reverse().slice(0, 15).forEach(o => {
                text += `• \`${o.id}\` - ${o.serviceName} (${o.status})\n`;
            });
            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '◀ Trang chủ', callback_data: 'back_start' }]] } });
        }
        else if (data === 'admin_center' && chatId === ADMIN_ID) {
            let text = `🛡️ *TRUNG TÂM QUẢN LÝ ADMIN*\nTổng khách hàng: \`${Object.keys(users).length}\`\n`;
            let kb = [];
            Object.keys(users).slice(-10).reverse().forEach(uid => {
                kb.push([{ text: `👤 ${users[uid].name} \vert{}${users[uid].balance}đ`, callback_data: `admin_user_${uid}` }]);
            });
            kb.push([{ text: '◀ Trang chủ', callback_data: 'back_start' }]);
            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
        }
        else if (data.startsWith('admin_user_') && chatId === ADMIN_ID) {
            const targetId = data.replace('admin_user_', '');
            adminSession[chatId] = { action: 'ADD', targetId: targetId };
            bot.sendMessage(chatId, `➕ Nhập số tiền muốn CỘNG cho khách hàng này: (Gõ /cancel để hủy)`);
        }
        else if (data === 'back_start') {
            if (u.actionState) delete u.actionState;
            saveDatabase();
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
        console.log('🤖 Bot Telegram đã khởi động thành công!');
    } catch (e) {
        console.error('❌ Lỗi khởi động bot:', e);
    }
}

// ==========================================
// 🌐 WEBSOCKET SERVER & PING HANDLING
// ==========================================
wss.on('connection', (ws) => {
    console.log('🌐 Web Dashboard đã kết nối WebSocket.');
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.action === 'PING') {
                ws.send(JSON.stringify({ type: 'PONG' }));
            }
        } catch (e) {}
    });
    ws.on('close', () => console.log('🔌 Web Dashboard ngắt kết nối.'));
});

server.listen(PORT, () => {
    loadDatabase();
    startBot(currentToken);
    console.log(`🚀 Master Control Panel chạy thành công trên cổng ${PORT}`);
});
