// client/src/components/DeckSkeleton.tsx
export default function DeckSkeleton({ count = 10 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="aspect-[3/4.2] rounded-[14px] shimmer" />
            ))}
        </div>
    )
}