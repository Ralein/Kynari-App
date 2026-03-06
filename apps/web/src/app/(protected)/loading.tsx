export default function ProtectedLoading() {
    return (
        <div className="flex-1 w-full min-h-[70vh] flex items-center justify-center font-[family-name:var(--font-sans)] animate-fade-in px-4">
            <div className="w-full max-w-md shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] shadow-[#EAE2FB]/50 rounded-[2rem] border border-white/60 bg-white/60 backdrop-blur-xl flex flex-col items-center justify-center p-10 min-h-[460px] animate-pulse">
                <div className="relative w-28 h-28 mb-6 rounded-full overflow-hidden bg-white/80 border-2 border-white shadow-sm flex items-center justify-center">
                    <video
                        src="/load.webm"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover scale-110"
                    />
                </div>
                <h3 className="text-lg font-bold text-[#1a1b2e]">
                    Loading your family space...
                </h3>
            </div>
        </div>
    );
}
