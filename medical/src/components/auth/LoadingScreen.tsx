import React from 'react'
import BrandLockup from '../branding/BrandLockup'

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_100%)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-8 text-center shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        <BrandLockup
          subtitle="Loading your coding journey..."
          className="flex-col justify-center text-center"
          iconWrapperClassName="mx-auto h-20 w-20 animate-pulse"
          titleClassName="mt-2 text-2xl"
          subtitleClassName="mt-1 text-sm text-slate-600"
        />
        <div className="mt-6">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen
