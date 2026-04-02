import React from 'react';
import type { MascotKey } from '../../lib/mascots';
import MascotIcon from './MascotIcon';

type BrandLockupProps = {
  mascot?: MascotKey;
  title?: string;
  subtitle?: string;
  className?: string;
  iconWrapperClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

export default function BrandLockup({
  mascot = 'learn',
  title = 'Codhak',
  subtitle,
  className = '',
  iconWrapperClassName = '',
  titleClassName = '',
  subtitleClassName = '',
}: BrandLockupProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className={`flex h-20 w-20 shrink-0 items-center justify-center ${iconWrapperClassName}`}>
        <MascotIcon mascot={mascot} className="h-full w-full" imageClassName="drop-shadow-md" />
      </div>
      <div className="min-w-0">
        <div className={`text-2xl font-semibold leading-tight text-slate-900 ${titleClassName}`}>{title}</div>
        {subtitle ? (
          <div className={`text-sm leading-5 text-slate-500 ${subtitleClassName}`}>{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
