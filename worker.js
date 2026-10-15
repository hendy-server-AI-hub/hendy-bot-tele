export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (request.method === 'GET' && url.pathname === '/') {
            return new Response('Server Hendy & Hades V6100 Cloudflare Worker đang hoạt động.', {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        if (request.method === 'POST' && url.pathname === '/telegram-webhook') {
            try {
                const update = await request.json();
                await handleUpdate(update, env);
                return new Response('OK', { status: 200 });
            } catch (err) {
                console.error('Lỗi xử lý Webhook:', err);
                return new Response(err.message, { status: 500 });
            }
        }

        return new Response('Not Found', { status: 404 });
    }
};

// ==========================================
// 🗄️ QUẢN LÝ DỮ LIỆU & STATE
// ==========================================
const memoryDb = {
    users: {},
    orders: {},
    giftcodes: {
        'TANTHU2026': { value: 20000, maxUses: 999, usedBy: [] },
        'HENDYVIP': { value: 50000, maxUses: 100, usedBy: [] }
    }
};

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

const BRAND_STATUSES = {
    'SC88': { status: '🟢 Hoạt động', price: 50000 },
    'C168': { status: '🟢 Hoạt động', price: 45000 },
    'F8BET': { status: '🟢 Hoạt động', price: 60000 },
    'CM88': { status: '🟡 Bảo trì', price: 50000 }
};

function getUser(chatId, firstName) {
    if (!memoryDb.users[chatId]) {
        memoryDb.users[chatId] = {
            id: chatId,
            name: firstName || 'Khách',
            balance: 50000,
            wonCodes: [],
            orders: [],
            linkedAccounts: { SC88: [], C168: [], CM88: [], F8BET: [], QQ88: [], "78WIN": [] }
        };
    }
    return memoryDb.users[chatId];
}

// ==========================================
// 🤖 XỬ LÝ SỰ KIỆN TELEGRAM WEBHOOK
// ==========================================
async function handleUpdate(update, env) {
    const BOT_TOKEN = env.BOT_TOKEN || '8689114890:AAFBFM0rNtZWpOtAovIPHPVQTJVp0odU1DQ';
    const ADMIN_ID = env.ADMIN_ID || '6138197737';

    // 1. Xử lý Callback Query (Button click)
    if (update.callback_query) {
        const query = update.callback_query;
        const chatId = query.from.id.toString();
        const data = query.data;
        const u = getUser(chatId, query.from.first_name);

        if (data === 'smm_main') {
            let kb = Object.keys(SMM_SERVICES).map(key => [{ text: SMM_SERVICES[key].title, callback_data: `smm_cat_${key}` }]);
            kb.push([{ text: '◀ Quay lại', callback_data: 'back_start' }]);
            await editMessage(BOT_TOKEN, chatId, query.message.message_id, '🌐 *DANH MỤC DỊCH VỤ MXH*', kb);
        } 
        else if (data.startsWith('smm_cat_')) {
            const catKey = data.replace('smm_cat_', '');
            const category = SMM_SERVICES[catKey];
            if (category) {
                let kb = category.items.map((item, idx) => [{ text: `🛒 ${item.name} (${item.price}đ)`, callback_data: `order_${catKey}_${idx}` }]);
                kb.push([{ text: '◀ Quay lại', callback_data: 'smm_main' }]);
                await editMessage(BOT_TOKEN, chatId, query.message.message_id, `📌 *${category.title}*`, kb);
            }
        }
        else if (data.startsWith('order_')) {
            const [_, catKey, itemIdx] = data.split('_');
            const item = SMM_SERVICES[catKey]?.items[parseInt(itemIdx)];
            if (item) {
                u.actionState = { step: 'WAITING_LINK', serviceName: item.name, price: item.price };
                await sendMessage(BOT_TOKEN, chatId, `📌 Bạn đang đặt: *${item.name}*\n💰 Giá: \`${item.price}đ/lượt\`\n👉 Vui lòng dán Link/ID mục tiêu:`);
            }
        }
        else if (data === 'buy_code') {
            let text = `🎟️ *TRUNG TÂM MUA CODE*\nSố dư ví: \`${u.balance.toLocaleString()} VNĐ\`\n\n`;
            let kb = Object.keys(BRAND_STATUSES).map(brand => {
                const bInfo = BRAND_STATUSES[brand];
                const count = (u.linkedAccounts[brand] || []).length;
                return [{ text: `${brand} (${count} code) -${bInfo.price / 1000}K`, callback_data: `page_${brand}` }];
            });
            kb.push([{ text: '◀ Quay lại', callback_data: 'back_start' }]);
            await editMessage(BOT_TOKEN, chatId, query.message.message_id, text, kb);
        }
        else if (data.startsWith('page_')) {
            const brand = data.replace('page_', '');
            const price = BRAND_STATUSES[brand]?.price || 50000;
            const codes = (u.linkedAccounts[brand] || []).map(c => `\`${c}\``).join(', ') || 'Chưa có code nào.';
            let text = `🎟️ *MUA CODE: ${brand}*\n💰 Giá mua: \`${price.toLocaleString()} VNĐ\` / Code\n\n📦 *Code bạn đang sở hữu:*\n${codes}`;
            let kb = [
                [{ text: `🛒 THANH TOÁN MUA 1 CODE`, callback_data: `buycode_${brand}` }],
                [{ text: '◀ Quay lại', callback_data: 'buy_code' }]
            ];
            await editMessage(BOT_TOKEN, chatId, query.message.message_id, text, kb);
        }
        else if (data.startsWith('buycode_')) {
            const brand = data.replace('buycode_', '');
            const price = BRAND_STATUSES[brand]?.price || 50000;
            if (u.balance < price) {
                await answerCallback(BOT_TOKEN, query.id, `❌ Số dư không đủ! Cần ${price.toLocaleString()}đ.`);
                return;
            }
            u.balance -= price;
            const newCode = `${brand}-` + Math.random().toString(36).substring(2, 8).toUpperCase();
            if (!u.linkedAccounts[brand]) u.linkedAccounts[brand] = [];
            u.linkedAccounts[brand].push(newCode);

            await answerCallback(BOT_TOKEN, query.id, `✅ Mua code thành công!`);
            await sendMessage(BOT_TOKEN, chatId, `🎉 *MUA CODE THÀNH CÔNG!*\n🎟️ Mã của bạn: \`${newCode}\`\n💰 Trừ ví: \`-${price.toLocaleString()} VNĐ\``);
        }
        else if (data === 'back_start') {
            if (u.actionState) delete u.actionState;
            await sendHomeMenu(BOT_TOKEN, chatId, u, chatId === ADMIN_ID);
        }
        await answerCallback(BOT_TOKEN, query.id);
        return;
    }

    // 2. Xử lý Message
    if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id.toString();
        const u = getUser(chatId, msg.from?.first_name);

        // Xử lý Video (AI Vietsub qua OpenAI API)
        if (msg.video) {
            const pricePerVideo = 5000;
            if (u.balance < pricePerVideo) {
                await sendMessage(BOT_TOKEN, chatId, `❌ Bạn cần tối thiểu \`${pricePerVideo.toLocaleString()} VNĐ\` để dùng dịch vụ AI Vietsub Video.`);
                return;
            }
            u.balance -= pricePerVideo;
            await sendMessage(BOT_TOKEN, chatId, '⏳ *Đang xử lý Video qua OpenAI Whisper AI...*\nVui lòng chờ trong giây lát!');

            try {
                // Tải URL file từ Telegram API
                const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${msg.video.file_id}`);
                const fileData = await fileRes.json();
                
                if (fileData.ok) {
                    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
                    
                    // Gọi API OpenAI Whisper
                    const mediaRes = await fetch(downloadUrl);
                    const mediaBlob = await mediaRes.blob();
                    
                    const formData = new FormData();
                    formData.append('file', mediaBlob, 'video.mp4');
                    formData.append('model', 'whisper-1');
                    formData.append('response_format', 'srt');

                    const aiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
                        body: formData
                    });

                    if (aiRes.ok) {
                        const srtText = await aiRes.text();
                        await sendDocument(BOT_TOKEN, chatId, srtText, 'subtitles.srt', `🎉 *VIETSUB HOÀN TẤT!*\n💰 Trừ ví: \`-${pricePerVideo.toLocaleString()} VNĐ\`\n💎 Số dư: \`${u.balance.toLocaleString()} VNĐ\``);
                    } else {
                        throw new Error('Lỗi từ API OpenAI');
                    }
                }
            } catch (e) {
                u.balance += pricePerVideo; // Hoàn tiền
                await sendMessage(BOT_TOKEN, chatId, `❌ *Lỗi xử lý AI:* ${e.message}. Hệ thống đã hoàn lại 5.000 VNĐ vào ví.`);
            }
            return;
        }

        const text = msg.text;
        if (!text) return;

        if (text === '/start') {
            await sendHomeMenu(BOT_TOKEN, chatId, u, chatId === ADMIN_ID);
            return;
        }

        // Broadcast từ Admin
        if (chatId === ADMIN_ID && text.startsWith('/tb ')) {
            const broadcastMsg = text.replace('/tb ', '');
            let count = 0;
            for (const uid of Object.keys(memoryDb.users)) {
                await sendMessage(BOT_TOKEN, uid, `📢 *THÔNG BÁO HỆ THỐNG:*\n\n${broadcastMsg}`);
                count++;
            }
            await sendMessage(BOT_TOKEN, chatId, `✅ Đã gửi thông báo tới ${count} người dùng.`);
            return;
        }

        // Nhập Giftcode
        if (text.startsWith('/giftcode ')) {
            const codeStr = text.split(' ')[1]?.toUpperCase();
            const codeData = memoryDb.giftcodes[codeStr];

            if (!codeData) return sendMessage(BOT_TOKEN, chatId, '❌ Mã Giftcode không tồn tại!');
            if (u.wonCodes.includes(codeStr)) return sendMessage(BOT_TOKEN, chatId, '❌ Bạn đã nhập mã này rồi!');

            u.balance += codeData.value;
            u.wonCodes.push(codeStr);
            return sendMessage(BOT_TOKEN, chatId, `🎁 *NHẬP MÃ THÀNH CÔNG!*\n💰 + \`${codeData.value.toLocaleString()} VNĐ\`\n💎 Số dư mới: \`${u.balance.toLocaleString()} VNĐ\``);
        }

        // Tạo đơn SMM
        if (u.actionState && u.actionState.step === 'WAITING_LINK') {
            u.actionState.link = text;
            u.actionState.step = 'WAITING_QUANTITY';
            await sendMessage(BOT_TOKEN, chatId, `🔗 Đã nhận Link.\n👉 *Nhập số lượng bạn muốn tăng:*`);
            return;
        }

        if (u.actionState && u.actionState.step === 'WAITING_QUANTITY') {
            const quantity = parseInt(text);
            if (isNaN(quantity) || quantity <= 0) return sendMessage(BOT_TOKEN, chatId, '❌ Số lượng không hợp lệ.');

            const totalCost = quantity * u.actionState.price;
            if (u.balance < totalCost) {
                delete u.actionState;
                return sendMessage(BOT_TOKEN, chatId, `❌ Số dư không đủ! Yêu cầu: \`${totalCost.toLocaleString()} VNĐ\``);
            }

            u.balance -= totalCost;
            const orderId = 'ORD' + Math.floor(Math.random() * 90000 + 10000);
            delete u.actionState;

            await sendMessage(BOT_TOKEN, chatId, `✅ *TẠO ĐƠN THÀNH CÔNG!*\nMã đơn: *${orderId}*\nLink: ${text}\nSL:${quantity.toLocaleString()} | Trừ ví: \`-${totalCost.toLocaleString()} VNĐ\``);
            return;
        }
    }
}

