export default function Loading() {
  return (
    <div className="py-12 md:py-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse space-y-6">
        <div className="h-4 bg-muted rounded w-40" />
        <div className="h-10 bg-muted rounded-xl w-3/4 mx-auto" />
        <div className="h-5 bg-muted rounded w-2/3 mx-auto" />
        <div className="space-y-4 mt-8">
          <div className="h-40 bg-muted rounded-2xl" />
          <div className="h-40 bg-muted rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

