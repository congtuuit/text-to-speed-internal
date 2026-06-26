import React from "react";

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

export default function UsersTab({ users, loading }) {
  if (loading) {
    return <div style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>Đang tải người dùng...</div>;
  }

  if (users.length === 0) {
    return <div style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>Không có người dùng nào.</div>;
  }

  return (
    <div className="admin-table-container">
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Họ Tên</th>
            <th>Email</th>
            <th>Vai Trò</th>
            <th>Tài Khoản</th>
            <th>Hoạt Động</th>
            <th>Đăng Nhập Cuối</th>
            <th style={{ textAlign: "right" }}>Số Job</th>
            <th style={{ textAlign: "right" }}>Số Audio</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
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
  );
}
