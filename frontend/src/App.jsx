import { useState } from "react";

export default function App() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const mockResponses = {
    portfolio:
      "Portfolio for Client 42: Total Value ₹12.4L, Equity 68%, Debt 22%, Cash 10%",
    transactions:
      "Recent transactions fetched successfully for client account.",
    analytics:
      "Risk profile: Moderate. Suggested allocation rebalancing available.",
    client:
      "Client 42 profile loaded successfully.",
  };

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setLoading(true);

    setTimeout(() => {
      let result = "No matching API route found.";

    if (query.toLowerCase().includes("portfolio")) {
      const clientMatch = query.match(/\d+/);

      const clientId = clientMatch ? clientMatch[0] : "Unknown";

      result = `Portfolio for Client ${clientId}: Total Value ₹12.4L, Equity 68%, Debt 22%, Cash 10%`;
    } else if (query.toLowerCase().includes("transaction")) {
      result = mockResponses.transactions;
    } else if (query.toLowerCase().includes("analytics")) {
      result = mockResponses.analytics;
    } else if (query.toLowerCase().includes("client")) {
      result = mockResponses.client;
    }

      setResponse(result);
      setLoading(false);
    }, 1200);
  };

  return (
    <div
      style={{
        background: "#0b1020",
        minHeight: "100vh",
        color: "white",
        fontFamily: "Arial",
        padding: "40px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "48px",
            marginBottom: "10px",
          }}
        >
          NLQ API Copilot
        </h1>

        <p
          style={{
            color: "#94a3b8",
            marginBottom: "40px",
            fontSize: "18px",
          }}
        >
          Natural Language → API Router using Claude Tool Calling
        </p>

        <div
          style={{
            background: "#111827",
            padding: "30px",
            borderRadius: "16px",
            border: "1px solid #1e293b",
          }}
        >
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Example: Show me portfolio for client 42"
            rows={4}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "10px",
              border: "1px solid #334155",
              background: "#020617",
              color: "white",
              fontSize: "16px",
              resize: "none",
            }}
          />

          <button
            onClick={handleSubmit}
            style={{
              marginTop: "20px",
              background: "#2563eb",
              border: "none",
              color: "white",
              padding: "14px 24px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Run Query
          </button>

          {loading && (
            <div
              style={{
                marginTop: "20px",
                color: "#38bdf8",
              }}
            >
              Routing request through AI workflow...
            </div>
          )}

          {response && !loading && (
            <div
              style={{
                marginTop: "30px",
                background: "#020617",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid #334155",
              }}
            >
              <h3 style={{ marginBottom: "10px" }}>Structured Response</h3>

              <p
                style={{
                  color: "#cbd5e1",
                  lineHeight: "1.6",
                }}
              >
                {response}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}