import os
import subprocess
import pysrt
import time
import requests
import telebot
import threading
from flask import Flask, request, jsonify
from googletrans import Translator
from faster_whisper import WhisperModel

app = Flask(__name__)
translator = Translator()

# ==========================================
# ⚙️ CẤU HÌNH BOT & MÔI TRƯỜNG
# ==========================================
API_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '8574999116:AAF39jSNBiOx-RqIFF08oLxHXqyxsQ9mYqw')
bot = telebot.TeleBot(API_TOKEN)

# ==========================================
# 🧠 TẢI MODEL AI (FASTER-WHISPER)
# ==========================================
print("⏳ Đang tải Faster-Whisper model...")
model = WhisperModel("tiny", device="cpu", compute_type="int8")
print("✅ Hệ thống AI Vietsub đã sẵn sàng!")

def format_time(seconds):
    """Hàm định dạng thời gian giây sang định dạng chuẩn của file SRT (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

# ==========================================
# 🎬 LÕI XỬ LÝ VIETSUB & RENDER VIDEO
# ==========================================
def process_video_task(chat_id, file_url):
    video_goc = f"video_{chat_id}.mp4"
    srt_goc = f"video_{chat_id}.srt"
    srt_vietsub = f"video_{chat_id}_vietsub.srt"
    video_hoanchinh = f"video_{chat_id}_hoanchinh.mp4"

    try:
        msg_status = bot.send_message(chat_id, "⏳ Đang tải video xuống cụm xử lý AI Vietsub...")
        
        # 1. Tải video từ URL (Telegram hoặc bên ngoài) về server
        response = requests.get(file_url, stream=True)
        with open(video_goc, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk: f.write(chunk)

        # 2. Tạo phụ đề gốc bằng Faster-Whisper
        bot.edit_message_text("🤖 AI đang nghe và bóc tách âm thanh tốc độ cao...", chat_id, msg_status.message_id)
        segments, info = model.transcribe(video_goc, beam_size=1)
        
        with open(srt_goc, "w", encoding="utf-8") as f:
            for i, segment in enumerate(segments):
                f.write(f"{i+1}\n{format_time(segment.start)} --> {format_time(segment.end)}\n{segment.text.strip()}\n\n")

        # 3. Dịch sang tiếng Việt tự động
        bot.edit_message_text("🇻🇳 Đang dịch phụ đề sang tiếng Việt chuẩn xác...", chat_id, msg_status.message_id)
        subs = pysrt.open(srt_goc)
        for sub in subs:
            try:
                # Dịch văn bản sang tiếng Việt
                sub.text = translator.translate(sub.text, dest='vi').text
                time.sleep(0.2) # Tránh bị Google chặn IP vì request quá nhanh
            except Exception as e:
                pass # Nếu lỗi dịch thuật, giữ nguyên bản gốc
        subs.save(srt_vietsub, encoding='utf-8')

        # 4. Gắn phụ đề cứng (Hardsub) vào video bằng FFmpeg có TRANG TRÍ CHỮ
        bot.edit_message_text("🎬 Đang render và gắn phụ đề vào video (Quá trình này mất vài phút)...", chat_id, msg_status.message_id)
        
        # Cấu hình chữ: Màu vàng (&H00FFFF), Viền đen dày, Font Arial/cỡ 22, Bôi đậm
        style = "FontName=Arial,FontSize=22,PrimaryColour=&H00FFFF,OutlineColour=&H000000,BorderStyle=1,Outline=2,Bold=1"
        
        subprocess.run([
            'ffmpeg', '-y', '-i', video_goc, 
            '-vf', f"subtitles={srt_vietsub}:force_style='{style}'", 
            '-c:a', 'copy', 
            video_hoanchinh
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 5. Gửi trả kết quả cho người dùng qua Telegram
        bot.edit_message_text("✅ Hoàn tất! Đang gửi video & phụ đề lên Telegram...", chat_id, msg_status.message_id)
        
        # Gửi file video đã gắn sub
        with open(video_hoanchinh, 'rb') as video_to_send:
            bot.send_video(chat_id, video_to_send, caption="🎉 *VIDEO VIETSUB HOÀN CHỈNH ĐÃ SẴN SÀNG!*", parse_mode="Markdown")
        
        # Gửi file phụ đề SRT rời
        with open(srt_vietsub, 'rb') as srt_to_send:
            bot.send_document(chat_id, srt_to_send, caption="📄 *File phụ đề (.srt) dành cho bạn.*", parse_mode="Markdown")
            
        bot.delete_message(chat_id, msg_status.message_id)

    except Exception as e:
        bot.send_message(chat_id, f"❌ Lỗi xử lý Video: {str(e)}\nĐã hoàn lại phí vào ví của bạn (nếu có).")
    finally:
        # Dọn dẹp file tạm để server không bị đầy dung lượng
        for file in [video_goc, srt_goc, srt_vietsub, video_hoanchinh]:
            if os.path.exists(file): 
                os.remove(file)

# ==========================================
# 📩 NHẬN VIDEO TRỰC TIẾP QUA CHAT TELEGRAM
# ==========================================
@bot.message_handler(commands=['start'])
def send_welcome(message):
    bot.reply_to(message, "👋 Xin chào! Hãy gửi trực tiếp 1 đoạn Video (hoặc file .mp4) cho mình, hệ thống sẽ tự động Vietsub cho bạn nhé!")

@bot.message_handler(content_types=['video', 'document'])
def handle_direct_video(message):
    chat_id = message.chat.id
    try:
        # Lấy thông tin file id dựa trên loại tin nhắn người dùng gửi
        file_id = message.video.file_id if message.content_type == 'video' else message.document.file_id
        file_info = bot.get_file(file_id)
        
        # Telegram API giới hạn Bot tải xuống tối đa 20MB bằng phương thức get_file
        if file_info.file_size and file_info.file_size > 20 * 1024 * 1024:
            bot.reply_to(message, "❌ Video quá nặng! Telegram chỉ cho phép Bot tải trực tiếp video dưới 20MB. Vui lòng gửi video nhẹ hơn hoặc dùng qua nền tảng Cloudflare.")
            return

        # Tạo đường dẫn tải file trực tiếp từ Telegram API
        file_url = f"https://api.telegram.org/file/bot{API_TOKEN}/{file_info.file_path}"
        bot.reply_to(message, "📥 Đã tiếp nhận video của bạn. Đang đưa vào hàng đợi xử lý nền...")
        
        # Đưa vào luồng xử lý riêng biệt để không chặn các tin nhắn khác
        threading.Thread(target=process_video_task, args=(chat_id, file_url)).start()

    except Exception as e:
        bot.reply_to(message, f"❌ Lỗi khi tải video từ Telegram: {str(e)}")

# Khởi chạy Polling lắng nghe Telegram liên tục (chạy trên thread riêng)
def run_telegram_bot():
    print("🎧 Bot Telegram đang lắng nghe tin nhắn...")
    bot.infinity_polling(timeout=10, long_polling_timeout=5)

threading.Thread(target=run_telegram_bot, daemon=True).start()

# ==========================================
# 🌐 API ENDPOINTS (Dành cho Web / Cloudflare Worker)
# ==========================================
@app.route('/api/vietsub', methods=['POST'])
def vietsub_api():
    data = request.json
    chat_id = data.get('chat_id')
    file_url = data.get('file_url')
    
    if not chat_id or not file_url:
        return jsonify({"error": "Thiếu dữ liệu chat_id hoặc file_url"}), 400

    # Chạy ngầm đa luồng để trả phản hồi 200 OK ngay lập tức cho Cloudflare Worker
    threading.Thread(target=process_video_task, args=(chat_id, file_url)).start()
    return jsonify({"status": "processing", "message": "Đã đưa vào hàng chờ Vietsub"}), 200

@app.route('/', methods=['GET'])
def index():
    return "🚀 Python Vietsub Microservice đang hoạt động hoàn hảo! (Tích hợp Bot Telegram & API)"

if __name__ == '__main__':
    # Khởi chạy server Flask
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