// ==========================================
// 🛠️ TELEGRAM API HELPERS
// ==========================================
async function sendHomeMenu(token, chatId, u, isAdmin) {
    const text = `🤖 *HỆ THỐNG DỊCH VỤ MXH PRO* 🚀\nChào mừng sếp, *${u.name}*\n--------------------------------------------------\n💎 *Phân quyền:* ${isAdmin ? '👑 ADMIN TỐI CAO' : '👤 KHÁCH HÀNG'}\n💰 **Ví Chính:** \`${(u.balance || 0).toLocaleString()} VNĐ\`\n--------------------------------------------------\n👉 Chọn dịch vụ cần giao dịch bên dưới:`;
    const kb = [
        [{ text: '🌐 DỊCH VỤ MẠNG XÃ HỘI', callback_data: 'smm_main' }],
        [{ text: '🎟️ TRUNG TÂM MUA CODE', callback_data: 'buy_code' }],
        [{ text: '👥 NHÓM HỖ TRỢ', url: 'https://t.me/Hendy_Support_Group' }]
    ];
    await sendMessage(token, chatId, text, kb);
}

async function sendMessage(token, chatId, text, inlineKeyboard = null) {
    const payload = { chat_id: chatId, text, parse_mode: 'Markdown' };
    if (inlineKeyboard) payload.reply_markup = { inline_keyboard: inlineKeyboard };
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

async function editMessage(token, chatId, messageId, text, inlineKeyboard = null) {
    const payload = { chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown' };
    if (inlineKeyboard) payload.reply_markup = { inline_keyboard: inlineKeyboard };
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

async function answerCallback(token, queryId, text = '') {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: queryId, text, show_alert: !!text })
    });
}

async function sendDocument(token, chatId, fileContent, fileName, caption) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
    formData.append('document', new Blob([fileContent], { type: 'text/plain' }), fileName);

    await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: 'POST',
        body: formData
    });
}
