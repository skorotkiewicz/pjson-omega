import { ApiCounter } from "./components/ApiCounter";

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-2xl py-16 px-8">
        <h1 className="text-3xl font-bold text-white mb-2">ALIFE</h1>
        <p className="text-zinc-400 mb-8">
          PJ Protocol - Minimal Progressive JSON
        </p>

        <ApiCounter />

        <div className="mt-12 p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <h2 className="text-lg font-semibold text-white mb-4">API Usage</h2>
          <code className="block text-sm text-green-400 bg-black p-4 rounded-lg overflow-x-auto">
            <pre>{`POST /api/pj
Content-Type: application/json

{ "encode": { "hello": "world" } }
→ Returns PJ string

{ "decode": "pjstring" }
→ Returns JSON

{ "compare": { "data": "..." } }
→ Returns { json, pj, saved }`}</pre>
          </code>
        </div>
      </main>
    </div>
  );
}
