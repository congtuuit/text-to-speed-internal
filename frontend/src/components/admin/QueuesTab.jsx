import React from "react";

export default function QueuesTab({ jobs }) {
  if (jobs.length === 0) {
    return <div style={{ color: "var(--text-muted)", padding: "3rem", textAlign: "center" }}>Không có Job nào trong hệ thống.</div>;
  }

  return (
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
          {jobs.map((job) => {
            const total = job.total || 0;
            const done = job.done || 0;
            const error = job.error || 0;
            const processing = job.processing || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
