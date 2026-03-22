export default function UsersLoading() {
    return (
        <div className="animate-pulse space-y-6 max-w-5xl">
            <div className="space-y-2">
                <div className="h-8 bg-muted rounded-lg w-48" />
                <div className="h-4 bg-muted rounded w-80" />
            </div>
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="h-14 bg-muted/50 border-b" />
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 border-b last:border-0 bg-muted/20" />
                ))}
            </div>
            <div className="h-48 bg-muted rounded-xl" />
        </div>
    )
}
