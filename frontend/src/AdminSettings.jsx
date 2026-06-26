import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import { API_BASE_URL } from "./config";

import PageHeader from "./components/PageHeader";
import SettingsTab from "./components/admin/SettingsTab";
import UsersTab from "./components/admin/UsersTab";
import QueuesTab from "./components/admin/QueuesTab";
import MonitorTab from "./components/admin/MonitorTab";
import CacheTab from "./components/admin/CacheTab";

export default function AdminSettings({ authToken, onSettingsSaved }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionState, setConnectionState] = useState("unknown"); // "unknown" | "success" | "failed" | "testing"

  // Admin Dashboard Tabs States
  const [activeTab, setActiveTab] = useState("settings"); // "settings" | "users" | "queues" | "monitor"
  const [users, setUsers] = useState([]);
  const [allJobs, setAllJobs] = useState([]);

  const [loadingUsers, setLoadingUsers] = useState(false);

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" }),
    [authToken]
  );

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
        })
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
        })
      );
  }, [authToken]);

  // Fetch registered users
  useEffect(() => {
    if (activeTab === "users" && authToken) {
      setLoadingUsers(true);
      fetch(`${API_BASE_URL}/api/admin/users`, { headers: authHeaders })
        .then((res) => res.json())
        .then((data) => {
          setUsers(data.users || []);
          setLoadingUsers(false);
        })
        .catch(() => setLoadingUsers(false));
    }
  }, [activeTab, authToken, authHeaders]);

  const handleAssignPlan = async (userId, email, currentPlanId) => {
    const { value: planId } = await Swal.fire({
      title: "Thay đổi gói dịch vụ",
      text: `Chọn gói dịch vụ mới cho tài khoản: ${email}`,
      input: "select",
      inputOptions: {
        free: "Free (Miễn phí)",
        starter: "Starter",
        pro: "Pro",
        studio: "Studio",
        enterprise: "Enterprise (Doanh nghiệp)"
      },
      inputValue: currentPlanId,
      showCancelButton: true,
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
      background: "transparent",
      color: "var(--text-main)",
      customClass: {
        popup: 'glass-panel',
        confirmButton: 'btn success',
        cancelButton: 'btn ghost',
        actions: 'swal2-actions-custom',
        input: 'swal2-input-custom'
      },
      buttonsStyling: false,
      inputValidator: (value) => {
        if (!value) {
          return "Bạn phải chọn một gói dịch vụ!";
        }
      }
    });

    if (planId) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/billing/admin/assign`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ user_id: userId, plan_id: planId }),
        });
        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Cập nhật thành công!",
            text: `Đã thay đổi gói dịch vụ của ${email} sang ${planId.toUpperCase()}`,
            timer: 1500,
            showConfirmButton: false,
            background: "#1e293b",
            color: "#fff"
          });
          // Re-fetch users
          setLoadingUsers(true);
          fetch(`${API_BASE_URL}/api/admin/users`, { headers: authHeaders })
            .then((res) => res.json())
            .then((data) => {
              setUsers(data.users || []);
              setLoadingUsers(false);
            })
            .catch(() => setLoadingUsers(false));
        } else {
          const data = await res.json();
          throw new Error(data.detail || "Không thể cập nhật gói");
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

  // Fetch job queue
  const fetchAllJobs = () => {
    if (activeTab === "queues" && authToken) {
      fetch(`${API_BASE_URL}/api/admin/jobs`, { headers: authHeaders })
        .then((res) => res.json())
        .then((data) => setAllJobs(data.jobs || []))
        .catch((err) => console.error(err));
    }
  };

  useEffect(() => {
    fetchAllJobs();
    if (activeTab === "queues") {
      const interval = setInterval(fetchAllJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, authToken]);



  const handleChange = (field, value) => setSettings((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        Swal.fire({ icon: "success", title: t("admin.save"), timer: 1000, showConfirmButton: false, background: "#1e293b", color: "#fff" });
        onSettingsSaved?.();
      } else throw new Error("Failed to save");
    } catch (err) {
      Swal.fire({ icon: "error", title: t("common.error"), text: err.message, background: "#1e293b", color: "#fff" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionState("testing");
    try {
      const res = await fetch(`${API_BASE_URL}/api/self-hosted/check-connection`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ self_hosted_url: settings.self_hosted_url }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConnectionState("success");
        const info = data.data || {};
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
        });
      } else {
        setConnectionState("failed");
        throw new Error(data.detail || t("admin.connectionFailed"));
      }
    } catch (err) {
      setConnectionState("failed");
      Swal.fire({ icon: "error", title: t("admin.connectionFailed"), text: err.message, background: "#1e293b", color: "#fff" });
    } finally {
      setTestingConnection(false);
    }
  };

  if (!settings) {
    return (
      <>
        <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} />
        <section className="glass-panel empty-state">{t("common.loading")}</section>
      </>
    );
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
        <button 
          className={`tab-btn ${activeTab === "cache" ? "active" : ""}`}
          onClick={() => setActiveTab("cache")}
        >
          📁 Quản lý Cache
        </button>
      </div>

      {/* TAB CONTENT Rendering */}
      {activeTab === "settings" && (
        <SettingsTab
          settings={settings}
          onChange={handleChange}
          onSave={handleSave}
          onTestConnection={handleTestConnection}
          saving={saving}
          testingConnection={testingConnection}
          connectionState={connectionState}
          t={t}
        />
      )}

      {activeTab === "users" && (
        <section className="glass-panel">
          <h3 style={{ marginBottom: "0.25rem" }}>Quản lý Người dùng</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            Danh sách tất cả các tài khoản đăng ký trong hệ thống và thống kê tổng số lượng yêu cầu của họ.
          </p>
          <UsersTab users={users} loading={loadingUsers} onAssignPlan={handleAssignPlan} />
        </section>
      )}

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
          <QueuesTab jobs={allJobs} />
        </section>
      )}

      {activeTab === "monitor" && (
        <MonitorTab
          authToken={authToken}
        />
      )}

      {activeTab === "cache" && (
        <section className="glass-panel">
          <h3 style={{ marginBottom: "0.25rem" }}>Quản lý Cache Tệp Tin</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            Xem danh sách các file audio đã được sinh ra trên đĩa hệ thống, dung lượng chiếm dụng và thực hiện dọn dẹp khi cần thiết.
          </p>
          <CacheTab authToken={authToken} />
        </section>
      )}
    </>
  );
}
