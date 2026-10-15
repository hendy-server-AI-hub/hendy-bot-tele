export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 1. Endpoint nhận Webhook từ Telegram
        if (request.method === 'POST' && url.pathname === '/telegram-webhook') {
            try {
                const update = await request.json();
                await handleTelegramUpdate(update, env);
                return new Response('OK', { status: 200 });
            } catch (err) {
                return new Response(err.message, { status: 500 });
            }
        }

        return new Response('Server Hendy & Hades V6100 running on Cloudflare Workers', { status: 200 });
    }
};

async function handleTelegramUpdate(update, env) {
    if (!update.message) return;
    const msg = update.message;
    const chatId = msg.chat.id.toString();
    const text = msg.text;

    const sendMessage = async (content) => {
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: content,
                parse_mode: 'Markdown'
            })
        });
    };

    if (text === '/start') {
        await sendMessage(`🤖 *HỆ THỐNG DỊCH VỤ PRO ON CLOUDFLARE*\nChào mừng bạn!`);
    }
}
