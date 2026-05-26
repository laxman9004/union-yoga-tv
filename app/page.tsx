import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-8 bg-cream px-6 text-center">
      <h1 className="font-serif text-5xl text-forest-deep tracking-tight">
        Union Yoga · The Frame
      </h1>
      <p className="max-w-md text-moss">
        Lobby TV display and studio admin. Powell, OH.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/display"
          className="rounded-full bg-forest px-6 py-3 text-sm font-semibold text-cream"
        >
          Display (TV)
        </Link>
        <Link
          href="/admin"
          className="rounded-full border border-forest-deep px-6 py-3 text-sm font-semibold text-forest-deep"
        >
          Admin
        </Link>
      </div>
    </main>
  );
}
