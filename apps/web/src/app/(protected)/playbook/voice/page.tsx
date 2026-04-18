"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    ChevronRight,
    Music,
} from "lucide-react";
import { VoiceSelector } from "@/components/voice/VoiceSelector";
import { NowPlayingBar } from "@/components/voice/NowPlayingBar";
import { MoodFilter } from "@/components/voice/MoodFilter";
import { LullabyLibrary } from "@/components/voice/LullabyLibrary";
import { getTTSEngine, TTS_VOICES, type TTSVoiceOption } from "@/lib/tts-engine";
import type { VoiceInfo, LullabyInfo } from "@/lib/api";

const MOOD_CHIPS = [
    { id: "all", label: "All", color: "#F0897A" },
    { id: "sleepy", label: "Sleepy", color: "#6B48C8" },
    { id: "calm", label: "Calm", color: "#93E2FA" },
    { id: "comfort", label: "Comfort", color: "#F3A595" },
    { id: "playful", label: "Playful", color: "#B5EAC5" },
];

// Client-side lullaby catalogue (no API needed)
const LULLABIES: LullabyInfo[] = [
    {
        id: "twinkle",
        title: "Twinkle Twinkle Little Star",
        lyrics: "Twinkle, twinkle, little star,\nHow I wonder what you are.\nUp above the world so high,\nLike a diamond in the sky.\nTwinkle, twinkle, little star,\nHow I wonder what you are.",
        mood: "calm",
        origin: "English traditional",
        duration_estimate: 45,
    },
    {
        id: "rockabye",
        title: "Rock-a-Bye Baby",
        lyrics: "Rock-a-bye baby, on the treetop,\nWhen the wind blows, the cradle will rock.\nWhen the bough breaks, the cradle will fall,\nAnd down will come baby, cradle and all.\nBaby is drowsing, cozy and fair,\nMother sits near, in her rocking chair.",
        mood: "sleepy",
        origin: "English traditional",
        duration_estimate: 50,
    },
    {
        id: "hushaby",
        title: "Hush Little Baby",
        lyrics: "Hush little baby, don't say a word,\nMama's gonna buy you a mockingbird.\nAnd if that mockingbird won't sing,\nMama's gonna buy you a diamond ring.\nAnd if that diamond ring turns brass,\nMama's gonna buy you a looking glass.",
        mood: "comfort",
        origin: "American traditional",
        duration_estimate: 55,
    },
    {
        id: "brahms",
        title: "Brahms' Lullaby",
        lyrics: "Lullaby and goodnight, with roses bedight,\nWith lilies bedecked, is baby's wee bed.\nLay thee down now and rest, may thy slumber be blessed.\nLay thee down now and rest, may thy slumber be blessed.",
        mood: "sleepy",
        origin: "Johannes Brahms, 1868",
        duration_estimate: 40,
    },
    {
        id: "allnight",
        title: "All Through the Night",
        lyrics: "Sleep my child and peace attend thee,\nAll through the night.\nGuardian angels God will send thee,\nAll through the night.\nSoft the drowsy hours are creeping,\nHill and dale in slumber sleeping,\nI my loving vigil keeping,\nAll through the night.",
        mood: "sleepy",
        origin: "Welsh traditional",
        duration_estimate: 60,
    },
    {
        id: "baabaablack",
        title: "Baa Baa Black Sheep",
        lyrics: "Baa, baa, black sheep, have you any wool?\nYes sir, yes sir, three bags full.\nOne for the master, one for the dame,\nAnd one for the little boy who lives down the lane.\nBaa, baa, black sheep, have you any wool?\nYes sir, yes sir, three bags full.",
        mood: "calm",
        origin: "English traditional",
        duration_estimate: 35,
    },
    {
        id: "marylamb",
        title: "Mary Had a Little Lamb",
        lyrics: "Mary had a little lamb,\nLittle lamb, little lamb.\nMary had a little lamb,\nIts fleece was white as snow.\nAnd everywhere that Mary went,\nMary went, Mary went,\nEverywhere that Mary went,\nThe lamb was sure to go.",
        mood: "playful",
        origin: "Sarah Josepha Hale, 1830",
        duration_estimate: 40,
    },
    {
        id: "rowboat",
        title: "Row Row Row Your Boat",
        lyrics: "Row, row, row your boat,\nGently down the stream.\nMerrily, merrily, merrily, merrily,\nLife is but a dream.\nRow, row, row your boat,\nGently down the stream.\nIf you see a crocodile,\nDon't forget to scream!",
        mood: "playful",
        origin: "American traditional",
        duration_estimate: 30,
    },
    {
        id: "moonlight",
        title: "By the Light of the Silvery Moon",
        lyrics: "By the light of the silvery moon,\nI want to spoon.\nTo my honey I'll croon love's tune.\nHoney moon, keep a-shining in June.\nYour silvery beams will bring love's dreams,\nWe'll be cuddling soon,\nBy the silvery moon.",
        mood: "calm",
        origin: "Edward Madden, 1909",
        duration_estimate: 45,
    },
    {
        id: "goldenslumber",
        title: "Golden Slumbers",
        lyrics: "Golden slumbers kiss your eyes,\nSmiles await you when you rise.\nSleep, pretty darling, do not cry,\nAnd I will sing a lullaby.\nCares you know not, therefore sleep,\nWhile over you a watch I'll keep.\nSleep, pretty darling, do not cry,\nAnd I will sing a lullaby.",
        mood: "sleepy",
        origin: "Thomas Dekker, 1603",
        duration_estimate: 50,
    },
];

