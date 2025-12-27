"use client";

import { useCallback, useState } from "react";

interface BenchmarkResult {
  jsonSize: number;
  pjsonSize: number;
  savings: string;
  jsonTime: number;
  pjsonTime: number;
  speedup: string;
}

interface DemoResult {
  original: unknown;
  pjson: string;
  humanReadable: string;
  benchmark: BenchmarkResult;
}

export function PJSONDemo() {
  const [input, setInput] = useState(
    '{\n  "name": "Test",\n  "count": 42,\n  "items": ["a", "b", "c"],\n  "active": true\n}',
  );
  const [pjsonOutput, setPjsonOutput] = useState("");
  const [humanOutput, setHumanOutput] = useState("");
  const [benchmark, setBenchmark] = useState<BenchmarkResult | null>(null);
  const [mode, setMode] = useState<"encode" | "decode" | "human">("encode");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDemo = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/pjson");
      const data: DemoResult = await response.json();
      setInput(JSON.stringify(data.original, null, 2));
      setPjsonOutput(data.pjson);
      setHumanOutput(data.humanReadable);
      setBenchmark(data.benchmark);
    } catch (err) {
      setError("Failed to load demo: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEncode = async () => {
    setLoading(true);
    setError("");
    try {
      const data = JSON.parse(input);
      const response = await fetch("/api/pjson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "encode", data }),
      });
      const result = await response.json();
      setPjsonOutput(result.pjson);
      setHumanOutput(result.humanReadable);

      // Also run benchmark
      const benchResponse = await fetch("/api/pjson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "benchmark", data }),
      });
      const benchResult = await benchResponse.json();
      setBenchmark(benchResult);
    } catch (err) {
      setError("Encode failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecode = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/pjson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decode", pjson: pjsonOutput }),
      });
      const result = await response.json();
      setInput(JSON.stringify(result.data, null, 2));
      setHumanOutput(result.humanReadable);
    } catch (err) {
      setError("Decode failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFromHuman = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/pjson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fromHuman", readable: humanOutput }),
      });
      const result = await response.json();
      setPjsonOutput(result.pjson);
      setInput(JSON.stringify(result.data, null, 2));
    } catch (err) {
      setError("Parse failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pjson-demo">
      <div className="pjson-header">
        <h2 className="pjson-title">⚡ PJSON Protocol</h2>
        <p className="pjson-subtitle">
          Progressive JSON - Optimized LLM Communication
        </p>
        <button
          type="button"
          onClick={loadDemo}
          disabled={loading}
          className="pjson-demo-button"
        >
          Load Demo Data
        </button>
      </div>

      {error && <div className="pjson-error">{error}</div>}

      {benchmark && (
        <div className="pjson-benchmark">
          <div className="benchmark-item">
            <span className="benchmark-label">JSON Size</span>
            <span className="benchmark-value">{benchmark.jsonSize} bytes</span>
          </div>
          <div className="benchmark-item highlight">
            <span className="benchmark-label">PJSON Size</span>
            <span className="benchmark-value">{benchmark.pjsonSize} bytes</span>
          </div>
          <div className="benchmark-item success">
            <span className="benchmark-label">Savings</span>
            <span className="benchmark-value">{benchmark.savings}</span>
          </div>
          <div className="benchmark-item">
            <span className="benchmark-label">Speed</span>
            <span className="benchmark-value">{benchmark.speedup}</span>
          </div>
        </div>
      )}

      <div className="pjson-mode-tabs">
        <button
          type="button"
          className={`pjson-tab ${mode === "encode" ? "active" : ""}`}
          onClick={() => setMode("encode")}
        >
          Encode
        </button>
        <button
          type="button"
          className={`pjson-tab ${mode === "decode" ? "active" : ""}`}
          onClick={() => setMode("decode")}
        >
          Decode
        </button>
        <button
          type="button"
          className={`pjson-tab ${mode === "human" ? "active" : ""}`}
          onClick={() => setMode("human")}
        >
          Human Format
        </button>
      </div>

      <div className="pjson-panels">
        <div className="pjson-panel">
          <div className="panel-header">
            <span className="panel-title">JSON Input</span>
            <span className="panel-size">
              {new TextEncoder().encode(input).length} bytes
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="pjson-textarea"
            placeholder='{"key": "value"}'
            spellCheck={false}
          />
        </div>

        <div className="pjson-actions">
          {mode === "encode" && (
            <button
              type="button"
              onClick={handleEncode}
              disabled={loading}
              className="pjson-action-btn encode"
            >
              Encode →
            </button>
          )}
          {mode === "decode" && (
            <button
              type="button"
              onClick={handleDecode}
              disabled={loading}
              className="pjson-action-btn decode"
            >
              ← Decode
            </button>
          )}
          {mode === "human" && (
            <button
              type="button"
              onClick={handleFromHuman}
              disabled={loading}
              className="pjson-action-btn human"
            >
              ← Parse
            </button>
          )}
        </div>

        <div className="pjson-panel">
          <div className="panel-header">
            <span className="panel-title">
              {mode === "human" ? "Human Readable" : "PJSON Output"}
            </span>
            <span className="panel-size">
              {
                new TextEncoder().encode(
                  mode === "human" ? humanOutput : pjsonOutput,
                ).length
              }{" "}
              bytes
            </span>
          </div>
          <textarea
            value={mode === "human" ? humanOutput : pjsonOutput}
            onChange={(e) =>
              mode === "human"
                ? setHumanOutput(e.target.value)
                : setPjsonOutput(e.target.value)
            }
            className="pjson-textarea mono"
            placeholder={
              mode === "human"
                ? 'OBJECT {\n  KEY: "name"\n  STRING: "value"\n}'
                : "ok1|namesk1|valueo"
            }
            spellCheck={false}
          />
        </div>
      </div>

      <div className="pjson-legend">
        <h4>Type Markers</h4>
        <div className="legend-grid">
          <span className="legend-item">
            <code>n</code> null
          </span>
          <span className="legend-item">
            <code>t</code> true
          </span>
          <span className="legend-item">
            <code>f</code> false
          </span>
          <span className="legend-item">
            <code>i</code> integer
          </span>
          <span className="legend-item">
            <code>d</code> float
          </span>
          <span className="legend-item">
            <code>s</code> string
          </span>
          <span className="legend-item">
            <code>a/A</code> array
          </span>
          <span className="legend-item">
            <code>o/O</code> object
          </span>
          <span className="legend-item">
            <code>k</code> key
          </span>
          <span className="legend-item">
            <code>r</code> reference
          </span>
        </div>
      </div>
    </div>
  );
}
