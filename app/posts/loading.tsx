export default function PostsLoading() {
  return (
    <section className="min-h-screen bg-black pb-24 text-white">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-10 w-56 rounded bg-white/10" />
          <div className="h-4 w-80 max-w-full rounded bg-white/10" />
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <div className="h-52 w-full bg-white/5" />
              <div className="space-y-3 p-6">
                <div className="h-3 w-28 rounded bg-white/10" />
                <div className="h-7 w-40 rounded bg-white/10" />
                <div className="h-4 w-full rounded bg-white/10" />
                <div className="h-4 w-5/6 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
