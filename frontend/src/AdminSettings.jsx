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
    </>
  )
}