export default function VoiceLullabyPage() {
    // Convert TTS voices to VoiceInfo format for existing components
    const voices: VoiceInfo[] = TTS_VOICES.map((v) => ({
        voice_id: v.id,
        name: v.name,
        gender: v.gender,
        style: v.style,
        description: v.description,
    }));

    const [selectedVoice, setSelectedVoice] = useState("af_sarah");
    const [activeMood, setActiveMood] = useState("all");

    // Playback state
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentLullaby, setCurrentLullaby] = useState<LullabyInfo | null>(null);
    const [generating, setGenerating] = useState(false);

    // TTS Engine event listener
    useEffect(() => {
        const engine = getTTSEngine();
        const unsub = engine.on((event) => {
            switch (event) {
                case "start":
                    setGenerating(false);
                    setIsPlaying(true);
                    break;
                case "end":
                    setIsPlaying(false);
                    setPlayingId(null);
                    setProgress(100);
                    setTimeout(() => {
                        setProgress(0);
                        setCurrentLullaby(null);
                    }, 500);
                    break;
                case "pause":
                    setIsPlaying(false);
                    break;
                case "resume":
                    setIsPlaying(true);
                    break;
                case "error":
                    setGenerating(false);
                    setIsPlaying(false);
                    setPlayingId(null);
                    setCurrentLullaby(null);
                    break;
            }
        });

        return () => unsub();
    }, []);

    // Progress simulation (Web Speech API doesn't provide word-level progress)
    useEffect(() => {
        if (!isPlaying || !currentLullaby) return;

        const estimatedDuration = currentLullaby.duration_estimate * 1000; // ms
        const startTime = Date.now();

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min((elapsed / estimatedDuration) * 100, 95);
            setProgress(pct);
        }, 200);

        return () => clearInterval(interval);
    }, [isPlaying, currentLullaby]);

    const selectVoice = useCallback((voiceId: string) => {
        setSelectedVoice(voiceId);
    }, []);

    const playLullaby = useCallback(async (lullaby: LullabyInfo) => {
        // Stop any current playback
        const engine = getTTSEngine();
        engine.stop();

        setPlayingId(lullaby.id);
        setCurrentLullaby(lullaby);
        setGenerating(true);
        setProgress(0);
        setIsPlaying(false);

        try {
            await engine.speak(lullaby.lyrics, selectedVoice, {
                rate: 0.8,
                pitch: 0.95,
            });
        } catch {
            setGenerating(false);
            setPlayingId(null);
            setCurrentLullaby(null);
        }
    }, [selectedVoice]);

    const togglePause = () => {
        const engine = getTTSEngine();
        if (isPlaying) {
            engine.pause();
        } else {
            engine.resume();
        }
    };

    const stopPlayback = () => {
        const engine = getTTSEngine();
        engine.stop();
        setIsPlaying(false);
        setPlayingId(null);
        setCurrentLullaby(null);
        setProgress(0);
    };

    const filteredLullabies = activeMood === "all"
        ? LULLABIES
        : LULLABIES.filter((l) => l.mood === activeMood);

    return (
        <div className="animate-fade-in space-y-6 relative z-10 w-full mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Link href="/dashboard" className="hover:text-[#6B48C8] transition-colors">Dashboard</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href="/playbook" className="hover:text-[#6B48C8] transition-colors">Playbook</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#1a1b2e] font-semibold">Voice Lullaby</span>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold font-[family-name:var(--font-sans)] text-[#1a1b2e]">
                    Voice Lullaby Studio
                </h1>
                <p className="text-sm text-[#4a4b5e] mt-1">
                    Choose a voice and play classic lullabies with beautiful AI voices.
                </p>
            </div>

            {/* Now Playing Bar */}
            <NowPlayingBar 
                generating={generating}
                playingId={playingId}
                currentLullaby={currentLullaby}
                isPlaying={isPlaying}
                progress={progress}
                selectedVoice={selectedVoice}
                voices={voices}
                onTogglePause={togglePause}
                onStop={stopPlayback}
            />

            {/* Voice Selector */}
            <VoiceSelector 
                voices={voices} 
                selectedVoiceId={selectedVoice} 
                onSelectVoice={selectVoice} 
            />

            {/* Mood Filter */}
            <MoodFilter 
                chips={MOOD_CHIPS} 
                activeMood={activeMood} 
                onSelectMood={setActiveMood} 
            />

            <LullabyLibrary 
                lullabies={filteredLullabies} 
                playingId={playingId} 
                isPlaying={isPlaying} 
                generating={generating} 
                onPlay={playLullaby} 
                onTogglePause={togglePause} 
            />

        </div>
    );
}
