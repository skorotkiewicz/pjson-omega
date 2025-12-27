"use client";
import { useState } from "react";
import { decode } from "@/lib/pj";

interface PJSONItem {
  id: number;
  user: string;
  status: string;
  load: number;
  metrics: {
    cpu: string;
    temp: string;
  };
  tags: string[];
}

interface PJSONStream {
  status: string;
  timestamp: number;
  sequence: PJSONItem[];
  footer?: string;
}

export default function Home() {
  const [input, setInput] = useState(
    '{"hello":"world","count":42,"list":[1,2,3]}',
  );
  const [output, setOutput] = useState("");
  const [size, setSize] = useState({ json: 0, pj: 0 });
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamData, setStreamData] = useState<PJSONStream | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const startStream = async () => {
    setIsStreaming(true);
    setStreamData(null);
    setOutput("");
    setLogs(["[0ms] INITIATING_STREAM..."]);

    try {
      const response = await fetch("/api/pj/stream");
      const reader = response.body?.getReader();
      if (!reader) return;

      let buffer = "";
      const textDecoder = new TextDecoder();
      const startTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = textDecoder.decode(value, { stream: true });
        buffer += chunk;
        const elapsed = Date.now() - startTime;

        setOutput(buffer);
        setLogs((prev) => [
          ...prev.slice(-4),
          `[${elapsed}ms] RECV_${chunk.length}B_CHUNKS`,
        ]);

        try {
          const decoded = decode(buffer) as PJSONStream;
          if (decoded) {
            setStreamData(decoded);
          }
        } catch {
          // Boundaries
        }
      }
      setLogs((prev) => [
        ...prev.slice(-4),
        `[${Date.now() - startTime}ms] DISCONNECT_COMPLETE`,
      ]);
    } catch {
      setLogs((prev) => [...prev.slice(-4), `[ERROR] STREAM_BREAK`]);
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
      if (!res.ok) throw new Error();
      const pj = await res.text();
      setOutput(pj);
      const stats = res.headers.get("X-PJSON-Stats");
      if (stats) setSize(JSON.parse(stats));
    } catch {
      alert("Fail");
    }
  };

  const onDecode = async () => {
    try {
      const res = await fetch("/api/pj", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: output,
      });
      const json = await res.json();
      setInput(JSON.stringify(json, null, 2));
    } catch {
      alert("Fail");
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-emerald-500/30">
      <div className="max-w-[1400px] mx-auto p-6 space-y-8">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#0a0a0a] p-8 rounded-[2rem] border border-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-black">
                Ω
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white italic">
                PJSON_OMEGA
              </h1>
            </div>
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
              Real-Life_Progressive_Hydration
            </p>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <button
              type="button"
              onClick={startStream}
              disabled={isStreaming}
              className={`flex-1 md:flex-none px-8 py-4 rounded-2xl font-bold text-sm tracking-widest transition-all duration-500 relative overflow-hidden group ${
                isStreaming
                  ? "bg-zinc-900 text-zinc-700"
                  : "bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-95"
              }`}
            >
              <span className="relative z-10 uppercase">
                {isStreaming ? "Connecting..." : "Live Re-hydrate"}
              </span>
              {!isStreaming && (
                <div className="absolute inset-0 bg-emerald-400 translate-y-full group-hover:translate-y-[95%] transition-transform duration-500" />
              )}
            </button>
            <div className="hidden md:flex flex-col justify-center border-l border-zinc-800 pl-6">
              <span className="text-[10px] font-mono text-zinc-600 uppercase">
                Saving_Rate
              </span>
              <span className="text-xl font-black text-emerald-500 font-mono tracking-tighter">
                {size.json > 0
                  ? `-${Math.round((1 - size.pj / size.json) * 100)}%`
                  : "00%"}
              </span>
            </div>
          </div>
        </header>

        {/* Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Encoder/Decoder Matrix */}
          <div className="space-y-6">
            <div className="bg-[#0a0a0a] rounded-[2rem] border border-zinc-900 overflow-hidden">
              <div className="px-6 py-4 bg-zinc-900/30 border-b border-zinc-900 flex justify-between items-center">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Encoding_Buffer
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onEncode}
                    className="text-[10px] text-zinc-400 hover:text-white transition-colors"
                  >
                    PACK
                  </button>
                  <span className="text-zinc-800">|</span>
                  <button
                    type="button"
                    onClick={onDecode}
                    className="text-[10px] text-zinc-400 hover:text-white transition-colors"
                  >
                    UNPACK
                  </button>
                </div>
              </div>
              <div className="p-1 grid grid-cols-1 md:grid-cols-2 gap-1 bg-zinc-900/50">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full h-80 bg-black p-6 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-zinc-800 transition-all text-zinc-400 rounded-2xl"
                  placeholder="RAW_JSON_INPUT"
                />
                <textarea
                  readOnly
                  value={output}
                  className="w-full h-80 bg-black p-6 font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-zinc-800 transition-all text-emerald-500/70 rounded-2xl break-all"
                  placeholder="PJSON_STREAM_BUFFER"
                />
              </div>
            </div>
          </div>

          {/* Real-Life Dashboard Render */}
          <div className="bg-[#0a0a0a] rounded-[2rem] border border-zinc-900 flex flex-col p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-9xl pointer-events-none">
              RAW
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-white uppercase tracking-tighter">
                  Process_Control_Center
                </h2>
                <p className="text-[10px] font-mono text-zinc-600">
                  LIVE_UI_REHYDRATION_ENGINE
                </p>
              </div>
              <div className="flex gap-2">
                {logs.slice(-3).map((log, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-mono bg-emerald-500/5 text-emerald-500/40 px-2 py-1 rounded-full border border-emerald-500/10 animate-in fade-in slide-in-from-right-2"
                  >
                    {log}
                  </span>
                ))}
              </div>
            </div>

            {/* The Matrix Cards */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 overflow-y-auto max-h-[500px] scrollbar-hide pr-2">
              {Array.from({ length: 50 }).map((_, i) => {
                const item = streamData?.sequence?.[i];
                return (
                  <div
                    key={i}
                    className={`group p-3 rounded-2xl border transition-all duration-700 aspect-square flex flex-col justify-between ${
                      item
                        ? "bg-zinc-900/50 border-emerald-500/20 scale-100"
                        : "bg-black border-zinc-900 scale-95 opacity-50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span
                        className={`text-[8px] font-mono font-black ${item ? "text-emerald-500/50" : "text-zinc-800"}`}
                      >
                        [{(i + 1).toString().padStart(3, "0")}]
                      </span>
                      {item && (
                        <div
                          className={`w-1 h-1 rounded-full ${item.status === "ACTIVE" ? "bg-emerald-500" : item.status === "STANDBY" ? "bg-amber-500" : "bg-red-500"} animate-pulse`}
                        />
                      )}
                    </div>

                    {item ? (
                      <div className="space-y-1 animate-in fade-in zoom-in-95 duration-500">
                        <div className="text-[9px] font-black text-zinc-300 truncate tracking-tight">
                          {item.user || "Initializing..."}
                        </div>
                        <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-1000"
                            style={{ width: `${item.load ?? 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[7px] font-mono text-zinc-500">
                          <span>CPU</span>
                          <span className="text-zinc-400">
                            {item.metrics?.cpu ?? "0"}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-1/2 h-0.5 bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-zinc-800 animate-loading-bar ${isStreaming ? "opacity-1" : "opacity-0"}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
