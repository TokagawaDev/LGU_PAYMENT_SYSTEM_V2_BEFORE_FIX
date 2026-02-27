import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Loading(): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner />
      </div>
    </div>
  );
}
