import React from "react";

export default function SettingsTab({
  settings,
  onChange,
  onSave,
  onTestConnection,
  saving,
  testingConnection,
  connectionState,
  t,
}) {
  return (
    <div className="admin-grid">
      {/* Left Column: Provider Settings */}
      <section className="glass-panel form-stack">
        <h3 style={{ marginBottom: "1rem" }}>{t("admin.provider")}</h3>
        
        <div className="provider-cards">
          <div 
            className={`provider-card ${settings.provider === "self_hosted" ? "active" : ""}`}
            onClick={() => onChange("provider", "self_hosted")}
          >
            <span className="provider-card-icon">🖥️</span>
            <span className="provider-card-name">Self Hosted</span>
            <span className="provider-card-desc">Chạy mô hình cục bộ hoặc server riêng</span>
          </div>

          <div 
            className={`provider-card ${settings.provider === "fpt" ? "active" : ""}`}
            onClick={() => onChange("provider", "fpt")}
          >
            <span className="provider-card-icon">⚡</span>
            <span className="provider-card-name">FPT.AI</span>
            <span className="provider-card-desc">Sử dụng API từ nền tảng FPT.AI Việt Nam</span>
          </div>

          <div 
            className={`provider-card ${settings.provider === "gemini" ? "active" : ""}`}
            onClick={() => onChange("provider", "gemini")}
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
                  onChange={(e) => onChange("self_hosted_url", e.target.value)} 
                  style={{ flex: 1 }}
                />
                <button className="btn ghost" onClick={onTestConnection} disabled={testingConnection} style={{ whiteSpace: "nowrap" }}>
                  {testingConnection ? t("common.processing") : t("admin.testConnection")}
                </button>
              </div>



            </>
          )}

          {settings.provider === "fpt" && (
            <>
              <label>{t("admin.fptKeys")}</label>
              <textarea 
                value={settings.fpt_api_keys} 
                onChange={(e) => onChange("fpt_api_keys", e.target.value)} 
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
                  onChange={(e) => onChange("fpt_speed", Number(e.target.value))} 
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
                onChange={(e) => onChange("api_key", e.target.value)} 
                style={{ marginBottom: "1rem" }}
              />

              <label>{t("admin.modelName")}</label>
              <input type="text" value={settings.model_name} onChange={(e) => onChange("model_name", e.target.value)} />
            </>
          )}
        </div>
      </section>

      {/* Right Column: Performance & Status Summary */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <section className="glass-panel form-stack">
          <h3 style={{ marginBottom: "1rem" }}>Cấu hình hệ thống</h3>



          <label>{t("admin.maxWorkers")}</label>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <input 
              type="range" 
              min="1" 
              max="10" 
              step="1" 
              value={settings.max_workers} 
              onChange={(e) => onChange("max_workers", Number(e.target.value))} 
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
            

          </div>

          <div className="button-row" style={{ marginTop: "1.5rem" }}>
            <button className="btn" onClick={onSave} disabled={saving} style={{ width: "100%" }}>
              {saving ? t("common.loading") : t("admin.save")}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
