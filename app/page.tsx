import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-trust-blue mb-4">
          Smart Doc Chaser
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Simple document collection for health insurance brokers
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/request"
            className="btn btn-primary"
          >
            Request Document
          </Link>
          <Link
            href="/tracker"
            className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            View Doc Tracker
          </Link>
        </div>
      </div>
    </main>
  )
}
