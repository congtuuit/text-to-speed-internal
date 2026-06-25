import React, { useState } from "react";

export default function RequestChart({ data, filter, onFilterChange, autoRefresh, onToggleAutoRefresh, onManualRefresh }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // SVG dimensions
  const width = 600;
  const height = 240;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Process data
  const chartData = data || [];
  const maxCount = Math.max(...chartData.map((d) => d.count), 5); // default min height scale of 5

  // Map to SVG coordinates
  const points = chartData.map((d, index) => {
    const x = paddingLeft + (index / Math.max(chartData.length - 1, 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.count / maxCount) * chartHeight;
    return { ...d, x, y, index };
  });

  // SVG Line path
  let pathD = "";
  let areaD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
    areaD = pathD + ` L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  }

  // Formatting labels
  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    // YYYY-MM-DD HH:MM
    if (filter === "minute") return timeStr.split(" ")[1] || timeStr;
    if (filter === "hour") return timeStr.split(" ")[1] || timeStr;
    // YYYY-MM-DD
    return timeStr.substring(5) || timeStr;
  };

  return (
    <section className="glass-panel" style={{ marginTop: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h3 style={{ marginBottom: "0.25rem" }}>📈 Lưu lượng API Requests</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Số lượng yêu cầu API gửi đến máy chủ được tổng hợp theo thời gian.
          </p>
        </div>
        
        {/* Day/Hour/Minute Filters and Auto Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {autoRefresh ? "Auto" : "Tắt Auto"}
            </span>
            <label className="toggle-switch" title="Tự động cập nhật">
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={onToggleAutoRefresh} 
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

          <div style={{ display: "flex", gap: "0.35rem", background: "rgba(0,0,0,0.2)", padding: "0.25rem", borderRadius: "8px" }}>
            {["minute", "hour", "day"].map((f) => (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                style={{
                  background: filter === f ? "var(--primary)" : "transparent",
                  color: "#fff",
                  border: "none",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  textTransform: "capitalize",
                  transition: "all 0.2s"
                }}
              >
                {f === "minute" ? "Phút" : f === "hour" ? "Giờ" : "Ngày"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div style={{ height: `${height}px`, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Chưa ghi nhận dữ liệu lưu lượng trong khoảng thời gian này
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
              const y = paddingTop + chartHeight * r;
              const val = Math.round(maxCount * (1 - r));
              return (
                <g key={i}>
                  <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fill="var(--text-muted)" style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Area Path */}
            {areaD && <path d={areaD} fill="url(#chartGlow)" />}

            {/* Line Path */}
            {pathD && <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />}

            {/* Highlighted hover line */}
            {hoveredPoint && (
              <line
                x1={hoveredPoint.x}
                y1={paddingTop}
                x2={hoveredPoint.x}
                y2={paddingTop + chartHeight}
                stroke="rgba(139, 92, 246, 0.3)"
                strokeDasharray="4"
              />
            )}

            {/* X-axis time labels (show first, middle, last to avoid crowding) */}
            {points.map((p, i) => {
              // Show label if first, last, or exact multiples
              const shouldShowLabel = 
                points.length < 8 || 
                i === 0 || 
                i === points.length - 1 || 
                i === Math.floor(points.length / 2) ||
                (points.length > 15 && i % Math.floor(points.length / 4) === 0);

              if (!shouldShowLabel) return null;

              return (
                <text
                  key={i}
                  x={p.x}
                  y={paddingTop + chartHeight + 18}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  style={{ fontSize: "0.7rem", fontFamily: "monospace" }}
                >
                  {formatTime(p.time)}
                </text>
              );
            })}

            {/* Interaction trigger overlay dots */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={hoveredPoint?.index === i ? 6 : 3}
                fill={hoveredPoint?.index === i ? "#fff" : "var(--primary)"}
                stroke="var(--primary)"
                strokeWidth={hoveredPoint?.index === i ? 3 : 1}
                style={{ cursor: "pointer", transition: "all 0.1s" }}
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}
          </svg>

          {/* Interactive HTML Tooltip floating */}
          {hoveredPoint && (
            <div
              style={{
                position: "absolute",
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100 - 30}%`,
                transform: "translate(-50%, -100%)",
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.15)",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                pointerEvents: "none",
                zIndex: 10,
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                color: "#fff",
                fontSize: "0.8rem",
                textAlign: "center",
                minWidth: "100px",
                transition: "left 0.1s, top 0.1s"
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "0.15rem" }}>{hoveredPoint.time}</div>
              <strong style={{ color: "var(--primary)" }}>{hoveredPoint.count} requests</strong>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
