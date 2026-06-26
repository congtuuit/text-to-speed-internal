module.exports = {
  apps: [
    {
      name: "tts-backend",
      cwd: "./backend",                 // Chạy lệnh trong thư mục backend
      script: "./venv/bin/uvicorn",     // Gọi file thực thi uvicorn từ venv
      args: "main:app --host 127.0.0.1 --port 8000 --workers 4", // 4 workers tối ưu cho 2 CPU, 4GB RAM
      interpreter: "none",              // Chạy trực tiếp file uvicorn
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",         // Tự động khởi động lại nếu chiếm dụng quá 1GB RAM (tránh rò rỉ bộ nhớ)
      env: {
        PYTHONPATH: "."                 // Định nghĩa đường dẫn import cho Python
      }
    }
  ]
};
