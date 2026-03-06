import Image from "next/image";
import Link from "next/link";
import { RiArrowRightLine } from "react-icons/ri";

export function Navbar() {
    return (
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12 lg:px-20 max-w-[1400px] mx-auto animate-fade-in">
            <div className="flex items-center gap-3">
                <Image src="/logo1.png" alt="Kynari" width={56} height={56} className="w-14 h-14 rounded-2xl object-cover drop-shadow-sm" priority />
                <span className="text-[22px] font-bold tracking-tight text-[#1a1b2e]">kynari</span>
            </div>
            <div className="flex items-center gap-4">
                <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                    Sign In
                </Link>
                <Link
                    href="/login"
                    className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a1b2e] text-white text-sm font-semibold hover:bg-[#2c2d42] transition-colors shadow-sm"
                >
                    Get Started
                    <RiArrowRightLine className="w-3.5 h-3.5" />
                </Link>
            </div>
        </nav>
    );
}
