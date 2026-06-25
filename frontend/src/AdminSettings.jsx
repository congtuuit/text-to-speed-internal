import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import Swal from "sweetalert2"
import { API_BASE_URL } from "./config"

function PageHeader({ title, subtitle }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  )
}


export default function AdminSettings({ authToken, onSettingsSaved }) {
  const { t } = useTranslation()
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionState, setConnectionState] = useState("unknown") // "unknown" | "success" | "failed" | "testing"

  // Admin Dashboard Tabs States
  const [activeTab, setActiveTab] = useState("settings") // "settings" | "users" | "queues" | "monitor"
  const [users, setUsers] = useState([])
  const [allJobs, setAllJobs] = useState([])
  const [systemStats, setSystemStats] = useState(null)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" }),
    [authToken],
  )

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then((res) => res.json())
      .then((data) =>
        setSettings({
          provider: data.provider || "self_hosted",
          self_hosted_url: data.self_hosted_url || "http://localhost:7860",
          fpt_api_keys: data.fpt_api_keys || "",
          fpt_speed: data.fpt_speed ?? 0.8,
          max_workers: data.max_workers ?? 3,
          api_key: data.api_key || "",
          model_name: data.model_name || "",
          output_speed: data.output_speed ?? 1.0,
          self_hosted_voice: data.self_hosted_voice || "female",
          self_hosted_seed: data.self_hosted_seed || "",
          self_hosted_keep_voice: data.self_hosted_keep_voice || "false",
        }),
      )
      .catch(() =>
        setSettings({
          provider: "self_hosted",
          self_hosted_url: "http://localhost:7860",
          fpt_api_keys: "",
          fpt_speed: 0.8,
          max_workers: 3,
          api_key: "",
          model_name: "",
          output_speed: 1.0,
          self_hosted_voice: "female",
          self_hosted_seed: "",
          self_hosted_keep_voice: "false",
        }),
      )
  }, [authToken])

  // Fetch registered users
  useEffect(() => {
    if (activeTab === "users" && authToken) {
      setLoadingUsers(true)
      fetch(`${API_BASE_URL}/api/admin/users`, { headers: authHeaders })
        .then((res) => res.json())
        .then((data) => {
          setUsers(data.users || [])
          setLoadingUsers(false)
        })
        .catch(() => setLoadingUsers(false))
    }
  }, [activeTab, authToken])

  // Fetch job queue
  const fetchAllJobs = () => {
    if (activeTab === "queues" && authToken) {
      fetch(`${API_BASE_URL}/api/admin/jobs`, { headers: authHeaders })
        .then((res) => res.json())
        .then((data) => setAllJobs(data.jobs || []))
        .catch((err) => console.error(err))
    }
  }

  useEffect(() => {
    fetchAllJobs()
    if (activeTab === "queues") {
      const interval = setInterval(fetchAllJobs, 5000)
      return () => clearInterval(interval)
    }
  }, [activeTab, authToken])

  // Fetch CPU/RAM stats
  const fetchSystemStats = () => {
    if (activeTab === "monitor" && authToken) {
      fetch(`${API_BASE_URL}/api/admin/system-stats`, { headers: authHeaders })
        .then((res) => res.json())
        .then((data) => setSystemStats(data))
        .catch((err) => console.error(err))
    }
  }

  useEffect(() => {
    fetchSystemStats()
    if (activeTab === "monitor") {
      const interval = setInterval(fetchSystemStats, 5000)
      return () => clearInterval(interval)
    }
  }, [activeTab, authToken])

  const handleChange = (field, value) => setSettings((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        Swal.fire({ icon: "success", title: t("admin.save"), timer: 1000, showConfirmButton: false, background: "#1e293b", color: "#fff" })
        onSettingsSaved?.()
      } else throw new Error("Failed to save")
    } catch (err) {
      Swal.fire({ icon: "error", title: t("common.error"), text: err.message, background: "#1e293b", color: "#fff" })
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setConnectionState("testing")
    try {
      const res = await fetch(`${API_BASE_URL}/api/self-hosted/check-connection`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ self_hosted_url: settings.self_hosted_url }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setConnectionState("success")
        const info = data.data || {}
        Swal.fire({
          icon: "success",
          title: t("admin.connectionSuccess"),
          html: `
            <div style="text-align: left; font-size: 0.9rem; margin-top: 0.75rem; background: rgba(0,0,0,0.25); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); font-family: system-ui, -apple-system, sans-serif;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.45rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.25rem;">
                <span style="color: #94a3b8;">Trạng thái:</span>
                <span style="font-weight: 600; color: #10b981; text-transform: uppercase;">${info.status || 'ok'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.45rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.25rem;">
                <span style="color: #94a3b8;">Mô hình:</span>
                <span style="font-weight: 600; color: #f8fafc;">${info.model || 'N/A'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.45rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.25rem;">
                <span style="color: #94a3b8;">Trạng thái mô hình:</span>
                <span style="font-weight: 600; color: ${info.is_model_loaded ? '#10b981' : '#ef4444'};">
                  ${info.is_model_loaded ? 'Đã tải (Loaded)' : 'Chưa tải'}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.45rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.25rem;">
                <span style="color: #94a3b8;">CPU sử dụng:</span>
                <span style="font-weight: 600; color: #f8fafc;">${info.cpu_percent ?? 0}%</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">RAM sử dụng:</span>
                <span style="font-weight: 600; color: #f8fafc;">${info.ram_percent ?? 0}% (${info.ram_used_gb ?? 0} GB / ${info.ram_total_gb ?? 0} GB)</span>
              </div>
            </div>
          `,
          background: "#1e293b",
          color: "#fff",
          confirmButtonColor: "#8b5cf6"
        })
      } else {
        setConnectionState("failed")
        throw new Error(data.detail || t("admin.connectionFailed"))
      }
    } catch (err) {
      setConnectionState("failed")
      Swal.fire({ icon: "error", title: t("admin.connectionFailed"), text: err.message, background: "#1e293b", color: "#fff" })
    } finally {
      setTestingConnection(false)
    }
  }

  if (!settings) {
    return (
      <>
        <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} />
        <section className="glass-panel empty-state">{t("common.loading")}</section>
      </>
    )
  }

  return (
    <>
      <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} />

      {/* Tabs Header Navigation */}
      <div className="tabs-header">
        <button 
          className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          ⚙️ Cấu hình hệ thống
        </button>
        <button 
          className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          👥 Người dùng
        </button>
        <button 
          className={`tab-btn ${activeTab === "queues" ? "active" : ""}`}
          onClick={() => setActiveTab("queues")}
        >
          📊 Trạng thái Queue
        </button>
        <button 
          className={`tab-btn ${activeTab === "monitor" ? "active" : ""}`}
          onClick={() => setActiveTab("monitor")}
        >
          🖥️ Theo dõi tài nguyên
        </button>
      </div>

      {/* TAB CONTENT: Settings */}
      {activeTab === "settings" && (
        <div className="admin-grid">
          {/* Left Column: Provider Settings */}
          <section className="glass-panel form-stack">
            <h3 style={{ marginBottom: "1rem" }}>{t("admin.provider")}</h3>
            
            <div className="provider-cards">
              <div 
                className={`provider-card ${settings.provider === "self_hosted" ? "active" : ""}`}
                onClick={() => handleChange("provider", "self_hosted")}
              >
                <span className="provider-card-icon">🖥️</span>
                <span className="provider-card-name">Self Hosted</span>
                <span className="provider-card-desc">Chạy mô hình cục bộ hoặc server riêng</span>
              </div>

              <div 
                className={`provider-card ${settings.provider === "fpt" ? "active" : ""}`}
                onClick={() => handleChange("provider", "fpt")}
              >
                <span className="provider-card-icon">⚡</span>
                <span className="provider-card-name">FPT.AI</span>
                <span className="provider-card-desc">Sử dụng API từ nền tảng FPT.AI Việt Nam</span>
              </div>

              <div 
                className={`provider-card ${settings.provider === "gemini" ? "active" : ""}`}
                onClick={() => handleChange("provider", "gemini")}
              >
                <span className="provider-card-icon">✨</span>
                <span className="provider-card-name">Gemini</span>
                <span className="provider-card-desc">Mô hình ngôn ngữ lớn từ Google Cloud</span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1.25rem", marginTop: "0.5rem" }}>
              {settings.provider === "self_hosted" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <label style={{ margin: 0 }}>{t("admin.selfHostedUrl")}</label>
                    {connectionState !== "unknown" && (
                      <span className={`connection-indicator ${connectionState}`}>
                        {connectionState === "testing" ? "⏳ Đang kết nối..." : connectionState === "success" ? "✓ Đã kết nối" : "⚠ Thất bại"}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                    <input 
                      type="text" 
                      value={settings.self_hosted_url} 
                      onChange={(e) => handleChange("self_hosted_url", e.target.value)} 
                      style={{ flex: 1 }}
                    />
                    <button className="btn ghost" onClick={handleTestConnection} disabled={testingConnection} style={{ whiteSpace: "nowrap" }}>
                      {testingConnection ? t("common.processing") : t("admin.testConnection")}
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <label>{t("admin.selfHostedVoice")}</label>
                      <input type="text" value={settings.self_hosted_voice} onChange={(e) => handleChange("self_hosted_voice", e.target.value)} />
                    </div>
                    <div>
                      <label>{t("admin.selfHostedSeed")}</label>
                      <input type="text" value={settings.self_hosted_seed} onChange={(e) => handleChange("self_hosted_seed", e.target.value)} />
                    </div>
                  </div>

                  <label>{t("admin.selfHostedKeepVoice")}</label>
                  <select value={settings.self_hosted_keep_voice} onChange={(e) => handleChange("self_hosted_keep_voice", e.target.value)}>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </>
              )}

              {settings.provider === "fpt" && (
                <>
                  <label>{t("admin.fptKeys")}</label>
                  <textarea 
                    value={settings.fpt_api_keys} 
                    onChange={(e) => handleChange("fpt_api_keys", e.target.value)} 
                    style={{ minHeight: "120px", marginBottom: "1rem" }} 
                  />
                  
                  <label>{t("admin.fptSpeed")}</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="2.0" 
                      step="0.1"
                      value={settings.fpt_speed} 
                      onChange={(e) => handleChange("fpt_speed", Number(e.target.value))} 
                      style={{ flex: 1, accentColor: "var(--primary)" }}
                    />
                    <strong style={{ minWidth: "2.5rem", textAlign: "right" }}>{settings.fpt_speed}x</strong>
                  </div>
                </>
              )}

              {settings.provider === "gemini" && (
                <>
                  <label>{t("admin.apiKey")}</label>
                  <input 
                    type="password" 
                    value={settings.api_key} 
                    onChange={(e) => handleChange("api_key", e.target.value)} 
                    style={{ marginBottom: "1rem" }}
                  />

                  <label>{t("admin.modelName")}</label>
                  <input type="text" value={settings.model_name} onChange={(e) => handleChange("model_name", e.target.value)} />
                </>
              )}
            </div>
          </section>

          {/* Right Column: Performance & Status Summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <section className="glass-panel form-stack">
              <h3 style={{ marginBottom: "1rem" }}>Cấu hình hệ thống</h3>

              <label>{t("admin.outputSpeed")}</label>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1" 
                  value={settings.output_speed} 
                  onChange={(e) => handleChange("output_speed", Number(e.target.value))} 
                  style={{ flex: 1, accentColor: "var(--primary)" }}
                />
                <strong style={{ minWidth: "2.5rem", textAlign: "right" }}>{settings.output_speed}x</strong>
              </div>

              <label>{t("admin.maxWorkers")}</label>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  step="1" 
                  value={settings.max_workers} 
                  onChange={(e) => handleChange("max_workers", Number(e.target.value))} 
                  style={{ flex: 1, accentColor: "var(--primary)" }}
                />
                <strong style={{ minWidth: "2.5rem", textAlign: "right" }}>{settings.max_workers} luồng</strong>
              </div>

              <div className="status-summary-card">
                <div className="status-summary-title">Tóm tắt cấu hình</div>
                
                <div className="status-summary-row">
                  <span className="status-summary-label">Provider đang hoạt động:</span>
                  <span className="status-summary-value" style={{ textTransform: "capitalize" }}>
                    {settings.provider === "self_hosted" ? "Self Hosted" : settings.provider}
                  </span>
                </div>
                
                <div className="status-summary-row">
                  <span className="status-summary-label">Số luồng (Workers):</span>
                  <span className="status-summary-value">{settings.max_workers} luồng xử lý</span>
                </div>
                
                <div className="status-summary-row">
                  <span className="status-summary-label">Tốc độ xuất giọng nói:</span>
                  <span className="status-summary-value">{settings.output_speed}x</span>
                </div>
              </div>

              <div className="button-row" style={{ marginTop: "1.5rem" }}>
                <button className="btn" onClick={handleSave} disabled={saving} style={{ width: "100%" }}>
                  {saving ? t("common.loading") : t("admin.save")}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Users */}
      {activeTab === "users" && (
        <section className="glass-panel">
          <h3 style={{ marginBottom: "0.25rem" }}>Quản lý Người dùng</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            Danh sách tất cả các tài khoản đăng ký trong hệ thống và thống kê tổng số lượng yêu cầu của họ.
          </p>

          {loadingUsers ? (
            <div style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>Đang tải người dùng...</div>
          ) : users.length === 0 ? (
            <div style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>Không có người dùng nào.</div>
          ) : (
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
          )}
        </section>
      )}

      {/* TAB CONTENT: Queues */}
      {activeTab === "queues" && (
        <section className="glass-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ marginBottom: "0.25rem" }}>Tình trạng Hàng đợi</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Theo dõi thời gian thực tất cả các Job đang được xếp hàng hoặc xử lý trong toàn hệ thống.
              </p>
            </div>
            <button className="btn ghost btn-sm" onClick={fetchAllJobs}>🔄 Cập nhật</button>
          </div>

          {allJobs.length === 0 ? (
            <div style={{ color: "var(--text-muted)", padding: "3rem", textAlign: "center" }}>Không có Job nào trong hệ thống.</div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>Tên Job</th>
                    <th>Người Tạo</th>
                    <th>Trạng Thái</th>
                    <th>Tiến Độ</th>
                    <th style={{ textAlign: "right" }}>Thống Kê Files</th>
                  </tr>
                </thead>
                <tbody>
                  {allJobs.map((job) => {
                    const total = job.total || 0
                    const done = job.done || 0
                    const error = job.error || 0
                    const processing = job.processing || 0
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0

                    return (
                      <tr key={job.job_id}>
                        <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>#{job.job_id}</td>
                        <td style={{ fontWeight: 600, maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={job.job_name}>
                          {job.job_name}
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>{job.owner_email}</td>
                        <td>
                          <span className={`status-badge ${job.status.toLowerCase()}`}>
                            {job.status}
                          </span>
                        </td>
                        <td style={{ minWidth: "150px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div className="monitor-progress-bg" style={{ flex: 1, margin: 0, height: "6px" }}>
                              <div className="monitor-progress-fill" style={{ width: `${pct}%`, backgroundColor: job.status === "Completed" ? "var(--success)" : "var(--primary)" }} />
                            </div>
                            <span style={{ fontSize: "0.8rem", fontFamily: "monospace", fontWeight: 600 }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", fontSize: "0.8rem" }}>
                            <span style={{ color: "var(--success)" }}>✓ {done}</span>
                            {processing > 0 && <span style={{ color: "var(--primary)" }}>⚡ {processing}</span>}
                            {error > 0 && <span style={{ color: "var(--danger)" }}>⚠ {error}</span>}
                            <span style={{ color: "var(--text-muted)", marginLeft: "0.25rem" }}>Tổng: {total}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB CONTENT: System Monitor */}
      {activeTab === "monitor" && (
        <div>
          {/* Resource cards */}
          {systemStats ? (
            <>
              <div className="monitor-grid">
                <div className="monitor-card">
                  <div className="monitor-card-title">CPU Máy Chủ (Backend)</div>
                  <div className="monitor-card-value">{systemStats.backend?.cpu_percent ?? 0}%</div>
                  <div className="monitor-progress-bg">
                    <div className="monitor-progress-fill" style={{ width: `${systemStats.backend?.cpu_percent ?? 0}%` }} />
                  </div>
                </div>

                <div className="monitor-card">
                  <div className="monitor-card-title">RAM Máy Chủ (Backend)</div>
                  <div className="monitor-card-value">{systemStats.backend?.ram_percent ?? 0}%</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Đã dùng {systemStats.backend?.ram_used_gb ?? 0} GB trên {systemStats.backend?.ram_total_gb ?? 0} GB
                  </div>
                  <div className="monitor-progress-bg">
                    <div className="monitor-progress-fill" style={{ width: `${systemStats.backend?.ram_percent ?? 0}%` }} />
                  </div>
                </div>

                <div className="monitor-card">
                  <div className="monitor-card-title">Dung lượng ổ cứng</div>
                  <div className="monitor-card-value">{systemStats.backend?.disk_percent ?? 0}%</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Còn trống {systemStats.backend?.disk_free_gb ?? 0} GB trên {systemStats.backend?.disk_total_gb ?? 0} GB
                  </div>
                  <div className="monitor-progress-bg">
                    <div className="monitor-progress-fill" style={{ width: `${systemStats.backend?.disk_percent ?? 0}%` }} />
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
                      <strong style={{ fontSize: "1.1rem" }}>{systemStats.database?.total_users ?? 0} người</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Tổng số Jobs đã tạo:</span>
                      <strong style={{ fontSize: "1.1rem" }}>{systemStats.database?.total_jobs ?? 0} jobs</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Tổng số file tasks:</span>
                      <strong style={{ fontSize: "1.1rem" }}>{systemStats.database?.total_tasks ?? 0} tasks</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Tổng số file audio đã tạo:</span>
                      <strong style={{ fontSize: "1.1rem", color: "var(--primary)" }}>{systemStats.database?.total_audios ?? 0} files</strong>
                    </div>
                  </div>
                </section>

                <section className="glass-panel">
                  <h3 style={{ marginBottom: "1rem" }}>Trạng thái Thread Pool (Queue)</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Luồng hoạt động hiện tại:</span>
                      <strong style={{ fontSize: "1.1rem", color: "#10b981" }}>{systemStats.queue?.active_workers ?? 0} luồng đang chạy</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "0.5rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Số luồng giới hạn tối đa:</span>
                      <strong style={{ fontSize: "1.1rem" }}>{systemStats.queue?.max_workers ?? 3} luồng</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Trạng thái hàng đợi:</span>
                      <strong style={{ fontSize: "1.1rem", color: systemStats.queue?.is_paused ? "var(--danger)" : "var(--success)" }}>
                        {systemStats.queue?.is_paused ? "Tạm dừng (Paused)" : "Hoạt động (Running)"}
                      </strong>
                    </div>
                  </div>
                </section>
              </div>

              {/* Self Hosted status details if available */}
              {systemStats.self_hosted && (
                <section className="glass-panel" style={{ marginTop: "1.5rem" }}>
                  <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>🖥️ Chi tiết Máy chủ Self-Hosted TTS</span>
                    <span className="connection-indicator success" style={{ fontSize: "0.75rem" }}>✓ Connected</span>
                  </h3>
                  <div className="monitor-grid">
                    <div className="monitor-card" style={{ background: "rgba(0,0,0,0.15)" }}>
                      <div className="monitor-card-title">Mô hình AI</div>
                      <div className="monitor-card-value" style={{ fontSize: "1.4rem" }}>{systemStats.self_hosted.model || "N/A"}</div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Trạng thái: <strong style={{ color: systemStats.self_hosted.is_model_loaded ? "var(--success)" : "var(--danger)" }}>
                          {systemStats.self_hosted.is_model_loaded ? "Đã nạp vào VRAM" : "Chưa nạp"}
                        </strong>
                      </span>
                    </div>

                    <div className="monitor-card" style={{ background: "rgba(0,0,0,0.15)" }}>
                      <div className="monitor-card-title">CPU Self-Hosted</div>
                      <div className="monitor-card-value">{systemStats.self_hosted.cpu_percent ?? 0}%</div>
                      <div className="monitor-progress-bg">
                        <div className="monitor-progress-fill" style={{ width: `${systemStats.self_hosted.cpu_percent ?? 0}%` }} />
                      </div>
                    </div>

                    <div className="monitor-card" style={{ background: "rgba(0,0,0,0.15)" }}>
                      <div className="monitor-card-title">RAM Self-Hosted</div>
                      <div className="monitor-card-value">{systemStats.self_hosted.ram_percent ?? 0}%</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Đã dùng {systemStats.self_hosted.ram_used_gb ?? 0} GB trên {systemStats.self_hosted.ram_total_gb ?? 0} GB
                      </div>
                      <div className="monitor-progress-bg">
                        <div className="monitor-progress-fill" style={{ width: `${systemStats.self_hosted.ram_percent ?? 0}%` }} />
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          ) : (
            <div style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>Đang tải trạng thái tài nguyên hệ thống...</div>
          )}
        </div>
      )}
    </>
  )
}
