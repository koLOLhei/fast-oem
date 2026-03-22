export default function MypageLoading() {
    return (
        <div className="min-h-screen bg-muted/30 py-12">
            <div className="max-w-4xl mx-auto px-4">
                <div className="animate-pulse space-y-6">
                    <div className="space-y-2">
                        <div className="h-8 bg-muted rounded-lg w-40" />
                        <div className="h-4 bg-muted rounded w-56" />
                    </div>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-24 bg-muted rounded-xl" />
                    ))}
                </div>
            </div>
        </div>
    )
}
