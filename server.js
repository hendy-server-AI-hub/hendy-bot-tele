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

# LẤY BIẾN MÔI TRƯỜNG
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

# HÀM XỬ LÝ VIETSUB CHẠY NGẦM
def process_video_task(chat_id, file_url):
    video_goc = f"video_{chat_id}.mp4"
    srt_goc = f"video_{chat_id}.srt"
    srt_vietsub = f"video_{chat_id}_vietsub.srt"
    video_hoanchinh = f"video_{chat_id}_hoanchinh.mp4"

    try:
        msg_status = bot.send_message(chat_id, "⏳ Đang tải video của bạn xuống Server Vệ Tinh...")
        
        # 1. Tải file từ Cloudflare truyền sang
        response = requests.get(file_url)
        with open(video_goc, 'wb') as f:
            f.write(response.content)

        # 2. Tạo phụ đề gốc
        bot.edit_message_text("🤖 AI đang nghe và bóc tách lời thoại...", chat_id, msg_status.message_id)
        segments, info = model.transcribe(video_goc, beam_size=1)
        
        with open(srt_goc, "w", encoding="utf-8") as f:
            for i, segment in enumerate(segments):
                f.write(f"{i+1}\n{format_time(segment.start)} --> {format_time(segment.end)}\n{segment.text.strip()}\n\n")

        # 3. Dịch sang tiếng Việt
        bot.edit_message_text("🇻🇳 Đang dịch phụ đề sang tiếng Việt...", chat_id, msg_status.message_id)
        subs = pysrt.open(srt_goc)
        for sub in subs:
            try:
                sub.text = translator.translate(sub.text, dest='vi').text
                time.sleep(0.3)
            except: pass
        subs.save(srt_vietsub, encoding='utf-8')

        # 4. Hardsub bằng FFmpeg
        bot.edit_message_text("🎬 Đang gắn phụ đề cứng vào video (Vui lòng chờ)...", chat_id, msg_status.message_id)
        subprocess.run(['ffmpeg', '-y', '-i', video_goc, '-vf', f"subtitles={srt_vietsub}", '-c:a', 'copy', video_hoanchinh], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 5. Gửi trả khách hàng
        bot.edit_message_text("✅ Hoàn tất! Đang tải video lên Telegram...", chat_id, msg_status.message_id)
        with open(video_hoanchinh, 'rb') as video_to_send:
            bot.send_video(chat_id, video_to_send, caption="🎉 *VIDEO VIETSUB CỦA BẠN ĐÂY!*", parse_mode="Markdown")
        bot.delete_message(chat_id, msg_status.message_id)

    except Exception as e:
        bot.send_message(chat_id, f"❌ Lỗi xử lý Video: {str(e)}\nVui lòng liên hệ Admin để hoàn tiền.")
    finally:
        for file in [video_goc, srt_goc, srt_vietsub, video_hoanchinh]:
            if os.path.exists(file): os.remove(file)

# API ENDPOINT ĐỂ CLOUDFLARE GỌI SANG
@app.route('/api/vietsub', methods=['POST'])
def vietsub_api():
    data = request.json
    chat_id = data.get('chat_id')
    file_url = data.get('file_url')
    
    if not chat_id or not file_url:
        return jsonify({"error": "Thiếu dữ liệu"}), 400

    # Khởi chạy luồng chạy ngầm để trả kết quả 200 OK ngay lập tức cho Cloudflare
    threading.Thread(target=process_video_task, args=(chat_id, file_url)).start()
    return jsonify({"status": "processing"}), 200

@app.route('/', methods=['GET'])
def index():
    return "Python Vietsub Microservice đang hoạt động!"

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
