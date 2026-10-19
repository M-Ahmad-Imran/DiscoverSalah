import { Check, ChevronRight } from 'lucide-react';

export function Steps({ items, current }: { items: string[]; current: number }) {
  return (
    <div className="steps">
      {items.map((x, i) => (
        <div className={i <= current ? 'active' : ''} key={x}>
          <span>{i < current ? <Check size={16} /> : i + 1}</span>
          {x}
          {i < items.length - 1 && <ChevronRight size={16} />}
        </div>
      ))}
    </div>
  );
}
