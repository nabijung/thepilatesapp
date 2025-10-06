// src/components/homework/HomeworkViewModal.tsx
import { useState, useEffect } from 'react';
import { useUpdateHomeworkStatusMutation } from '@/store/api/homeworkApi';

interface HomeworkViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    lesson: {
        lesson_id: string | number;
        title: string;
        reps: string;
        instructions: string;
        video_url?: string;
        level?: string;
        student_lesson_id: string | number;
        is_completed: boolean;
    } | null;
    readOnly?: boolean;
}

export default function HomeworkViewModal({
    isOpen,
    onClose,
    lesson,
    readOnly = false
}: HomeworkViewModalProps) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateHomeworkStatus] = useUpdateHomeworkStatusMutation();

    // Add local state to track completion status
    const [isCompleted, setIsCompleted] = useState<boolean>(false);

    // Update local state when the lesson prop changes
    useEffect(() => {
        if (lesson) {
            setIsCompleted(lesson.is_completed);
        }
    }, [lesson]);

    if (!isOpen || !lesson) return null;

    const handleMarkComplete = async () => {
        if (!lesson.student_lesson_id || readOnly) return;

        try {
            setIsUpdating(true);
            // Toggle the completion status
            const newStatus = !isCompleted;

            const result = await updateHomeworkStatus({
                studentLessonId: String(lesson.student_lesson_id),
                isCompleted: newStatus
            }).unwrap();

            // Update local state after successful API call
            setIsCompleted(newStatus);

        } catch (error) {
            console.error('Failed to update homework status:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    // Function to render embed video if available
    const renderVideo = () => {
        if (!lesson.video_url) return null;

        // Extract YouTube video ID
        const getYouTubeId = (url: string) => {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
            const match = url.match(regExp);

            return (match && match[2].length === 11) ? match[2] : null;
        };

        // Extract Vimeo video ID
        const getVimeoId = (url: string) => {
            const regExp = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
            const match = url.match(regExp);

            return match ? match[1] : null;
        };

        // Try to get YouTube ID first
        const youtubeId = getYouTubeId(lesson.video_url);
        if (youtubeId) {
            return (
                <div className="bg-gray-200 rounded-md overflow-hidden aspect-video mb-6">
                    <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        className="w-full h-full"
                        title={lesson.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            );
        }

        // Then try Vimeo ID
        const vimeoId = getVimeoId(lesson.video_url);
        if (vimeoId) {
            return (
                <div className="bg-gray-200 rounded-md overflow-hidden aspect-video mb-6">
                    <iframe
                        src={`https://player.vimeo.com/video/${vimeoId}`}
                        className="w-full h-full"
                        title={lesson.title}
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            );
        }

        // If not a YouTube or Vimeo URL, just show the URL as a link
        return (
            <div className="bg-gray-200 rounded-md overflow-hidden aspect-video mb-6 flex items-center justify-center">
                <a
                    href={lesson.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                >
                    Open Video
                </a>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-[20px]">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold flex-grow pr-4">{lesson.title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl sm:text-3xl leading-none"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="mb-4 space-y-2">
                    <p className="text-sm sm:text-base"><span className="font-medium">Reps:</span> {lesson.reps}</p>
                    {lesson.level && (
                        <p className="text-sm sm:text-base">
                            <span className="font-medium">Level:</span> {lesson.level}
                        </p>
                    )}
                </div>

                <p className="mb-6 text-sm sm:text-base">
                    <span className="font-medium">Instructions:</span> {lesson.instructions}
                </p>

                {/* Video container with consistent height */}
                {lesson.video_url && (
                    <div className="mb-6">
                        {renderVideo()}
                    </div>
                )}

                {/* Empty space to maintain height when no video */}
                {!lesson.video_url && <div className="h-24 sm:h-48 mb-6"></div>}

                {!readOnly && (
                    <button
                        onClick={handleMarkComplete}
                        disabled={isUpdating}
                        className="w-full py-2 sm:py-3 bg-[#FD7363] text-white rounded-md hover:bg-[#FF6A4A] transition-colors text-sm sm:text-base"
                    >
                        {isUpdating
                            ? 'Updating...'
                            : isCompleted
                                ? 'Mark as Incomplete'
                                : 'Mark Complete'
                        }
                    </button>
                )}
            </div>
        </div>
    );
}