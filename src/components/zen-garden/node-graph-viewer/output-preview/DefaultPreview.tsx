export function DefaultPreview({ value }: { value: unknown }) {
  return (
    <div className="text-xs bg-gray-700 p-1 rounded">
      {JSON.stringify(value, null, 2)}
    </div>
  );
}
