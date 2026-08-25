export function RadarAnimation({ size = 160 }: { size?: number }) {
  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size }}
      aria-label="Escaneando área"
      role="status"
    >
      <div className="radar-sweep" />
      <div className="radar-ring" style={{ animationDelay: "0s" }} />
      <div className="radar-ring" style={{ animationDelay: "0.8s" }} />
      <div className="radar-ring" style={{ animationDelay: "1.6s" }} />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal-zero/20"
        style={{ width: size * 0.12, height: size * 0.12 }}
      />
    </div>
  );
}
