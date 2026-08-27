export function RadarAnimation({ size = 160 }: { size?: number }) {
  return (
    <div
      className="relative mx-auto overflow-visible"
      style={{ width: size, height: size }}
      aria-label="Escaneando área"
      role="status"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-signal-zero) 6%, transparent), transparent 68%)",
        }}
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          border: "1px solid color-mix(in oklab, var(--color-signal-zero) 28%, transparent)",
          boxShadow: "inset 0 0 28px color-mix(in oklab, var(--color-signal-zero) 10%, transparent)",
        }}
      />

      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-px w-[44%] origin-left"
        style={{
          background: "linear-gradient(90deg, var(--color-signal-zero), transparent)",
          transform: "translateY(-50%) rotate(0deg)",
          animation: "radar-hand 2.2s linear infinite",
          boxShadow: "0 0 10px color-mix(in oklab, var(--color-signal-zero) 55%, transparent)",
        }}
      />

      {[0, 0.75, 1.5].map((delay) => (
        <div
          key={delay}
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{
            border: "1px solid color-mix(in oklab, var(--color-signal-zero) 35%, transparent)",
            animation: "radar-wave 2.8s ease-out infinite",
            animationDelay: `${delay}s`,
          }}
        />
      ))}

      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: size * 0.1,
          height: size * 0.1,
          background: "var(--color-signal-zero)",
          boxShadow: "0 0 22px color-mix(in oklab, var(--color-signal-zero) 70%, transparent)",
          animation: "radar-core 1.6s ease-in-out infinite",
        }}
      />

      <style>{`
        @keyframes radar-hand {
          from { transform: translateY(-50%) rotate(0deg); }
          to { transform: translateY(-50%) rotate(360deg); }
        }
        @keyframes radar-wave {
          0% { transform: scale(0.52); opacity: 0.75; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes radar-core {
          0%, 100% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.12); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [aria-label="Escaneando área"] * { animation-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}
