import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-muted-foreground">{message}</p>;
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="py-8 text-center" role="alert">
      <p className="text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-2" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
