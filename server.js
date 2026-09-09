const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const clients = new Set();
const activeSlaves = new Map();
const activeBots = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// API lấy danh sách Slaves
app.get('/api/slaves', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    let slavesList = [];
    activeSlaves.forEach((client) => {
        slavesList.push({
            id: client.id,
            name: client.name,
            role: client.role,
            isOnLive: client.isOnLive,
            url: client.url,
            lastSeen: new Date(client.lastSeen).toLocaleTimeString('vi-VN')
        });
    });
    res.end(JSON.stringify(slavesList, null, 2));
});

// API lấy danh sách Bot active
app.get('/api/bots', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(Array.from(activeBots.values()), null, 2));
});

// API gửi lệnh điều khiển nhanh
app.get('/send-command', (req, res) => {
    const cmd = req.query.cmd || 'ĐIỂM DANH + SC88 +';
    let count = 0;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ action: `CHAT|${cmd}` }));
            count++;
        }
    });
    res.send(`🚀 Đã phát lệnh thành công cho ${count} thiết bị: [ ${cmd} ]`);
});

// --- AI ENGINE HANDLER (NLP RULE-BASED / API READY) ---
function processAiCommand(text) {
    const input = text.toLowerCase();
    
    // 1. Lệnh quản lý Bot
    if (input.includes('chạy') && (input.includes('tất cả') || input.includes('toàn bộ bot'))) {
        return { reply: "Mệnh lệnh xác nhận. Đang kích hoạt toàn bộ chiến binh Hades V6100.", trigger: "AI_START_BOTS" };
    }
    if (input.includes('dừng') || input.includes('stop')) {
        return { reply: "Hệ thống đã nhận lệnh dừng hỏa lực. Toàn bộ Bot đang đóng băng.", trigger: "AI_STOP_BOTS" };
    }
    if (input.includes('thêm bot') || input.includes('tạo bot')) {
        return { reply: "Đã khởi tạo thêm một Bot mới vào hàng chờ hệ thống.", trigger: "AI_ADD_BOT" };
    }
    
    // 2. Lệnh UI / Navigation
    if (input.includes('mở kho') || input.includes('acc store')) {
        return { reply: "Đang truy xuất CSDL Kho Tài khoản Cyberpunk...", trigger: "AI_OPEN_ACC_STORE" };
    }
    if (input.includes('test') || input.includes('giả lập')) {
        return { reply: "Khởi động môi trường giả lập Live Stream Hendy.", trigger: "AI_OPEN_TEST_ENV" };
    }

    // 3. Truy vấn trạng thái
    if (input.includes('trạng thái') || input.includes('báo cáo')) {
        return { reply: `Hệ thống ổn định. Đang có ${wss.clients.size} kết nối WS hoạt động. Số lượng Bot đang quản lý: ${activeBots.size}.`, trigger: "NONE" };
    }

    // Mặc định (Có thể tích hợp gọi API Gemini/OpenAI tại đây)
    return { 
        reply: "AI Manager đang chờ lệnh. Bạn có thể yêu cầu: 'Chạy tất cả bot', 'Dừng bot', 'Mở kho tài khoản', 'Mở môi trường giả lập'...", 
        trigger: "NONE" 
    };
}

wss.on('connection', (ws) => {
    clients.add(ws);
    ws.isAlive = true;
    let currentSlaveId = null;
    
    console.log('[WS] Client đã kết nối thành công.');
    ws.send(JSON.stringify({ type: 'SYSTEM', message: 'Kết nối thành công tới WebSocket Hub!' }));

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const now = Date.now();
            
            // XỬ LÝ LỆNH TỪ AI MANAGER FRONTEND
            if (data.action === 'AI_CHAT') {
                console.log('[AI RECV]:', data.text);
                const aiResult = processAiCommand(data.text);
                
                // Trả kết quả về cho Client đã yêu cầu
                ws.send(JSON.stringify({
                    type: 'AI_RESPONSE',
                    message: aiResult.reply,
                    triggerCmd: aiResult.trigger
                }));
                return; // Không broadcast lệnh chat AI cho toàn bộ server
            }

            console.log('[WS RECV]:', data);

            if (data.action === 'SYNC_REGISTER_TAB') {
                currentSlaveId = data.value?.id || ('slave_' + Math.random().toString(36).substring(2, 8));
                ws.slaveId = currentSlaveId;
                activeSlaves.set(currentSlaveId, {
                    ws: ws, id: currentSlaveId,
                    name: data.value?.name || 'Khách',
                    role: data.value?.role || 'VIP_BOT',
                    isOnLive: 1, url: '', lastSeen: now
                });
            } else if (data.action === 'SYNC_STATUS') {
                currentSlaveId = data.slaveId;
                if (activeSlaves.has(currentSlaveId)) {
                    let slave = activeSlaves.get(currentSlaveId);
                    slave.name = data.nickname || slave.name;
                    slave.isOnLive = data.is_on_live;
                    slave.url = data.url;
                    slave.lastSeen = now;
                }
            } else if (data.action === 'CREATE_BOT') {
                activeBots.set(data.botId, {
                    botId: data.botId,
                    account: data.account,
                    status: data.status || 'RUNNING',
                    timestamp: data.timestamp || new Date().toLocaleTimeString('vi-VN')
                });
                console.log(`[BOT CREATED] ID: ${data.botId} | Acc: ${data.account}`);
            }

            // Broadcast dữ liệu/lệnh tới tất cả Client khác
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'BROADCAST', data }));
                }
            });
        } catch (e) {
            console.error('[WS ERROR]: Lỗi xử lý message', e);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        if (ws.slaveId && activeSlaves.has(ws.slaveId)) {
            activeSlaves.delete(ws.slaveId);
        }
        console.log('[WS] Client đã ngắt kết nối.');
    });
});

server.listen(PORT, () => {
    console.log(`🚀 [HENDY SERVER HUB] Đang chạy tại cổng: ${PORT}`);
});
