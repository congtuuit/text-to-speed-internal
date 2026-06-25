import React from "react";

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
            <th>Trạng Thái</th>
            <th style={{ textAlign: "right" }}>Số Job đã tạo</th>
            <th style={{ textAlign: "right" }}>Số Audio đã tạo</th>
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
                  {user.is_active ? "Hoạt động" : "Bị khóa"}
                </span>
              </td>
              <td style={{ textAlign: "right", fontWeight: 600 }}>{user.jobs_count}</td>
              <td style={{ textAlign: "right", fontWeight: 600, color: "var(--primary)" }}>{user.audios_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
