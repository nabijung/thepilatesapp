// src/components/photo/PhotoViewerModal.tsx
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useState } from 'react';

interface PhotoViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    photo: {
        id: string;
        url: string;
        date: string;
    } | null;
}

export default function PhotoViewerModal({ isOpen, onClose, photo }: PhotoViewerModalProps) {
    const [loaded, setLoaded] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Show the modal first (for enter animation)
            setIsVisible(true);
            setIsAnimating(true);

            // Lock body scroll when modal is open
            document.body.style.overflow = 'hidden';

            // Start animation after a frame
            requestAnimationFrame(() => {
                setIsAnimating(false);
            });
        } else {
            // Start exit animation
            if (isVisible) {
                setIsAnimating(true);

                // Wait for animation to complete before hiding
                const timer = setTimeout(() => {
                    setIsVisible(false);
                    setLoaded(false);

                    // Restore scroll when modal closes
                    document.body.style.overflow = 'auto';
                }, 300);

                return () => clearTimeout(timer);
            }
        }

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, isVisible]);

    // Return null if modal shouldn't be rendered at all
    if (!isVisible && !isOpen) return null;

    const formattedDate = photo ? new Date(photo.date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : '';

    return (
        <div
            className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4"
            style={{
                transition: 'opacity 300ms ease',
                opacity: isAnimating ? 0 : 1
            }}
        >
            <div
                className="w-full max-w-4xl relative"
                style={{
                    transition: 'transform 300ms ease',
                    transform: isAnimating ? 'scale(0.9)' : 'scale(1)'
                }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-1 z-10 hover:bg-opacity-70 transition-all"
                >
                    <CloseIcon />
                </button>

                <div className="text-white text-sm mb-2">
                    {formattedDate}
                </div>

                <div className="relative w-full max-h-[80vh] flex items-center justify-center">
                    {photo && !loaded && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 border-4 border-t-[#FD7363] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        </div>
                    )}

                    {photo && (
                        <img
                            src={photo.url}
                            alt={`Progress photo from ${formattedDate}`}
                            className={`max-w-full max-h-[80vh] object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => setLoaded(true)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}