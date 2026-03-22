export default function ProductsLoading() {
    return (
        <div className="animate-pulse space-y-6">
            <div className="flex items-center justify-between">
                <div className="h-8 bg-muted rounded-lg w-40" />
                <div className="h-10 bg-muted rounded-lg w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-12 bg-muted rounded-lg" />
                    ))}
                </div>
                <div className="md:col-span-3 h-96 bg-muted rounded-xl" />
            </div>
        </div>
    )
}
