import { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export default function Card({ title, description, footer, children }: Props) {
  return (
    <div className="w-full max-w-3xl m-auto my-8 rounded-3xl border border-white/10 bg-black/70 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
      <div className="px-6 py-5">
        <h3 className="mb-2 text-2xl font-semibold text-white">{title}</h3>
        <p className="text-base text-neutral-400">{description}</p>
        {children}
      </div>
      {footer && (
        <div className="rounded-b-3xl border-t border-white/10 bg-black/80 p-4 text-sm text-neutral-500">
          {footer}
        </div>
      )}
    </div>
  );
}
