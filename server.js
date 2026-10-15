require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const { WebSocketServer, WebSocket } = require('ws');
const fs = require('fs');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const { OpenAI } = require('openai');

// ==========================================
// ⚙️ CẤU HÌNH HỆ THỐNG CƠ BẢN
// ==========================================
const PORT = process.env.PORT || 8080;
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_TOKEN || '8689114890:AAFBFM0rNtZWpOtAovIPHPVQTJVp0odU1DQ';
const ADMIN_ID = process.env.ADMIN_ID || '6138197737';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'hendy_secret_key_2026';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-xxxx-chuoi-api-key-cua-ban' 
});

const BANK_CONFIG = {
    bankId: 'MB',
    accountNo: '0123456789',
    accountName: 'HENDY SYSTEM'
};

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.send('Server Hendy & Hades V6100 đang hoạt động.');
});

// ==========================================
// 🗄️ QUẢN LÝ DATABASE (USERS, ORDERS, GIFTCODES)
// ==========================================
const DB_FILE = path.join(__dirname, 'database.json');
let users = {};
let orders = {};
let giftcodes = {
    'TANTHU2026': { value: 20000, maxUses: 999, usedBy: [] },
    'HENDYVIP': { value: 50000, maxUses: 100, usedBy: [] }
};
let adminSession = {}; 
let bot = null;
let isSaving = false; 

const DEFAULT_LINKED_ACCOUNTS = {
    SC88: [], C168: [], CM88: [], F8BET: [], QQ88: [], "78WIN": []
};

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            users = data.users || {};
            orders = data.orders || {};
            if (data.giftcodes) giftcodes = data.giftcodes;

            Object.keys(users).forEach(uid => {
                if (!users[uid].linkedAccounts) users[uid].linkedAccounts = JSON.parse(JSON.stringify(DEFAULT_LINKED_ACCOUNTS));
                if (users[uid].balance === undefined) users[uid].balance = 50000;
                if (!users[uid].orders) users[uid].orders = [];
                if (!users[uid].wonCodes) users[uid].wonCodes = [];
            });
            console.log(`✅ Đã tải dữ liệu: ${Object.keys(users).length} users \vert{}${Object.keys(orders).length} orders.`);
        } else {
            saveDatabase();
        }
    } catch (err) {
        console.error('❌ Lỗi đọc database:', err.message);
    }
}

function saveDatabase() {
    if (isSaving) return;
    isSaving = true;
    setTimeout(() => {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify({ users, orders, giftcodes }, null, 4), 'utf8');
        } catch (err) {
            console.error('❌ Lỗi lưu database:', err.message);
        } finally {
            isSaving = false;
        }
    }, 500); 
}

function generateOrderId() {
    return 'ORD' + Math.floor(Math.random() * 90000 + 10000);
}

// ==========================================
// 📦 DANH MỤC DỊCH VỤ MXH
// ==========================================
const SMM_SERVICES = {
    facebook: {
        title: '📘 DỊCH VỤ FACEBOOK',
        items: [{ name: 'Tăng Like Facebook', price: 100 }, { name: 'Tăng Follow Facebook', price: 150 }]
    },
    tiktok: {
        title: '🎵 DỊCH VỤ TIKTOK',
        items: [{ name: 'Tăng Tim Tiktok', price: 80 }, { name: 'Tăng Follow Tiktok', price: 120 }]
    }
};

let brandStatuses = {
    'SC88': { status: '🟢 Hoạt động', ping: 12, price: 50000 },
    'C168': { status: '🟢 Hoạt động', ping: 15, price: 45000 },
    'F8BET': { status: '🟢 Hoạt động', ping: 14, price: 60000 },
    'CM88': { status: '🟡 Bảo trì', ping: 99, price: 50000 }
};

