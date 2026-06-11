import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  vi: {
    translation: {
      "title": "Trình chuyển đổi văn bản sang giọng nói hàng loạt bằng Google Gemini 2.0 Flash",
      "settings": "⚙️ Cài đặt",
      "api_key": "Mã Google Gemini API Key",
      "save_key": "Lưu Mã",
      "batch_setup": "1. Cài đặt hàng loạt",
      "input_dir": "Thư mục đầu vào",
      "browse": "Duyệt",
      "scan": "Quét",
      "scanning": "Đang quét...",
      "found_files": "Đã tìm thấy {{count}} file .txt",
      "output_dir": "Thư mục đầu ra",
      "voice_selection": "Chọn giọng đọc Gemini",
      "start_batch": "BẮT ĐẦU CHUYỂN ĐỔI",
      "test_voice_preview": "2. Nghe thử giọng đọc",
      "test_text": "Văn bản thử nghiệm",
      "test_voice": "Nghe thử ({{voice}})",
      "testing": "Đang gọi API...",
      "api_key_required": "Yêu cầu mã API Key",
      "status_dashboard": "Bảng trạng thái",
      "state": "Trạng thái:",
      "total_tasks": "Tổng số tiến trình:",
      "done": "Hoàn thành:",
      "error": "Lỗi:",
      "processing": "Đang xử lý:",
      "no_active_tasks": "Không có tiến trình nào đang chạy",
      
      "alerts": {
        "saved_success": "Đã lưu cài đặt thành công!",
        "save_failed": "Lỗi khi lưu cài đặt",
        "scan_error": "Lỗi khi quét thư mục: ",
        "conn_error": "Không thể kết nối với Backend",
        "browse_error": "Lỗi khi kết nối với Backend. Backend đã bật chưa?",
        "start_job": "Đã bắt đầu Job {{jobId}} với {{files}} file.",
        "start_job_error": "Lỗi khi tạo job: ",
        "test_voice_error": "Lỗi không thể sinh âm thanh nghe thử"
      }
    }
  },
  en: {
    translation: {
      "title": "Mass Text-to-Speech Converter powered by Google Gemini 2.0 Flash",
      "settings": "⚙️ Settings",
      "api_key": "Google Gemini API Key",
      "save_key": "Save Key",
      "batch_setup": "1. Batch Setup",
      "input_dir": "Input Directory",
      "browse": "Browse",
      "scan": "Scan",
      "scanning": "Scanning...",
      "found_files": "Found {{count}} .txt files",
      "output_dir": "Output Directory",
      "voice_selection": "Gemini Voice Selection",
      "start_batch": "START BATCH CONVERSION",
      "test_voice_preview": "2. Test Voice Preview",
      "test_text": "Test Text",
      "test_voice": "Test Voice ({{voice}})",
      "testing": "Testing...",
      "api_key_required": "API Key Required",
      "status_dashboard": "Status Dashboard",
      "state": "State:",
      "total_tasks": "Total Tasks:",
      "done": "Done:",
      "error": "Error:",
      "processing": "Processing:",
      "no_active_tasks": "No active tasks",
      
      "alerts": {
        "saved_success": "Settings saved successfully!",
        "save_failed": "Failed to save settings",
        "scan_error": "Error scanning directory: ",
        "conn_error": "Failed to connect to backend",
        "browse_error": "Failed to connect to backend for browsing. Is the backend running?",
        "start_job": "Started job {{jobId}} with {{files}} files.",
        "start_job_error": "Error creating job: ",
        "test_voice_error": "Failed to generate test voice audio"
      }
    }
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "vi", // Default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  })

export default i18n
