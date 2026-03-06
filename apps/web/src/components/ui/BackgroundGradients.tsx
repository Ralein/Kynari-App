export function BackgroundGradients() {
    return (
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden z-0 fixed" aria-hidden="true">
            <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[70%] rounded-full opacity-60 mix-blend-multiply blur-[100px] bg-[#EAE2FB]" />
            <div className="absolute top-[10%] right-[30%] w-[40%] h-[50%] rounded-full opacity-60 mix-blend-multiply blur-[100px] bg-[#FCECD8]" />
            <div className="absolute bottom-[-10%] right-[10%] w-[50%] h-[60%] rounded-full opacity-50 mix-blend-multiply blur-[100px] bg-[#FFD7D7]" />
            <div className="absolute top-[30%] left-[-10%] w-[40%] h-[50%] rounded-full opacity-40 mix-blend-multiply blur-[100px] bg-[#FCF8DD]" />
        </div>
    );
}
