export default function FactoriesLoading() {
    return (
        <div className="animate-pulse space-y-6 max-w-4xl">
            <div className="h-8 bg-muted rounded-lg w-40" />
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="h-12 bg-muted/50 border-b" />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 border-b last:border-0 bg-muted/20" />
                ))}
            </div>
            <div className="h-48 bg-muted rounded-xl" />
        </div>
    )
}
