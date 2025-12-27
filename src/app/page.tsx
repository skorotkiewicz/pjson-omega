"use client";
import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState('{"hello":"world","count":42}');
  const [output, setOutput] = useState("");
  const [size, setSize] = useState({ json: 0, pj: 0 });

  const encode = async () => {
    const res = await fetch("/api/pj", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: input,
    });
    const pj = await res.text();
    setOutput(pj);
    setSize({ json: input.length, pj: pj.length });
  };

  const decode = async () => {
    const res = await fetch("/api/pj", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: output,
    });
    const json = await res.json();
    setInput(JSON.stringify(json));
  };

  return (
    <main className="min-h-screen bg-black text-white p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">PJ Protocol</h1>
      <p className="text-zinc-500 mb-6">Compact JSON communication</p>

      <div className="space-y-4">
        <div>
          <label htmlFor="json-input" className="text-sm text-zinc-400">
            JSON
          </label>
          <textarea
            id="json-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 font-mono text-sm h-24"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={encode}
            className="bg-blue-600 px-4 py-2 rounded font-medium"
          >
            Encode →
          </button>
          <button
            type="button"
            onClick={decode}
            className="bg-zinc-700 px-4 py-2 rounded font-medium"
          >
            ← Decode
          </button>
          {size.json > 0 && (
            <span className="text-zinc-500 text-sm self-center ml-auto">
              {size.json}→{size.pj} bytes (
              {Math.round((1 - size.pj / size.json) * 100)}% smaller)
            </span>
          )}
        </div>

        <div>
          <label htmlFor="pj-output" className="text-sm text-zinc-400">
            PJ Output
          </label>
          <textarea
            id="pj-output"
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 font-mono text-sm h-24 text-green-400"
          />
        </div>
      </div>
    </main>
  );
}
