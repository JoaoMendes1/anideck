// client/src/components/RankingSkeleton.tsx
export default function RankingSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="flex flex-col gap-3" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-panel border border-line">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg shimmer shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-3.5 w-3/4 rounded-full shimmer" />
                        <div className="h-2.5 w-1/3 rounded-full shimmer" />
                    </div>
                    <div className="w-8 h-9 rounded-lg shimmer shrink-0" />
                </div>
            ))}
        </div>
    )
}