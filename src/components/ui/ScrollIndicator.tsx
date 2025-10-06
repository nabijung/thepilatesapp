// src/components/ui/ScrollIndicator.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { FaChevronDown as ChevronDown } from 'react-icons/fa6';


interface ScrollIndicatorProps {
    containerRef: React.RefObject<HTMLDivElement>;
    className?: string;
}

export default function ScrollIndicator({ containerRef, className = '' }: ScrollIndicatorProps) {
    const [showIndicator, setShowIndicator] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const checkScrollability = () => {
            // Show indicator if content is taller than container
            setShowIndicator(container.scrollHeight > container.clientHeight);
        };

        // Check initially
        checkScrollability();

        // Check on resize
        const resizeObserver = new ResizeObserver(checkScrollability);
        resizeObserver.observe(container);

        // Check on content changes
        const mutationObserver = new MutationObserver(checkScrollability);
        mutationObserver.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });

        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [containerRef]);

    if (!showIndicator) return null;

    return (
        <div className={`absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none animate-bounce ${className}`}>
            <div className="bg-white/80 rounded-full p-1 shadow-md">
                <ChevronDown size={20} className="text-gray-500" />
            </div>
        </div>
    );
}