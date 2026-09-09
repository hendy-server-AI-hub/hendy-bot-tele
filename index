<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Master Control Panel - Hendy & Hades V6100 Pro System</title>
    <style>
        body.master-body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            background-color: #f8fafc;
            display: flex;
            height: 100vh;
        }
        .sidebar {
            width: 260px;
            background: #1e293b;
            color: #fff;
            padding: 20px;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
        }
        .sidebar h2 { color: #38bdf8; font-size: 18px; border-bottom: 1px solid #334155; padding-bottom: 15px; margin-top: 0; }
        .sidebar ul { list-style: none; padding: 0; margin-top: 15px; }
        .sidebar ul li {
            padding: 10px 12px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 6px;
            color: #94a3b8;
            font-size: 14px;
        }
        .sidebar ul li:hover { background: #334155; color: #fff; }
        .sidebar ul li.active { background: #2563eb; color: #fff; font-weight: bold; }

        .main-content {
            flex: 1;
            padding: 30px;
            overflow-y: auto;
        }
        .header {
            font-size: 24px;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 20px;
        }
        .card {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            display: inline-block;
            width: 100%;
            box-sizing: border-box;
            margin-bottom: 20px;
        }
        .content-view { display: none; }
        .content-view.active { display: block; }

        .btn-open-live {
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background 0.3s ease;
        }
        .btn-open-live:hover { background: #1d4ed8; }

        /* --- CYBERPUNK THEME 7.1.5 PRO CARD --- */
        .cyber-card {
            background: #090d16 !important;
            border: 1px solid #00f3ff !important;
            box-shadow: 0 0 15px rgba(0, 243, 255, 0.2);
            color: #f1f5f9;
        }
        .cyber-card h3 {
            color: #00f3ff !important;
            text-shadow: 0 0 8px rgba(0, 243, 255, 0.4);
            font-family: 'Courier New', Courier, monospace;
        }
        .cyber-btn {
            background: linear-gradient(135deg, #00f3ff, #0072ff);
            color: #000;
            border: none;
            padding: 10px 16px;
            border-radius: 4px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        .cyber-btn:hover {
            box-shadow: 0 0 12px #00f3ff;
            filter: brightness(1.1);
        }
        .cyber-btn.secondary {
            background: linear-gradient(135deg, #ff0055, #7000ff);
            color: #fff;
        }
        .cyber-btn.secondary:hover {
            box-shadow: 0 0 12px #ff0055;
        }

        /* --- HADES V6100 HUB STYLES --- */
        .hades-panel {
            background: #050a14;
            border: 1px solid #00f3ff;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 0 20px rgba(0, 243, 255, 0.15);
            color: #fff;
            font-family: 'Segoe UI', sans-serif;
        }
        .hades-header {
            font-size: 18px;
            font-weight: 900;
            color: #00f3ff;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .hades-status-line {
            font-family: monospace;
            font-size: 12px;
            color: #a855f7;
            margin-bottom: 15px;
            display: flex;
            gap: 20px;
            align-items: center;
            flex-wrap: wrap;
        }
        .ping-badge {
            background: #0f172a;
            border: 1px solid #38bdf8;
            padding: 2px 8px;
            border-radius: 4px;
            color: #00ffcc;
            font-weight: bold;
        }
        .hades-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            flex-wrap: wrap;
            align-items: center;
        }
        .hades-btn-run { background: #00bfff; color: #000; border: none; padding: 8px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; }
        .hades-btn-stop { background: #e6005c; color: #fff; border: none; padding: 8px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; }
        .hades-btn-add { background: #00cc66; color: #000; border: none; padding: 8px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; }
        .hades-btn-clear { background: #8a2be2; color: #fff; border: none; padding: 8px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; }
        .hades-btn-export-csv { background: #f59e0b; color: #000; border: none; padding: 8px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; }
        .hades-btn-export-txt { background: #10b981; color: #000; border: none; padding: 8px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; }
        .hades-btn-run:hover, .hades-btn-stop:hover, .hades-btn-add:hover, .hades-btn-clear:hover, .hades-btn-export-csv:hover, .hades-btn-export-txt:hover { filter: brightness(1.2); }
        
        .hades-search-box {
            background: #020610;
            border: 1px solid #38bdf8;
            color: #fff;
            padding: 7px 12px;
            border-radius: 4px;
            font-size: 12px;
            outline: none;
            width: 220px;
        }

        .hades-tip {
            font-size: 12px;
            color: #facc15;
            margin-bottom: 15px;
            font-style: italic;
        }
        .hades-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 13px;
        }
        .hades-table th {
            background: #0f172a;
            color: #38bdf8;
            border: 1px solid #1e293b;
            padding: 10px;
            text-align: left;
        }
        .hades-table td {
            background: #090d16;
            border: 1px solid #1e293b;
            padding: 8px 10px;
            color: #f1f5f9;
        }
        .hades-table td[contenteditable="true"]:focus {
            outline: 1px solid #00f3ff;
            background: #0f1e36;
        }
        .btn-del-row {
            background: #ff0055;
            color: #fff;
            border: none;
            padding: 4px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: bold;
        }

        .hades-logs-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        .hades-log-box {
            background: #020610;
            border: 1px solid #101f38;
            border-radius: 6px;
            padding: 10px;
            height: 180px;
            display: flex;
            flex-direction: column;
        }
        .hades-log-title {
            font-size: 11px;
            font-weight: bold;
            color: #00f3ff;
            margin-bottom: 6px;
            text-transform: uppercase;
            border-bottom: 1px dashed #1e293b;
            padding-bottom: 4px;
        }
        .hades-log-content {
            flex: 1;
            overflow-y: auto;
            font-family: monospace;
            font-size: 11px;
            color: #00ffcc;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .hades-cmd-bar {
            display: flex;
            gap: 10px;
        }
        .hades-cmd-input {
            flex: 1;
            background: #020610;
            border: 1px solid #00f3ff;
            color: #00ffcc;
            padding: 8px 12px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            outline: none;
        }
        .hades-cmd-btn {
            background: #00f3ff;
            color: #000;
            border: none;
            padding: 8px 18px;
            border-radius: 4px;
            font-weight: bold;
            cursor: pointer;
            transition: 0.2s;
        }
        .hades-cmd-btn:hover { background: #38bdf8; box-shadow: 0 0 10px #00f3ff; }

        /* Styles cho Quản lý người dùng */
        .user-mgmt-panel {
            background: #fff;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .user-mgmt-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            flex-wrap: wrap;
            gap: 10px;
        }
        .user-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .user-table th {
            background: #f1f5f9;
            color: #334155;
            border: 1px solid #e2e8f0;
            padding: 10px;
            text-align: left;
        }
        .user-table td {
            border: 1px solid #e2e8f0;
            padding: 9px 10px;
            color: #0f172a;
        }
        .badge-role {
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
        }
        .badge-admin { background: #fee2e2; color: #dc2626; }
        .badge-mod { background: #fef3c7; color: #d97706; }
        .badge-user { background: #e0f2fe; color: #0284c7; }
        
        .badge-status {
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
        }
        .badge-active { background: #dcfce7; color: #16a34a; }
        .badge-locked { background: #f1f5f9; color: #64748b; }

        .btn-action-sm {
            padding: 4px 8px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-size: 11px;
            font-weight: bold;
            margin-right: 4px;
        }
        .btn-toggle-status { background: #f59e0b; color: #fff; }
        .btn-delete-user { background: #ef4444; color: #fff; }

        /* Modal chung */
        .modal-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.85);
            z-index: 1000;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(4px);
        }
        .modal-content {
            background-color: #0f172a;
            width: 95%;
            max-width: 1450px;
            height: 90vh;
            overflow-y: auto;
            border-radius: 12px;
            position: relative;
            padding: 40px 15px 15px 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            color: #f8fafc;
        }
        .close-btn {
            position: absolute;
            top: 15px;
            right: 20px;
            background: #ef4444;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            z-index: 1001;
        }
        .close-btn:hover { background: #dc2626; }

        /* Styles AI Assistant Panel */
        .ai-chat-box {
            background: #020610;
            border: 1px solid #a855f7;
            border-radius: 8px;
            padding: 15px;
            height: 400px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .ai-chat-history {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding-right: 5px;
        }
        .ai-msg {
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 13px;
            max-width: 80%;
            line-height: 1.4;
        }
        .ai-msg.user {
            background: #2563eb;
            color: white;
            align-self: flex-end;
        }
        .ai-msg.assistant {
            background: #1e1b4b;
            border: 1px solid #8b5cf6;
            color: #e0e7ff;
            align-self: flex-start;
        }
        .ai-quick-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 10px;
        }
        .ai-btn-chip {
            background: #0f172a;
            border: 1px solid #38bdf8;
            color: #38bdf8;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .ai-btn-chip:hover {
            background: #38bdf8;
            color: #000;
            font-weight: bold;
        }
    </style>
</head>
<body class="master-body">

    <!-- THANH MENU BÊN TRÁI -->
    <div class="sidebar">
        <h2>🛠️ Bảng Điều Khiển</h2>
        <p style="font-size: 12px; color: #94a3b8; margin: 5px 0;">Hệ thống quản lý trung tâm.</p>
        <ul>
            <li class="active" onclick="switchTab('dashboard', this)">🏠 Dashboard chính</li>
            <li onclick="switchTab('aimanager', this)">🤖 Trợ Lý AI Quản Lý</li>
            <li onclick="switchTab('hades', this)">🤖 Hades V6100 Hub</li>
            <li onclick="switchTab('users', this)">👥 Quản lý người dùng</li>
            <li onclick="switchTab('settings', this)">⚙️ Cài đặt hệ thống</li>
        </ul>
    </div>

    <!-- KHUNG NỘI DUNG CHÍNH -->
    <div class="main-content">
        
        <!-- Tab 1: Dashboard chính -->
        <div id="dashboard-view" class="content-view active">
            <div class="header">Dashboard Chính</div>
            
            <div class="card">
                <h3>Công Cụ & Tiện Ích</h3>
                <p>Sử dụng nút bên dưới để mở giao diện kiểm thử Live Stream.</p>
                <button class="btn-open-live" onclick="openTestEnv()">
                    ▶️ Mở HenDy Live Stream - Test Environment
                </button>
            </div>

            <!-- Ô TRUNG TÂM ĐIỀU KHIỂN HENDY - CYBERPUNK 7.1.5 PRO -->
            <div class="card cyber-card">
                <h3>⚡ TRUNG TÂM ĐIỀU KHIỂN HENDY - CYBERPUNK 7.1.5 PRO</h3>
                <p style="color: #9438ff; font-family: monospace; margin: 4px 0;">[SYSTEM_CORE: ONLINE] • Trạng thái mạng: <span style="color:#00ffcc; font-weight:bold;">SYNCHRONIZED</span></p>
                <p style="font-size: 13px; color: #94a3b8;">Giao thức điều khiển cấp cao dành cho môi trường giả lập trực tuyến tốc độ cao.</p>
                <div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                    <button class="cyber-btn" onclick="openProModal()">🚀 Khởi Động Giao Diện Pro</button>
                    <button class="cyber-btn secondary" onclick="showToast('Đã kích hoạt tường lửa Cyberpunk 7.1.5!')">🛡️ Kích Hoạt Khiên</button>
                </div>
            </div>
        </div>

        <!-- TAB MỚI: TRỢ LÝ AI QUẢN LÝ (AI MANAGER) -->
        <div id="aimanager-view" class="content-view">
            <div class="header">🤖 AI Manager - Trợ Lý Quản Lý Tự Động</div>
            <div class="hades-panel" style="border-color: #a855f7; box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);">
                <div class="hades-header" style="color: #c084fc;">
                    ✨ TRUNG TÂM ĐIỀU KHIỂN BẰNG AI (AI COMMAND CENTER)
                </div>
                <div class="hades-status-line">
                    <span>[AI_ENGINE: ACTIVE] • Hỗ trợ: <span style="color: #00ffcc; font-weight: bold;">Gemini / Intelligent Local Engine</span></span>
                </div>

                <div class="ai-quick-actions">
                    <button class="ai-btn-chip" onclick="sendAiQuickCommand('Chạy tất cả bot')">🚀 Chạy tất cả bot</button>
                    <button class="ai-btn-chip" onclick="sendAiQuickCommand('Dừng tất cả bot')">⏹ Dừng tất cả bot</button>
                    <button class="ai-btn-chip" onclick="sendAiQuickCommand('Thêm 3 bot mới')">➕ Thêm 3 bot mới</button>
                    <button class="ai-btn-chip" onclick="sendAiQuickCommand('Xuất báo cáo danh sách bot CSV')">📥 Xuất báo cáo CSV</button>
                    <button class="ai-btn-chip" onclick="sendAiQuickCommand('Kiểm tra sức khỏe hệ thống')">📊 Báo cáo trạng thái</button>
                    <button class="ai-btn-chip" onclick="sendAiQuickCommand('Xóa lịch sử log')">🗑️ Dọn dẹp Log</button>
                </div>

                <div class="ai-chat-box" style="margin-top: 15px;">
                    <div class="ai-chat-history" id="aiChatHistory">
                        <div class="ai-msg assistant">
                            👋 Chào bạn! Tôi là <b>AI Quản Lý Trung Tâm</b>. Bạn có thể ra lệnh bằng tiếng Việt tự nhiên (VD: "Chạy tất cả bot", "Thêm 5 bot", "Xuất file báo cáo", "Báo cáo trạng thái hệ thống").
                        </div>
                    </div>
                    <div class="hades-cmd-bar">
                        <input type="text" id="aiPromptInput" class="hades-cmd-input" style="border-color: #a855f7;" placeholder="Nhập câu lệnh cho AI Quản lý..." onkeydown="if(event.key==='Enter') sendAiCommand()" />
                        <button class="hades-cmd-btn" style="background: #a855f7; color: #fff;" onclick="sendAiCommand()">Gửi Lệnh AI</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tab HADES V6100 -->
        <div id="hades-view" class="content-view">
            <div class="header">Hades V6100 - Multi-Session Bot Hub</div>
            
            <div class="hades-panel">
                <div class="hades-header">🤖 ĐIỀU KHIỂN ĐA PHIÊN & TỰ ĐỘNG HÓA (PRO FEATURES)</div>
                <div class="hades-status-line">
                    <span>[HADES_CORE: ACTIVE] • WebSocket Hub: <span id="hadesWsStatusText" style="color: #00ffcc; font-weight: bold;">Chưa kết nối</span></span>
                    <span>⚡ Độ trễ mạng (Ping): <span class="ping-badge" id="latencyDisplay">-- ms</span></span>
                </div>

                <div class="hades-actions">
                    <button class="hades-btn-run" onclick="startAllBots()">🚀 Chạy Tất Cả</button>
                    <button class="hades-btn-stop" onclick="stopAllBots()">⏹ Dừng Lại</button>
                    <button class="hades-btn-add" onclick="addBotAccount()">➕ Thêm Bot</button>
                    <button class="hades-btn-clear" onclick="clearHadesLogs()">🗑️ Xóa Log</button>
                    <button class="hades-btn-export-csv" onclick="exportBotsToCSV()">📥 Xuất CSV</button>
                    <button class="hades-btn-export-txt" onclick="exportSystemLogsToTXT()">📥 Xuất TXT</button>
                    <div style="margin-left: auto; display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="botSearchInput" class="hades-search-box" placeholder="🔍 Tìm kiếm tài khoản / trạng thái..." oninput="filterBotTable(this)" />
                    </div>
                </div>

                <div class="hades-tip">
                    💡 Mẹo: Dữ liệu tự động lưu vào LocalStorage (F5 không mất). Dùng thanh tìm kiếm để tra cứu nhanh hàng trăm tài khoản bot.
                </div>

                <table class="hades-table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">ID</th>
                            <th>Tài khoản</th>
                            <th>Tài khoản BO</th>
                            <th style="width: 120px;">Trạng thái</th>
                            <th style="width: 80px;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="botTableBody">
                    </tbody>
                </table>

                <div class="hades-logs-grid">
                    <div class="hades-log-box">
                        <div class="hades-log-title">📜 NHẬT KÝ HỆ THỐNG (SYSTEM LOG)</div>
                        <div class="hades-log-content" id="hadesSystemLog">
                            <div><span style="color: #38bdf8;">[SYSTEM]</span> Module giám sát sẵn sàng.</div>
                        </div>
                    </div>
                    <div class="hades-log-box">
                        <div class="hades-log-title">💬 NHẬT KÝ CHAT & LỆNH TỪ XA</div>
                        <div class="hades-log-content" id="hadesChatLog">
                            <div><span style="color: #38bdf8;">[WS]</span> Chờ thiết lập kết nối WebSocket Hub...</div>
                        </div>
                    </div>
                </div>

                <div class="hades-cmd-bar">
                    <input type="text" id="hadesJsonInput" class="hades-cmd-input" placeholder='Nhập lệnh JSON gửi qua WebSocket (VD: {"action": "PING"})' onkeydown="if(event.key==='Enter') sendHadesJsonCmd()" />
                    <button class="hades-cmd-btn" onclick="sendHadesJsonCmd()">Gửi Lệnh WS</button>
                </div>
            </div>
        </div>

        <!-- Tab 2: Quản lý người dùng -->
        <div id="users-view" class="content-view">
            <div class="header">Quản Lý Người Dùng</div>
            
            <div class="user-mgmt-panel">
                <div class="user-mgmt-header">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="text" id="userSearchBox" class="hades-search-box" placeholder="🔍 Tìm kiếm thành viên..." oninput="filterUserTable(this)" style="width: 250px;" />
                    </div>
                    <button class="cyber-btn" style="padding: 8px 14px; font-size: 12px;" onclick="openAddUserModal()">➕ Thêm Tài Khoản</button>
                </div>

                <table class="user-table">
                    <thead>
                        <tr>
                            <th style="width: 60px;">ID</th>
                            <th>Tên đăng nhập / Email</th>
                            <th style="width: 130px;">Phân quyền</th>
                            <th style="width: 130px;">Trạng thái</th>
                            <th style="width: 150px;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="userTableBody">
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Tab 3: Cài đặt hệ thống -->
        <div id="settings-view" class="content-view">
            <div class="header">Cài Đặt Hệ Thống</div>
            <div class="card">
                <h3 style="margin-top:0; color:#0f172a; font-size:16px;">Cấu hình kết nối & Bảo mật nâng cao</h3>
                <div style="display: flex; flex-direction: column; gap: 14px; max-width: 600px; margin-top: 15px;">
                    <div>
                        <label style="display:block; font-size:13px; font-weight:600; margin-bottom:5px; color:#334155;">WebSocket URL:</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="settingWsUrl" value="wss://hendy-railway-server-production-b340.up.railway.app" style="flex:1; padding:9px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;" />
                            <button type="button" onclick="testWebSocketConnection()" style="background:#0284c7; color:white; border:none; padding:0 14px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;">Test Connection</button>
                        </div>
                    </div>
                    <div>
                        <label style="display:block; font-size:13px; font-weight:600; margin-bottom:5px; color:#334155;">Secret Token (Bảo mật API/WS):</label>
                        <input type="password" id="settingSecretToken" placeholder="Nhập khóa bảo mật Secret Token..." style="width:100%; padding:9px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;" />
                    </div>
                    <div>
                        <label style="display:block; font-size:13px; font-weight:600; margin-bottom:5px; color:#334155;">Nguồn Video Mặc Định (URL):</label>
                        <input type="text" id="settingVideoUrl" value="https://www.w3schools.com/html/mov_bbb.mp4" style="width:100%; padding:9px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;" />
                    </div>
                    <div>
                        <label style="display:block; font-size:13px; font-weight:600; margin-bottom:5px; color:#334155;">Tên Kênh / Phòng:</label>
                        <input type="text" id="settingChannel" value="MOCK-LIVE" style="width:100%; padding:9px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;" />
                    </div>
                    <div>
                        <label style="display:block; font-size:13px; font-weight:600; margin-bottom:5px; color:#334155;">Thời gian đồng bộ (giây):</label>
                        <input type="number" id="settingSyncInterval" value="5" style="width:100%; padding:9px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; box-sizing:border-box;" />
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="settingEnableDebug" style="width: 16px; height: 16px; cursor: pointer;" />
                        <label for="settingEnableDebug" style="font-size: 13px; font-weight: 600; color: #334155; cursor: pointer;">Bật Debug Log & Tự động kết nối lại WS (Tránh spam log nếu server tắt)</label>
                    </div>
                    <button onclick="saveSystemSettings()" style="background:#2563eb; color:white; border:none; padding:10px 18px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:13px; width:fit-content; transition:background 0.2s;">💾 Lưu Cài Đặt</button>
                </div>
            </div>
        </div>

    </div>

    <!-- MODAL THÊM NGƯỜI DÙNG MỚI -->
    <div class="modal-overlay" id="addUserModal" style="display:none; justify-content:center; align-items:center;">
        <div class="custom-modal">
            <h3>Thêm Tài Khoản Mới</h3>
            <div class="form-group">
                <label>Tên đăng nhập / Email:</label>
                <input type="text" id="newUsernameInput" placeholder="Nhập tên đăng nhập..." />
            </div>
            <div class="form-group">
                <label>Phân quyền:</label>
                <select id="newUserRoleSelect">
                    <option value="User">User</option>
                    <option value="Mod">Mod</option>
                    <option value="Admin">Admin</option>
                </select>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button type="button" onclick="closeAddUserModal()" style="background:#cbd5e1; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold;">Hủy</button>
                <button type="button" onclick="saveNewUser()" style="background:#2563eb; color:white; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold;">Xác Nhận Thêm</button>
            </div>
        </div>
    </div>

    <!-- JAVASCRIPT XỬ LÝ LOGIC -->
    <script>
        let wsSocket = null;
        let reconnectDelay = 3000;
        let isConnecting = false;
        let currentZoom = 1.0;
        let botAccountCounter = 1;
        let userAccountCounter = 1;
        let pingStartTime = 0;
        let pingIntervalTimer = null;

        // --- AI MANAGER LOGIC INTERACTION ---
        async function sendAiCommand() {
            const input = document.getElementById('aiPromptInput');
            const prompt = input.value.trim();
            if (!prompt) return;

            appendAiChatMessage(prompt, 'user');
            input.value = '';

            const botCount = document.querySelectorAll('#botTableBody tr').length;

            try {
                const response = await fetch('/api/ai/manage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: prompt,
                        context: { botCount: botCount }
                    })
                });

                const resData = await response.json();
                if (resData.success && resData.data) {
                    const aiData = resData.data;
                    appendAiChatMessage(aiData.reply, 'assistant');
                    executeAiAction(aiData.action, aiData.params);
                } else {
                    appendAiChatMessage('❌ AI Manager gặp sự cố khi xử lý câu lệnh.', 'assistant');
                }
            } catch (err) {
                console.error('Lỗi gọi API AI Manager:', err);
                // Fallback local execution
                executeLocalAiFallback(prompt);
            }
        }

        function sendAiQuickCommand(text) {
            document.getElementById('aiPromptInput').value = text;
            sendAiCommand();
        }

        function appendAiChatMessage(msg, sender) {
            const history = document.getElementById('aiChatHistory');
            const div = document.createElement('div');
            div.className = `ai-msg ${sender}`;
            div.innerHTML = msg.replace(/\n/g, '<br>');
            history.appendChild(div);
            history.scrollTop = history.scrollHeight;
        }

        function executeAiAction(action, params) {
            switch (action) {
                case 'START_ALL_BOTS':
                    startAllBots();
                    break;
                case 'STOP_ALL_BOTS':
                    stopAllBots();
                    break;
                case 'ADD_BOT':
                    const count = params?.count || 1;
                    for (let i = 0; i < count; i++) {
                        addBotAccount();
                    }
                    break;
                case 'EXPORT_CSV':
                    exportBotsToCSV();
                    break;
                case 'CLEAR_LOGS':
                    clearHadesLogs();
                    break;
                case 'SYSTEM_STATUS':
                    showToast('Đã hiển thị báo cáo trạng thái hệ thống.');
                    break;
            }
        }

        function executeLocalAiFallback(prompt) {
            const p = prompt.toLowerCase();
            if (p.includes('chạy')) {
                startAllBots();
                appendAiChatMessage('🚀 [Local AI] Đã kích hoạt chạy toàn bộ Bot.', 'assistant');
            } else if (p.includes('dừng')) {
                stopAllBots();
                appendAiChatMessage('⏹ [Local AI] Đã dừng toàn bộ Bot.', 'assistant');
            } else if (p.includes('thêm')) {
                addBotAccount();
                appendAiChatMessage('➕ [Local AI] Đã thêm 1 Bot mới.', 'assistant');
            } else if (p.includes('xuất')) {
                exportBotsToCSV();
                appendAiChatMessage('📥 [Local AI] Đã xuất tệp CSV thành công.', 'assistant');
            } else {
                appendAiChatMessage('🤖 [Local AI] Đã ghi nhận câu lệnh.', 'assistant');
            }
        }

        // --- 1. TÍNH NĂNG QUẢN LÝ NGƯỜI DÙNG ---
        function loadUsersFromLocalStorage() {
            const saved = localStorage.getItem('hendy_users_store');
            const tbody = document.getElementById('userTableBody');
            if (!tbody) return;

            if (saved) {
                try {
                    const users = JSON.parse(saved);
                    tbody.innerHTML = '';
                    if (users.length > 0) {
                        users.forEach(u => {
                            renderUserRow(u.id, u.username, u.role, u.status);
                            const pId = parseInt(u.id);
                            if (!isNaN(pId) && pId >= userAccountCounter) {
                                userAccountCounter = pId + 1;
                            }
                        });
                        return;
                    }
                } catch (e) {
                    console.error("Lỗi đọc danh sách users:", e);
                }
            }

            renderUserRow(1, "admin_hendy", "Admin", "Hoạt động");
            renderUserRow(2, "mod_hades", "Mod", "Hoạt động");
            renderUserRow(3, "test_user01", "User", "Khóa");
            userAccountCounter = 4;
            saveUsersToLocalStorage();
        }

        function saveUsersToLocalStorage() {
            const rows = document.querySelectorAll('#userTableBody tr');
            const users = [];
            rows.forEach(tr => {
                const cols = tr.querySelectorAll('td');
                if (cols.length >= 4) {
                    users.push({
                        id: cols[0].textContent.trim(),
                        username: cols[1].textContent.trim(),
                        role: cols[2].textContent.trim(),
                        status: cols[3].textContent.trim()
                    });
                }
            });
            localStorage.setItem('hendy_users_store', JSON.stringify(users));
        }

        function renderUserRow(id, username, role, status) {
            const tbody = document.getElementById('userTableBody');
            const tr = document.createElement('tr');
            
            const tdId = document.createElement('td');
            tdId.textContent = id;

            const tdName = document.createElement('td');
            tdName.textContent = username;

            const tdRole = document.createElement('td');
            const roleBadge = document.createElement('span');
            roleBadge.className = 'badge-role ' + (role === 'Admin' ? 'badge-admin' : role === 'Mod' ? 'badge-mod' : 'badge-user');
            roleBadge.textContent = role;
            tdRole.appendChild(roleBadge);

            const tdStatus = document.createElement('td');
            const statusBadge = document.createElement('span');
            statusBadge.className = 'badge-status ' + (status === 'Hoạt động' ? 'badge-active' : 'badge-locked');
            statusBadge.textContent = status;
            tdStatus.appendChild(statusBadge);

            const tdAction = document.createElement('td');
            
            const btnToggle = document.createElement('button');
            btnToggle.className = 'btn-action-sm btn-toggle-status';
            btnToggle.textContent = status === 'Hoạt động' ? 'Khóa' : 'Mở khóa';
            btnToggle.onclick = function() {
                toggleUserStatus(tr, id);
            };

            const btnDel = document.createElement('button');
            btnDel.className = 'btn-action-sm btn-delete-user';
            btnDel.textContent = 'Xóa';
            btnDel.onclick = function() {
                tr.remove();
                saveUsersToLocalStorage();
                showToast(`Đã xóa tài khoản ID: ${id}`);
            };

            tdAction.appendChild(btnToggle);
            tdAction.appendChild(btnDel);

            tr.appendChild(tdId);
            tr.appendChild(tdName);
            tr.appendChild(tdRole);
            tr.appendChild(tdStatus);
            tr.appendChild(tdAction);
            tbody.appendChild(tr);
        }

        function openAddUserModal() {
            document.getElementById('addUserModal').style.display = 'flex';
        }

        function closeAddUserModal() {
            document.getElementById('addUserModal').style.display = 'none';
            document.getElementById('newUsernameInput').value = '';
        }

        function saveNewUser() {
            const username = document.getElementById('newUsernameInput').value.trim();
            const role = document.getElementById('newUserRoleSelect').value;
            if (!username) {
                showToast('Vui lòng nhập tên đăng nhập!');
                return;
            }
            renderUserRow(userAccountCounter++, username, role, 'Hoạt động');
            saveUsersToLocalStorage();
            closeAddUserModal();
            showToast(`Thêm thành công tài khoản: ${username}`);
        }

        function toggleUserStatus(tr, id) {
            const statusTd = tr.querySelectorAll('td')[3];
            const badge = statusTd.querySelector('span');
            const btn = tr.querySelector('.btn-toggle-status');
            
            if (badge.textContent === 'Hoạt động') {
                badge.textContent = 'Khóa';
                badge.className = 'badge-status badge-locked';
                btn.textContent = 'Mở khóa';
            } else {
                badge.textContent = 'Hoạt động';
                badge.className = 'badge-status badge-active';
                btn.textContent = 'Khóa';
            }
            saveUsersToLocalStorage();
            showToast(`Đã cập nhật trạng thái tài khoản ID: ${id}`);
        }

        function filterUserTable(inputEl) {
            const query = inputEl.value.toLowerCase().trim();
            const rows = document.querySelectorAll('#userTableBody tr');
            rows.forEach(tr => {
                const text = tr.innerText.toLowerCase();
                tr.style.display = text.includes(query) ? '' : 'none';
            });
        }

        // --- 2. CÀI ĐẶT HỆ THỐNG & TEST KẾT NỐI WS ---
        function saveSystemSettings() {
            const settings = {
                wsUrl: document.getElementById('settingWsUrl').value,
                secretToken: document.getElementById('settingSecretToken').value,
                videoUrl: document.getElementById('settingVideoUrl').value,
                channel: document.getElementById('settingChannel').value,
                syncInterval: document.getElementById('settingSyncInterval').value,
                enableDebug: document.getElementById('settingEnableDebug').checked
            };
            localStorage.setItem('hendy_system_settings', JSON.stringify(settings));
            
            document.getElementById('wsServerUrl').value = settings.wsUrl;
            showToast('Đã lưu cài đặt hệ thống vào localStorage thành công!');
        }

        function loadSystemSettings() {
            const saved = localStorage.getItem('hendy_system_settings');
            if (saved) {
                try {
                    const s = JSON.parse(saved);
                    if (s.wsUrl) document.getElementById('settingWsUrl').value = s.wsUrl;
                    if (s.secretToken) document.getElementById('settingSecretToken').value = s.secretToken;
                    if (s.videoUrl) document.getElementById('settingVideoUrl').value = s.videoUrl;
                    if (s.channel) document.getElementById('settingChannel').value = s.channel;
                    if (s.syncInterval) document.getElementById('settingSyncInterval').value = s.syncInterval;
                    if (typeof s.enableDebug === 'boolean') {
                        document.getElementById('settingEnableDebug').checked = s.enableDebug;
                    }
                    if (s.wsUrl) document.getElementById('wsServerUrl').value = s.wsUrl;
                } catch (e) {
                    console.error("Lỗi tải cài đặt hệ thống:", e);
                }
            }
        }

        function testWebSocketConnection() {
            const url = document.getElementById('settingWsUrl').value.trim();
            if (!url) {
                showToast('Vui lòng nhập WebSocket URL!');
                return;
            }
            showToast('Đang kiểm tra kết nối WebSocket...');
            try {
                const testSocket = new WebSocket(url);
                const timer = setTimeout(() => {
                    if (testSocket.readyState !== WebSocket.OPEN) {
                        testSocket.close();
                        showToast('Kết nối thất bại hoặc quá thời gian phản hồi!');
                    }
                }, 4000);

                testSocket.onopen = function() {
                    clearTimeout(timer);
                    testSocket.close();
                    showToast('✅ Test Connection Thành Công! Server phản hồi tốt.');
                };

                testSocket.onerror = function() {
                    clearTimeout(timer);
                    showToast('❌ Không thể kết nối tới server.');
                };
            } catch (err) {
                showToast('❌ Lỗi cú pháp URL WebSocket!');
            }
        }

        // --- 3. GIÁM SÁT PING & TRẠNG THÁI MẠNG ---
        function startPingMonitor() {
            if (pingIntervalTimer) clearInterval(pingIntervalTimer);
            pingIntervalTimer = setInterval(() => {
                if (wsSocket && wsSocket.readyState === WebSocket.OPEN) {
                    pingStartTime = Date.now();
                    try {
                        wsSocket.send(JSON.stringify({ action: "PING", time: pingStartTime }));
                    } catch (e) {
                        document.getElementById('latencyDisplay').textContent = "Lỗi kết nối";
                    }
                } else {
                    document.getElementById('latencyDisplay').textContent = "-- ms";
                }
            }, 5000);
        }

        function handlePingPongResponse(data) {
            if (data && (data.action === "PONG" || data.time)) {
                const latency = Date.now() - (data.time || pingStartTime);
                const latDisplay = document.getElementById('latencyDisplay');
                if (latDisplay) {
                    latDisplay.textContent = latency + " ms";
                    latDisplay.style.color = latency < 100 ? "#00ffcc" : latency < 300 ? "#facc15" : "#ff3366";
                }
            }
        }

        // --- 4. XUẤT DỮ LIỆU BÁO CÁO (CSV & TXT) ---
        function exportBotsToCSV() {
            const rows = document.querySelectorAll('#botTableBody tr');
            if (rows.length === 0) {
                showToast('Không có dữ liệu bot để xuất!');
                return;
            }
            let csvContent = "data:text/csv;charset=utf-8,ID,TaiKhoan,TaiKhoanBO,TrangThai\r\n";
            rows.forEach(tr => {
                const cols = tr.querySelectorAll('td');
                if (cols.length >= 4) {
                    csvContent += `${cols[0].textContent.trim()},"${cols[1].textContent.trim()}","${cols[2].textContent.trim()}","${cols[3].textContent.trim()}"\r\n`;
                }
            });
            const link = document.createElement("a");
            link.setAttribute("href", encodeURI(csvContent));
            link.setAttribute("download", `Hades_Bots_Report_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Đã xuất file báo cáo CSV thành công!');
        }

        function exportSystemLogsToTXT() {
            const sysLogBox = document.getElementById('hadesSystemLog');
            const chatLogBox = document.getElementById('hadesChatLog');
            let textData = "=== HENDY & HADES V6100 SYSTEM LOGS ===\r\n\r\n[SYSTEM LOGS]:\r\n" + (sysLogBox ? sysLogBox.innerText : "") + "\r\n\r\n[CHAT LOGS]:\r\n" + (chatLogBox ? chatLogBox.innerText : "");
            
            const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Hades_System_Logs_${Date.now()}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('Đã xuất nhật ký hệ thống sang file TXT thành công!');
        }

        // --- 5. BỘ LỌC BOT & LOCALSTORAGE ---
        function filterBotTable(inputEl) {
            const filterVal = inputEl.value.toLowerCase().trim();
            const rows = document.querySelectorAll('#botTableBody tr');
            rows.forEach(tr => {
                tr.style.display = tr.innerText.toLowerCase().includes(filterVal) ? '' : 'none';
            });
        }

        function saveBotsToLocalStorage() {
            const rows = document.querySelectorAll('#botTableBody tr');
            const botsData = [];
            rows.forEach(tr => {
                const cols = tr.querySelectorAll('td');
                if (cols.length >= 4) {
                    botsData.push({
                        id: cols[0].textContent.trim(),
                        account: cols[1].textContent.trim(),
                        boAccount: cols[2].textContent.trim(),
                        status: cols[3].innerHTML.trim()
                    });
                }
            });
            localStorage.setItem('hades_bots_store', JSON.stringify(botsData));
        }

        function loadBotsFromLocalStorage() {
            const saved = localStorage.getItem('hades_bots_store');
            const tbody = document.getElementById('botTableBody');
            if (!tbody) return;

            if (saved) {
                try {
                    const botsData = JSON.parse(saved);
                    tbody.innerHTML = '';
                    if (botsData.length > 0) {
                        botsData.forEach(bot => {
                            renderBotRow(bot.id, bot.account, bot.boAccount, bot.status);
                            const parsedId = parseInt(bot.id);
                            if (!isNaN(parsedId) && parsedId >= botAccountCounter) {
                                botAccountCounter = parsedId + 1;
                            }
                        });
                        return;
                    }
                } catch (e) {
                    console.error("Lỗi tải LocalStorage bot:", e);
                }
            }
            renderBotRow(1, "yg45g", "yg45g", '<span style="color: #00ffcc; font-weight: bold;">Sẵn sàng</span>');
        }

        function renderBotRow(id, account, boAccount, statusHtml) {
            const tbody = document.getElementById('botTableBody');
            const tr = document.createElement('tr');
            
            const tdId = document.createElement('td');
            tdId.textContent = id;
            
            const tdAcc = document.createElement('td');
            tdAcc.contentEditable = "true";
            tdAcc.textContent = account;
            tdAcc.onblur = function() { saveBotsToLocalStorage(); };

            const tdBo = document.createElement('td');
            tdBo.contentEditable = "true";
            tdBo.textContent = boAccount;
            tdBo.onblur = function() { saveBotsToLocalStorage(); };

            const tdStatus = document.createElement('td');
            tdStatus.innerHTML = statusHtml;

            const tdAction = document.createElement('td');
            const btnDel = document.createElement('button');
            btnDel.className = 'btn-del-row';
            btnDel.textContent = 'Xóa';
            btnDel.onclick = function() { 
                tr.remove(); 
                saveBotsToLocalStorage();
            };
            tdAction.appendChild(btnDel);

            tr.appendChild(tdId);
            tr.appendChild(tdAcc);
            tr.appendChild(tdBo);
            tr.appendChild(tdStatus);
            tr.appendChild(tdAction);
            tbody.appendChild(tr);
        }

        function switchTab(tabId, el) {
            document.querySelectorAll('.sidebar ul li').forEach(li => li.classList.remove('active'));
            document.querySelectorAll('.content-view').forEach(view => view.classList.remove('active'));
            el.classList.add('active');
            const target = document.getElementById(tabId + '-view');
            if (target) target.classList.add('active');
        }

        function getHadesTime() {
            const d = new Date();
            return `[${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}]`;
        }

        function appendHadesSystemLog(msg) {
            const logBox = document.getElementById('hadesSystemLog');
            if (!logBox) return;
            const div = document.createElement('div');
            div.innerHTML = `<span style="color: #38bdf8;">${getHadesTime()}</span> ${msg}`;
            logBox.appendChild(div);
            logBox.scrollTop = logBox.scrollHeight;
        }

        function startAllBots() {
            document.querySelectorAll('#botTableBody tr').forEach(r => {
                const s = r.children[3];
                if (s) s.innerHTML = '<span style="color:#00e5ff; font-weight:bold;">Đang chạy</span>';
            });
            saveBotsToLocalStorage();
            appendHadesSystemLog('[BOT] Tất cả bot đã được kích hoạt chạy tự động!');
        }

        function stopAllBots() {
            document.querySelectorAll('#botTableBody tr').forEach(r => {
                const s = r.children[3];
                if (s) s.innerHTML = '<span style="color:#ff3366; font-weight:bold;">Đã dừng</span>';
            });
            saveBotsToLocalStorage();
            appendHadesSystemLog('[BOT] Đã phát lệnh dừng tất cả các bot!');
        }

        function addBotAccount(customName = null) {
            botAccountCounter++;
            const newAccName = customName || ('yg45g_' + Math.random().toString(36).substr(2, 4));
            renderBotRow(botAccountCounter, newAccName, newAccName, '<span style="color: #00ffcc; font-weight: bold;">Đang chạy</span>');
            saveBotsToLocalStorage();
            appendHadesSystemLog(`[BOT] Đã thêm tài khoản mới thành công: ${newAccName}`);
        }

        function clearHadesLogs() {
            document.getElementById('hadesSystemLog').innerHTML = '';
            const chatLog = document.getElementById('hadesChatLog');
            if(chatLog) chatLog.innerHTML = '';
            appendHadesSystemLog('[SYSTEM] Nhật ký đã được dọn dẹp.');
        }

        function showToast(msg) {
            alert(msg);
        }

        // Init App
        window.addEventListener('DOMContentLoaded', () => {
            loadSystemSettings();
            loadBotsFromLocalStorage();
            loadUsersFromLocalStorage();
        });
    </script>
</body>
</html>
