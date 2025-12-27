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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

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
          `[${elapsed}ms] RECV_${chunk.length}B_PACKET_CHECKSUM_OK`,
        ]);

        try {
          const decoded = decode(buffer) as PJSONStream;
          if (decoded) {
            setStreamData(decoded);
          }
        } catch {
          // Fragmented payload
        }
      }
      setLogs((prev) => [
        ...prev,
        `[${Date.now() - startTime}ms] TRANSMISSION_TERMINATED_SAFE`,
      ]);
    } catch {
      setLogs((prev) => [...prev, `[ERROR] CRITICAL_BUFFER_COLLAPSE`]);
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
    <main className="min-h-screen bg-[#050505] text-zinc-400 font-mono selection:bg-emerald-500/30 overflow-x-hidden">
      {/* GLITCH OVERLAY BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-50 contrast-150 z-50" />

      <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-12 relative">
        {/* TOP STATUS BAR */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-900/50 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 flex items-center justify-center rounded-sm font-black text-black text-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                Ω
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-white italic leading-none">
                  PJSON_SUPREME
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isStreaming ? "bg-emerald-500 animate-pulse" : "bg-zinc-800"}`}
                  />
                  <span className="text-[9px] text-zinc-600 uppercase tracking-[0.6em]">
                    Ultra_Density_Machine_Interface
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-12 items-end">
            <div className="text-right">
              <div className="text-[8px] text-zinc-700 uppercase mb-1 tracking-widest">
                Hydration_Efficiency
              </div>
              <div className="text-4xl font-black text-emerald-500 tracking-tighter italic tabular-nums">
                {size.json > 0
                  ? `-${Math.round((1 - size.pj / size.json) * 100)}%`
                  : "00%"}
              </div>
            </div>
            <div className="hidden lg:block text-right border-l border-zinc-900 pl-8">
              <div className="text-[8px] text-zinc-700 uppercase mb-1 tracking-widest">
                Active_Packets
              </div>
              <div className="text-4xl font-black text-zinc-800 tracking-tighter italic tabular-nums leading-none">
                {activePacket || "00B"}
              </div>
            </div>
          </div>
        </header>

        {/* WORKSPACE MATRIX */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* PACK/UNPACK SECTION */}
          <div className="space-y-4">
            <div className="bg-[#0a0a0a] border border-zinc-900 rounded-sm p-4 h-full flex flex-col space-y-4">
              <div className="flex justify-between items-center px-4">
                <span className="text-[9px] font-black text-emerald-500/50 uppercase tracking-[0.4em]">
                  Encoder_Decoding_Array
                </span>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={onEncode}
                    className="text-[9px] font-bold text-zinc-600 hover:text-white transition-colors tracking-widest uppercase"
                  >
                    Pack
                  </button>
                  <button
                    type="button"
                    onClick={onDecode}
                    className="text-[9px] font-bold text-zinc-600 hover:text-white transition-colors tracking-widest uppercase"
                  >
                    Unpack
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-900/30 flex-1">
                <div className="relative bg-black p-8 group">
                  <span className="absolute top-4 left-4 text-[7px] text-zinc-800 uppercase group-focus-within:text-zinc-500 transition-colors">
                    RAW_JSON_INPUT
                  </span>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full h-80 xl:h-[500px] bg-transparent focus:outline-none text-[12px] leading-relaxed text-zinc-400 font-mono resize-none scrollbar-hide"
                  />
                </div>
                <div className="relative bg-black p-8 group">
                  <span className="absolute top-4 left-4 text-[7px] text-zinc-800 uppercase group-focus-within:text-emerald-900 transition-colors font-bold">
                    PJSON_STREAM_BUFFER
                  </span>
                  <textarea
                    readOnly
                    value={output}
                    className="w-full h-80 xl:h-[500px] bg-transparent focus:outline-none text-[11px] leading-tight text-emerald-500/70 font-mono resize-none break-all scrollbar-hide"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={onEncode}
                  className="flex-1 py-4 bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all hover:shadow-[0_0_30px_rgba(52,211,153,0.3)]"
                >
                  Pack_OMEGA
                </button>
                <button
                  type="button"
                  onClick={onDecode}
                  className="flex-1 py-4 bg-zinc-900 text-white font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all border border-zinc-800"
                >
                  Unpack_OMEGA
                </button>
              </div>
            </div>
          </div>

          {/* PROGRESSIVE VISUALIZER */}
          <div className="space-y-4">
            <div className="bg-[#0a0a0a] border border-zinc-900 rounded-sm p-8 flex flex-col h-full space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-black text-white italic uppercase tracking-tighter">
                    Live_Progressive_Hydration
                  </h2>
                  <p className="text-[9px] text-zinc-700 uppercase tracking-widest mt-1">
                    Real-time object reconstruction matrix
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startStream}
                  disabled={isStreaming}
                  className={`px-8 py-3 font-black text-[10px] uppercase tracking-widest transition-all ${isStreaming ? "bg-zinc-900 text-zinc-800 border border-zinc-800" : "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:bg-white"}`}
                >
                  {isStreaming ? "Link_Active..." : "Execute_Overlink"}
                </button>
              </div>

              <div className="flex-1 grid grid-rows-3 gap-4 min-h-[500px]">
                {/* TOP: HYDRATION STRUCTURE */}
                <div className="row-span-2 bg-black border border-zinc-900/50 p-8 overflow-auto scrollbar-hide flex flex-col relative group">
                  <span className="absolute top-4 left-4 text-[7px] text-zinc-600 font-bold uppercase tracking-widest">
                    Structure_Hydration_Window
                  </span>
                  <pre className="text-emerald-500/80 text-[11px] leading-tight mt-4 transition-opacity duration-300">
                    {streamData ? (
                      JSON.stringify(streamData, null, 2)
                    ) : (
                      <span className="text-zinc-900 uppercase italic animate-pulse">
                        Waiting for bytes...
                      </span>
                    )}
                  </pre>
                  <div className="absolute bottom-4 right-4 text-[7px] text-zinc-800 font-mono tracking-tighter">
                    PROTO: SUPREME_93CH
                  </div>
                </div>

                {/* BOTTOM: TELEMETRY & NODES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="bg-black border border-zinc-900/50 p-6 overflow-auto scrollbar-hide"
                    ref={scrollRef}
                  >
                    <span className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest mb-4 block">
                      Link_Telemetry
                    </span>
                    <div className="space-y-1">
                      {logs.map((log, i) => (
                        <div
                          key={i}
                          className="text-[9px] font-mono text-emerald-500/40 border-l border-zinc-900 pl-3"
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-black border border-zinc-900/50 p-6">
                    <span className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest mb-4 block">
                      Node_Matrix_Status
                    </span>
                    <div className="grid grid-cols-10 gap-1.5 auto-rows-fr h-full pb-8">
                      {Array.from({ length: 50 }).map((_, i) => {
                        const item = streamData?.sequence?.[i];
                        return (
                          <div
                            key={i}
                            className={`h-4 rounded-sm border transition-all duration-700 ${item ? "bg-emerald-500 border-emerald-400/50" : "bg-zinc-950 border-zinc-900"}`}
                            title={item ? `Node ${i + 1}: Active` : "Offline"}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM DASHBOARD */}
        <section className="bg-[#080808] border border-zinc-900 p-8 rounded-sm grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          <div className="space-y-1">
            <span className="text-[8px] text-zinc-700 uppercase tracking-widest">
              Protocol
            </span>
            <div className="text-xs font-black text-white italic">
              PJSON_OMEGA_SUPREME
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[8px] text-zinc-700 uppercase tracking-widest">
              Machine_Density
            </span>
            <div className="text-xs font-black text-emerald-500 italic uppercase">
              High_Efficiency
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[8px] text-zinc-700 uppercase tracking-widest">
              Alphabet
            </span>
            <div className="text-xs font-black text-white italic uppercase">
              Alpha_93_Extended
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[8px] text-zinc-700 uppercase tracking-widest">
              Hydration
            </span>
            <div className="text-xs font-black text-white italic uppercase">
              Progressive_Recovery
            </div>
          </div>
          <div className="hidden lg:flex flex-col space-y-1 col-span-2 text-right">
            <span className="text-[8px] text-zinc-700 uppercase tracking-widest">
              System_Auth
            </span>
            <div className="text-xs font-black text-zinc-500 uppercase">
              Authenticated_Agent_Terminal_V2.0.4
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
