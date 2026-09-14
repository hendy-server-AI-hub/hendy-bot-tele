const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// ==========================================
// 1. CẤU HÌNH HỆ THỐNG CƠ BẢN
// ==========================================
const token = '8689114890:AAFBFM0rNtZWpOtAovIPHPVQTJVp0odU1DQ'; // Thay token bot của sếp vào đây
const bot = new TelegramBot(token, { polling: true });
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Chứa file index.html

// Database giả lập (Nên thay bằng MongoDB/MySQL khi scale lớn)
let users = {};
let orders = {};

// Hàm lưu database tạm
function saveDatabase() {
    fs.writeFileSync('./database.json', JSON.stringify({ users, orders }, null, 2));
}
// Load db nếu có
if (fs.existsSync('./database.json')) {
    const data = JSON.parse(fs.readFileSync('./database.json'));
    users = data.users || {};
    orders = data.orders || {};
}

// Cấu hình VietQR
const BANK_CONFIG = {
    bankId: 'MB',
    accountNo: '0123456789',
    accountName: 'HENDY SYSTEM'
};

// ==========================================
// 2. LÕI AI ENGINE ĐIỀU KHIỂN HỆ THỐNG ĐA PHIÊN
// ==========================================
let wss; // WebSocket Server instance

class AISessionManager {
    constructor(maxConcurrentSessions = 5) {
        this.maxConcurrent = maxConcurrentSessions;
        this.activeSessions = new Map();
        this.queue = [];
    }

    enqueueOrder(order) {
        this.queue.push(order);
        this.broadcastLog(`[AI ENGINE] Đã nhận đơn #${order.id} (${order.service}) vào hàng chờ.`);
        this.processNext();
    }

    processNext() {
        if (this.activeSessions.size >= this.maxConcurrent || this.queue.length === 0) return;

        const order = this.queue.shift();
        const sessionId = `BOT_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 100)}`;
        
        this.activeSessions.set(sessionId, {
            id: sessionId,
            orderId: order.id,
            targetLink: order.link,
            quantity: order.quantity,
            progress: 0,
            status: 'RUNNING'
        });

        if (orders[order.id]) {
            orders[order.id].status = 'Đang xử lý';
            saveDatabase();
        }

        this.broadcastLog(`[AI ENGINE] Khởi tạo luồng ${sessionId} chạy đơn #${order.id}`);
        this.broadcastSessionState();
        this.runWorkerSession(sessionId, order);
    }

    async runWorkerSession(sessionId, order) {
        const session = this.activeSessions.get(sessionId);
        const targetQty = parseInt(order.quantity) || 100;
        let completed = 0;

        // Giả lập bot chạy tương tác (cứ 2 giây tăng 1 đợt)
        const interval = setInterval(() => {
            if (completed >= targetQty) {
                clearInterval(interval);
                session.status = 'COMPLETED';
                session.progress = 100;

                if (orders[order.id]) {
                    orders[order.id].status = 'Hoàn thành';
                    saveDatabase();
                }

                this.broadcastLog(`[AI ENGINE] ✅ Phiên ${sessionId} hoàn thành! Đã bơm ${targetQty} cho ${order.link}`);
                this.broadcastOrderUpdate();
                
                this.activeSessions.delete(sessionId);
                this.broadcastSessionState();
                
                // Kích hoạt chạy đơn tiếp theo trong hàng chờ
                this.processNext();
            } else {
                const step = Math.min(Math.floor(Math.random() * 15) + 5, targetQty - completed);
                completed += step;
                session.progress = Math.round((completed / targetQty) * 100);

                this.broadcastSessionState();
            }
        }, 2000);
    }

    broadcastLog(message) {
        this.emitToWS({ type: 'AI_SYSTEM_LOG', timestamp: new Date().toLocaleTimeString('vi-VN'), text: message });
    }

    broadcastSessionState() {
        this.emitToWS({ type: 'AI_SESSIONS_UPDATE', activeCount: this.activeSessions.size, sessions: Array.from(this.activeSessions.values()) });
    }

