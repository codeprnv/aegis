import Link from 'next/link';

/**
 * Standard 404 Not Found fallback page.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#070b14] text-white font-sans">
      <h2 className="text-3xl font-bold mb-2">404 - Page Not Found</h2>
      <p className="text-sm text-slate-400 mb-6">Could not find the requested resource.</p>
      <Link
        href="/"
        className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/20"
      >
        Return Home
      </Link>
    </div>
  );
}
