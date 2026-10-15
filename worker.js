export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const BOT_TOKEN = env.BOT_TOKEN || '8574999116:AAF39jSNBiOx-RqIFF08oLxHXqyxsQ9mYqw';

        // ==========================================
        // 🔧 ĐƯỜNG DẪN TỰ ĐỘNG CÀI ĐẶT WEBHOOK (/setup)
        // ==========================================
        if (request.method === 'GET' && url.pathname === '/setup') {
            const webhookUrl = `https://${url.host}/telegram-webhook`;
            const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${webhookUrl}`;
            
            try {
                const response = await fetch(telegramApiUrl);
                const result = await response.json();
                
                return new Response(JSON.stringify({
                    status: "Thực thi cài đặt Webhook",
                    domain_detected: webhookUrl,
                    telegram_response: result
                }, null, 2), {
                    headers: { 'Content-Type': 'application/json; charset=utf-8' }
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), { status: 500 });
            }
        }

        // ==========================================
        // 🌐 TRANG CHỦ (Kiểm tra server sống)
        // ==========================================
        if (request.method === 'GET' && url.pathname === '/') {
            return new Response(
                '<h2>Server Hendy & Hades V6100 Cloudflare Worker đang hoạt động.</h2>' +
                '<p>👉 Truy cập vào đường dẫn <b><a href="/setup">/setup</a></b> để tự động cài đặt Telegram Webhook.</p>', 
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
        }

        // ==========================================
        // 🤖 ĐIỂM NHẬN WEBHOOK TỪ TELEGRAM (/telegram-webhook)
        // ==========================================
        if (request.method === 'POST' && url.pathname === '/telegram-webhook') {
            try {
                const update = await request.json();
                await handleUpdate(update, env, BOT_TOKEN);
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
async function handleUpdate(update, env, BOT_TOKEN) {
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

        // A. Xử lý Video (Chuyển tiếp qua Server Vệ Tinh Python - Vietsub & Hardsub)
        if (msg.video) {
            const fileSize = msg.video.file_size || 0;
            if (fileSize > 20000000) {
                await sendMessage(BOT_TOKEN, chatId, '❌ File Video quá lớn. Vui lòng gửi video dưới 20MB!');
                return;
            }

            const pricePerVideo = 5000;
            if (u.balance < pricePerVideo) {
                await sendMessage(BOT_TOKEN, chatId, `❌ Bạn cần tối thiểu \`${pricePerVideo.toLocaleString()} VNĐ\` để dùng dịch vụ AI Vietsub Video.`);
                return;
            }

            u.balance -= pricePerVideo;
            await sendMessage(BOT_TOKEN, chatId, '⏳ *Đã tiếp nhận Video!*\nHệ thống đang chuyển dữ liệu sang Cụm Máy Chủ AI Python để render phụ đề cứng (Hardsub). Vui lòng chờ kết quả...');

            try {
                const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${msg.video.file_id}`);
                const fileData = await fileRes.json();
                
                if (fileData.ok) {
                    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
                    const PYTHON_SERVER_URL = 'https://app-python-cua-ban.onrender.com/api/vietsub'; // Thay link Server Python của bạn vào đây
                    
                    fetch(PYTHON_SERVER_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: chatId, file_url: fileUrl })
                    }).catch(err => console.error("Lỗi gọi Python API:", err));
                }
            } catch (e) {
                u.balance += pricePerVideo; 
                await sendMessage(BOT_TOKEN, chatId, `❌ *Lỗi hệ thống:* Không kết nối được với Máy chủ AI. Đã hoàn lại 5.000 VNĐ vào ví.`);
            }
            return;
        }

        // B. Xử lý Hình ảnh (Dịch văn bản qua OpenAI Vision API)
        if (msg.photo) {
            const photo = msg.photo[msg.photo.length - 1];
            await sendMessage(BOT_TOKEN, chatId, '🖼️ *Đang phân tích và dịch nội dung hình ảnh qua AI...*');

            try {
                const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${photo.file_id}`);
                const fileData = await fileRes.json();
                
                if (fileData.ok) {
                    const imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
                    
                    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${env.OPENAI_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [
                                {
                                    role: "user",
                                    content: [
                                        { type: "text", text: "Hãy trích xuất toàn bộ văn bản có trong ảnh này và dịch sang Tiếng Việt chuẩn xác nhất." },
                                        { type: "image_url", image_url: { url: imageUrl } }
                                    ]
                                }
                            ],
                            max_tokens: 1000
                        })
                    });

                    const aiData = await aiRes.json();
                    const translatedText = aiData.choices?.[0]?.message?.content || "Không thể dịch được hình ảnh này.";
                    await sendMessage(BOT_TOKEN, chatId, `🌐 *KẾT QUẢ DỊCH HÌNH ẢNH AI:*\n\n${translatedText}`);
                }
            } catch (err) {
                await sendMessage(BOT_TOKEN, chatId, `❌ Lỗi xử lý hình ảnh: ${err.message}`);
            }
            return;
        }

        const text = msg.text;
        if (!text) return;

        if (text === '/start') {
            await sendHomeMenu(BOT_TOKEN, chatId, u, chatId === ADMIN_ID);
            return;
        }

        // C. Lệnh Dịch Văn Bản (/dich <nội dung>)
        if (text.startsWith('/dich ')) {
            const textToTranslate = text.replace('/dich ', '');
            await sendMessage(BOT_TOKEN, chatId, '🌐 *AI đang dịch văn bản...*');

            try {
                const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                            { role: "system", content: "Bạn là một biên dịch viên chuyên nghiệp. Hãy dịch đoạn văn bản sau sang Tiếng Việt chuẩn xác nhất." },
                            { role: "user", content: textToTranslate }
                        ]
                    })
                });
                const aiData = await aiRes.json();
                const result = aiData.choices?.[0]?.message?.content || "Lỗi dịch.";
                await sendMessage(BOT_TOKEN, chatId, `📖 *Bản dịch:* \n\n${result}`);
            } catch (e) {
                await sendMessage(BOT_TOKEN, chatId, '❌ Lỗi hệ thống dịch thuật.');
            }
            return;
        }

        // D. Broadcast từ Admin (/tb <nội dung>)
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

        // E. Nhập Giftcode (/giftcode <mã>)
        if (text.startsWith('/giftcode ')) {
            const codeStr = text.split(' ')[1]?.toUpperCase();
            const codeData = memoryDb.giftcodes[codeStr];

            if (!codeData) return sendMessage(BOT_TOKEN, chatId, '❌ Mã Giftcode không tồn tại!');
            if (u.wonCodes.includes(codeStr)) return sendMessage(BOT_TOKEN, chatId, '❌ Bạn đã nhập mã này rồi!');

            u.balance += codeData.value;
            u.wonCodes.push(codeStr);
            return sendMessage(BOT_TOKEN, chatId, `🎁 *NHẬP MÃ THÀNH CÔNG!*\n💰 + \`${codeData.value.toLocaleString()} VNĐ\`\n💎 Số dư mới: \`${u.balance.toLocaleString()} VNĐ\``);
        }

        // F. Tạo đơn SMM (Link & Số lượng)
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

        // G. Trợ lý AI Chat thông minh tư vấn tự động (Mặc định khi nhắn văn bản)
        if (!text.startsWith('/')) {
            await sendMessage(BOT_TOKEN, chatId, '💭 *Trợ lý AI đang suy nghĩ...*');
            try {
                const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                            { role: "system", content: "Bạn là Trợ lý ảo thông minh của hệ thống Hendy & Hades SMM & Vietsub Pro. Hãy hỗ trợ tư vấn các dịch vụ mạng xã hội, mua code, và dịch thuật lịch sự, ngắn gọn." },
                            { role: "user", content: text }
                        ]
                    })
                });
                const aiData = await aiRes.json();
                const reply = aiData.choices?.[0]?.message?.content || "Xin chào, tôi có thể giúp gì cho bạn?";
                await sendMessage(BOT_TOKEN, chatId, `🤖 *Trợ lý AI:* \n\n${reply}`);
            } catch (e) {
                await sendMessage(BOT_TOKEN, chatId, '❌ Trợ lý AI đang bận, vui lòng thử lại sau.');
            }
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