// ==========================================
// 🧠 LÕI AI ENGINE & WEBSOCKET
// ==========================================
class AISessionManager {
    constructor(maxConcurrentSessions = 10) {
        this.maxConcurrent = maxConcurrentSessions;
        this.activeSessions = new Map();
        this.queue = [];
    }
    enqueueOrder(order) {
        this.queue.push(order);
        this.processNext();
    }
    processNext() {
        if (this.activeSessions.size >= this.maxConcurrent || this.queue.length === 0) return;
        const order = this.queue.shift();
        const sessionId = `BOT_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 100)}`;
        
        this.activeSessions.set(sessionId, { id: sessionId, orderId: order.id, status: 'RUNNING', progress: 0 });
        if (orders[order.id]) orders[order.id].status = '⏳ Đang xử lý';
        saveDatabase();

        this.runWorkerSession(sessionId, order);
    }
    async runWorkerSession(sessionId, order) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;
        const targetQty = parseInt(order.quantity) || 100;
        let completed = 0;

        const interval = setInterval(() => {
            if (completed >= targetQty) {
                clearInterval(interval);
                session.progress = 100;
                
                if (orders[order.id]) orders[order.id].status = '✅ Hoàn thành';
                if (users[order.chatId]) {
                    const uOrder = users[order.chatId].orders.find(o => o.id === order.id);
                    if (uOrder) uOrder.status = '✅ Hoàn thành';
                }
                saveDatabase();

                if (bot) bot.sendMessage(order.chatId, `🎉 *ĐƠN HÀNG HOÀN TẤT!*\nĐơn \`${order.id}\` (${order.serviceName}) của bạn đã chạy xong 100%.`, {parse_mode: 'Markdown'}).catch(()=>{});

                this.activeSessions.delete(sessionId);
                this.processNext();
            } else {
                completed += Math.min(Math.floor(Math.random() * 15) + 5, targetQty - completed);
                session.progress = Math.round((completed / targetQty) * 100);
            }
        }, 2000);
    }
}
const aiEngine = new AISessionManager(10);

app.post('/api/smm/run-puppeteer', async (req, res) => {
    const { targetUrl } = req.body;
    if (!targetUrl) return res.status(400).json({ error: 'Target URL is required' });

    let browser = null;
    try {
        let puppeteer = require('puppeteer');
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        
        const title = await page.title();
        return res.json({ success: true, data: { title, url: targetUrl } });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
});

// ==========================================
// 🤖 KHỞI TẠO BOT TELEGRAM & LOGIC CHÍNH
// ==========================================
function sendHomeMenu(chatId, u, isAdmin) {
    const welcomeMessage = `
🤖 *HỆ THỐNG DỊCH VỤ MXH PRO* 🚀
Chào mừng sếp, *${u.name}*
--------------------------------------------------
💎 *Phân quyền:* ${isAdmin ? '👑 ADMIN TỐI CAO' : '👤 KHÁCH HÀNG'}
💰 **Ví Chính:** \`${(u.balance || 0).toLocaleString()} VNĐ\`
--------------------------------------------------
👉 Chọn dịch vụ cần giao dịch bên dưới:
    `;

    const inlineKeyboard = [
        [{ text: '🌐 DỊCH VỤ MẠNG XÃ HỘI', callback_data: 'smm_main' }],
        [{ text: '🎟️ TRUNG TÂM MUA CODE', callback_data: 'buy_code' }],
        [{ text: '💳 NẠP TIỀN', callback_data: 'deposit' }, { text: '📇 QUẢN LÝ ĐƠN HÀNG', callback_data: 'customer_center' }],
        ...(isAdmin ? [[{ text: '🛡️ QUẢN LÝ TÀI KHOẢN (ADMIN)', callback_data: 'admin_center' }]] : []),
        [{ text: '👥 NHÓM HỖ TRỢ', url: 'https://t.me/Hendy_Support_Group' }]
    ];

    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineKeyboard } }).catch(() => {});
}

