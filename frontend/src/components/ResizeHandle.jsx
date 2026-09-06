/**
 * ResizeHandle — a draggable divider between two panels.
 * @param {'horizontal' | 'vertical'} direction
 * @param {MouseEventHandler} onMouseDown
 */
export default function ResizeHandle({ direction = 'horizontal', onMouseDown }) {
  const isH = direction === 'horizontal';

  return (
    <div
      onMouseDown={onMouseDown}
      className={`resizer ${isH ? 'resizer-h' : 'resizer-v'} flex items-center justify-center group select-none`}
      title="Drag to resize"
    >
      {isH ? (
        <div className="flex flex-col gap-1 opacity-30 group-hover:opacity-70 transition-opacity">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-0.5 h-3 rounded-full bg-indigo-400" />
          ))}
        </div>
      ) : (
        <div className="flex gap-1 opacity-30 group-hover:opacity-70 transition-opacity">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-0.5 w-3 rounded-full bg-indigo-400" />
          ))}
        </div>
      )}
    </div>
  );
}
