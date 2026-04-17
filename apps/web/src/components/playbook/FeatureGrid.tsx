"use client";

import { FeatureCard } from "./FeatureCard";
import { type LucideIcon } from "lucide-react";

interface Feature {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color: string;
    bgFrom: string;
    bgTo: string;
    available: boolean;
}

interface FeatureGridProps {
    features: Feature[];
    hasChildren: boolean;
}

export function FeatureGrid({ features, hasChildren }: FeatureGridProps) {
    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
                <FeatureCard 
                    key={feature.id}
                    {...feature}
                    isDisabled={!feature.available || !hasChildren}
                />
            ))}
        </div>
    );
}
