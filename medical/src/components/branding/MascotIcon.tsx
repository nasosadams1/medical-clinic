import React from 'react';
import { mascots, type MascotKey } from '../../lib/mascots';

type MascotIconProps = {
  mascot: MascotKey;
  className?: string;
  imageClassName?: string;
};

export default function MascotIcon({
  mascot,
  className = '',
  imageClassName = '',
}: MascotIconProps) {
  const asset = mascots[mascot];

  return (
    <div className={`overflow-hidden ${className}`}>
      <img
        src={asset.src}
        alt=""
        aria-hidden="true"
        className={`h-full w-full object-contain object-center ${imageClassName}`}
        loading="lazy"
      />
    </div>
  );
}
