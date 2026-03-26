export default function CheckoutLoading() {
    return (
        <div className="animate-pulse py-8 md:py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Back link */}
                <div className="h-4 bg-muted rounded w-28" />

                {/* Page title */}
                <div className="h-8 bg-muted rounded-lg w-40" />

                {/* Progress steps */}
                <div className="flex items-center justify-center gap-4">
                    <div className="w-8 h-8 bg-muted rounded-full" />
                    <div className="w-16 h-0.5 bg-muted" />
                    <div className="w-8 h-8 bg-muted rounded-full" />
                    <div className="w-16 h-0.5 bg-muted" />
                    <div className="w-8 h-8 bg-muted rounded-full" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Shipping form skeleton */}
                    <div className="lg:col-span-2 rounded-xl border bg-card p-6 space-y-6">
                        <div className="h-6 bg-muted rounded w-32" />

                        {/* Company section */}
                        <div className="space-y-4 pb-4 border-b border-border">
                            <div className="h-3 bg-muted/40 rounded w-40" />
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="h-4 bg-muted/60 rounded w-16" />
                                    <div className="h-10 bg-muted/30 rounded w-full" />
                                </div>
                            ))}
                        </div>

                        {/* Name fields (2 cols) */}
                        <div className="grid grid-cols-2 gap-4">
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="h-4 bg-muted/60 rounded w-12" />
                                    <div className="h-10 bg-muted/30 rounded" />
                                </div>
                            ))}
                        </div>

                        {/* Kana fields (2 cols) */}
                        <div className="grid grid-cols-2 gap-4">
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="h-4 bg-muted/60 rounded w-20" />
                                    <div className="h-10 bg-muted/30 rounded" />
                                </div>
                            ))}
                        </div>

                        {/* Single fields (postal, prefecture, city, address, phone, email) */}
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <div className="h-4 bg-muted/60 rounded w-24" />
                                <div className="h-10 bg-muted/30 rounded max-w-xs" />
                            </div>
                        ))}

                        {/* Submit button */}
                        <div className="h-12 bg-muted rounded-lg w-full" />
                    </div>

                    {/* Order summary skeleton */}
                    <div className="lg:col-span-1">
                        <div className="rounded-xl border bg-card p-6 space-y-4">
                            <div className="h-6 bg-muted rounded w-20" />

                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="w-16 h-16 bg-muted rounded flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-muted/60 rounded w-3/4" />
                                        <div className="h-3 bg-muted/40 rounded w-1/4" />
                                        <div className="h-4 bg-muted/60 rounded w-1/3" />
                                    </div>
                                </div>
                            ))}

                            <div className="border-t border-border pt-4 space-y-2">
                                <div className="flex justify-between">
                                    <div className="h-4 bg-muted/60 rounded w-12" />
                                    <div className="h-4 bg-muted rounded w-20" />
                                </div>
                                <div className="flex justify-between">
                                    <div className="h-4 bg-muted/60 rounded w-8" />
                                    <div className="h-4 bg-muted rounded w-16" />
                                </div>
                                <div className="flex justify-between pt-2 border-t border-border">
                                    <div className="h-6 bg-muted rounded w-12" />
                                    <div className="h-6 bg-muted rounded w-28" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
