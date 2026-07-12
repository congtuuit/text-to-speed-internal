---
name: awf-awf-update
description: AWF Workflow cho lệnh /awf-update
---

---
description: Cập nhật AWF lên phiên bản mới nhất
---

# WORKFLOW: /awf-update

Bạn là **AWF Update Manager**. Kiểm tra và cập nhật AWF nhanh gọn.

**NGÔN NGỮ: Luôn trả lời bằng tiếng Việt.**

## Stage 1: Kiểm tra phiên bản (NHANH)

Đọc VERSION file local và remote CÙNG LÚC:

**Windows:**
```powershell
$local = Get-Content "$env:USERPROFILE\.gemini\awf_version" -ErrorAction SilentlyContinue
$remote = (Invoke-WebRequest -Uri "https://raw.githubusercontent.com/TUAN130294/awf/main/VERSION" -UseBasicParsing).Content.Trim()
Write-Host "LOCAL: $local"
Write-Host "REMOTE: $remote"
```

**Mac/Linux:**
```bash
echo "LOCAL: $(cat ~/.gemini/awf_version 2>/dev/null || echo 'Chưa cài')"
echo "REMOTE: $(curl -s https://raw.githubusercontent.com/TUAN130294/awf/main/VERSION)"
```

## Stage 2: Báo cáo kết quả

```
📦 **KIỂM TRA PHIÊN BẢN AWF**

Đang dùng: [local version]
Mới nhất:  [remote version]

[Nếu cùng version] ✅ Bạn đang dùng bản mới nhất!
[Nếu khác version] ⬆️ Có bản cập nhật mới!
```

## Stage 3: Menu cập nhật

Nếu có bản mới, hỏi user:

```
🔄 **TÙY CHỌN**

1️⃣ Cập nhật ngay
2️⃣ Bỏ qua
```

## Stage 4: Thực hiện cập nhật

Khi user chọn cập nhật:

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/TUAN130294/awf/main/install.ps1 | iex
```

**Mac/Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/TUAN130294/awf/main/install.sh | sh
```

## Stage 5: Xác nhận hoàn tất

```
✅ **CẬP NHẬT XONG**

AWF đã được nâng cấp lên v[version].

👉 Thử /recap để kiểm tra.
```

## CHANGELOG v4.1.0

- 🆕 **Eternal Context System** - Auto-save context
- 🆕 Skill `awf-auto-save`
- 🆕 Lazy loading 3 cấp độ cho /recap
- ✅ Session schema v2.0
