export default function CartLoading() {
    return (
        <div className="animate-pulse py-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Page title */}
                <div className="h-10 bg-muted rounded-xl w-48" />

                {/* Cart item cards */}
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border bg-card p-6">
                        <div className="flex gap-4">
                            <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0" />
                            <div className="flex-1 space-y-3">
                                <div className="h-5 bg-muted rounded w-1/3" />
                                <div className="h-4 bg-muted/60 rounded w-1/4" />
                                <div className="h-4 bg-muted/60 rounded w-1/5" />
                            </div>
                            <div className="h-6 bg-muted rounded w-24 flex-shrink-0" />
                        </div>
                    </div>
                ))}

                {/* Summary / Total */}
                <div className="rounded-2xl border bg-card p-6 space-y-4 max-w-sm ml-auto">
                    <div className="flex justify-between">
                        <div className="h-4 bg-muted rounded w-16" />
                        <div className="h-4 bg-muted rounded w-24" />
                    </div>
                    <div className="flex justify-between">
                        <div className="h-4 bg-muted rounded w-12" />
                        <div className="h-4 bg-muted rounded w-20" />
                    </div>
                    <div className="border-t border-border pt-4 flex justify-between">
                        <div className="h-6 bg-muted rounded w-12" />
                        <div className="h-6 bg-muted rounded w-28" />
                    </div>
                    <div className="h-12 bg-muted rounded-xl w-full" />
                </div>
            </div>
        </div>
    )
}
