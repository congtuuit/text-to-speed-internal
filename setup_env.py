import os
from pathlib import Path

def setup_env_file(example_path, env_path, title):
    print("\n" + "=" * 60)
    print(f" Cấu hình file môi trường cho: {title}")
    print("=" * 60)
    print("Nhập giá trị cho từng biến (ấn Enter để sử dụng mặc định hoặc giá trị cũ):\n")

    if not os.path.exists(example_path):
        print(f"[Lỗi] Không tìm thấy file mẫu: {example_path}")
        return

    # Nếu file .env hiện tại đã có sẵn, đọc các giá trị cũ để làm mặc định
    existing_values = {}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    existing_values[key.strip()] = val.strip()

    with open(example_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            new_lines.append(line)
            continue
        
        # Tách biến môi trường
        key, default_val = stripped.split("=", 1)
        key = key.strip()
        default_val = default_val.strip()

        # Dùng giá trị cũ làm mặc định nếu có, ngược lại dùng giá trị mẫu
        current_default = existing_values.get(key, default_val)

        user_input = input(f" {key} [{current_default}]: ").strip()
        final_val = user_input if user_input else current_default
        new_lines.append(f"{key}={final_val}\n")
    
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    
    print(f"\n[OK] Đã cấu hình và lưu file: {env_path}")

def main():
    root = Path(__file__).resolve().parent
    
    # Cấu hình Backend
    backend_example = root / "backend" / ".env.example"
    backend_env = root / "backend" / ".env"
    setup_env_file(backend_example, backend_env, "BACKEND")
    
    # Cấu hình Frontend
    frontend_example = root / "frontend" / ".env.example"
    frontend_env = root / "frontend" / ".env"
    setup_env_file(frontend_example, frontend_env, "FRONTEND")

    print("\n" + "=" * 60)
    print(" HOÀN TẤT CẤU HÌNH MÔI TRƯỜNG!")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