    broadcastOrderUpdate() {
        this.emitToWS({ type: 'ORDERS_UPDATED', orders: Object.values(orders) });
    }

    emitToWS(payload) {
        if (!wss) return;
        const data = JSON.stringify(payload);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) client.send(data);
        });
    }
}

const aiEngine = new AISessionManager(10); // Cho phép tối đa 10 tab bot chạy ngầm song song

// ==========================================
// 3. API ENDPOINTS (WEBHOOK & DASHBOARD)
// ==========================================

// Kích hoạt AI chạy toàn bộ đơn "Đang chờ"
app.post('/api/ai/run-all', (req, res) => {
    let count = 0;
    Object.values(orders).forEach(order => {
        if (order.status === 'Đang chờ' || order.status === 'Pending') {
            aiEngine.enqueueOrder(order);
            count++;
        }
    });
    res.json({ success: true, message: `Đã đẩy ${count} đơn vào hệ thống AI đa phiên.` });
});

// Broadcast Telegram
app.post('/api/broadcast', async (req, res) => {
    const { message } = req.body;
    let success = 0, fail = 0;
    for (const chatId of Object.keys(users)) {
        try {
            await bot.sendMessage(chatId, `📢 *THÔNG BÁO TỪ HỆ THỐNG*\n\n${message}`, { parse_mode: 'Markdown' });
            success++;
        } catch (e) { fail++; }
    }
    aiEngine.broadcastLog(`[BROADCAST] Đã gửi thông báo tới ${success} user (${fail} lỗi).`);
    res.json({ success: true, successCount: success });
});

// VietQR Webhook
app.post('/api/vietqr-webhook', async (req, res) => {
    try {
        const { content, transferAmount } = req.body;
        const match = content.match(/NAP\s+(\d+)/i);
        if (match && users[match[1]]) {
            const chatId = match[1];
            users[chatId].balance += Number(transferAmount);
            saveDatabase();
            bot.sendMessage(chatId, `🎉 *NẠP TIỀN THÀNH CÔNG!*\n💰 Bạn vừa được cộng +${transferAmount} VNĐ.`, { parse_mode: 'Markdown' });
            aiEngine.broadcastLog(`[FINANCE] Auto-Deposit: +${transferAmount} cho user ${chatId}`);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Khởi tạo HTTP Server
const server = app.listen(port, () => {
    console.log(`🚀 Server Hendy & Hades V6100 đang chạy tại port ${port}`);
});

// ==========================================
// 4. WEBSOCKET SERVER
// ==========================================
wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    console.log('💻 Dashboard đã kết nối WebSocket');
    // Gửi data ban đầu khi Dashboard vừa load
    ws.send(JSON.stringify({ type: 'ORDERS_UPDATED', orders: Object.values(orders) }));
    aiEngine.broadcastSessionState();
    aiEngine.broadcastLog('[SYSTEM] Kết nối Master Control Panel thành công.');
});

// ==========================================
// 5. TELEGRAM BOT LOGIC (Ví dụ đơn giản)
// ==========================================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!users[chatId]) {
        users[chatId] = { id: chatId, name: msg.from.first_name, balance: 0 };
        saveDatabase();
    }
    bot.sendMessage(chatId, `Chào mừng sếp đến với Hendy SMM Bot! Số dư: ${users[chatId].balance} VNĐ\nNhập /mua để test lên đơn.`);
});

bot.onText(/\/mua/, (msg) => {
    const chatId = msg.chat.id;
    const orderId = `ORD${Math.floor(Math.random() * 90000) + 10000}`;
    orders[orderId] = { id: orderId, userId: chatId, service: 'Tăng Tim TikTok', link: 'https://vt.tiktok.com/ZS...', quantity: 100, status: 'Đang chờ' };
    saveDatabase();
    aiEngine.broadcastOrderUpdate();
    bot.sendMessage(chatId, `✅ Đã tạo đơn ${orderId} thành công. Đang chờ hệ thống AI xử lý!`);
});
