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
let adminSession = {}; 
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

// ==========================================
// 📦 DANH MỤC DỊCH VỤ MXH
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
                if (!users[uid].orders) {
                    users[uid].orders = [];
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
    let report = `📡 *HỆ THỐNG DỊCH VỤ MXH MONITOR*\n🕒 ${new Date().toLocaleTimeString('vi-VN')}\n--------------------------\n`;
    Object.keys(brandStatuses).forEach(brand => {
        const b = brandStatuses[brand];
        report += `• *${brand}:* ${b.status} (${b.ping}ms)\n`;
    });
    return report;
}

function generateOrderId() {
    return 'ORD' + Math.floor(Math.random() * 90000 + 10000);
}

// Hàm AI Bot tự tạo tài khoản định danh cho dịch vụ
function generateServiceAccount() {
    const accId = 'bot_acc_' + Math.floor(Math.random() * 89999 + 10000);
    const passKey = 'key_' + Math.random().toString(36).substring(2, 8);
    return `${accId} | Mật khẩu/Token: ${passKey}`;
}

// ==========================================
// 🤖 KHỞI TẠO BOT TELEGRAM & LOGIC CHÍNH
// ==========================================
function sendHomeMenu(chatId, u, isAdmin) {
    const welcomeMessage = `
🤖 *HỆ THỐNG DỊCH VỤ MXH PRO* 🚀
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
        [{ text: '💳 NẠP TIỀN', callback_data: 'deposit' }, { text: '📇 TRUNG TÂM KHÁCH HÀNG', callback_data: 'customer_center' }],
        ...(isAdmin ? [[{ text: '🛡️ TRUNG TÂM ADMIN (QUẢN LÝ)', callback_data: 'admin_center' }]] : []),
        [{ text: '👥 NHÓM HỖ TRỢ', url: 'https://t.me/Hendy_Support_Group' }]
    ];

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
        
        if (users[chatId].actionState) {
            delete users[chatId].actionState;
        }
        if (adminSession[chatId]) {
            delete adminSession[chatId];
        }
        saveDatabase();

        sendHomeMenu(chatId, users[chatId], isAdmin);
    });

    // --- LỆNH ADMIN DUYỆT ĐƠN NHANH: /done [Mã đơn] ---
    bot.onText(/\/done (.+)/, (msg, match) => {
        const chatId = msg.chat.id.toString();
        if (chatId !== ADMIN_ID) return;

        const orderIdToFind = match[1].trim();
        let found = false;

        Object.keys(users).forEach(uid => {
            if (users[uid].orders) {
                users[uid].orders.forEach(o => {
                    if (o.id === orderIdToFind) {
                        o.status = '✅ Đã hoàn thành';
                        found = true;
                        
                        try {
                            bot.sendMessage(
                                uid, 
                                `🎉 *ĐƠN HÀNG ĐÃ HOÀN TẤT!*\n\n` +
                                `🏷️ Mã đơn: \`${o.id}\`\n` +
                                `📌 Dịch vụ: ${o.serviceName}\n` +
                                `🔗 Link: ${o.link}\n` +
                                `📊 Số lượng: ${o.quantity.toLocaleString()}\n` +
                                `✨ Trạng thái: *Đã hoàn thành giao dịch thành công!*`, 
                                { parse_mode: 'Markdown' }
                            );
                        } catch (e) {}
                    }
                });
            }
        });

        saveDatabase();

        if (found) {
            bot.sendMessage(chatId, `✅ Đã duyệt đơn hàng *${orderIdToFind}* thành công.`);
        } else {
            bot.sendMessage(chatId, `❌ Không tìm thấy mã đơn: *${orderIdToFind}*`);
        }
    });

    // --- LẮNG NGHE TIN NHẮN VĂN BẢN ---
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id.toString();
        const text = msg.text;
        let u = users[chatId];
        
        if (!u || !text || text.startsWith('/start') || text.startsWith('/done')) return;

        // Xử lý Hủy bỏ
        if (text === '/cancel') {
            if (u.actionState) delete u.actionState;
            if (adminSession[chatId]) delete adminSession[chatId];
            saveDatabase();
            bot.sendMessage(chatId, '🚫 Đã hủy thao tác hiện tại.');
            sendHomeMenu(chatId, u, (chatId === ADMIN_ID));
            return;
        }

        // 🛡️ XỬ LÝ NHẬP SỐ TIỀN TỪ ADMIN
        if (chatId === ADMIN_ID && adminSession[chatId]) {
            const session = adminSession[chatId];
            const amount = parseInt(text.replace(/[,.]/g, ''));

            if (isNaN(amount) || amount <= 0) {
                bot.sendMessage(chatId, '❌ Số tiền không hợp lệ. Vui lòng chỉ nhập số (VD: 50000). Gõ /cancel để hủy.');
                return;
            }

            const targetId = session.targetId;
            const targetUser = users[targetId];

            if (!targetUser) {
                bot.sendMessage(chatId, '❌ Không tìm thấy thông tin khách hàng này.');
                delete adminSession[chatId];
                return;
            }

            if (session.action === 'ADD') {
                targetUser.balance += amount;
                saveDatabase();

                bot.sendMessage(chatId, `✅ Đã CỘNG thành công \`${amount.toLocaleString()} VNĐ\` cho khách *${targetUser.name}*.\n💰 Số dư mới của khách: \`${targetUser.balance.toLocaleString()} VNĐ\``, { parse_mode: 'Markdown' });

                try {
                    bot.sendMessage(
                        targetId,
                        `💳 *TÀI KHOẢN ĐÃ ĐƯỢC NẠP / CỘNG TIỀN!*\n\n` +
                        `💰 Số tiền nhận: \`+${amount.toLocaleString()} VNĐ\`\n` +
                        `💎 Số dư hiện tại: \`${targetUser.balance.toLocaleString()} VNĐ\``,
                        { parse_mode: 'Markdown' }
                    );
                } catch (e) {}

            } else if (session.action === 'SUB') {
                targetUser.balance -= amount;
                saveDatabase();

                bot.sendMessage(chatId, `✅ Đã TRỪ \`${amount.toLocaleString()} VNĐ\` của khách *${targetUser.name}*.\n💰 Số dư mới của khách: \`${targetUser.balance.toLocaleString()} VNĐ\``, { parse_mode: 'Markdown' });

                try {
                    bot.sendMessage(
                        targetId,
                        `⚠️ *THÔNG BÁO TRỪ TIỀN VÍ*\n\n` +
                        `📉 Số tiền bị trừ: \`-${amount.toLocaleString()} VNĐ\`\n` +
                        `💎 Số dư hiện tại: \`${targetUser.balance.toLocaleString()} VNĐ\``,
                        { parse_mode: 'Markdown' }
                    );
                } catch (e) {}
            }

            delete adminSession[chatId];
            return;
        }

        // 1. Chờ nhập Link đặt dịch vụ MXH
        if (u.actionState && u.actionState.step === 'WAITING_LINK') {
            u.actionState.link = text;
            u.actionState.step = 'WAITING_QUANTITY';
            saveDatabase();

            bot.sendMessage(
                chatId, 
                `🔗 Đã nhận Link mục tiêu.\n\n👉 *Vui lòng nhập số lượng bạn muốn tăng:* (Chỉ nhập số, VD: 1000)\n\n_(Gõ /cancel để hủy)_`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // 2. Chờ nhập Số lượng đặt dịch vụ MXH & TỰ TẠO TÀI KHOẢN HỆ THỐNG
        if (u.actionState && u.actionState.step === 'WAITING_QUANTITY') {
            const quantity = parseInt(text);
            
            if (isNaN(quantity) || quantity <= 0) {
                bot.sendMessage(chatId, '❌ Số lượng không hợp lệ. Vui lòng chỉ nhập số dương (VD: 1000).');
                return;
            }

            const totalCost = quantity * u.actionState.price;

            if (u.balance < totalCost) {
                bot.sendMessage(
                    chatId, 
                    `❌ Tài khoản của bạn không đủ!\n💰 Số dư: \`${u.balance.toLocaleString()} VNĐ\`\n📉 Yêu cầu: \`${totalCost.toLocaleString()} VNĐ\`\n\n👉 Vui lòng liên hệ Admin để nạp thêm tiền.`, 
                    { parse_mode: 'Markdown' }
                );
                delete u.actionState; 
                saveDatabase();
                return;
            }

            // Trừ tiền ví
            u.balance -= totalCost;
            const orderDetail = u.actionState;
            const newOrderId = generateOrderId();
            
            // 🤖 TỰ ĐỘNG TẠO TÀI KHOẢN HỆ THỐNG CHO ĐƠN HÀNG
            const autoAccountInfo = generateServiceAccount();

            if (!u.orders) u.orders = [];
            u.orders.push({
                id: newOrderId,
                serviceName: orderDetail.serviceName,
                link: orderDetail.link,
                quantity: quantity,
                totalCost: totalCost,
                serviceAccount: autoAccountInfo, // Lưu thông tin tài khoản tự tạo
                status: '⏳ Đang xử lý',
                date: new Date().toLocaleString('vi-VN')
            });

            delete u.actionState; 
            saveDatabase();

            // Gửi tin nhắn thành công cho khách kèm tài khoản tự tạo
            bot.sendMessage(
                chatId, 
                `✅ *ĐẶT HÀNG THÀNH CÔNG & KHỞI TẠO TÀI KHOẢN!* 🤖\n\n` +
                `🏷️ Mã đơn: *${newOrderId}*\n` +
                `📌 Dịch vụ: *${orderDetail.serviceName}*\n` +
                `🔗 Link: ${orderDetail.link}\n` +
                `📊 Số lượng: ${quantity.toLocaleString()}\n` +
                `🔑 *Tài khoản hệ thống tự tạo:* \`${autoAccountInfo}\`\n` +
                `💸 Tổng tiền: \`-${totalCost.toLocaleString()} VNĐ\`\n` +
                `💰 Số dư còn lại: \`${u.balance.toLocaleString()} VNĐ\`\n\n` +
                `⏳ *Hệ thống đang tiến hành xử lý tự động...*`,
                { parse_mode: 'Markdown' }
            );

            // Báo cáo về cho Admin
            try {
                bot.sendMessage(
                    ADMIN_ID, 
                    `🔔 *CÓ ĐƠN SMM MỚI (AI AUTO TẠO TK)*\n👤 Khách: ${u.name} (ID: \`${chatId}\`)\n🏷️ Mã Đơn: ${newOrderId}\n📌 Dịch vụ: ${orderDetail.serviceName}\n🔗 Link: ${orderDetail.link}\n📊 SL: ${quantity}\n🔑 TK Cấp: \`${autoAccountInfo}\`\n💵 Tổng thu: ${totalCost.toLocaleString()} VNĐ\n\n_💡 Gõ /done ${newOrderId} để duyệt đơn._`, 
                    { parse_mode: 'Markdown' }
                );
            } catch (e) {}
        }
    });

    // --- LẮNG NGHE BẤM NÚT (CALLBACK QUERY) ---
    bot.on('callback_query', (query) => {
        const chatId = query.from.id.toString();
        const data = query.data;
        const u = users[chatId];
        if (!u) return;

        if (data === 'smm_main') {
            let text = `🌐 *DANH MỤC DỊCH VỤ MXH*\nVui lòng chọn nền tảng bạn muốn sử dụng:\n--------------------------------------------------\n`;
            let kb = [];
            Object.keys(SMM_SERVICES).forEach(key => {
                kb.push([{ text: SMM_SERVICES[key].title, callback_data: `smm_cat_${key}` }]);
            });
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
                u.actionState = {
                    step: 'WAITING_LINK',
                    serviceName: item.name,
                    price: item.price
                };
                saveDatabase();
                bot.sendMessage(
                    chatId, 
                    `📌 Bạn đang đặt: *${item.name}*\n💰 Đơn giá: \`${item.price.toLocaleString()} VNĐ / 1 lượt\`\n\n👉 *Vui lòng dán Link / ID mục tiêu vào đây:*\n\n_(Gõ /cancel nếu bạn muốn hủy)_`, 
                    { parse_mode: 'Markdown' }
                );
            }
        }
        else if (data === 'customer_center') {
            if (!u.orders) u.orders = [];
            
            let text = `📇 *TRUNG TÂM KHÁCH HÀNG*\n👤 Xin chào sếp: *${u.name}*\n💰 Số dư ví: \`${u.balance.toLocaleString()} VNĐ\`\n--------------------------------------------------\n`;
            text += `📦 *DANH SÁCH ĐƠN HÀNG (KÈM TÀI KHOẢN TỰ TẠO):*\n\n`;

            const userOrders = u.orders.slice().reverse().slice(0, 15);

            if (userOrders.length === 0) {
                text += `_Hiện tại bạn chưa có đơn hàng nào._\n`;
            } else {
                userOrders.forEach((o) => {
                    text += `🏷️ *Mã đơn:* \`${o.id}\`\n`;
                    text += `📌 *Dịch vụ:* ${o.serviceName}\n`;
                    text += `🔗 *Link:* ${o.link}\n`;
                    if (o.serviceAccount) {
                        text += `🔑 *Tài khoản cấp:* \`${o.serviceAccount}\`\n`;
                    }
                    text += `📊 *SL:* ${o.quantity.toLocaleString()} | 💸 \`${o.totalCost.toLocaleString()} VNĐ\`\n`;
                    text += `⏰ *Lúc:* ${o.date}\n`;
                    text += `🔄 *Trạng thái:* ${o.status}\n`;
                    text += `—\n`;
                });
            }

            let kb = [
                [{ text: '◀ Quay lại Trang chủ', callback_data: 'back_start' }]
            ];
            
            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
        }
        
        // ==========================================
        // 🛡️ TRUNG TÂM ADMIN INTERACTIVE
        // ==========================================
        else if (data === 'admin_center') {
            if (chatId !== ADMIN_ID) {
                bot.answerCallbackQuery(query.id, { text: '❌ Bạn không có quyền truy cập!', show_alert: true });
                return;
            }

            const totalUsers = Object.keys(users).length;
            let totalBalance = 0;
            let totalOrders = 0;
            Object.values(users).forEach(usr => {
                totalBalance += (usr.balance || 0);
                if (usr.orders) totalOrders += usr.orders.length;
            });

            let text = `🛡️ *TRUNG TÂM QUẢN LÝ ADMIN*\n--------------------------------------------------\n`;
            text += `👥 Tổng khách hàng: \`${totalUsers}\`\n`;
            text += `💰 Tổng số dư ví toàn hệ thống: \`${totalBalance.toLocaleString()} VNĐ\`\n`;
            text += `📦 Tổng số đơn: \`${totalOrders}\`\n`;
            text += `--------------------------------------------------\n`;
            text += `👉 *Chọn khách hàng bên dưới để quản lý số dư (Cộng / Trừ / Hoàn tiền nhanh):*\n`;

            let kb = [];
            const recentUserIds = Object.keys(users).slice(-10).reverse();
            recentUserIds.forEach(uid => {
                const usr = users[uid];
                kb.push([{ text: `👤 ${usr.name} | 💰 ${(usr.balance || 0).toLocaleString()}đ`, callback_data: `admin_user_${uid}` }]);
            });

            kb.push([{ text: '🔄 Làm mới', callback_data: 'admin_center' }, { text: '◀ Quay lại Trang chủ', callback_data: 'back_start' }]);

            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
        }
        else if (data.startsWith('admin_user_')) {
            if (chatId !== ADMIN_ID) return;
            const targetId = data.replace('admin_user_', '');
            const targetUser = users[targetId];

            if (!targetUser) {
                bot.answerCallbackQuery(query.id, { text: '❌ Khách hàng không tồn tại!', show_alert: true });
                return;
            }

            let text = `👤 *QUẢN LÝ KHÁCH HÀNG*\n--------------------------------------------------\n`;
            text += `📌 Tên: *${targetUser.name}*\n`;
            text += `🆔 ID Telegram: \`${targetId}\`\n`;
            text += `💰 Số dư ví: \`${(targetUser.balance || 0).toLocaleString()} VNĐ\`\n`;
            text += `📦 Tổng đơn đã đặt: \`${targetUser.orders ? targetUser.orders.length : 0}\`\n`;
            text += `--------------------------------------------------\n`;
            text += `👉 Chọn thao tác bạn muốn thực hiện với tài khoản này:`;

            let kb = [
                [
                    { text: '➕ Cộng / Nạp / Hoàn tiền', callback_data: `admin_add_${targetId}` },
                    { text: '➖ Trừ tiền', callback_data: `admin_sub_${targetId}` }
                ],
                [{ text: '◀ Quay lại danh sách Admin', callback_data: 'admin_center' }]
            ];

            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
        }
        else if (data.startsWith('admin_add_')) {
            if (chatId !== ADMIN_ID) return;
            const targetId = data.replace('admin_add_', '');
            const targetUser = users[targetId];

            adminSession[chatId] = { action: 'ADD', targetId: targetId };

            bot.sendMessage(
                chatId,
                `➕ *CỘNG / NẠP / HOÀN TIỀN CHO KHÁCH*\n` +
                `👤 Khách: *${targetUser.name}* (ID: \`${targetId}\`)\n\n` +
                `👉 *Vui lòng nhập số tiền muốn cộng vào khung chat bên dưới:* (Chỉ nhập số, VD: 50000)\n\n` +
                `_(Gõ /cancel để hủy thao tác)_`,
                { parse_mode: 'Markdown' }
            );
        }
        else if (data.startsWith('admin_sub_')) {
            if (chatId !== ADMIN_ID) return;
            const targetId = data.replace('admin_sub_', '');
            const targetUser = users[targetId];

            adminSession[chatId] = { action: 'SUB', targetId: targetId };

            bot.sendMessage(
                chatId,
                `➖ *TRỪ TIỀN KHÁCH HÀNG*\n` +
                `👤 Khách: *${targetUser.name}* (ID: \`${targetId}\`)\n\n` +
                `👉 *Vui lòng nhập số tiền muốn trừ vào khung chat bên dưới:* (Chỉ nhập số, VD: 20000)\n\n` +
                `_(Gõ /cancel để hủy thao tác)_`,
                { parse_mode: 'Markdown' }
            );
        }
        // ==========================================

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
        else if (data === 'back_start') {
            if (u.actionState) delete u.actionState;
            if (adminSession[chatId]) delete adminSession[chatId];
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
        console.log('🤖 Bot Dịch Vụ MXH (AI Auto-Account + Interactive Admin) đã khởi động thành công!');

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
console.log(`🚀 WebSocket Server & Bot Dịch Vụ MXH đã chạy thành công trên cổng ${WS_PORT}!`);
