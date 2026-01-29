export default function Loading() {
  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 space-y-2">
          <div className="h-8 w-48 bg-card rounded animate-pulse" />
          <div className="h-4 w-64 bg-card rounded animate-pulse" />
        </div>
        <div className="h-11 w-full bg-card rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              <div className="aspect-[16/10] bg-secondary animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 bg-secondary rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-secondary rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-secondary rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
