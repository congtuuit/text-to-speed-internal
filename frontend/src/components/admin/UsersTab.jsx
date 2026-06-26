import React, { useState } from "react";

function formatDateTime(isoString) {
  if (!isoString) return "Chưa từng";
  try {
    const date = new Date(isoString);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return isoString;
  }
}

export default function UsersTab({ users, loading, onAssignPlan }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  if (loading) {
    return <div style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>Đang tải người dùng...</div>;
  }

  // Filter users based on search term
  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(term) ||
      (user.full_name && user.full_name.toLowerCase().includes(term)) ||
      String(user.id).includes(term) ||
      (user.plan_id && user.plan_id.toLowerCase().includes(term)) ||
      (user.role && user.role.toLowerCase().includes(term))
    );
  });

  // Pagination calculation
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  // Reset page when search term changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header controls (Search & Page Size Select) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        {/* Search Bar */}
        <div style={{ position: "relative", flex: "1", minWidth: "280px", maxWidth: "450px" }}>
          <input
            type="text"
            placeholder="Tìm theo ID, họ tên, email, vai trò, gói..."
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
              transition: "border-color 0.2s, box-shadow 0.2s"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--primary)";
              e.target.style.boxShadow = "0 0 8px rgba(99, 102, 241, 0.2)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border-glass)";
              e.target.style.boxShadow = "none";
            }}
          />
          <span style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", opacity: 0.5, fontSize: "0.9rem" }}>
            🔍
          </span>
        </div>

        {/* Page Size Select */}
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
            <option value={5} style={{ background: "#1e293b", color: "#fff" }}>5 dòng</option>
            <option value={10} style={{ background: "#1e293b", color: "#fff" }}>10 dòng</option>
            <option value={20} style={{ background: "#1e293b", color: "#fff" }}>20 dòng</option>
            <option value={50} style={{ background: "#1e293b", color: "#fff" }}>50 dòng</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {totalItems === 0 ? (
        <div style={{ color: "var(--text-muted)", padding: "3rem", textAlign: "center", border: "1px dashed var(--border-glass)", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.01)" }}>
          Không tìm thấy kết quả phù hợp cho "{searchTerm}"
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Họ Tên</th>
                  <th>Email</th>
                  <th>Vai Trò</th>
                  <th>Tài Khoản</th>
                  <th>Gói Dịch Vụ</th>
                  <th>Hoạt Động</th>
                  <th>Đăng Nhập Cuối</th>
                  <th style={{ textAlign: "right" }}>Số Job</th>
                  <th style={{ textAlign: "right" }}>Số Audio</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-muted)" }}>#{user.id}</td>
                    <td style={{ fontWeight: 600 }}>{user.full_name || "N/A"}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`status-badge ${user.role === "admin" ? "processing" : "pending"}`} style={{ textTransform: "capitalize" }}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.is_active ? "done" : "error"}`}>
                        {user.is_active ? "Kích hoạt" : "Bị khóa"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span className="status-badge processing" style={{ textTransform: "uppercase" }}>
                          {user.plan_id || "free"}
                        </span>
                        {onAssignPlan && (
                          <button
                            className="btn ghost"
                            style={{ padding: "2px 6px", fontSize: "0.8rem", width: "auto", border: "1px solid var(--border-glass)" }}
                            onClick={() => onAssignPlan(user.id, user.email, user.plan_id || "free")}
                            title="Thay đổi gói dịch vụ"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${user.is_online ? "done" : "pending"}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: user.is_online ? "var(--success, #10b981)" : "#94a3b8",
                          display: "inline-block"
                        }} />
                        {user.is_online ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{formatDateTime(user.last_login_at)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{user.jobs_count}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--primary)" }}>{user.audios_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginTop: "0.5rem", borderTop: "1px solid var(--border-glass)", paddingTop: "1rem" }}>
            {/* Info text */}
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Hiển thị <strong>{startIndex + 1}</strong> đến <strong>{Math.min(startIndex + pageSize, totalItems)}</strong> trong tổng số <strong>{totalItems}</strong> người dùng
            </span>

            {/* Buttons */}
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: "0.25rem" }}>
                {/* Prev */}
                <button
                  className="btn ghost"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: "0.4rem 0.8rem",
                    fontSize: "0.85rem",
                    width: "auto",
                    opacity: currentPage === 1 ? 0.4 : 1,
                    cursor: currentPage === 1 ? "not-allowed" : "pointer"
                  }}
                >
                  ◀
                </button>

                {/* Page numbers */}
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

                {/* Next */}
                <button
                  className="btn ghost"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: "0.4rem 0.8rem",
                    fontSize: "0.85rem",
                    width: "auto",
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer"
                  }}
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
