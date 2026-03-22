export default function OrderDetailLoading() {
    return (
        <div className="animate-pulse space-y-6 max-w-5xl">
            <div className="h-6 bg-muted rounded w-32" />
            <div className="h-10 bg-muted rounded-lg w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-48 bg-muted rounded-xl" />
                <div className="h-48 bg-muted rounded-xl" />
            </div>
            <div className="h-64 bg-muted rounded-xl" />
        </div>
    )
}
