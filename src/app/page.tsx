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
    setLogs(["[0ms] INITIATING_CONNECTION..."]);

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
          `[${elapsed}ms] RECV_${chunk.length}B_PACKET`,
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
        `[${Date.now() - startTime}ms] COMPLETE`,
      ]);
    } catch {
      setLogs((prev) => [...prev.slice(-4), `[ERROR] INTERRUPTED`]);
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

      const statsHeader = res.headers.get("X-PJSON-Stats");
      if (statsHeader) {
        const stats = JSON.parse(statsHeader);
        setSize({ json: stats.json, pj: stats.pj });
      } else {
        setSize({ json: input.length, pj: pj.length });
      }
    } catch {
      alert("Encode Fail");
    }
  };

  const onDecode = async () => {
    try {
      const res = await fetch("/api/pj", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: output,
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setInput(JSON.stringify(json, null, 2));
    } catch {
      alert("Decode Fail");
    }
  };

  return (
    <main className="min-h-screen bg-[#020202] text-zinc-400 font-sans selection:bg-emerald-500/30">
      <div className="max-w-[1200px] mx-auto p-8 space-y-12">
        {/* TOP BRANDING */}
        <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-zinc-900 pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white italic flex items-center gap-3">
              <span className="text-emerald-500 not-italic">Ω</span> PJSON_OMEGA
            </h1>
            <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.5em] mt-2">
              The Essential Machine-Density Engine
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-zinc-700 uppercase mb-1">
              Compression_Delta
            </div>
            <div className="text-3xl font-black text-emerald-500 font-mono tracking-tighter italic">
              {size.json > 0
                ? `-${Math.round((1 - size.pj / size.json) * 100)}%`
                : "00.0%"}
            </div>
          </div>
        </header>

        {/* PRIMARY: ENCODE/DECODE MATRIX */}
        <section className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="bg-[#080808] rounded-[2.5rem] border border-zinc-900 shadow-2xl overflow-hidden p-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <div className="relative group">
                <div className="absolute top-6 left-6 z-10 text-[9px] font-bold text-zinc-700 uppercase tracking-widest pointer-events-none group-focus-within:text-zinc-400 transition-colors">
                  JSON_BUFFER
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full h-[500px] bg-black rounded-[2rem] p-12 pt-16 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-zinc-800 transition-all text-zinc-300 resize-none"
                  placeholder="Input Raw JSON..."
                />
              </div>
              <div className="relative group">
                <div className="absolute top-6 left-6 z-10 text-[9px] font-bold text-zinc-700 uppercase tracking-widest pointer-events-none group-focus-within:text-zinc-600 transition-colors">
                  PJSON_STREAM
                </div>
                <textarea
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  className="w-full h-[500px] bg-black rounded-[2rem] p-12 pt-16 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-900/30 transition-all text-emerald-500/80 resize-none break-all"
                  placeholder="PJSON Bytes..."
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <button
              type="button"
              onClick={onEncode}
              className="w-full md:w-64 py-5 rounded-2xl bg-white text-black font-black text-sm tracking-[0.2em] uppercase hover:bg-emerald-400 transition-all hover:shadow-[0_0_40px_rgba(52,211,153,0.3)] active:scale-95"
            >
              Pack_Omega
            </button>
            <button
              type="button"
              onClick={onDecode}
              className="w-full md:w-64 py-5 rounded-2xl bg-zinc-900 text-white border border-zinc-800 font-black text-sm tracking-[0.2em] uppercase hover:bg-zinc-800 transition-all active:scale-95"
            >
              Unpack_JSON
            </button>
          </div>
        </section>

        {/* SECONDARY: LIVE VISUALIZATION (FORMERLY STREAM) */}
        <section className="pt-12 border-t border-zinc-900 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tighter italic uppercase flex items-center gap-2">
                <span className="w-2 h-2 bg-zinc-800 rounded-full" />
                Live_Visualization
              </h2>
              <p className="text-[10px] font-mono text-zinc-700 uppercase">
                Interactive Proof-of-Concept Hydration
              </p>
            </div>
            <button
              type="button"
              onClick={startStream}
              disabled={isStreaming}
              className={`px-10 py-3 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all duration-500 ${
                isStreaming
                  ? "bg-zinc-900 text-zinc-700 cursor-not-allowed"
                  : "bg-transparent text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/5"
              }`}
            >
              {isStreaming ? "Receiving_Bytes..." : "Start_Live_Hydration"}
            </button>
          </div>

          {(isStreaming || !!streamData) && (
            <div className="bg-[#080808] rounded-[2rem] border border-zinc-900 p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl">
              {/* PRIMARY FOCUS: HYDRATION & LOGS */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 bg-black rounded-[2rem] p-8 border border-zinc-900/50 h-[500px] overflow-auto scrollbar-hide">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest italic">
                      Structure_Hydration_Matrix
                    </span>
                    <span className="text-[10px] font-mono text-emerald-500/30">
                      RE_HYDRATING_BYTES...
                    </span>
                  </div>
                  <pre className="text-emerald-500/90 font-mono text-xs leading-relaxed">
                    {streamData
                      ? JSON.stringify(streamData, null, 2)
                      : "// WAITING_FOR_OMEGA_TRANSMISSION..."}
                  </pre>
                </div>
                <div className="bg-black rounded-[2rem] p-8 border border-zinc-900/50 h-[500px] overflow-auto scrollbar-hide">
                  <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest italic mb-6 block">
                    Diagnostics
                  </span>
                  <div className="space-y-2">
                    {logs.map((log, i) => (
                      <div
                        key={i}
                        className="text-[10px] font-mono text-zinc-500 leading-tight border-l border-zinc-900 pl-3"
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SUPPORTING FOCUS: VISUAL PACKAGES */}
              <div className="space-y-6 pt-12 border-t border-zinc-900/50">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">
                    Visual_Package_Matrix
                  </span>
                  <span className="text-[9px] font-mono text-zinc-800">
                    TOTAL_NODES: 050
                  </span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-10 lg:grid-cols-25 gap-2">
                  {Array.from({ length: 50 }).map((_, i) => {
                    const item = streamData?.sequence?.[i];
                    return (
                      <div
                        key={i}
                        className={`h-8 rounded flex items-center justify-center transition-all duration-700 border ${
                          item
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 scale-100"
                            : "bg-black border-zinc-900 text-zinc-900 scale-90"
                        }`}
                      >
                        <span className="text-[8px] font-black">
                          {item ? (i + 1).toString().padStart(2, "0") : ".."}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
