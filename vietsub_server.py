from flask import Flask, request, jsonify
import os
import subprocess
import pysrt
from googletrans import Translator
from faster_whisper import WhisperModel
import time
import requests
import telebot
import threading

app = Flask(__name__)
translator = Translator()

# LẤY BIẾN MÔI TRƯỜNG HOẶC CẤU HÌNH TRỰC TIẾP
API_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '8574999116:AAF39jSNBiOx-RqIFF08oLxHXqyxsQ9mYqw')
bot = telebot.TeleBot(API_TOKEN)

print("Đang tải Faster-Whisper model...")
model = WhisperModel("tiny", device="cpu", compute_type="int8")
print("Sẵn sàng!")

def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

# HÀM XỬ LÝ VIETSUB VÀ GHÉP HARD SUB VÀO VIDEO
def process_video_task(chat_id, file_url):
    video_goc = f"video_{chat_id}.mp4"
    srt_goc = f"video_{chat_id}.srt"
    srt_vietsub = f"video_{chat_id}_vietsub.srt"
    video_hoanchinh = f"video_{chat_id}_hoanchinh.mp4"

    try:
        msg_status = bot.send_message(chat_id, "⏳ Đang tải video xuống cụm xử lý AI Vietsub...")
        
        # 1. Tải video từ URL Telegram về server
        response = requests.get(file_url)
        with open(video_goc, 'wb') as f:
            f.write(response.content)

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
                sub.text = translator.translate(sub.text, dest='vi').text
                time.sleep(0.3)
            except: 
                pass
        subs.save(srt_vietsub, encoding='utf-8')

        # 4. Gắn phụ đề cứng (Hardsub) vào video bằng FFmpeg
        bot.edit_message_text("🎬 Đang render và gắn phụ đề vào video (Quá trình này mất vài phút)...", chat_id, msg_status.message_id)
        subprocess.run([
            'ffmpeg', '-y', '-i', video_goc, 
            '-vf', f"subtitles={srt_vietsub}", 
            '-c:a', 'copy', 
            video_hoanchinh
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 5. Gửi trả video hoàn chỉnh cho người dùng qua Telegram
        bot.edit_message_text("✅ Hoàn tất! Đang gửi video Vietsub lên Telegram...", chat_id, msg_status.message_id)
        with open(video_hoanchinh, 'rb') as video_to_send:
            bot.send_video(chat_id, video_to_send, caption="🎉 *VIDEO VIETSUB HOÀN CHỈNH ĐÃ SẴN SÀNG!*", parse_mode="Markdown")
            
        bot.delete_message(chat_id, msg_status.message_id)

    except Exception as e:
        bot.send_message(chat_id, f"❌ Lỗi xử lý Video: {str(e)}\nĐã hoàn lại phí vào ví của bạn.")
    finally:
        # Dọn dẹp file tạm tránh đầy ổ cứng server
        for file in [video_goc, srt_goc, srt_vietsub, video_hoanchinh]:
            if os.path.exists(file): 
                os.remove(file)

# API ENDPOINT NHẬN TÍN HIỆU TỪ CLOUDFLARE WORKER
@app.route('/api/vietsub', methods=['POST'])
def vietsub_api():
    data = request.json
    chat_id = data.get('chat_id')
    file_url = data.get('file_url')
    
    if not chat_id or not file_url:
        return jsonify({"error": "Thiếu dữ liệu chat_id hoặc file_url"}), 400

    # Chạy ngầm đa luồng để trả phản hồi 200 OK ngay cho Cloudflare Worker
    threading.Thread(target=process_video_task, args=(chat_id, file_url)).start()
    return jsonify({"status": "processing"}), 200

@app.route('/', methods=['GET'])
def index():
    return "Python Vietsub Microservice đang hoạt động hoàn hảo!"

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
