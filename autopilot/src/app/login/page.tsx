export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; err?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form action="/api/auth/login" method="post" className="card w-full max-w-sm p-6">
        <h1 className="text-lg font-bold">Pin Autopilot</h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in to the dashboard.</p>
        {sp.err && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Incorrect password.</p>}
        <input type="hidden" name="next" value={next} />
        <label className="label mt-4" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
        <button className="btn btn-primary mt-4 w-full">Sign in</button>
      </form>
    </main>
  );
}
