import React from 'react';
import { mascots, type MascotKey } from '../../lib/mascots';

type MascotArtworkProps = {
  mascot: MascotKey;
  className?: string;
  imageClassName?: string;
};

export default function MascotArtwork({ mascot, className = '', imageClassName = '' }: MascotArtworkProps) {
  const asset = mascots[mascot];

  return (
    <div className={className}>
      <img
        src={asset.src}
        alt=""
        aria-hidden="true"
        className={`mx-auto block h-auto w-full max-w-[320px] object-contain object-center ${imageClassName}`}
        loading="lazy"
      />
    </div>
  );
}
