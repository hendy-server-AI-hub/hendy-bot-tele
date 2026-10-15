require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const cors = require('cors');

const PORT = process.env.PORT || 8080;
const BOT_TOKEN = process.env.BOT_TOKEN || '8689114890:AAFBFM0rNtZWpOtAovIPHPVQTJVp0odU1DQ';

const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.send('Server Hendy & Hades V6100 Node.js Local/VPS đang hoạt động.');
});

server.listen(PORT, () => {
    console.log(`🚀 Server Node.js đang chạy tại port ${PORT}`);
});
