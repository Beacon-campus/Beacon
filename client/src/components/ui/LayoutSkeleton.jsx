import React from 'react';

/**
 * Primitive Skeleton component.
 * Usage: <Skeleton className="w-full h-10 rounded-xl" />
 */
export function Skeleton({ className = "", variant = "light" }) {
  const baseClass = variant === "dark" ? "skeleton-dark" : "skeleton";
  return (
    <div className={`${baseClass} ${className}`} aria-hidden="true" />
  );
}

/**
 * LayoutSkeleton mimics the sidebar + navbar + main content dashboard flow.
 */
export function LayoutSkeleton() {
  return (
    <div className="fixed inset-0 z-[100] flex bg-[#F4F7FB] overflow-hidden">
      {/* Ambient Aurora Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob"></div>
      <div className="absolute top-[20%] right-[-5%] w-[35%] h-[40%] bg-green-100/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-100/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob animation-delay-4000"></div>

      {/* Sidebar Skeleton */}
      <div className="w-64 h-full p-4 p-8 flex flex-col gap-6 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <Skeleton className="w-24 h-6 rounded-md" />
        </div>
        <div className="space-y-4">
          <Skeleton className="w-full h-10 rounded-lg" />
          <Skeleton className="w-[90%] h-10 rounded-lg" />
          <Skeleton className="w-full h-10 rounded-lg" />
          <Skeleton className="w-full h-10 rounded-lg" />
          <Skeleton className="w-[85%] h-10 rounded-lg" />
        </div>
        <div className="mt-auto flex flex-col gap-4">
          <div className="flex items-center gap-3 p-2">
             <Skeleton className="w-10 h-10 rounded-full shrink-0" />
             <div className="flex flex-col gap-1 w-full">
               <Skeleton className="w-20 h-3 rounded" />
               <Skeleton className="w-14 h-2 rounded opacity-50" />
             </div>
          </div>
          <Skeleton className="w-10 h-10 rounded-full self-center" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-8 gap-8 relative z-10 h-full">
        {/* Navbar area */}
        <div className="flex items-center justify-between">
          <Skeleton className="w-48 h-8 rounded-lg" />
          <div className="flex gap-3">
             <Skeleton className="w-10 h-10 rounded-full" />
             <Skeleton className="w-32 h-10 rounded-xl" />
          </div>
        </div>

        {/* Content blocks */}
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Skeleton className="h-32 rounded-3xl" />
             <Skeleton className="h-32 rounded-3xl" />
             <Skeleton className="h-32 rounded-3xl" />
          </div>
          <Skeleton className="w-full h-64 rounded-3xl" />
          <div className="grid grid-cols-2 gap-6">
             <Skeleton className="h-48 rounded-3xl" />
             <Skeleton className="h-48 rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * LoginSkeleton mimics the split-screen login page.
 */
export function LoginSkeleton() {
  return (
    <div className="fixed inset-0 z-[100] flex bg-[#F8FAFC] overflow-hidden">
      {/* Ambient Aurora Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob"></div>
      <div className="absolute top-[20%] right-[-5%] w-[35%] h-[40%] bg-green-100/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-100/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob animation-delay-4000"></div>

      {/* Left Panel (Animation Area) */}
      <div className="hidden lg:flex w-[60%] h-full flex-col items-center justify-center p-8 relative">
        <div className="w-full max-w-2xl space-y-10">
          <Skeleton className="w-full h-[400px] rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="w-3/4 h-8 rounded-lg mx-auto" />
            <Skeleton className="w-1/2 h-6 rounded-lg mx-auto opacity-60" />
          </div>
        </div>
      </div>

      {/* Right Panel (Form Area) */}
      <div className="w-full lg:w-[40%] h-full flex flex-col items-center justify-center p-12 bg-white/40 backdrop-blur-md border-l border-white/50">
        <div className="w-full max-w-sm space-y-8">
           <div className="flex flex-col items-center gap-4 mb-4">
             <Skeleton className="w-16 h-16 rounded-2xl" />
             <Skeleton className="w-32 h-8 rounded-lg" />
           </div>
           <div className="space-y-6">
             <div className="space-y-2">
               <Skeleton className="w-full h-14 rounded-xl" />
               <Skeleton className="w-full h-14 rounded-xl" />
             </div>
             <div className="flex justify-between">
               <Skeleton className="w-24 h-4 rounded" />
               <Skeleton className="w-24 h-4 rounded" />
             </div>
             <Skeleton className="w-full h-12 rounded-xl" />
             <div className="flex items-center gap-2">
               <div className="flex-1 border-t border-gray-100"></div>
               <Skeleton className="w-8 h-3 rounded" />
               <div className="flex-1 border-t border-gray-100"></div>
             </div>
             <Skeleton className="w-full h-12 rounded-xl" />
           </div>
        </div>
      </div>
    </div>
  );
}
