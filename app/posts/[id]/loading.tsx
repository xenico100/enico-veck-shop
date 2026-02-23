export default function PostDetailLoading() {
  return (
    <section className="min-h-screen bg-black pb-24 text-white">
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="mb-6 h-10 w-28 rounded-full bg-white/10" />
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="h-[280px] w-full bg-white/5 sm:h-[420px]" />
          <div className="space-y-5 p-6 sm:p-8">
            <div className="h-3 w-36 rounded bg-white/10" />
            <div className="h-10 w-2/3 rounded bg-white/10" />
            <div className="h-4 w-40 rounded bg-white/10" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-white/10" />
              <div className="h-4 w-full rounded bg-white/10" />
              <div className="h-4 w-5/6 rounded bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
