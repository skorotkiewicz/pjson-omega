import Image from "next/image";
import { ApiCounter } from "./components/ApiCounter";
import { PJSONDemo } from "./components/PJSONDemo";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-6xl py-16 px-8">
        <div className="flex items-center gap-4 mb-8">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
            priority
          />
        </div>

        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50 mb-4">
            ALIFE Communication Protocol
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Progressive JSON (PJSON) - An optimized protocol for LLM and
            backend-frontend communication. Uses server-side Map() for state
            tracking.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 mb-12">
          <div>
            <ApiCounter />
          </div>
        </div>

        <PJSONDemo />

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
