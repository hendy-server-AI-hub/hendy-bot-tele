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
    SC88: [], C168: [], CM88: [], F8BET: [], QQ88: [], "78WIN": []
};

// ==========================================
// 📦 DANH MỤC DỊCH VỤ MẠNG (SMM)
// ==========================================
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
            { name: 'Tăng View Live Stream', price: 300 }
        ]
    },
    tiktok: {
        title: '🎵 DỊCH VỤ TIKTOK',
        items: [
            { name: 'Tăng Tim Tiktok', price: 80 },
            { name: 'Tăng Follow Tiktok', price: 120 },
            { name: 'Tăng Mắt Live Tiktok', price: 350 }
        ]
    },
    youtube: {
        title: '▶️ DỊCH VỤ YOUTUBE',
        items: [
            { name: 'Tăng Subscribe Youtube', price: 300 },
            { name: 'Tăng View Youtube', price: 50 }
        ]
    }
};

let brandStatuses = {
    'SC88': { status: '🟢 Hoạt động', ping: 12 },
    'C168': { status: '🟢 Hoạt động', ping: 15 }
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
                if (!users[uid].linkedAccounts) users[uid].linkedAccounts = JSON.parse(JSON.stringify(DEFAULT_LINKED_ACCOUNTS));
                if (users[uid].balance === undefined) users[uid].balance = 50000;
                if (!users[uid].orders) users[uid].orders = []; // Thêm mảng lưu trữ đơn hàng
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
// 🤖 KHỞI TẠO BOT TELEGRAM & LOGIC CHÍNH
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
        [{ text: '💳 NẠP TIỀN TỰ ĐỘNG', callback_data: 'deposit' }, { text: '📇 TRUNG TÂM KHÁCH HÀNG', callback_data: 'customer_center' }],
        [{ text: '👥 NHÓM HỖ TRỢ', url: 'https://t.me/Hendy_Support_Group' }]
    ];

    // Nút dành riêng cho Admin
    if (isAdmin) {
        inlineKeyboard.push([{ text: '👑 QUẢN LÝ ADMIN (XEM ĐƠN)', callback_data: 'admin_panel' }]);
    }

    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineKeyboard } });
}

