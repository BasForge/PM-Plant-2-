import http.server
import socketserver
import os
import socket
import sys
import json
import urllib.request
import urllib.parse

# PORT ที่ต้องการใช้งานจำลอง (เปลี่ยนเป็นพอร์ตอื่นได้ เช่น 80, 8080, 8000)
PORT = 8000
# ชี้เป้าไปที่โฟลเดอร์ 'dist' ที่ได้จากการคอมไพล์ React
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

class SPARequestHandler(http.server.SimpleHTTPRequestHandler):
    """
    Custom HTTP Request Handler เพื่อรองรับ Single Page Application (SPA) และ API endpoints
    สำหรับการบันทึกข้อมูลส่วนกลาง (db.json) และแจ้งเตือน LINE Notify ในวง LAN ร่วมกัน
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        clean_path = self.path.split('?')[0].split('#')[0]
        
        # 🟢 ดึงข้อมูลฐานข้อมูลส่วนกลางจากเครื่อง Server
        if clean_path == "/api/db":
            db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "db.json")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            
            if os.path.exists(db_path):
                with open(db_path, "r", encoding="utf-8") as f:
                    self.wfile.write(f.read().encode("utf-8"))
            else:
                self.wfile.write(b"{}")
            return

        # แปลงเป็นที่อยู่ไฟล์บนโฟลเดอร์เครื่องจริง
        local_path = os.path.join(DIRECTORY, clean_path.lstrip('/'))
        
        # หากมองหาไม่เจอในโฟลเดอร์ dist (เช่น URL เส้นทางเมนูย่อยของแอป) ให้ fallback กลับไปที่ index.html
        if not os.path.exists(local_path):
            self.path = '/index.html'
            
        return super().do_GET()

    def do_POST(self):
        clean_path = self.path.split('?')[0].split('#')[0]
        
        # 🔵 บันทึกข้อมูลส่วนกลางจากอุปกรณ์ลูกข่ายลงในไฟล์ db.json
        if clean_path == "/api/db":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                # ตรวจเช็คความถูกต้องของ JSON และบันทึกข้อมูล
                data = json.loads(post_data.decode('utf-8'))
                db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "db.json")
                with open(db_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Database saved successfully."}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "message": str(e)}).encode('utf-8'))
            return

        # 🟡 ส่งข้อความ LINE Notify (Proxy)
        if clean_path == "/api/line-notify":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                payload = json.loads(post_data.decode('utf-8'))
                message = payload.get("message", "")
                token = payload.get("token", "")
                
                if not token:
                    token = os.environ.get("LINE_NOTIFY_TOKEN", "")
                    
                if not token:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "message": "LINE Notify Token not set."}).encode('utf-8'))
                    return
                
                # ส่ง HTTP Request ไปยังเซิร์ฟเวอร์ LINE Notify จริง
                url = "https://notify-api.line.me/api/notify"
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/x-www-form-urlencoded"
                }
                req_data = urllib.parse.urlencode({"message": message}).encode('utf-8')
                req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
                
                with urllib.request.urlopen(req) as response:
                    res_body = response.read().decode('utf-8')
                    res_json = json.loads(res_body)
                    
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "data": res_json}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "message": str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

def get_local_ip():
    """ดึงข้อมูล IP Address ภายในเครือข่าย LAN ของเครื่องคอมพิวเตอร์ปัจจุบัน"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # เชื่อมต่อ Dummy IP (DNS Google) เพื่อดึง Local Interface IP ที่แท้จริงออกมา
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        # หากดึงไม่ได้หรือไม่มีเน็ตเวิร์กการ์ดต่ออยู่ ให้เป็น Localhost
        return "127.0.0.1"

if __name__ == "__main__":
    # ตรวจสอบก่อนว่ามีการ Build ตัวแอปเรียบร้อยหรือยัง
    if not os.path.exists(DIRECTORY):
        print("=" * 70)
        print("❌ เกิดข้อผิดพลาด: ไม่พบโฟลเดอร์ 'dist' ในระบบ!")
        print("กรุณาสร้างโฟลเดอร์ Build ของ React ก่อนนำรัน ด้วยคำสั่งด้านล่าง:")
        print("👉  npm run build")
        print("=" * 70)
        sys.exit(1)

    local_ip = get_local_ip()
    
    print("\n" + "╔" + "═"*68 + "╗")
    print(" 🚀  ระบบจำลองเซิร์ฟเวอร์ LAN (Python LAN Server) พร้อมใช้งานแล้ว!")
    print("╚" + "═"*68 + "╝")
    print(f" 📍 เปิดบนเครื่องตัวเอง (Local PC):  http://localhost:{PORT}")
    print(f" 🌐 เปิดจากอุปกรณ์อื่นในวงแลนเดียวกัน: http://{local_ip}:{PORT}")
    print("─" * 70)
    print(" 💡 วิธีใช้เพื่อให้ผู้อื่นเข้าใช้งานในบริษัท:")
    print(" 1. ตรวจสอบให้แน่ใจว่า คอมพิวเตอร์เครื่องนี้ และอุปกรณ์อื่นๆ (มือถือ, แท็บเล็ต, PC เครื่องอื่น)")
    print("    เชื่อมต่อกับสายแลนเส้นเดียวกัน หรือใช้ Wi-Fi วงเดียวกันในบริษัท")
    print(" 2. นำ URL ด้านบน ( http://{}:{} ) ส่งให้เพื่อนร่วมงานหรือสแกนเปิดใช้งานได้ทันที".format(local_ip, PORT))
    print(" 3. กดปุ่ม 'Ctrl + C' บนคีย์บอร์ดที่หน้าจอนี้ได้ตลอดเวลาเพื่อปิดระบบจำลอง")
    print("─" * 70 + "\n")

    # ตั้งค่าให้สามารถรันพอร์ตซ้ำได้ทันที (ป้องกันพอร์ตค้างชั่วคราว)
    socketserver.TCPServer.allow_reuse_address = True
    handler = SPARequestHandler
    
    try:
        with socketserver.TCPServer(("0.0.0.0", PORT), handler) as httpd:
            print(f"📶 เซิร์ฟเวอร์กำลัง Standby รันอยู่ที่พอร์ต {PORT}... ยินดีต้อนรับผู้ใช้งานเข้าสู่ระบบ")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 ระบบจำลองเซิร์ฟเวอร์ปิดตัวสำเร็จตามคำสั่งของคุณ เรียบร้อยแล้ว")
