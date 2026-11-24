import Button from "./Button";
import Notice from "./Notice";

export default function AsyncError({ error, onRetry }) {
  return (
    <div className="empty-note" role="alert">
      <Notice tone="danger">
        {error?.message ?? "The information could not be loaded. Please try again."}
      </Notice>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}