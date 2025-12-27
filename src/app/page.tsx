"use client";
import { useState } from "react";
import { decode } from "@/lib/pj";

export default function Home() {
  const [input, setInput] = useState(
    '{"hello":"world","count":42,"list":[1,2,3]}',
  );
  const [output, setOutput] = useState("");
  const [size, setSize] = useState({ json: 0, pj: 0 });
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamData, setStreamData] = useState<unknown>(null);

  const startStream = async () => {
    setIsStreaming(true);
    setStreamData(null);
    setOutput("");

    try {
      const response = await fetch("/api/pj/stream");
      const reader = response.body?.getReader();
      if (!reader) return;

      let buffer = "";
      const textDecoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = textDecoder.decode(value, { stream: true });
        buffer += chunk;
        setOutput(buffer); // Show raw stream progress

        try {
          const decoded = decode(buffer);
          if (decoded) setStreamData(decoded);
        } catch {
          // Partial data might fail decoding markers at boundaries, just wait for more
        }
      }
    } catch (err) {
      console.error("Streaming error:", err);
    } finally {
      setIsStreaming(false);
    }
  };

  const onEncode = async () => {
    try {
      const res = await fetch("/api/pj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: input,
      });
      if (!res.ok) throw new Error("Server rejected JSON");
      const pj = await res.text();
      setOutput(pj);

      const statsHeader = res.headers.get("X-PJSON-Stats");
      if (statsHeader) {
        const stats = JSON.parse(statsHeader);
        setSize({ json: stats.json, pj: stats.pj });
      } else {
        setSize({ json: input.length, pj: pj.length });
      }
    } catch {
      alert("Encoding Failed");
    }
  };

  const onDecode = async () => {
    try {
      const res = await fetch("/api/pj", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: output,
      });
      if (!res.ok) throw new Error("Server rejected PJ");
      const json = await res.json();
      setInput(JSON.stringify(json, null, 2));
    } catch {
      alert("Decoding Failed");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-2xl">
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter bg-gradient-to-br from-blue-400 via-indigo-500 to-emerald-400 bg-clip-text text-transparent">
            PJ ULTRA STREAM
          </h1>
          <p className="text-xs text-zinc-500 font-mono uppercase tracking-[0.2em] mt-1">
            Machine-Density Transmission
          </p>
        </div>
        <button
          type="button"
          onClick={startStream}
          disabled={isStreaming}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 ${
            isStreaming
              ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          }`}
        >
          {isStreaming ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              RECEIVING...
            </span>
          ) : (
            "START LIVE STREAM"
          )}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2 group">
          <label
            htmlFor="json-input"
            className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2"
          >
            JSON Matrix
          </label>
          <div className="relative">
            <textarea
              id="json-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 font-mono text-sm h-64 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all resize-none shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-2 group">
          <label
            htmlFor="pj-output"
            className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2"
          >
            Encoded Stream
          </label>
          <div className="relative">
            <textarea
              id="pj-output"
              value={output}
              readOnly
              className="w-full bg-zinc-950 border-emerald-900/30 border rounded-2xl p-5 font-mono text-[10px] h-64 text-emerald-500/80 focus:outline-none overflow-x-hidden break-all shadow-inner leading-relaxed"
            />
            <div className="absolute top-4 right-4 flex gap-2">
              {size.json > 0 && (
                <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20">
                  -{Math.round((1 - size.pj / size.json) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          type="button"
          onClick={onEncode}
          className="group relative bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-blue-500/20 flex items-center gap-2 overflow-hidden"
        >
          <span className="relative z-10 font-black tracking-widest">PACK</span>
        </button>
        <button
          type="button"
          onClick={onDecode}
          className="bg-zinc-800 hover:bg-zinc-700 px-8 py-3 rounded-xl font-bold text-sm transition-all border border-zinc-700/50 tracking-widest uppercase flex items-center gap-2"
        >
          UNPACK
        </button>
      </div>

      {(size.json > 0 || isStreaming || !!streamData) && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/80 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Live RE-HYDRATION
              </span>
            </div>

            <div className="bg-black/50 rounded-2xl border border-zinc-800/50 p-6 h-96 overflow-auto scrollbar-hide relative group">
              <pre className="text-indigo-300 font-mono text-xs leading-relaxed">
                {streamData ? (
                  JSON.stringify(streamData, null, 2)
                ) : (
                  <span className="text-zinc-700 italic">
                    WAITING_FOR_PAYLOAD...
                  </span>
                )}
              </pre>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
