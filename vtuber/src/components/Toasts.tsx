import { toasts } from '../state/store';
import { useStore } from '../state/createStore';

export function Toasts() {
  const list = useStore(toasts, (s) => s.list);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
