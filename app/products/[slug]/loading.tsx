export default function ProductDetailLoading() {
    return (
        <div className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="animate-pulse">
                    <div className="h-5 bg-muted rounded w-48 mb-8" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="aspect-square bg-muted rounded-2xl" />
                        <div className="space-y-6">
                            <div className="h-10 bg-muted rounded-xl w-3/4" />
                            <div className="h-4 bg-muted rounded w-full" />
                            <div className="h-4 bg-muted rounded w-2/3" />
                            <div className="h-32 bg-muted rounded-xl" />
                            <div className="h-14 bg-muted rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
