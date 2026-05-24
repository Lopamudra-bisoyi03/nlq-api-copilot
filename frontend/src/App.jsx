import { useState, useRef, useEffect } from "react";

const SAMPLE_QUERIES = [
  "Show me portfolio for client 42",
  "Get last 5 transactions for Sunita Rao (client 17)",
  "List all advisors and their AUM",
  "What's the current market summary?",
  "How is Vikram Nair's (client 88) portfolio doing?",
];

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function ToolBadge({ tool }) {
  const colors = {
    get_portfolio:     { bg: "#0d2b1f", border: "#00e676", text: "#00e676" },
    get_transactions:  { bg: "#1a1a00", border: "#ffd600", text: "#ffd600" },
    list_advisors:     { bg: "#0d1b2b", border: "#40c4ff", text: "#40c4ff" },
    get_market_summary:{ bg: "#2b0d0d", border: "#ff5252", text: "#ff5252" },
  };
  const c = colors[tool] || { bg: "#1a1a1a", border: "#888", text: "#888" };
  return (
    <span style={{
      display: "inline-block",
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text,
      borderRadius: 4,
      padding: "2px 10px",
      fontSize: 11,
      fontFamily: "monospace",
      letterSpacing: "0.05em",
      marginBottom: 8,
    }}>
      ⚙ {tool}
    </span>
  );
}

function DataBlock({ data }) {
  if (!data) return null;
  return (
    <pre style={{
      background: "#0a0f0a",
      border: "1px solid #1e3a1e",
      borderRadius: 6,
      padding: "12px 16px",
      fontSize: 12,
      color: "#a8d5a2",
      overflowX: "auto",
      margin: "8px 0",
      fontFamily: "'Fira Code', 'Cascadia Code', monospace",
      lineHeight: 1.6,
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function Message({ msg }) {
  if (msg.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <div style={{
          background: "linear-gradient(135deg, #003322, #004433)",
          border: "1px solid #00cc66",
          borderRadius: "12px 12px 2px 12px",
          padding: "10px 16px",
          maxWidth: "70%",
          color: "#e0ffe8",
          fontSize: 14,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #00cc66, #009944)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#000",
        }}>AI</div>
        <span style={{ color: "#555", fontSize: 11, fontFamily: "monospace" }}>copilot</span>
      </div>

      {msg.tool_used && <ToolBadge tool={msg.tool_used} />}

      {msg.tool_inputs && (
        <div style={{ color: "#666", fontSize: 12, fontFamily: "monospace", marginBottom: 6 }}>
          inputs → {JSON.stringify(msg.tool_inputs)}
        </div>
      )}

      <DataBlock data={msg.data} />

      {msg.summary && (
        <div style={{
          color: "#cce8cc",
          fontSize: 14,
          lineHeight: 1.7,
          fontFamily: "'IBM Plex Sans', sans-serif",
          borderLeft: "2px solid #00cc66",
          paddingLeft: 12,
          marginTop: 8,
        }}>
          {msg.summary}
        </div>
      )}

      {msg.error && (
        <div style={{ color: "#ff5252", fontSize: 13, fontFamily: "monospace" }}>
          ✗ {msg.error}
        </div>
      )}

      {msg.loading && (
        <div style={{ color: "#00cc66", fontSize: 13, fontFamily: "monospace", animation: "blink 1s infinite" }}>
          routing query<span className="dots">...</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendQuery(q) {
    const query = q || input.trim();
    if (!query) return;
    setInput("");

    setMessages(prev => [...prev, { role: "user", content: query }]);
    setMessages(prev => [...prev, { role: "assistant", loading: true }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          tool_used: data.tool_used,
          tool_inputs: data.tool_inputs,
          data: data.data,
          summary: data.summary,
        };
        return updated;
      });
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          error: "Failed to reach backend. Is the server running?",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050a05",
      color: "#e0ffe8",
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #0d2b0d",
        padding: "16px 28px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "#060b06",
      }}>
        <div style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: 11,
          color: "#00cc66",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}>
          ◈ NLQ API COPILOT
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          fontSize: 11,
          color: "#2d5a2d",
          fontFamily: "monospace",
          letterSpacing: "0.05em",
        }}>
          model: claude-opus-4-5 · tool-calling · wealth management
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#00cc66",
          boxShadow: "0 0 6px #00cc66",
        }} />
      </div>

      {/* Sample queries */}
      {messages.length === 0 && (
        <div style={{ padding: "48px 28px 0" }}>
          <div style={{ color: "#2d5a2d", fontSize: 12, fontFamily: "monospace", marginBottom: 20, letterSpacing: "0.1em" }}>
            — TRY THESE QUERIES —
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {SAMPLE_QUERIES.map((q, i) => (
              <button key={i} onClick={() => sendQuery(q)} style={{
                background: "transparent",
                border: "1px solid #1a3a1a",
                borderRadius: 6,
                color: "#5a9a5a",
                padding: "8px 14px",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseOver={e => { e.target.style.borderColor = "#00cc66"; e.target.style.color = "#00ff77"; }}
              onMouseOut={e => { e.target.style.borderColor = "#1a3a1a"; e.target.style.color = "#5a9a5a"; }}
              >
                {q}
              </button>
            ))}
          </div>

          <div style={{
            marginTop: 64,
            color: "#1a3a1a",
            fontSize: 11,
            fontFamily: "monospace",
            lineHeight: 2,
          }}>
            <div>AVAILABLE TOOLS</div>
            <div>├── get_portfolio(client_id)         → portfolio value, returns, allocation</div>
            <div>├── get_transactions(client_id, limit) → recent buy/sell activity</div>
            <div>├── list_advisors()                   → all advisors with AUM & ratings</div>
            <div>└── get_market_summary()              → NIFTY 50, SENSEX, gainers/losers</div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, padding: "28px 28px 0", overflowY: "auto", maxWidth: 860, width: "100%", margin: "0 auto", alignSelf: "stretch" }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "20px 28px",
        borderTop: "1px solid #0d2b0d",
        display: "flex",
        gap: 12,
        maxWidth: 860,
        width: "100%",
        margin: "0 auto",
        alignSelf: "stretch",
      }}>
        <div style={{
          color: "#00cc66",
          fontFamily: "monospace",
          fontSize: 16,
          paddingTop: 10,
        }}>›</div>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && sendQuery()}
          placeholder="Ask anything about clients, portfolios, markets..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            borderBottom: "1px solid #1a3a1a",
            outline: "none",
            color: "#e0ffe8",
            fontSize: 14,
            fontFamily: "'IBM Plex Sans', sans-serif",
            padding: "8px 0",
            caretColor: "#00cc66",
          }}
        />
        <button
          onClick={() => sendQuery()}
          disabled={loading || !input.trim()}
          style={{
            background: loading ? "#0d2b0d" : "linear-gradient(135deg, #00cc66, #009944)",
            border: "none",
            borderRadius: 6,
            color: loading ? "#2d5a2d" : "#000",
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            fontFamily: "monospace",
            letterSpacing: "0.05em",
            transition: "all 0.15s",
          }}
        >
          {loading ? "..." : "SEND"}
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Fira+Code:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #050a05; }
        ::-webkit-scrollbar-thumb { background: #1a3a1a; border-radius: 2px; }
        @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }
      `}</style>
    </div>
  );
}
