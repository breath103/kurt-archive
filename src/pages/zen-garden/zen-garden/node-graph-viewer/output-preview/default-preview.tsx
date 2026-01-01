export function DefaultPreview({ value }: { value: unknown }) {
  return (
    <div className="text-xs bg-gray-700 p-1 rounded">
      {String(value).slice(0, 50)}
    </div>
  );
}
