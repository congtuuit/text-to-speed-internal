import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { API_BASE_URL } from "../../config";

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function formatDateTime(isoString) {
  if (!isoString) return "N/A";
  try {
    const date = new Date(isoString);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (e) {
    return isoString;
  }
}

export default function CacheTab({ authToken }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const authHeaders = {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json"
  };

  const fetchCacheFiles = () => {
    setLoading(false);
    setLoading(true);
    fetch(`${API_BASE_URL}/api/admin/cache-files`, { headers: authHeaders })
      .then((res) => res.json())
      .then((data) => {
        setFiles(data.files || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch cache files:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (authToken) {
      fetchCacheFiles();
    }
  }, [authToken]);

  const handleDelete = async (fileId, fileName) => {
    const result = await Swal.fire({
      title: "Xác nhận xóa tệp cache?",
      text: `Hành động này sẽ xóa vĩnh viễn tệp âm thanh '${fileName}' trên ổ đĩa và cơ sở dữ liệu.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa tệp",
      cancelButtonText: "Hủy bỏ",
      background: "transparent",
      color: "var(--text-main)",
      customClass: {
        popup: "glass-panel",
        confirmButton: "btn danger",
        cancelButton: "btn ghost",
        actions: "swal2-actions-custom"
      },
      buttonsStyling: false
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/cache-files/${fileId}`, {
          method: "DELETE",
          headers: authHeaders
        });
        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Đã xóa!",
            text: "Tệp cache đã được gỡ bỏ thành công.",
            timer: 1500,
            showConfirmButton: false,
            background: "#1e293b",
            color: "#fff"
          });
          fetchCacheFiles();
        } else {
          const data = await res.json();
          throw new Error(data.detail || "Không thể xóa tệp");
        }
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Lỗi",
          text: err.message,
          background: "#1e293b",
          color: "#fff"
        });
      }
    }
  };

  // Filter files
  const filteredFiles = files.filter((file) => {
    const term = searchTerm.toLowerCase();
    return (
      file.file_name?.toLowerCase().includes(term) ||
      file.creator?.toLowerCase().includes(term) ||
      file.storage_provider?.toLowerCase().includes(term)
    );
  });

  // Calculate metrics
  const totalSize = filteredFiles.reduce((acc, f) => acc + (f.size_bytes || 0), 0);
  const totalItems = filteredFiles.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedFiles = filteredFiles.slice(startIndex, startIndex + pageSize);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (loading && files.length === 0) {
    return <div style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>Đang quét tệp tin cache...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Overview Cards */}
      <div className="metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="metric-card" style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glass)", padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Tổng số tệp cache</span>
          <strong style={{ display: "block", fontSize: "1.75rem", fontWeight: "bold", marginTop: "0.25rem", color: "var(--text-main)" }}>{files.length} tệp</strong>
        </div>
        <div className="metric-card" style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glass)", padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Tổng dung lượng trên đĩa</span>
          <strong style={{ display: "block", fontSize: "1.75rem", fontWeight: "bold", marginTop: "0.25rem", color: "var(--primary, #6366f1)" }}>
            {formatBytes(files.reduce((acc, f) => acc + (f.size_bytes || 0), 0))}
          </strong>
        </div>
      </div>

      {/* Header controls (Search & Page Size Select) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        {/* Search Bar */}
        <div style={{ position: "relative", flex: "1", minWidth: "280px", maxWidth: "450px" }}>
          <input
            type="text"
            placeholder="Tìm theo tên tệp, người tạo..."
            value={searchTerm}
            onChange={handleSearchChange}
            style={{
              width: "100%",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-glass)",
              borderRadius: "var(--radius-sm)",
              padding: "0.6rem 1rem 0.6rem 2.2rem",
              color: "var(--text-main)",
              fontSize: "0.9rem",
              outline: "none",
              transition: "border-color 0.2s"
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-glass)")}
          />
          <span style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", opacity: 0.5, fontSize: "0.9rem" }}>
            🔍
          </span>
        </div>

        {/* Page Size & Refresh Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="btn ghost btn-sm" onClick={fetchCacheFiles} style={{ width: "auto" }}>🔄 Quét lại</button>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--border-glass)",
                borderRadius: "var(--radius-sm)",
                padding: "0.4rem 1.5rem 0.4rem 0.6rem",
                color: "var(--text-main)",
                fontSize: "0.85rem",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value={10} style={{ background: "#1e293b", color: "#fff" }}>10 dòng</option>
              <option value={20} style={{ background: "#1e293b", color: "#fff" }}>20 dòng</option>
              <option value={50} style={{ background: "#1e293b", color: "#fff" }}>50 dòng</option>
            </select>
          </div>
        </div>
      </div>

      {/* Files Table */}
      {totalItems === 0 ? (
        <div style={{ color: "var(--text-muted)", padding: "3rem", textAlign: "center", border: "1px dashed var(--border-glass)", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.01)" }}>
          {files.length === 0 ? "Không có tệp cache nào tồn tại." : `Không tìm thấy kết quả phù hợp cho "${searchTerm}"`}
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tên Tệp Tin</th>
                  <th>Kích Thước</th>
                  <th>Người Tạo</th>
                  <th>Nơi Lưu Trữ</th>
                  <th>Thời Gian Tạo</th>
                  <th style={{ textAlign: "center" }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFiles.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-main)", wordBreak: "break-all" }}>{file.file_name}</span>
                        {file.audio_url && (
                          <a
                            href={`${API_BASE_URL}${file.audio_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none", width: "fit-content" }}
                          >
                            🔗 Nghe / Tải xuống
                          </a>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{formatBytes(file.size_bytes)}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{file.creator}</td>
                    <td style={{ fontSize: "0.85rem" }}>
                      <span className={`status-badge ${file.storage_provider === "local" ? "processing" : "done"}`} style={{ textTransform: "uppercase" }}>
                        {file.storage_provider}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{formatDateTime(file.created_at)}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="btn ghost danger"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", width: "auto", border: "1px solid rgba(239, 68, 68, 0.2)" }}
                        onClick={() => handleDelete(file.id, file.file_name)}
                      >
                        🗑️ Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginTop: "0.5rem", borderTop: "1px solid var(--border-glass)", paddingTop: "1rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Hiển thị <strong>{startIndex + 1}</strong> đến <strong>{Math.min(startIndex + pageSize, totalItems)}</strong> trong tổng số <strong>{totalItems}</strong> tệp cache ({formatBytes(totalSize)})
            </span>

            {totalPages > 1 && (
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button
                  className="btn ghost"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", width: "auto", opacity: currentPage === 1 ? 0.4 : 1 }}
                >
                  ◀
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                  <button
                    key={page}
                    className={`btn ${currentPage === page ? "primary" : "ghost"}`}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.85rem",
                      width: "auto",
                      background: currentPage === page ? "var(--primary)" : "transparent",
                      color: currentPage === page ? "#fff" : "var(--text-main)",
                      border: currentPage === page ? "none" : "1px solid var(--border-glass)"
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  className="btn ghost"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", width: "auto", opacity: currentPage === totalPages ? 0.4 : 1 }}
                >
                  ▶
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
