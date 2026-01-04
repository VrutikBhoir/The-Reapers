import React from 'react';
import { ArrowRight, Zap, Shield, Database, LayoutTemplate } from 'lucide-react';

interface LandingPageProps {
    onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-black text-white font-sans selection:bg-purple-500/30 selection:text-purple-200">

            {/* 3D Background */}
            <div className="fixed inset-0 z-0">
                <spline-viewer url="https://prod.spline.design/Pg7M-shqf-lIgpw8/scene.splinecode"></spline-viewer>
            </div>

            {/* Overlay for readability - reduced opacity */}
            <div className="fixed inset-0 z-0 bg-black/10 pointer-events-none" />

            {/* Content - allows clicks to pass through to background */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 text-center pointer-events-none">

                {/* Hero Section */}
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pointer-events-auto">
                    <div className="space-y-4">
                        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-400 drop-shadow-2xl pb-2 pr-2">
                            IngestFlow
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
                            Next-Generation Multimodal Data Pipeline
                        </p>
                    </div>

                    <button
                        onClick={onGetStarted}
                        className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-lg font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                        Get Started
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* About Section - Glass Card */}
                <div className="mt-24 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200 pointer-events-auto">
                    <AboutCard
                        icon={<Zap className="w-6 h-6 text-yellow-400" />}
                        title="Design Excellence"
                        description="State-of-the-art glassmorphism UI with fluid animations."
                    />
                    <AboutCard
                        icon={<Database className="w-6 h-6 text-blue-400" />}
                        title="Universal Ingest"
                        description="Process PDF, Audio, Images, and JSON with automated ETL."
                    />
                    <AboutCard
                        icon={<LayoutTemplate className="w-6 h-6 text-purple-400" />}
                        title="Auto Structuring"
                        description="AI-driven schema generation and data normalization."
                    />
                    <AboutCard
                        icon={<Shield className="w-6 h-6 text-green-400" />}
                        title="Enterprise Ready"
                        description="Secure processing with detailed validation reporting."
                    />
                </div>

                <footer className="absolute bottom-8 text-sm text-slate-500 font-medium tracking-wide">
                    POWERED BY DEEPMIND ANTIGRAVITY
                </footer>
            </div>
        </div>
    );
};

const AboutCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl text-left hover:bg-black/50 transition-colors group">
        <div className="mb-4 p-3 bg-white/5 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300 border border-white/5">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
);
