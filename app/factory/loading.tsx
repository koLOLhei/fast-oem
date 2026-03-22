export default function FactoryLoading() {
    return (
        <div className="animate-pulse space-y-6 max-w-5xl mx-auto p-6">
            <div className="flex items-center justify-between">
                <div className="h-8 bg-muted rounded-lg w-48" />
                <div className="flex gap-2">
                    <div className="h-9 bg-muted rounded-lg w-20" />
                    <div className="h-9 bg-muted rounded-lg w-20" />
                </div>
            </div>
            <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-9 bg-muted rounded-lg w-24" />
                ))}
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 bg-muted rounded-xl" />
            ))}
        </div>
    )
}
