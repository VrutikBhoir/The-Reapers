import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  showBackground?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showBackground = true }) => {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 selection:text-purple-200 relative overflow-x-hidden">
      {/* Spline Background */}
      {showBackground && (
        <>
          <div className="fixed inset-0 z-0">
            <spline-viewer url="https://prod.spline.design/BcrgUA38t1kVEfCh/scene.splinecode"></spline-viewer>
          </div>

          {/* Overlay for better readability */}
          <div className="fixed inset-0 z-0 bg-black/40 pointer-events-none backdrop-blur-[2px]" />
        </>
      )}

      <header className="fixed w-full top-0 z-50 transition-all duration-300 border-b border-white/10 bg-black/20 backdrop-blur-xl supports-[backdrop-filter]:bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 transform hover:scale-105 transition-transform duration-200">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-none">IngestFlow</h1>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Data Pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
                <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                <span className="text-xs font-medium text-slate-200">System Operational</span>
              </div>
              <span className="text-xs font-mono text-slate-500">v1.0.0</span>
            </div>
          </div>
        </div>
      </header>
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 animate-in fade-in duration-500 slide-in-from-bottom-4">
        {children}
      </main>
    </div>
  );
};
