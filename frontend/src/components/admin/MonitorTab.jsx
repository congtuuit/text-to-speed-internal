import React from "react";

export default function MonitorTab({ stats }) {
  if (!stats) {
    return <div style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>Đang tải trạng thái tài nguyên hệ thống...</div>;
  }

  return (
    <div>
      {/* Resource cards */}
      <div className="monitor-grid">
        <div className="monitor-card">
          <div className="monitor-card-title">CPU Máy Chủ (Backend)</div>
          <div className="monitor-card-value">{stats.backend?.cpu_percent ?? 0}%</div>
          <div className="monitor-progress-bg">
            <div className="monitor-progress-fill" style={{ width: `${stats.backend?.cpu_percent ?? 0}%` }} />
          </div>
        </div>

        <div className="monitor-card">
          <div className="monitor-card-title">RAM Máy Chủ (Backend)</div>
          <div className="monitor-card-value">{stats.backend?.ram_percent ?? 0}%</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Đã dùng {stats.backend?.ram_used_gb ?? 0} GB trên {stats.backend?.ram_total_gb ?? 0} GB
          </div>
          <div className="monitor-progress-bg">
            <div className="monitor-progress-fill" style={{ width: `${stats.backend?.ram_percent ?? 0}%` }} />
          </div>
        </div>

        <div className="monitor-card">
          <div className="monitor-card-title">Dung lượng ổ cứng</div>
          <div className="monitor-card-value">{stats.backend?.disk_percent ?? 0}%</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Còn trống {stats.backend?.disk_free_gb ?? 0} GB trên {stats.backend?.disk_total_gb ?? 0} GB
          </div>
          <div className="monitor-progress-bg">
            <div className="monitor-progress-fill" style={{ width: `${stats.backend?.disk_percent ?? 0}%` }} />
          </div>
        </div>
      </div>

      {/* Database and Queue monitor */}
      <div className="admin-grid" style={{ marginTop: "1.5rem" }}>
        <section className="glass-panel">
          <h3 style={{ marginBottom: "1rem" }}>Số liệu cơ sở dữ liệu</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Tổng số người dùng:</span>
              <strong style={{ fontSize: "1.1rem" }}>{stats.database?.total_users ?? 0} người</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Tổng số Jobs đã tạo:</span>
              <strong style={{ fontSize: "1.1rem" }}>{stats.database?.total_jobs ?? 0} jobs</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Tổng số file tasks:</span>
              <strong style={{ fontSize: "1.1rem" }}>{stats.database?.total_tasks ?? 0} tasks</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Tổng số file audio đã tạo:</span>
              <strong style={{ fontSize: "1.1rem", color: "var(--primary)" }}>{stats.database?.total_audios ?? 0} files</strong>
            </div>
          </div>
        </section>

        <section className="glass-panel">
          <h3 style={{ marginBottom: "1rem" }}>Trạng thái Thread Pool (Queue)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Luồng hoạt động hiện tại:</span>
              <strong style={{ fontSize: "1.1rem", color: "#10b981" }}>{stats.queue?.active_workers ?? 0} luồng đang chạy</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Số luồng giới hạn tối đa:</span>
              <strong style={{ fontSize: "1.1rem" }}>{stats.queue?.max_workers ?? 3} luồng</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Trạng thái hàng đợi:</span>
              <strong style={{ fontSize: "1.1rem", color: stats.queue?.is_paused ? "var(--danger)" : "var(--success)" }}>
                {stats.queue?.is_paused ? "Tạm dừng (Paused)" : "Hoạt động (Running)"}
              </strong>
            </div>
          </div>
        </section>
      </div>

      {/* Self Hosted status details if available */}
      {stats.self_hosted && (
        <section className="glass-panel" style={{ marginTop: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🖥️ Chi tiết Máy chủ Self-Hosted TTS</span>
            <span className="connection-indicator success" style={{ fontSize: "0.75rem" }}>✓ Connected</span>
          </h3>
          <div className="monitor-grid">
            <div className="monitor-card" style={{ background: "rgba(0,0,0,0.15)" }}>
              <div className="monitor-card-title">Mô hình AI</div>
              <div className="monitor-card-value" style={{ fontSize: "1.4rem" }}>{stats.self_hosted.model || "N/A"}</div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Trạng thái: <strong style={{ color: stats.self_hosted.is_model_loaded ? "var(--success)" : "var(--danger)" }}>
                  {stats.self_hosted.is_model_loaded ? "Đã nạp vào VRAM" : "Chưa nạp"}
                </strong>
              </span>
            </div>

            <div className="monitor-card" style={{ background: "rgba(0,0,0,0.15)" }}>
              <div className="monitor-card-title">CPU Self-Hosted</div>
              <div className="monitor-card-value">{stats.self_hosted.cpu_percent ?? 0}%</div>
              <div className="monitor-progress-bg">
                <div className="monitor-progress-fill" style={{ width: `${stats.self_hosted.cpu_percent ?? 0}%` }} />
              </div>
            </div>

            <div className="monitor-card" style={{ background: "rgba(0,0,0,0.15)" }}>
              <div className="monitor-card-title">RAM Self-Hosted</div>
              <div className="monitor-card-value">{stats.self_hosted.ram_percent ?? 0}%</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Đã dùng {stats.self_hosted.ram_used_gb ?? 0} GB trên {stats.self_hosted.ram_total_gb ?? 0} GB
              </div>
              <div className="monitor-progress-bg">
                <div className="monitor-progress-fill" style={{ width: `${stats.self_hosted.ram_percent ?? 0}%` }} />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