function setupBotLogic() {
    if (!bot) return;

    // --- LỆNH /START ---
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
        saveDatabase();
        sendHomeMenu(chatId, users[chatId], isAdmin);
    });

    // --- LẮNG NGHE TIN NHẮN (NHẬP LINK & SỐ LƯỢNG) ---
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id.toString();
        const text = msg.text;
        let u = users[chatId];
        
        if (!u || !text || text.startsWith('/start')) return;

        if (text === '/cancel' && u.actionState) {
            delete u.actionState;
            saveDatabase();
            bot.sendMessage(chatId, '🚫 Đã hủy quá trình đặt đơn.');
            sendHomeMenu(chatId, u, (chatId === ADMIN_ID));
            return;
        }

        if (u.actionState && u.actionState.step === 'WAITING_LINK') {
            u.actionState.link = text;
            u.actionState.step = 'WAITING_QUANTITY';
            saveDatabase();
            bot.sendMessage(chatId, `🔗 Đã nhận Link mục tiêu.\n\n👉 *Vui lòng nhập số lượng bạn muốn tăng:* (Chỉ nhập số, VD: 1000)\n\n_(Nhập /cancel để hủy)_`, { parse_mode: 'Markdown' });
            return;
        }

        if (u.actionState && u.actionState.step === 'WAITING_QUANTITY') {
            const quantity = parseInt(text);
            
            if (isNaN(quantity) || quantity <= 0) {
                bot.sendMessage(chatId, '❌ Số lượng không hợp lệ. Vui lòng chỉ nhập số (VD: 1000).');
                return;
            }

            const totalCost = quantity * u.actionState.price;

            if (u.balance < totalCost) {
                bot.sendMessage(chatId, `❌ Tài khoản của bạn không đủ!\n💰 Số dư: \`${u.balance.toLocaleString()} VNĐ\`\n📉 Yêu cầu: \`${totalCost.toLocaleString()} VNĐ\``, { parse_mode: 'Markdown' });
                delete u.actionState;
                saveDatabase();
                return;
            }

            // TẠO ĐƠN HÀNG VÀ LƯU VÀO DATABASE
            const orderId = Math.floor(10000 + Math.random() * 90000).toString(); // Tạo mã đơn 5 số
            const newOrder = {
                id: orderId,
                serviceName: u.actionState.serviceName,
                link: u.actionState.link,
                quantity: quantity,
                totalCost: totalCost,
                status: '⏳ Đang xử lý',
                time: new Date().toLocaleTimeString('vi-VN')
            };
            
            if (!u.orders) u.orders = [];
            u.orders.push(newOrder); // Lưu vào lịch sử khách hàng
            u.balance -= totalCost; // Trừ tiền
            
            delete u.actionState;
            saveDatabase();

            bot.sendMessage(
                chatId, 
                `✅ *ĐẶT HÀNG THÀNH CÔNG!*\n\n🔹 Mã đơn: #${orderId}\n📌 Dịch vụ: *${newOrder.serviceName}*\n🔗 Link: ${newOrder.link}\n📊 Số lượng: ${quantity.toLocaleString()}\n💸 Tổng tiền: \`-${totalCost.toLocaleString()} VNĐ\`\n💰 Số dư còn lại: \`${u.balance.toLocaleString()} VNĐ\`\n\n⏳ Hệ thống đang xử lý đơn hàng của bạn... Bạn có thể theo dõi tại Trung Tâm Khách Hàng.`,
                { parse_mode: 'Markdown' }
            );

            try {
                bot.sendMessage(ADMIN_ID, `🔔 *CÓ ĐƠN SMM MỚI*\n👤 Khách: ${u.name} (\`${chatId}\`)\n🔹 Mã: #${orderId}\n📌 DV: ${newOrder.serviceName}\n🔗 Link: ${newOrder.link}\n📊 SL: ${quantity}\n💵 Tổng thu: ${totalCost.toLocaleString()} VNĐ`, { parse_mode: 'Markdown' });
            } catch (e) {}
        }
    });

    // --- LẮNG NGHE NÚT BẤM (CALLBACK QUERY) ---
    bot.on('callback_query', (query) => {
        const chatId = query.from.id.toString();
        const data = query.data;
        const u = users[chatId];
        if (!u) return;

        const isAdmin = (chatId === ADMIN_ID);

        // ==========================================
        // 1. TRUNG TÂM KHÁCH HÀNG (Khách xem đơn của mình)
        // ==========================================
        if (data === 'customer_center') {
            let text = `📇 *TRUNG TÂM KHÁCH HÀNG*\n👤 Tên: ${u.name}\n💰 Số dư: \`${u.balance.toLocaleString()} VNĐ\`\n---------------------------------\n📦 *CÁC ĐƠN HÀNG ĐANG XỬ LÝ:*\n`;
            
            let pendingOrders = (u.orders || []).filter(o => o.status === '⏳ Đang xử lý');
            
            if (pendingOrders.length === 0) {
                text += `\n_Bạn hiện không có đơn hàng nào đang xử lý._`;
            } else {
                pendingOrders.forEach(o => {
                    text += `\n🔹 *Mã:* #${o.id} | 📊 *SL:* ${o.quantity}\n📌 ${o.serviceName}\n🔗 ${o.link}\n`;
                });
            }

            let kb = [[{ text: '◀ Quay lại Trang chủ', callback_data: 'back_start' }]];
            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
        }

        // ==========================================
        // 2. ADMIN QUẢN LÝ (Admin duyệt/hủy đơn)
        // ==========================================
        else if (data === 'admin_panel' && isAdmin) {
            let text = `👑 *TRUNG TÂM QUẢN LÝ ADMIN*\n--------------------------------------------------\n👉 Hệ thống quản lý toàn bộ dữ liệu.`;
            let kb = [
                [{ text: '📦 QUẢN LÝ ĐƠN ĐANG XỬ LÝ', callback_data: 'admin_pending_orders' }],
                [{ text: '◀ Quay lại Trang chủ', callback_data: 'back_start' }]
            ];
            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
        }

        else if (data === 'admin_pending_orders' && isAdmin) {
            let text = `📦 *TẤT CẢ ĐƠN HÀNG ĐANG CHỜ XỬ LÝ*\n--------------------------------------------------\n`;
            let kb = [];
            let count = 0;
            
            Object.keys(users).forEach(uid => {
                let userObj = users[uid];
                if (userObj.orders) {
                    userObj.orders.forEach(o => {
                        if (o.status === '⏳ Đang xử lý') {
                            count++;
                            text += `\n👤 Khách: ${userObj.name} (\`${uid}\`)\n🔹 Mã: #${o.id} - 💵 ${o.totalCost}đ\n📌 DV: ${o.serviceName}\n🔗 Link: ${o.link}\n📊 SL: ${o.quantity}\n`;
                            kb.push([
                                { text: `✅ Xong #${o.id}`, callback_data: `adm_done_${uid}_${o.id}` },
                                { text: `❌ Hủy & Hoàn tiền`, callback_data: `adm_cancel_${uid}_${o.id}` }
                            ]);
                        }
                    });
                }
            });
            
            if (count === 0) text += `\n_Hệ thống hiện tại không có đơn hàng nào chờ xử lý._`;
            kb.push([{ text: '◀ Quay lại Admin', callback_data: 'admin_panel' }]);
            
            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
        }

        // Xử lý khi Admin bấm "Hoàn Thành" đơn
        else if (data.startsWith('adm_done_') && isAdmin) {
            const parts = data.split('_');
            const targetUid = parts[2];
            const orderId = parts[3];
            
            if (users[targetUid] && users[targetUid].orders) {
                let order = users[targetUid].orders.find(o => o.id === orderId);
                if (order) {
                    order.status = '✅ Đã hoàn thành';
                    saveDatabase();
                    
                    // Báo cáo khách hàng
                    try { bot.sendMessage(targetUid, `🎉 *THÔNG BÁO HOÀN TẤT*\nĐơn hàng **#${orderId}** (${order.serviceName}) của bạn đã chạy xong!`, { parse_mode: 'Markdown' }); } catch(e) {}
                    
                    bot.answerCallbackQuery(query.id, { text: `Đã duyệt đơn #${orderId}` });
                    // Load lại danh sách đơn
                    bot.editMessageText(`✅ Đã duyệt đơn #${orderId} thành công!`, { chat_id: chatId, message_id: query.message.message_id, reply_markup: { inline_keyboard: [[{ text: '◀ Quay lại Danh sách', callback_data: 'admin_pending_orders' }]] } });
                    return;
                }
            }
        }

        // Xử lý khi Admin bấm "Hủy & Hoàn Tiền"
        else if (data.startsWith('adm_cancel_') && isAdmin) {
            const parts = data.split('_');
            const targetUid = parts[2];
            const orderId = parts[3];
            
            if (users[targetUid] && users[targetUid].orders) {
                let order = users[targetUid].orders.find(o => o.id === orderId);
                if (order) {
                    order.status = '❌ Đã hủy';
                    users[targetUid].balance += order.totalCost; // Cộng lại tiền cho khách
                    saveDatabase();
                    
                    // Báo cáo khách hàng
                    try { bot.sendMessage(targetUid, `🚫 *THÔNG BÁO HỦY ĐƠN*\nĐơn hàng **#${orderId}** (${order.serviceName}) của bạn đã bị hủy.\n💰 Bạn được hoàn lại \`${order.totalCost.toLocaleString()} VNĐ\` vào tài khoản.`, { parse_mode: 'Markdown' }); } catch(e) {}
                    
                    bot.answerCallbackQuery(query.id, { text: `Đã hủy & hoàn tiền đơn #${orderId}` });
                    bot.editMessageText(`❌ Đã hủy và hoàn tiền cho đơn #${orderId}!`, { chat_id: chatId, message_id: query.message.message_id, reply_markup: { inline_keyboard: [[{ text: '◀ Quay lại Danh sách', callback_data: 'admin_pending_orders' }]] } });
                    return;
                }
            }
        }

        // ==========================================
        // CÁC CHỨC NĂNG CÒN LẠI (MENU, ĐẶT ĐƠN)
        // ==========================================
        else if (data === 'smm_main') {
            let text = `🌐 *DANH MỤC DỊCH VỤ MẠNG 86*\nVui lòng chọn nền tảng bạn muốn sử dụng:\n--------------------------------------------------\n`;
            let kb = [];
            Object.keys(SMM_SERVICES).forEach(key => { kb.push([{ text: SMM_SERVICES[key].title, callback_data: `smm_cat_${key}` }]); });
            kb.push([{ text: '◀ Quay lại Trang chủ', callback_data: 'back_start' }]);
            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
        }

        else if (data.startsWith('smm_cat_')) {
            const catKey = data.replace('smm_cat_', '');
            const category = SMM_SERVICES[catKey];
            if (category) {
                let text = `${category.title}\n--------------------------------------------------\n`;
                let kb = [];
                category.items.forEach((item, idx) => {
                    text += `• *${item.name}*: \`${item.price.toLocaleString()} VNĐ/lượt\`\n`;
                    kb.push([{ text: `🛒 Đặt hàng: ${item.name}`, callback_data: `order_${catKey}_${idx}` }]);
                });
                kb.push([{ text: '◀ Quay lại Danh mục', callback_data: 'smm_main' }]);
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
                bot.sendMessage(chatId, `📌 Bạn đang đặt: *${item.name}*\n💰 Đơn giá: \`${item.price.toLocaleString()} VNĐ / 1 lượt\`\n\n👉 *Vui lòng dán Link / ID mục tiêu vào đây:*\n\n_(Gõ /cancel nếu bạn muốn hủy)_`, { parse_mode: 'Markdown' });
            }
        }

        else if (data === 'back_start') {
            if (u.actionState) { delete u.actionState; saveDatabase(); }
            sendHomeMenu(chatId, u, isAdmin);
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
    masterWebSocket = ws;
    ws.on('close', () => { if (masterWebSocket === ws) masterWebSocket = null; });
});

// Khởi chạy hệ thống
loadDatabase();
startBot(currentToken);
console.log(`🚀 WebSocket Server & Bot đã chạy thành công trên cổng ${WS_PORT}!`);
