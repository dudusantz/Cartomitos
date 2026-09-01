export default function LoadingTeamProfile() {
  return (
    <div className="mx-auto min-h-[100dvh] max-w-7xl animate-pulse px-4 py-10 md:px-6">
      <div className="h-4 w-40 rounded bg-white/[0.05]" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <div className="h-56 rounded-2xl bg-white/[0.04]" />
        <div className="h-56 rounded-2xl bg-white/[0.04]" />
      </div>
      <div className="mt-10 h-16 rounded-2xl bg-white/[0.035]" />
      <div className="mt-6 grid gap-5 lg:grid-cols-2"><div className="h-80 rounded-2xl bg-white/[0.035]" /><div className="h-80 rounded-2xl bg-white/[0.035]" /></div>
    </div>
  );
}
