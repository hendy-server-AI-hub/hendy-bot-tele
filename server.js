const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static('public')); // Thư mục chứa file frontend index.html

// Token Bot Telegram của sếp
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
const bot = new TelegramBot(TOKEN, { polling: true });

// Database giả lập (có thể lưu ra file database.json)
let database = {
    users: {
        "6138197737": { name: "Ngô", balance: 500000 }
    },
    orders: [
        { id: "ORD56831", customer: "Ngô", service: "Tăng Tim Tiktok", link: "https://vt.tiktok.com/ZSqxC551U/", quantity: 100, total: 8000, status: "Đã hoàn thành" }
    ]
};

// ==========================================
// 🤖 AI ĐIỀU KHIỂN HỆ THỐNG ĐA PHIÊN (MULTI-SESSION BOT HUB)
// ==========================================
let activeAiSessions = [];

function broadcastToHub(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// API Kích hoạt AI tự động chạy các đơn hàng đang chờ
app.post('/api/ai/run-sessions', (req, res) => {
    activeAiSessions = [
        { id: 'BOT_WORKER_01', task: 'Tăng Tim TikTok (ORD56831)', status: 'Đang chạy', progress: '100%' },
        { id: 'BOT_WORKER_02', task: 'Đồng bộ API SMM Gateway', status: 'Sẵn sàng', progress: '0%' }
    ];

    broadcastToHub({
        type: 'SYSTEM_LOG',
        text: `[AI_CORE] Đã kích hoạt hệ thống đa phiên. Khởi chạy 2 bot worker xử lý đơn hàng.`
    });

    // Giả lập tiến trình AI xử lý đơn hàng tự động
    setTimeout(() => {
        broadcastToHub({
            type: 'ORDER_UPDATE',
            orders: database.orders
        });
    }, 1000);

    res.json({ success: true, sessions: activeAiSessions });
});

// API Lấy danh sách đơn hàng cho Web Dashboard
app.get('/api/orders', (req, res) => {
    res.json(database.orders);
});

// WebServer chạy cổng Render / Railway
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Hades V6100 System đang chạy tại cổng ${PORT}`);
});
