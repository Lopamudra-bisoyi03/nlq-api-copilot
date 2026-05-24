"""
NLQ API Copilot — Natural Language → API Router
Uses Claude tool-calling to route natural-language queries to the correct backend endpoint.
"""

import json
import random
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic

app = FastAPI(title="NLQ API Copilot", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env

# ─── Mock data ────────────────────────────────────────────────────────────────

CLIENTS = {
    "42": {"name": "Arjun Mehta", "risk_profile": "Moderate", "advisor": "Priya Sharma"},
    "17": {"name": "Sunita Rao",  "risk_profile": "Conservative", "advisor": "Rahul Gupta"},
    "88": {"name": "Vikram Nair", "risk_profile": "Aggressive", "advisor": "Anjali Patel"},
}

def _mock_portfolio(client_id: str):
    c = CLIENTS.get(client_id, {"name": "Unknown Client", "risk_profile": "N/A", "advisor": "N/A"})
    return {
        "client_id": client_id,
        "client_name": c["name"],
        "total_value": round(random.uniform(500_000, 5_000_000), 2),
        "returns_ytd": round(random.uniform(-5, 25), 2),
        "allocation": {"equities": 60, "debt": 25, "gold": 10, "cash": 5},
        "risk_profile": c["risk_profile"],
        "last_updated": datetime.utcnow().isoformat(),
    }

def _mock_transactions(client_id: str, limit: int = 5):
    types = ["BUY", "SELL", "SIP", "REDEMPTION"]
    assets = ["NIFTY 50 Index Fund", "HDFC Mid Cap", "SBI Liquid Fund", "Gold ETF", "US Tech FOF"]
    return {
        "client_id": client_id,
        "transactions": [
            {
                "txn_id": f"TXN{random.randint(10000,99999)}",
                "date": (datetime.utcnow() - timedelta(days=random.randint(1, 90))).strftime("%Y-%m-%d"),
                "type": random.choice(types),
                "asset": random.choice(assets),
                "amount": round(random.uniform(5000, 500000), 2),
                "units": round(random.uniform(10, 2000), 3),
            }
            for _ in range(limit)
        ],
    }

def _mock_advisors():
    return {
        "advisors": [
            {"id": "A1", "name": "Priya Sharma",  "aum": 120_000_000, "clients": 45, "rating": 4.8},
            {"id": "A2", "name": "Rahul Gupta",   "aum":  85_000_000, "clients": 32, "rating": 4.6},
            {"id": "A3", "name": "Anjali Patel",  "aum": 200_000_000, "clients": 78, "rating": 4.9},
        ]
    }

def _mock_market_summary():
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "indices": {
            "NIFTY 50":   {"value": round(random.uniform(22000, 24000), 2), "change_pct": round(random.uniform(-2, 2), 2)},
            "SENSEX":     {"value": round(random.uniform(72000, 80000), 2), "change_pct": round(random.uniform(-2, 2), 2)},
            "NIFTY BANK": {"value": round(random.uniform(47000, 52000), 2), "change_pct": round(random.uniform(-2, 2), 2)},
        },
        "top_gainers": ["Adani Ports", "Bajaj Finance", "HDFC Bank"],
        "top_losers":  ["Tata Motors", "Wipro", "Coal India"],
    }

# ─── Tool definitions for Claude ──────────────────────────────────────────────

TOOLS = [
    {
        "name": "get_portfolio",
        "description": "Retrieve a client's portfolio summary including total value, YTD returns, and asset allocation.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_id": {"type": "string", "description": "Numeric client ID (e.g. '42')"}
            },
            "required": ["client_id"],
        },
    },
    {
        "name": "get_transactions",
        "description": "Fetch recent transactions for a client.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_id": {"type": "string", "description": "Numeric client ID"},
                "limit": {"type": "integer", "description": "Number of transactions to return (default 5, max 20)", "default": 5},
            },
            "required": ["client_id"],
        },
    },
    {
        "name": "list_advisors",
        "description": "List all wealth advisors with their AUM, client count, and rating.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_market_summary",
        "description": "Get current Indian market indices, top gainers and losers.",
        "input_schema": {"type": "object", "properties": {}},
    },
]

def execute_tool(name: str, inputs: dict) -> dict:
    if name == "get_portfolio":
        return _mock_portfolio(inputs["client_id"])
    elif name == "get_transactions":
        return _mock_transactions(inputs["client_id"], inputs.get("limit", 5))
    elif name == "list_advisors":
        return _mock_advisors()
    elif name == "get_market_summary":
        return _mock_market_summary()
    else:
        return {"error": f"Unknown tool: {name}"}

# ─── API ───────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    query: str
    tool_used: str | None
    tool_inputs: dict | None
    data: dict | None
    summary: str

SYSTEM_PROMPT = """You are a Wealth Management API Copilot. 
You route natural-language queries from advisors to the correct backend API endpoint using tools.
Always use a tool when one is applicable. After getting the tool result, provide a concise 1-2 sentence summary.
Available clients: IDs 42 (Arjun Mehta), 17 (Sunita Rao), 88 (Vikram Nair).
"""

@app.post("/query", response_model=QueryResponse)
async def handle_query(req: QueryRequest):
    messages = [{"role": "user", "content": req.query}]

    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=TOOLS,
        messages=messages,
    )

    tool_used = None
    tool_inputs = None
    data = None
    summary = ""

    # Check if Claude wants to use a tool
    tool_use_block = next((b for b in response.content if b.type == "tool_use"), None)

    if tool_use_block:
        tool_used = tool_use_block.name
        tool_inputs = tool_use_block.input
        data = execute_tool(tool_used, tool_inputs)

        # Send tool result back for a natural-language summary
        messages += [
            {"role": "assistant", "content": response.content},
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use_block.id,
                        "content": json.dumps(data),
                    }
                ],
            },
        ]
        final = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=512,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )
        summary = next((b.text for b in final.content if hasattr(b, "text")), "")
    else:
        summary = next((b.text for b in response.content if hasattr(b, "text")), "")

    return QueryResponse(
        query=req.query,
        tool_used=tool_used,
        tool_inputs=tool_inputs,
        data=data,
        summary=summary,
    )

@app.get("/health")
def health():
    return {"status": "ok", "model": "claude-opus-4-5"}
