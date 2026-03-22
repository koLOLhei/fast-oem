export default function ProductsLoading() {
    return (
        <div className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="animate-pulse space-y-8">
                    <div className="h-10 bg-muted rounded-xl w-56" />
                    <div className="flex gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-10 bg-muted rounded-full w-24" />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-2xl bg-muted h-80" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
