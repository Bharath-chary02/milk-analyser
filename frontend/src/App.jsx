import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://milk-backend-ghny.onrender.com";

function getResultColor(result) {
  if (result === "Pure") return "#22c55e";
  if (result === "Adulterated") return "#ef4444";
  if (result === "Detergent") return "#f97316";
  if (result === "Urea") return "#a855f7";
  if (result === "Water") return "#3b82f6";
  if (result === "Watered") return "#06b6d4";
  return "#6b7280";
}

export default function App() {
  const [readings, setReadings] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReadings = async () => {
    try {
      const res = await axios.get(`${API}/api/readings`);
      setReadings(res.data);
      setLatest(res.data[0]);
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ NEW: Trigger API call
  const triggerTest = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/api/trigger`);
      alert("Trigger sent! Arduino will take reading...");
    } catch (err) {
      console.error(err);
      alert("Failed to trigger!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();
    const interval = setInterval(fetchReadings, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "20px", background: "#f1f5f9", minHeight: "100vh" }}>
      
      <h1 style={{ textAlign: "center", color: "#1e293b" }}>
        🥛 Milk Analyser Dashboard
      </h1>

      {/* ✅ TEST BUTTON */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <button
          onClick={triggerTest}
          disabled={loading}
          style={{
            background: loading ? "#94a3b8" : "#3b82f6",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          {loading ? "Sending..." : "Test Now"}
        </button>
      </div>

      {latest && (
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", marginBottom: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <h2 style={{ color: "#475569", marginBottom: "16px" }}>
            Latest Reading
          </h2>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            
            {/* pH */}
            <div style={{ flex: 1, background: "#f8fafc", borderRadius: "8px", padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#3b82f6" }}>
                {latest.ph.toFixed(2)}
              </div>
              <div style={{ color: "#64748b" }}>pH Level</div>
            </div>

            {/* Temperature */}
            <div style={{ flex: 1, background: "#f8fafc", borderRadius: "8px", padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#f97316" }}>
                {latest.temperature.toFixed(1)}°C
              </div>
              <div style={{ color: "#64748b" }}>Temperature</div>
            </div>

            {/* Conductivity */}
            <div style={{ flex: 1, background: "#f8fafc", borderRadius: "8px", padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#8b5cf6" }}>
                {latest.conductivity.toFixed(1)}
              </div>
              <div style={{ color: "#64748b" }}>Conductivity (µS)</div>
            </div>

            {/* Result */}
            <div style={{ flex: 1, background: "#f8fafc", borderRadius: "8px", padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: getResultColor(latest.result) }}>
                {latest.result}
              </div>
              <div style={{ color: "#64748b" }}>Result</div>
              <div style={{ fontSize: "14px", color: "#94a3b8", marginTop: "4px" }}>
                {latest.confidence}% confidence
              </div>
            </div>

          </div>

          <div style={{ marginTop: "12px", color: "#94a3b8", fontSize: "13px", textAlign: "right" }}>
            Last updated: {new Date(latest.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      {/* History Table */}
      <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h2 style={{ color: "#475569", marginBottom: "16px" }}>
          Reading History
        </h2>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>Time</th>
              <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>pH</th>
              <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>Temp (°C)</th>
              <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>Conductivity</th>
              <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>Result</th>
              <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>Confidence</th>
            </tr>
          </thead>

          <tbody>
            {readings.map((r) => (
              <tr key={r._id} style={{ borderTop: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px", color: "#475569", fontSize: "13px" }}>
                  {new Date(r.timestamp).toLocaleString()}
                </td>
                <td style={{ padding: "10px" }}>{r.ph.toFixed(2)}</td>
                <td style={{ padding: "10px" }}>{r.temperature.toFixed(1)}</td>
                <td style={{ padding: "10px" }}>{r.conductivity.toFixed(1)}</td>

                <td style={{ padding: "10px" }}>
                  <span
                    style={{
                      background: getResultColor(r.result),
                      color: "white",
                      padding: "2px 10px",
                      borderRadius: "12px",
                      fontSize: "13px",
                    }}
                  >
                    {r.result}
                  </span>
                </td>

                <td style={{ padding: "10px", color: "#64748b" }}>
                  {r.confidence}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}