function setupBotLogic() {
    if (!bot) return;

    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id.toString();
        const isAdmin = (chatId === ADMIN_ID);

        if (!users[chatId]) {
            users[chatId] = {
                id: chatId, name: msg.from.first_name || 'Khách',
                balance: 50000, wonCodes: [], orders: [],
                linkedAccounts: JSON.parse(JSON.stringify(DEFAULT_LINKED_ACCOUNTS))
            };
        }
        
        if (users[chatId].actionState) delete users[chatId].actionState;
        if (adminSession[chatId]) delete adminSession[chatId];
        saveDatabase();

        sendHomeMenu(chatId, users[chatId], isAdmin);
    });

    // 🎬 TÍNH NĂNG AI VIETSUB VIDEO TỰ ĐỘNG
    bot.on('video', async (msg) => {
        const chatId = msg.chat.id.toString();
        const videoId = msg.video.file_id;
        const fileSize = msg.video.file_size || 0;
        const u = users[chatId];
        
        if (!u) return;

        // Giới hạn Telegram Bot API mặc định là 20MB
        if (fileSize > 20000000) {
            return bot.sendMessage(chatId, '❌ File Video quá lớn. Vui lòng gửi video dưới 20MB!');
        }

        const pricePerVideo = 5000; 
        if (u.balance < pricePerVideo) {
            return bot.sendMessage(chatId, `❌ Bạn cần tối thiểu \`${pricePerVideo.toLocaleString()} VNĐ\` để sử dụng dịch vụ AI Vietsub Video.`, { parse_mode: 'Markdown' });
        }

        u.balance -= pricePerVideo;
        saveDatabase();

        const waitMsg = await bot.sendMessage(chatId, '⏳ *Hệ thống đang tiếp nhận Video...*\n🤖 AI đang tách âm thanh và tạo phụ đề. Vui lòng đợi 1-3 phút!', { parse_mode: 'Markdown' });

        try {
            const videoPath = await bot.downloadFile(videoId, __dirname);
            const audioPath = `${videoPath}.mp3`;

            ffmpeg(videoPath)
                .output(audioPath)
                .on('end', async () => {
                    try {
                        const transcription = await openai.audio.transcriptions.create({
                            file: fs.createReadStream(audioPath),
                            model: 'whisper-1',
                            response_format: 'srt' 
                        });

                        const srtPath = `${videoPath}.srt`;
                        fs.writeFileSync(srtPath, transcription);

                        await bot.sendDocument(chatId, srtPath, { 
                            caption: `🎉 *VIETSUB HOÀN TẤT!*\n💰 Đã trừ: \`-${pricePerVideo.toLocaleString()} VNĐ\`\n💎 Số dư: \`${u.balance.toLocaleString()} VNĐ\`\n\n👉 File \`.srt\` này dùng để ghép vào video gốc qua CapCut hoặc trình phát Video.`,
                            parse_mode: 'Markdown'
                        });

                    } catch (aiError) {
                        console.error('Lỗi OpenAI:', aiError);
                        bot.sendMessage(chatId, '❌ AI dịch thuật quá tải hoặc cấu hình API Key sai. Đã hoàn tiền!');
                        u.balance += pricePerVideo; 
                        saveDatabase();
                    } finally {
                        // Xoá file rác
                        try {
                            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
                            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                            if (fs.existsSync(`${videoPath}.srt`)) fs.unlinkSync(`${videoPath}.srt`);
                        } catch(e){}
                    }
                })
                .on('error', (err) => {
                    console.error('Lỗi FFmpeg:', err);
                    bot.sendMessage(chatId, '❌ Lỗi xử lý định dạng Video. Đã hoàn tiền!');
                    u.balance += pricePerVideo; 
                    saveDatabase();
                    try { if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath); } catch(e){}
                })
                .run();
                
        } catch (error) {
            console.error('Lỗi tải video:', error);
            bot.sendMessage(chatId, '❌ Lỗi hệ thống khi tải video. Đã hoàn tiền!');
            u.balance += pricePerVideo;
            saveDatabase();
        }
    });

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id.toString();
        const text = msg.text;
        let u = users[chatId];
        
        if (!u || !text || text.startsWith('/start')) return;

        // ADMIN: BROADCAST
        if (chatId === ADMIN_ID && text.startsWith('/tb ')) {
            const broadcastMsg = text.replace('/tb ', '');
            let count = 0;
            Object.keys(users).forEach(uid => {
                bot.sendMessage(uid, `📢 *THÔNG BÁO TỪ HỆ THỐNG:*\n\n${broadcastMsg}`, {parse_mode: 'Markdown'}).catch(()=>{});
                count++;
            });
            return bot.sendMessage(chatId, `✅ Đã gửi thông báo tới ${count} người dùng.`);
        }

        // USER: NHẬP GIFTCODE
        if (text.startsWith('/giftcode ')) {
            const codeStr = text.split(' ')[1].toUpperCase();
            const codeData = giftcodes[codeStr];

            if (!codeData) return bot.sendMessage(chatId, '❌ Mã Giftcode không tồn tại!');
            if (u.wonCodes.includes(codeStr)) return bot.sendMessage(chatId, '❌ Bạn đã sử dụng mã này rồi!');
            if (codeData.usedBy.length >= codeData.maxUses) return bot.sendMessage(chatId, '❌ Mã Giftcode đã hết lượt sử dụng!');

            u.balance += codeData.value;
            u.wonCodes.push(codeStr);
            codeData.usedBy.push(chatId);
            saveDatabase();
            return bot.sendMessage(chatId, `🎁 *NHẬP MÃ THÀNH CÔNG!*\nBạn nhận được: \`+${codeData.value.toLocaleString()} VNĐ\`\n💰 Số dư mới: \`${u.balance.toLocaleString()} VNĐ\``, {parse_mode: 'Markdown'});
        }

        if (text === '/cancel') {
            if (u.actionState) delete u.actionState;
            if (adminSession[chatId]) delete adminSession[chatId];
            saveDatabase();
            bot.sendMessage(chatId, '🚫 Đã hủy thao tác hiện tại.').catch(() => {});
            sendHomeMenu(chatId, u, (chatId === ADMIN_ID));
            return;
        }

        // ADMIN: XỬ LÝ CỘNG/TRỪ TIỀN
        if (chatId === ADMIN_ID && adminSession[chatId]) {
            const session = adminSession[chatId];
            const amount = parseInt(text.replace(/[,.]/g, ''));

            if (isNaN(amount) || amount <= 0) return bot.sendMessage(chatId, '❌ Số tiền không hợp lệ.');
            
            const targetUser = users[session.targetId];
            if (!targetUser) return delete adminSession[chatId];

            if (session.action === 'ADD') {
                targetUser.balance += amount;
                bot.sendMessage(session.targetId, `💳 *ĐƯỢC CỘNG TIỀN*\n💰 + \`${amount.toLocaleString()} VNĐ\``, {parse_mode: 'Markdown'}).catch(()=>{});
            } else if (session.action === 'SUB') {
                targetUser.balance = Math.max(0, targetUser.balance - amount);
            }
            saveDatabase();
            bot.sendMessage(chatId, `✅ Thao tác thành công. Số dư của ${targetUser.name}:${targetUser.balance.toLocaleString()} VNĐ`);
            delete adminSession[chatId];
            return;
        }

        // USER: TẠO ĐƠN SMM
        if (u.actionState && u.actionState.step === 'WAITING_LINK') {
            u.actionState.link = text;
            u.actionState.step = 'WAITING_QUANTITY';
            saveDatabase();
            return bot.sendMessage(chatId, `🔗 Đã nhận Link.\n👉 *Nhập số lượng bạn muốn tăng:*`, { parse_mode: 'Markdown' });
        }

        if (u.actionState && u.actionState.step === 'WAITING_QUANTITY') {
            const quantity = parseInt(text);
            if (isNaN(quantity) || quantity <= 0) return bot.sendMessage(chatId, '❌ Số lượng không hợp lệ.');

            const totalCost = quantity * u.actionState.price;
            if (u.balance < totalCost) {
                delete u.actionState; saveDatabase();
                return bot.sendMessage(chatId, `❌ Bạn không đủ tiền! Yêu cầu: \`${totalCost.toLocaleString()} VNĐ\``, { parse_mode: 'Markdown' });
            }

            u.balance -= totalCost;
            const newOrder = {
                id: generateOrderId(), chatId, serviceName: u.actionState.serviceName, 
                link: u.actionState.link, quantity, totalCost, status: 'Đang chờ', date: new Date().toLocaleString('vi-VN')
            };

            u.orders.push(newOrder); orders[newOrder.id] = newOrder;
            delete u.actionState; saveDatabase();
            aiEngine.enqueueOrder(newOrder);

            return bot.sendMessage(chatId, `✅ *TẠO ĐƠN THÀNH CÔNG!*\nMã đơn: *${newOrder.id}*\nLink: ${newOrder.link}\nSL:${quantity} | Trừ: \`-${totalCost.toLocaleString()} VNĐ\``, { parse_mode: 'Markdown' });
        }
    });

    bot.on('callback_query', (query) => {
        const chatId = query.from.id.toString();
        const data = query.data;
        const u = users[chatId];
        if (!u) return;

        if (data === 'smm_main') {
            let kb = Object.keys(SMM_SERVICES).map(key => [{ text: SMM_SERVICES[key].title, callback_data: `smm_cat_${key}` }]);
            kb.push([{ text: '◀ Quay lại', callback_data: 'back_start' }]);
            bot.editMessageText('🌐 *DANH MỤC DỊCH VỤ MXH*', { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }).catch(() => {});
        }
        else if (data.startsWith('smm_cat_')) {
            const catKey = data.replace('smm_cat_', '');
            const category = SMM_SERVICES[catKey];
            if (category) {
                let kb = category.items.map((item, idx) => [{ text: `🛒 ${item.name} (${item.price}đ)`, callback_data: `order_${catKey}_${idx}` }]);
                kb.push([{ text: '◀ Quay lại', callback_data: 'smm_main' }]);
                bot.editMessageText(`📌 ${category.title}`, { chat_id: chatId, message_id: query.message.message_id, reply_markup: { inline_keyboard: kb } }).catch(() => {});
            }
        }
        else if (data.startsWith('order_')) {
            const [_, catKey, itemIdx] = data.split('_');
            const item = SMM_SERVICES[catKey]?.items[parseInt(itemIdx)];
            if (item) {
                u.actionState = { step: 'WAITING_LINK', serviceName: item.name, price: item.price };
                saveDatabase();
                bot.sendMessage(chatId, `📌 Bạn đang đặt: *${item.name}*\n💰 Giá: \`${item.price}đ/lượt\`\n👉 Vui lòng dán Link/ID:`, { parse_mode: 'Markdown' }).catch(() => {});
            }
        }
        else if (data === 'buy_code') {
            let text = `🎟️ *TRUNG TÂM MUA CODE*\nSố dư: \`${u.balance.toLocaleString()}đ\`\n\n`;
            let kb = [];
            Object.keys(DEFAULT_LINKED_ACCOUNTS).forEach(brand => {
                const bInfo = brandStatuses[brand] || { price: 50000, status: '🟢' };
                let count = u.linkedAccounts[brand] ? u.linkedAccounts[brand].length : 0;
                kb.push([{ text: `${brand} (${count} code) -${bInfo.price/1000}K`, callback_data: `page_${brand}` }]);
            });
            kb.push([{ text: '◀ Quay lại', callback_data: 'back_start' }]);
            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }).catch(() => {});
        }
        else if (data.startsWith('page_')) {
            const brand = data.replace('page_', '');
            const price = brandStatuses[brand]?.price || 50000;
            const codes = (u.linkedAccounts[brand] || []).map(c => `\`${c}\``).join(', ') || 'Chưa có code nào.';
            
            let text = `🎟️ *MUA CODE: ${brand}*\n💰 Giá mua: \`${price.toLocaleString()} VNĐ\` / Code\n\n📦 *Code bạn đang sở hữu:*\n${codes}`;
            let kb = [[{ text: `🛒 THANH TOÁN MUA 1 CODE`, callback_data: `buycode_${brand}` }], [{ text: '◀ Quay lại', callback_data: 'buy_code' }]];
            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }).catch(() => {});
        }
        else if (data.startsWith('buycode_')) {
            const brand = data.replace('buycode_', '');
            const price = brandStatuses[brand]?.price || 50000;
            
            if (u.balance < price) return bot.answerCallbackQuery(query.id, { text: `❌ Số dư không đủ! Cần ${price}đ.`, show_alert: true }).catch(()=>{});

            u.balance -= price;
            const newCode = `${brand}-` + Math.random().toString(36).substring(2, 8).toUpperCase();
            if (!u.linkedAccounts[brand]) u.linkedAccounts[brand] = [];
            u.linkedAccounts[brand].push(newCode);
            saveDatabase();

            bot.answerCallbackQuery(query.id, { text: `✅ Mua code thành công!`, show_alert: true }).catch(()=>{});
            bot.sendMessage(chatId, `🎉 *MUA CODE THÀNH CÔNG!*\n🎟️ Mã của bạn: \`${newCode}\`\n💰 Trừ ví: \`-${price.toLocaleString()}đ\``, { parse_mode: 'Markdown' }).catch(()=>{});
        }
        else if (data === 'admin_center') {
            if (chatId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Bạn không có quyền truy cập!', show_alert: true }).catch(() => {});

            let totalUsers = Object.keys(users).length;
            let totalBalance = Object.values(users).reduce((sum, usr) => sum + (usr.balance || 0), 0);
            let totalOrders = Object.keys(orders).length;

            let text = `🛡️ *TRUNG TÂM QUẢN LÝ ADMIN*\n--------------------------\n👥 Tổng khách: \`${totalUsers}\`\n💰 Tổng số dư: \`${totalBalance.toLocaleString()}đ\`\n📦 Tổng đơn: \`${totalOrders}\`\n--------------------------\n👉 *Khách hàng gần đây:*`;

            let kb = [];
            Object.keys(users).slice(-10).reverse().forEach(uid => {
                kb.push([{ text: `👤 ${users[uid].name} | ${(users[uid].balance || 0).toLocaleString()}đ`, callback_data: `admin_user_${uid}` }]);
            });

            kb.push([{ text: '🔄 Làm mới', callback_data: 'admin_center' }, { text: '◀ Quay lại', callback_data: 'back_start' }]);
            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }).catch(() => {});
        }
        else if (data.startsWith('admin_user_')) {
            if (chatId !== ADMIN_ID) return;
            const targetId = data.replace('admin_user_', '');
            const targetUser = users[targetId];

            if (!targetUser) return bot.answerCallbackQuery(query.id, { text: '❌ Khách hàng không tồn tại!', show_alert: true }).catch(() => {});

            let text = `👤 *QUẢN LÝ KHÁCH HÀNG*\n--------------------------\n📌 Tên: *${targetUser.name}*\n🆔 ID: \`${targetId}\`\n💰 Số dư: \`${(targetUser.balance || 0).toLocaleString()}đ\`\n📦 Tổng đơn: \`${targetUser.orders ? targetUser.orders.length : 0}\`\n--------------------------`;
            let kb = [
                [{ text: '➕ Cộng tiền', callback_data: `admin_add_${targetId}` }, { text: '➖ Trừ tiền', callback_data: `admin_sub_${targetId}` }],
                [{ text: '◀ Quay lại', callback_data: 'admin_center' }]
            ];
            bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }).catch(() => {});
        }
        else if (data.startsWith('admin_add_')) {
            if (chatId !== ADMIN_ID) return;
            const targetId = data.replace('admin_add_', '');
            adminSession[chatId] = { action: 'ADD', targetId: targetId };
            bot.sendMessage(chatId, `➕ *CỘNG TIỀN*\nNhập số tiền muốn cộng cho ${users[targetId]?.name || targetId}:\n_(Gõ /cancel để hủy)_`, { parse_mode: 'Markdown' }).catch(() => {});
        }
        else if (data.startsWith('admin_sub_')) {
            if (chatId !== ADMIN_ID) return;
            const targetId = data.replace('admin_sub_', '');
            adminSession[chatId] = { action: 'SUB', targetId: targetId };
            bot.sendMessage(chatId, `➖ *TRỪ TIỀN*\nNhập số tiền muốn trừ của ${users[targetId]?.name || targetId}:\n_(Gõ /cancel để hủy)_`, { parse_mode: 'Markdown' }).catch(() => {});
        }
        else if (data === 'back_start') {
            if (u.actionState) delete u.actionState;
            saveDatabase();
            sendHomeMenu(chatId, u, (chatId === ADMIN_ID));
        }

        bot.answerCallbackQuery(query.id).catch(() => {});
    });
}

function startBot(token) {
    if (!token) return console.warn('⚠️ BOT_TOKEN trống.');
    try {
        bot = new TelegramBot(token, { polling: true });
        setupBotLogic();
        console.log('🤖 Bot Telegram đã khởi động thành công!');
    } catch (e) { console.error("❌ Lỗi khởi động bot:", e.message); }
}

server.listen(PORT, () => {
    loadDatabase();
    startBot(BOT_TOKEN);
    console.log(`🚀 Server đang chạy tại port ${PORT}`);
});
