import React from 'react'
import BrandLockup from '../branding/BrandLockup'

const LoadingScreen: React.FC = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.16),_transparent_22%),linear-gradient(180deg,_rgba(2,6,23,0.98)_0%,_rgba(4,10,28,1)_100%)]" />

      <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 text-center shadow-[0_30px_80px_rgba(2,6,23,0.65)] backdrop-blur-xl">
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        <BrandLockup
          subtitle="Loading your benchmark workspace..."
          className="flex-col justify-center text-center"
          iconWrapperClassName="mx-auto h-20 w-20 animate-pulse"
          titleClassName="mt-2 text-2xl text-white"
          subtitleClassName="mt-1 text-sm text-slate-300"
        />

        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="h-3 w-3 animate-pulse rounded-full bg-cyan-400" />
          <div className="h-3 w-3 animate-pulse rounded-full bg-blue-400 [animation-delay:160ms]" />
          <div className="h-3 w-3 animate-pulse rounded-full bg-sky-300 [animation-delay:320ms]" />
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen
