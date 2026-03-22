export default function AdminLoading() {
    return (
        <div className="animate-pulse space-y-6 max-w-5xl">
            <div className="h-8 bg-muted rounded-lg w-48" />
            <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded-xl" />
                ))}
            </div>
            <div className="h-64 bg-muted rounded-xl" />
        </div>
    )
}
