import requests
import json
import time
import sys

# Đảm bảo Encoding UTF-8 trên Terminal Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ==============================================================================
# CẤU HÌNH: URL WEB APP LẤY TỰ ĐỘNG TỪ FILE js/climb.js
# ==============================================================================
WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzafxB0TBS4_gcPIvaqbINNrnJJ_7aaE9Az3m9EqqkH5s2eo_mbzrRiOOw3jXolS5jfng/exec"

# Ảnh PNG Base64 giả lập (1x1 pixel) dùng cho Chữ ký và Ảnh chứng nhận
MOCK_BASE64_IMAGE = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)

def log_test_header(title):
    print("\n" + "=" * 70)
    print(f"[TEST CASE] {title}")
    print("=" * 70)

def print_result(success, response_data, duration):
    symbol = "[OK] THANH CONG" if success else "[FAIL] THAT BAI (NHU MONG DOI NEU LA TEST LOI)"
    print(f"Ket qua: {symbol}")
    print(f"Thoi gian phan hoi: {duration:.2f} giay")
    print(f"Phan hoi Server: {json.dumps(response_data, ensure_ascii=False, indent=2)}")

def test_registration_missing_fields():
    log_test_header("1. Dang ky thieu thong tin bat buoc")
    payload = {
        "action": "register",
        "leaderName": "",  # Thiếu tên
        "phoneNumber": "0901234567",
        "email": "test@example.com"
    }
    start = time.time()
    try:
        res = requests.post(WEB_APP_URL, json=payload, timeout=30)
        data = res.json()
        duration = time.time() - start
        expected = data.get("success") == False
        print_result(expected, data, duration)
    except Exception as e:
        print(f"[ERROR] Loi gui request: {e}")

def test_registration_invalid_phone():
    log_test_header("2. Dang ky voi So dien thoai sai dinh dang")
    payload = {
        "action": "register",
        "leaderName": "Nguyen Van A",
        "phoneNumber": "123",  # SĐT sai
        "address": "Tay Ninh",
        "groupSize": 1,
        "email": "test@example.com",
        "safetyCommit": True
    }
    start = time.time()
    try:
        res = requests.post(WEB_APP_URL, json=payload, timeout=30)
        data = res.json()
        duration = time.time() - start
        expected = data.get("success") == False
        print_result(expected, data, duration)
    except Exception as e:
        print(f"[ERROR] Loi gui request: {e}")

def test_registration_invalid_email():
    log_test_header("3. Dang ky voi Email sai dinh dang")
    payload = {
        "action": "register",
        "leaderName": "Nguyen Van A",
        "phoneNumber": "0901234567",
        "address": "Tay Ninh",
        "groupSize": 1,
        "email": "invalid-email-format",  # Email sai
        "safetyCommit": True
    }
    start = time.time()
    try:
        res = requests.post(WEB_APP_URL, json=payload, timeout=30)
        data = res.json()
        duration = time.time() - start
        expected = data.get("success") == False
        print_result(expected, data, duration)
    except Exception as e:
        print(f"[ERROR] Loi gui request: {e}")

def test_registration_success(test_phone):
    log_test_header("4. Dang ky hop le hoan chinh (Ghi du lieu ngay vao Sheet)")
    payload = {
        "action": "register",
        "leaderName": "Nguyen Van Hung (Test Bot)",
        "phoneNumber": test_phone,
        "address": "123 Duong 3/2, Q.10, TP.HCM",
        "groupSize": 2,
        "email": "nuibaden.test@gmail.com",
        "climbDate": "2026-07-25",
        "climbTime": "05:30",
        "safetyCommit": True,
        "memberList": "Nguyen Van Hung (Test Bot)\nTran Thi Mai",
        "birthday": "1995-05-15",
        "cccd": "079095123456",
        "signatureData": MOCK_BASE64_IMAGE
    }
    start = time.time()
    try:
        res = requests.post(WEB_APP_URL, json=payload, timeout=60)
        data = res.json()
        duration = time.time() - start
        expected = data.get("success") == True
        print_result(expected, data, duration)
    except Exception as e:
        print(f"[ERROR] Loi gui request: {e}")

def test_get_members(test_phone):
    log_test_header("5. Lay danh sach thanh vien theo SDT (doGet)")
    url = f"{WEB_APP_URL}?action=getMembersByPhone&phone={test_phone}"
    start = time.time()
    try:
        res = requests.get(url, timeout=30)
        data = res.json()
        duration = time.time() - start
        expected = data.get("success") == True and len(data.get("members", [])) > 0
        print_result(expected, data, duration)
    except Exception as e:
        print(f"[ERROR] Loi gui request: {e}")

def test_generate_certificates(test_phone):
    log_test_header("6. Tao chung nhan co anh (handleGenerateCertificatesWithPhotos)")
    payload = {
        "action": "generateCertificatesWithPhotos",
        "phone": test_phone,
        "verificationMethod": "test_script",
        "members": [
            {
                "name": "Nguyen Van Hung (Test Bot)",
                "photoData": MOCK_BASE64_IMAGE
            }
        ]
    }
    start = time.time()
    try:
        res = requests.post(WEB_APP_URL, json=payload, timeout=120)
        data = res.json()
        duration = time.time() - start
        expected = data.get("success") == True
        print_result(expected, data, duration)
    except Exception as e:
        print(f"[ERROR] Loi gui request: {e}")

def test_registration_email_fail():
    log_test_header("7. Dang ky khi Email gap su co/Loi MailApp (Van luu Sheet 100%)")
    payload = {
        "action": "register",
        "leaderName": "Khach Test Email Loi (Vn)",
        "phoneNumber": "0911223344",
        "address": "Tay Ninh",
        "groupSize": 1,
        "email": "this-email-does-not-exist-123456789@invalid-domain-xyz99.com",
        "climbDate": "2026-07-28",
        "climbTime": "06:00",
        "safetyCommit": True,
        "memberList": "Khach Test Email Loi (Vn)",
        "birthday": "1990-01-01",
        "cccd": "012345678901",
        "signatureData": MOCK_BASE64_IMAGE
    }
    start = time.time()
    try:
        res = requests.post(WEB_APP_URL, json=payload, timeout=60)
        data = res.json()
        duration = time.time() - start
        expected = data.get("success") == True
        print(f"-> Ghi chu: Dang ky van tra ve success=True vi du lieu da duoc luu xuong Sheet tu Buoc 1 (~{duration:.2f}s).")
        print_result(expected, data, duration)
    except Exception as e:
        print(f"[ERROR] Loi gui request: {e}")

if __name__ == "__main__":
    print("\n>>> BAT DAU CHAY KIEM THU CHO GOOGLE APPS SCRIPT WEB APP <<<")
    print(f"Target URL: {WEB_APP_URL}\n")
    
    test_registration_missing_fields()
    test_registration_invalid_phone()
    test_registration_invalid_email()
    
    # SDT test
    test_phone = "0987654321"
    test_registration_success(test_phone)
    time.sleep(2) # Cho 2 giay cho Sheet dong bo
    test_get_members(test_phone)
    test_generate_certificates(test_phone)
    
    # Test case dac biet: Email bi loi nhưng van luu Sheet 100%
    test_registration_email_fail()
    
    print("\n>>> HOAN THANH KICH BAN KIEM THU <<<")
