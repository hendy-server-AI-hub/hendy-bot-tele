import logging
import asyncio
import aiosqlite
import aiohttp # Thêm thư viện gọi API
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ApplicationBuilder, CallbackQueryHandler, CommandHandler, MessageHandler, filters, ContextTypes

# Thiết lập log
logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)

user_states = {}
BRANDS = ['SC88', 'C168', 'QQ88 THỨ SÁU', 'F8BET', 'KJC']
BOT1_TOKEN = "YOUR_BOT_TOKEN_HERE" 

# ⚠️ THAY BẰNG DOMAIN RAILWAY CỦA BẠN
NODEJS_API_URL = "https://ecosystem-api-production.up.railway.app/api/orders"

# ================= DATABASE (TỐI ƯU ASYNC) =================
# [Giữ nguyên phần DB như code cũ của bạn...]
async def init_db():
    async with aiosqlite.connect('system.db') as db:
        await db.execute('''CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, balance INTEGER DEFAULT 50000)''')
        await db.execute('''CREATE TABLE IF NOT EXISTS linked_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, brand TEXT, account_name TEXT)''')
        await db.commit()

async def get_or_create_user(user_id, name):
    async with aiosqlite.connect('system.db') as db:
        async with db.execute("SELECT balance FROM users WHERE id = ?", (user_id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                return row[0]
            else:
                await db.execute("INSERT INTO users (id, name, balance) VALUES (?, ?, 50000)", (user_id, name))
                await db.commit()
                return 50000

async def get_linked_accounts(user_id):
    async with aiosqlite.connect('system.db') as db:
        async with db.execute("SELECT brand, account_name FROM linked_accounts WHERE user_id = ?", (user_id,)) as cursor:
            rows = await cursor.fetchall()
    accounts = {brand: [] for brand in BRANDS}
    for brand, acc_name in rows:
        if brand in accounts: accounts[brand].append(acc_name)
    return accounts

async def add_linked_account(user_id, brand, account_name):
    async with aiosqlite.connect('system.db') as db:
        await db.execute("INSERT INTO linked_accounts (user_id, brand, account_name) VALUES (?, ?, ?)", (user_id, brand, account_name))
        await db.commit()

async def update_balance(user_id, amount):
    async with aiosqlite.connect('system.db') as db:
        await db.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (amount, user_id))
        await db.commit()

# ================= GIAO DIỆN & XỬ LÝ CHÍNH =================
# [Giữ nguyên các hàm send_home_menu, start, button_handler như code cũ của bạn...]

# ... (Vui lòng chèn lại phần send_home_menu, start, button_handler của bạn vào đây để tránh file quá dài) ...

# ================= XỬ LÝ TIN NHẮN (ĐỒNG BỘ API NODE.JS) =================
async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_user.id)
    text = update.message.text.strip()
    
    if chat_id not in user_states:
        return

    # Xử lý nhập tên liên kết tài khoản
    if user_states[chat_id]['action'] == 'waiting_link_account':
        brand = user_states[chat_id]['brand']
        await add_linked_account(chat_id, brand, text)
        del user_states[chat_id]
        await update.message.reply_text(f"✅ Đã liên kết `{text}` với *{brand}*!\n👉 Nhấn /start để về menu chính.", parse_mode="Markdown")

    # Xử lý nhập link tăng mắt Live & BẮN API SANG NODE.JS
    elif user_states[chat_id]['action'] == 'waiting_live_link':
        platform = user_states[chat_id]['platform']
        link = text
        price = 10000 if platform == "TikTok" else 15000
        
        balance = await get_or_create_user(chat_id, update.effective_user.first_name)
        
        if balance >= price:
            await update_balance(chat_id, -price) # Trừ tiền
            del user_states[chat_id]
            
            # --- ĐỒNG BỘ VỚI BACKEND NODE.JS ---
            order_payload = {
                "serviceType": f"buff_live_{platform.lower()}",
                "target": link,
                "quantity": 1000 # Mặc định 1k mắt
            }
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(NODEJS_API_URL, json=order_payload) as response:
                        api_result = await response.json()
                        logging.info(f"API Node.js Response: {api_result}")
            except Exception as e:
                logging.error(f"Lỗi khi gọi API Node.js: {e}")
            # ------------------------------------

            success_msg = (
                "✅ **TIẾN TRÌNH THÀNH CÔNG!**\n\n"
                f"📺 Nền tảng: *{platform}*\n"
                f"🔗 Link: {link}\n"
                f"💸 Đã thanh toán: `-{price:,} VNĐ`\n\n"
                "_Mắt sẽ bắt đầu tăng dần trong 1 - 5 phút tới._\n"
                "👉 Nhấn /start để về menu chính."
            )
            await update.message.reply_text(success_msg, parse_mode="Markdown")
        else:
            del user_states[chat_id]
            await update.message.reply_text("❌ **SỐ DƯ KHÔNG ĐỦ!**\nVui lòng nạp thêm tiền để sử dụng dịch vụ.\n👉 Nhấn /start để về menu chính.", parse_mode="Markdown")

# ================= HÀM MAIN =================
def main():
    loop = asyncio.get_event_loop()
    loop.run_until_complete(init_db())
    
    app = ApplicationBuilder().token(BOT1_TOKEN).build()
    
    # ... (Khai báo handler như cũ) ...
    
    print("🤖 Bot Python đang chạy và đã đồng bộ API...")
    app.run_polling()

if __name__ == "__main__":
    main()
