// The Factory Portal is completely self-contained in the client component.
// This layout just ensures the page has a body structure.
export default function FactoryLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <div className="min-h-screen bg-muted/30">{children}</div>
}
