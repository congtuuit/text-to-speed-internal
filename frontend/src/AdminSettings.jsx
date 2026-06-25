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
    try {
      const res = await fetch(`${API_BASE_URL}/api/self-hosted/check-connection`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ self_hosted_url: settings.self_hosted_url }),
      })
      const data = await res.json()
      if (res.ok && data.success)
        Swal.fire({ icon: "success", title: t("admin.connectionSuccess"), background: "#1e293b", color: "#fff" })
      else throw new Error(data.detail || t("admin.connectionFailed"))
    } catch (err) {
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
      <section className="glass-panel form-stack">
        <label>{t("admin.provider")}</label>
        <select value={settings.provider} onChange={(e) => handleChange("provider", e.target.value)}>
          <option value="self_hosted">Self Hosted</option>
          <option value="fpt">FPT.AI</option>
          <option value="gemini">Gemini</option>
        </select>

        {settings.provider === "self_hosted" && (
          <>
            <label>{t("admin.selfHostedUrl")}</label>
            <input type="text" value={settings.self_hosted_url} onChange={(e) => handleChange("self_hosted_url", e.target.value)} />
            <button className="btn ghost" onClick={handleTestConnection} disabled={testingConnection}>
              {testingConnection ? t("common.processing") : t("admin.testConnection")}
            </button>

            <label>{t("admin.selfHostedVoice")}</label>
            <input type="text" value={settings.self_hosted_voice} onChange={(e) => handleChange("self_hosted_voice", e.target.value)} />

            <label>{t("admin.selfHostedSeed")}</label>
            <input type="text" value={settings.self_hosted_seed} onChange={(e) => handleChange("self_hosted_seed", e.target.value)} />

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
            <textarea value={settings.fpt_api_keys} onChange={(e) => handleChange("fpt_api_keys", e.target.value)} style={{ minHeight: "120px" }} />
            <label>{t("admin.fptSpeed")}</label>
            <input type="number" step="0.1" value={settings.fpt_speed} onChange={(e) => handleChange("fpt_speed", Number(e.target.value))} />
          </>
        )}

        {settings.provider === "gemini" && (
          <>
            <label>{t("admin.apiKey")}</label>
            <input type="text" value={settings.api_key} onChange={(e) => handleChange("api_key", e.target.value)} />

            <label>{t("admin.modelName")}</label>
            <input type="text" value={settings.model_name} onChange={(e) => handleChange("model_name", e.target.value)} />
          </>
        )}

        <label>{t("admin.outputSpeed")}</label>
        <input type="number" step="0.1" min="0.5" max="2" value={settings.output_speed} onChange={(e) => handleChange("output_speed", Number(e.target.value))} />

        <label>{t("admin.maxWorkers")}</label>
        <input type="number" min="1" max="10" value={settings.max_workers} onChange={(e) => handleChange("max_workers", Number(e.target.value))} />

        <div className="button-row">
          <button className="btn" onClick={handleSave} disabled={saving}>
            {saving ? t("common.loading") : t("admin.save")}
          </button>
        </div>
      </section>
    </>
  )
}
