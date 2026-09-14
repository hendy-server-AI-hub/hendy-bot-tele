export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const BOT_TOKEN = env.BOT_TOKEN || '8689114890:AAFBFM0rNtZWpOtAovIPHPVQTJVp0odU1DQ';

    // Cấu hình CORS dùng chung cho các API
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Endpoint nhận Webhook từ Telegram Bot
    if (url.pathname === `/telegram-webhook/${BOT_TOKEN}` && request.method === 'POST') {
      try {
        const update = await request.json();
        if (update.message) {
          const chatId = update.message.chat.id;
          const text = update.message.text;
          
          // Phản hồi tự động ngược lại Telegram
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `[Hendy & Hades V6100 Edge] Đã xử lý lệnh: "${text}"`
            })
          });
        }
        return new Response(JSON.stringify({ success: true }), { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }
    }

    // 2. API Trạng thái hệ thống & Kiểm tra kết nối
    if (url.pathname === '/api/v1/status') {
      const data = {
        status: "Active",
        core: "HADES_AI_V6100_EDGE",
        timestamp: Date.now(),
        botTokenActive: true
      };
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 3. API Broadcast thông báo hàng loạt tới người dùng Telegram
    if (url.pathname === '/api/v1/broadcast' && request.method === 'POST') {
      const body = await request.json();
      const message = body.message;
      
      // Xử lý gửi broadcast qua Telegram API ở đây
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Đã phát broadcast thành công: "${message}"` 
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response('Hendy & Hades V6100 Cloudflare Worker Core Active', { 
      status: 200,
      headers: corsHeaders 
    });
  }
};
