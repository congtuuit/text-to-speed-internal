import React, { useState, useEffect, useMemo } from "react";
import RequestChart from "./RequestChart";
import { API_BASE_URL } from "../../config";

export default function MonitorTab({ authToken }) {
  const [stats, setStats] = useState(null);
  const [requestStats, setRequestStats] = useState([]);
  const [chartFilter, setChartFilter] = useState("hour");
  const [loading, setLoading] = useState(true);

  // Auto refresh toggles state for each block
  const [autoRefresh, setAutoRefresh] = useState({
    cpu: true,
    ram: true,
    disk: true,
    database: true,
    queue: true,
    selfHosted: true,
    request: true,
  });

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" }),
    [authToken]
  );

  const fetchSystemStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/system-stats`, { headers: authHeaders });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching system stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/request-stats?group_by=${chartFilter}`, { headers: authHeaders });
      const data = await res.json();
      setRequestStats(data || []);
    } catch (err) {
      console.error("Error fetching request stats:", err);
    }
  };

  // Trigger initial fetches
  useEffect(() => {
    if (authToken) {
      fetchSystemStats();
      fetchRequestStats();
    }
  }, [authToken, chartFilter]);

  // Set interval for system stats if ANY system stats block is auto-refresh enabled
  useEffect(() => {
    const anySystemActive = autoRefresh.cpu || autoRefresh.ram || autoRefresh.disk || autoRefresh.database || autoRefresh.queue || autoRefresh.selfHosted;
    
    if (anySystemActive && authToken) {
      const interval = setInterval(() => {
        fetchSystemStats();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh.cpu, autoRefresh.ram, autoRefresh.disk, autoRefresh.database, autoRefresh.queue, autoRefresh.selfHosted, authToken]);

  // Set interval for request stats if request auto-refresh is active
  useEffect(() => {
    if (autoRefresh.request && authToken) {
      const interval = setInterval(() => {
        fetchRequestStats();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh.request, chartFilter, authToken]);

  const toggleAutoRefresh = (key) => {
    setAutoRefresh((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Reusable controls for small card headers
  const renderCardHeader = (title, autoRefreshKey, onManualRefresh) => {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "0.25rem" }}>
        <span className="monitor-card-title">{title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <label className="toggle-switch" title="Tự động cập nhật">
            <input 
              type="checkbox" 
              checked={autoRefresh[autoRefreshKey]} 
              onChange={() => toggleAutoRefresh(autoRefreshKey)} 
            />
            <span className="toggle-slider"></span>
          </label>
          <button 
            onClick={onManualRefresh} 
            className="btn ghost btn-sm" 
            style={{ 
              padding: 0, 
              width: "24px", 
              height: "24px", 
              borderRadius: "6px", 
              display: "inline-flex", 
              alignItems: "center", 
              justifyContent: "center",
              minWidth: "auto",
              boxShadow: "none"
            }}
            title="Cập nhật ngay"
          >
            🔄
          </button>
        </div>
      </div>
    );
  };

  // Reusable controls for section headers
  const renderSectionHeader = (title, autoRefreshKey, onManualRefresh, extraHeaderElement = null) => {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {extraHeaderElement}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {autoRefresh[autoRefreshKey] ? "Auto" : "Tắt Auto"}
          </span>
          <label className="toggle-switch" title="Tự động cập nhật">
            <input 
              type="checkbox" 
              checked={autoRefresh[autoRefreshKey]} 
              onChange={() => toggleAutoRefresh(autoRefreshKey)} 
            />
            <span className="toggle-slider"></span>
          </label>
          <button 
            onClick={onManualRefresh} 
            className="btn ghost btn-sm" 
            style={{ 
              padding: 0, 
              width: "28px", 
              height: "28px", 
              borderRadius: "6px", 
              display: "inline-flex", 
              alignItems: "center", 
              justifyContent: "center",
              minWidth: "auto",
              boxShadow: "none"
            }}
            title="Cập nhật ngay"
          >
            🔄
          </button>
        </div>
      </div>
    );
  };

  if (loading && !stats) {
    return <div style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>Đang tải trạng thái tài nguyên hệ thống...</div>;
  }

  const safeStats = stats || {};

  return (
    <div>
      {/* Resource cards */}
      <div className="monitor-grid">
        <div className="monitor-card">
          {renderCardHeader("CPU Máy Chủ", "cpu", fetchSystemStats)}
          <div className="monitor-card-value">{safeStats.backend?.cpu_percent ?? 0}%</div>
          <div className="monitor-progress-bg">
            <div className="monitor-progress-fill" style={{ width: `${safeStats.backend?.cpu_percent ?? 0}%` }} />
          </div>
        </div>

        <div className="monitor-card">
          {renderCardHeader("RAM Máy Chủ", "ram", fetchSystemStats)}
          <div className="monitor-card-value">{safeStats.backend?.ram_percent ?? 0}%</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Đã dùng {safeStats.backend?.ram_used_gb ?? 0} GB trên {safeStats.backend?.ram_total_gb ?? 0} GB
          </div>
          <div className="monitor-progress-bg">
            <div className="monitor-progress-fill" style={{ width: `${safeStats.backend?.ram_percent ?? 0}%` }} />
          </div>
        </div>

        <div className="monitor-card">
          {renderCardHeader("Dung lượng ổ cứng", "disk", fetchSystemStats)}
          <div className="monitor-card-value">{safeStats.backend?.disk_percent ?? 0}%</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Còn trống {safeStats.backend?.disk_free_gb ?? 0} GB trên {safeStats.backend?.disk_total_gb ?? 0} GB
          </div>
          <div className="monitor-progress-bg">
            <div className="monitor-progress-fill" style={{ width: `${safeStats.backend?.disk_percent ?? 0}%` }} />
          </div>
        </div>
      </div>

      {/* Database and Queue monitor */}
      <div className="admin-grid" style={{ marginTop: "1.5rem" }}>
        <section className="glass-panel">
          {renderSectionHeader("Số liệu cơ sở dữ liệu", "database", fetchSystemStats)}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Tổng số người dùng:</span>
              <strong style={{ fontSize: "1.1rem" }}>{safeStats.database?.total_users ?? 0} người</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Tổng số Jobs đã tạo:</span>
              <strong style={{ fontSize: "1.1rem" }}>{safeStats.database?.total_jobs ?? 0} jobs</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Tổng số file tasks:</span>
              <strong style={{ fontSize: "1.1rem" }}>{safeStats.database?.total_tasks ?? 0} tasks</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Tổng số file audio đã tạo:</span>
              <strong style={{ fontSize: "1.1rem", color: "var(--primary)" }}>{safeStats.database?.total_audios ?? 0} files</strong>
            </div>
          </div>
        </section>

        <section className="glass-panel">
          {renderSectionHeader("Trạng thái Thread Pool (Queue)", "queue", fetchSystemStats)}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Luồng hoạt động hiện tại:</span>
              <strong style={{ fontSize: "1.1rem", color: "#10b981" }}>{safeStats.queue?.active_workers ?? 0} luồng đang chạy</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Số luồng giới hạn tối đa:</span>
              <strong style={{ fontSize: "1.1rem" }}>{safeStats.queue?.max_workers ?? 3} luồng</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Trạng thái hàng đợi:</span>
              <strong style={{ fontSize: "1.1rem", color: safeStats.queue?.is_paused ? "var(--danger)" : "var(--success)" }}>
                {safeStats.queue?.is_paused ? "Tạm dừng (Paused)" : "Hoạt động (Running)"}
              </strong>
            </div>
          </div>
        </section>
      </div>

      {/* Request Traffic Chart */}
      <RequestChart 
        data={requestStats} 
        filter={chartFilter} 
        onFilterChange={setChartFilter} 
        autoRefresh={autoRefresh.request}
        onToggleAutoRefresh={() => toggleAutoRefresh("request")}
        onManualRefresh={fetchRequestStats}
      />

      {/* Self Hosted status details if available */}
      {safeStats.self_hosted && (
        <section className="glass-panel" style={{ marginTop: "1.5rem" }}>
          {renderSectionHeader(
            "Chi tiết Máy chủ Self-Hosted TTS", 
            "selfHosted", 
            fetchSystemStats,
            <span className="connection-indicator success" style={{ fontSize: "0.75rem" }}>✓ Connected</span>
          )}
          <div className="monitor-grid">
            <div className="monitor-card" style={{ background: "rgba(0,0,0,0.15)" }}>
              <div className="monitor-card-title">Mô hình AI</div>
              <div className="monitor-card-value" style={{ fontSize: "1.4rem" }}>{safeStats.self_hosted.model || "N/A"}</div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Trạng thái: <strong style={{ color: safeStats.self_hosted.is_model_loaded ? "var(--success)" : "var(--danger)" }}>
                  {safeStats.self_hosted.is_model_loaded ? "Đã nạp vào VRAM" : "Chưa nạp"}
                </strong>
              </span>
            </div>

            <div className="monitor-card" style={{ background: "rgba(0,0,0,0.15)" }}>
              <div className="monitor-card-title">CPU Self-Hosted</div>
              <div className="monitor-card-value">{safeStats.self_hosted.cpu_percent ?? 0}%</div>
              <div className="monitor-progress-bg">
                <div className="monitor-progress-fill" style={{ width: `${safeStats.self_hosted.cpu_percent ?? 0}%` }} />
              </div>
            </div>

            <div className="monitor-card" style={{ background: "rgba(0,0,0,0.15)" }}>
              <div className="monitor-card-title">RAM Self-Hosted</div>
              <div className="monitor-card-value">{safeStats.self_hosted.ram_percent ?? 0}%</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Đã dùng {safeStats.self_hosted.ram_used_gb ?? 0} GB trên {safeStats.self_hosted.ram_total_gb ?? 0} GB
              </div>
              <div className="monitor-progress-bg">
                <div className="monitor-progress-fill" style={{ width: `${safeStats.self_hosted.ram_percent ?? 0}%` }} />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

