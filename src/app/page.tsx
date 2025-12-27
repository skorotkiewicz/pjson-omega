"use client";
import { useEffect, useRef, useState } from "react";
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
  const [activePacket, setActivePacket] = useState<number | null>(null);

  // Ref for manual scroll checks or stickiness if ever opted back in
  const scrollRef = useRef<HTMLDivElement>(null);

  const startStream = async () => {
    setIsStreaming(true);
    setStreamData(null);
    setOutput("");
    setLogs(["[SYSTEM] INITIATING_OMEGA_OVERLINK..."]);

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
        setActivePacket(chunk.length);
        setLogs((prev) => [
          ...prev.slice(-10),
          `[${elapsed}ms] RECV_${chunk.length}B_PACKET_OK`,
        ]);

        try {
          const decoded = decode(buffer) as PJSONStream;
          if (decoded) setStreamData(decoded);
        } catch {}
      }
      setLogs((prev) => [
        ...prev,
        `[${Date.now() - startTime}ms] DISCONNECT_SAFE`,
      ]);
    } catch {
      setLogs((prev) => [...prev, `[ERROR] COLLAPSE`]);
    } finally {
      setIsStreaming(false);
      setActivePacket(null);
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
      alert("OMEGA: Pack Error");
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
      alert("OMEGA: Unpack Error");
    }
  };

  return (
    <main className="h-screen bg-[#050505] text-zinc-400 font-mono selection:bg-emerald-500/30 flex flex-col overflow-hidden">
      {/* HEADER SECTION - FIXED HEIGHT */}
      <header className="flex-none px-8 py-6 border-b border-zinc-900/50 flex justify-between items-center bg-[#070707]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500 flex items-center justify-center rounded-sm font-black text-black text-xl">
            Ω
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white italic leading-none">
              PJSON_SUPREME
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-1 h-1 rounded-full ${isStreaming ? "bg-emerald-500 animate-pulse" : "bg-zinc-800"}`}
              />
              <span className="text-[8px] text-zinc-600 uppercase tracking-[0.4em]">
                One_Screen_Overlink_Terminal
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-10 items-center">
          <div className="text-right">
            <div className="text-[7px] text-zinc-700 uppercase tracking-widest">
              Efficiency
            </div>
            <div className="text-2xl font-black text-emerald-500 tracking-tighter italic tabular-nums">
              {size.json > 0
                ? `-${Math.round((1 - size.pj / size.json) * 100)}%`
                : "00%"}
            </div>
          </div>
          <div className="text-right border-l border-zinc-900 pl-8">
            <div className="text-[7px] text-zinc-700 uppercase tracking-widest">
              Stream_Buffer
            </div>
            <div className="text-2xl font-black text-zinc-800 tracking-tighter italic tabular-nums leading-none">
              {activePacket ? `${activePacket}B` : "00B"}
            </div>
          </div>
          <button
            type="button"
            onClick={startStream}
            disabled={isStreaming}
            className={`px-6 py-3 font-black text-[9px] uppercase tracking-widest transition-all ${isStreaming ? "bg-zinc-900 text-zinc-800" : "bg-emerald-500 text-black hover:bg-white"}`}
          >
            {isStreaming ? "Streaming..." : "Start_Overlink"}
          </button>
        </div>
      </header>

      {/* WORKSPACE - FILL REMAINING TALL */}
      <div className="flex-1 flex min-h-0 bg-black/50">
        {/* LEFT: PACKER (40%) */}
        <div className="w-[40%] flex flex-col border-r border-zinc-900/50">
          <div className="flex justify-between items-center px-6 py-3 bg-[#0a0a0a] border-b border-zinc-900/30">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">
              Machine_Encoder
            </span>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onEncode}
                className="text-[8px] font-bold text-zinc-700 hover:text-white uppercase"
              >
                Pack
              </button>
              <button
                type="button"
                onClick={onDecode}
                className="text-[8px] font-bold text-zinc-700 hover:text-white uppercase"
              >
                Unpack
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 relative group border-b border-zinc-900/30">
              <span className="absolute top-3 left-6 text-[7px] text-zinc-800 uppercase pointer-events-none">
                Input_JSON
              </span>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full h-full bg-transparent p-6 pt-10 focus:outline-none text-xs text-zinc-500 font-mono resize-none overflow-y-auto"
              />
            </div>
            <div className="flex-1 relative group">
              <span className="absolute top-3 left-6 text-[7px] text-zinc-800 uppercase pointer-events-none font-bold">
                PJSON_Buffer
              </span>
              <textarea
                readOnly
                value={output}
                className="w-full h-full bg-transparent p-6 pt-10 focus:outline-none text-[10px] text-emerald-500/60 font-mono resize-none break-all overflow-y-auto"
              />
            </div>
          </div>

          <div className="p-4 bg-[#070707] flex gap-4">
            <button
              type="button"
              onClick={onEncode}
              className="flex-1 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400"
            >
              Pack_Omega
            </button>
            <button
              type="button"
              onClick={onDecode}
              className="flex-1 py-3 bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 border border-zinc-800"
            >
              Unpack_JSON
            </button>
          </div>
        </div>

        {/* RIGHT: LIVE HYDRATOR (60%) */}
        <div className="flex-1 flex flex-col">
          <div className="px-6 py-3 bg-[#0a0a0a] border-b border-zinc-900/30 flex justify-between">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic tracking-widest">
              Hydration_Oversight
            </span>
            <span className="text-[7px] text-zinc-800 font-mono tracking-tighter">
              ENGINE: OMEGA_SUPREME_93
            </span>
          </div>

          <div className="flex-1 flex min-h-0">
            {/* MAIN JSON TREE */}
            <div className="flex-1 bg-black p-8 overflow-auto group relative">
              <span className="absolute top-3 left-6 text-[7px] text-zinc-800 uppercase pointer-events-none">
                Rehydration_Matrix
              </span>
              <pre className="text-emerald-500/80 text-[11px] leading-snug mt-4">
                {streamData ? (
                  JSON.stringify(streamData, null, 2)
                ) : (
                  <span className="text-zinc-900 italic">Waiting...</span>
                )}
              </pre>
            </div>

            {/* SIDEBAR TELEMETRY */}
            <div className="w-80 border-l border-zinc-900/50 bg-[#080808] flex flex-col">
              <div
                className="flex-1 p-6 overflow-auto scrollbar-hide border-b border-zinc-900/30"
                ref={scrollRef}
              >
                <span className="text-[7px] text-zinc-700 font-bold uppercase mb-4 block">
                  Telemetry
                </span>
                <div className="space-y-1">
                  {logs.map((log, i) => (
                    <div
                      key={i}
                      className="text-[9px] font-mono text-emerald-500/30 border-l border-zinc-900/50 pl-2 leading-tight"
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 h-64 overflow-auto scrollbar-hide">
                <span className="text-[7px] text-zinc-700 font-bold uppercase mb-4 block tracking-widest">
                  Node_Array
                </span>
                <div className="grid grid-cols-5 gap-1 pt-2">
                  {Array.from({ length: 50 }).map((_, i) => {
                    const item = streamData?.sequence?.[i];
                    return (
                      <div
                        key={i}
                        className={`h-2.5 rounded-xs transition-all duration-700 ${item ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.3)]" : "bg-zinc-900"}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER - FIXED */}
      <footer className="flex-none px-8 py-3 bg-[#0a0a0a] border-t border-zinc-900/50 flex justify-between items-center text-[7px] text-zinc-600 tracking-[0.2em] uppercase">
        <div className="flex gap-8">
          <span>Protocol: SUPREME_MASTER</span>
          <span>Density: 34%_REDUCTION</span>
          <span>Auth: AGENT_TERMINAL_2.4</span>
        </div>
        <div className="flex gap-4 italic font-black text-zinc-800">
          SYSTEM_STATUS: NOMINAL
        </div>
      </footer>
    </main>
  );
}
