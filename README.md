# <p align="center">PJSON Ω_OMEGA</p>

<p align="center">
  <img src="public/banner.png" alt="PJSON OMEGA Banner" width="100%">
</p>

> **High-Density Machine-to-Machine Protocol**  
> _Because the wire shouldn't wait for your download to finish._

PJSON OMEGA is an industrial-strength serialization format designed for high-throughput LLM-to-LLM communication and real-time state synchronization. It prioritizes **density**, **determinism**, and **progressive hydration**.

---

### Ω_CORE_AXIOMS

- **Structural Referencing**: Reuses identical complex objects and arrays via machine-code IDs, enabling graph-level data reuse for ~2 bytes per reference.
- **Bit-Packed Floats**: 64-bit doubles are mapped to a custom Base-91 alphabet, preserving 100% precision with significantly less overhead than ASCII strings.
- **Hydration Over Loading**: Native support for partial stream rehydration. The decoder reconstructs valid structures character-by-character as they hit the buffer.
- **Native Types**: High-fidelity support for `Date`, `BigInt`, and deterministically sorted Objects.

---

### Ω_DASHBOARD

The repository includes a **Next.js Operational Terminal** to witness the protocol in real-time.

```bash
# Start the machine
bun install
bun dev
```

Visit `localhost:3000` to access the **Overlink Matrix**:
1. **Downlink**: Start a live PJSON stream from the server.
2. **Rehydration_Matrix**: Watch the bit-stream physically turn into a React DOM in real-time.
3. **Efficiency Monitor**: Track bandwidth savings (avg. 30-75% over raw JSON).

---

### Ω_STANDALONE_DEMOS

Verify the hydration mechanics via the CLI proof-of-concept scripts located in `/examples`:

- `bun examples/simple.ts`: Loss-less round-trip verification and efficiency stats.
- `bun examples/live_rehydration.ts`: Witness a JSON object growing character-by-character from a bit-stream.
- `bun examples/server.ts`: A high-performance PJSON-native Bun server.
- `bun examples/reverse_stream.ts`: Demonstrates client-to-server hydration resilience.

---

### Ω_ARCHITECTURE

- `src/lib/pj.ts`: The protocol engine.
- `src/app/page.tsx`: The industrial dashboard.
- `src/app/api/pj/stream`: The overlink source provider.

---

**_SYSTEM_STATUS: NOMINAL_**  
**_BUILD: OMEGA_MASTER_93_**
