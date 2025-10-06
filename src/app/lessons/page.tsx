'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

import LessonModal from '@/components/lessons/LessonModal';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useDeleteLessonMutation, useGetStudioLessonsQuery } from '@/store/api/lessonsApi';
import { useAppSelector } from '@/store/hooks';

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Return false during SSR to prevent hydration mismatch
    return isClient ? isMobile : false;
}

export default function LessonsPage() {
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const isMobile = useIsMobile();

    const { user } = useAppSelector((state) => state.auth);

    const [confirmAction, setConfirmAction] = useState({
        isOpen: false,
        lessonId: null as string | null,
    });

    const [hoveredLessonId, setHoveredLessonId] = useState<string | null>(null);

    const { activeStudio } = useAppSelector(state => state.studio);
    const activeStudioId = activeStudio?.studio_id;

    const [deleteLesson] = useDeleteLessonMutation();

    const { data: lessons, isLoading, error } = useGetStudioLessonsQuery(String(activeStudioId) || '');
    const typedLessons = lessons as Array<{
        lesson_id: string;
        title: string;
        level: string;
        reps: string;
        created_at: string;
    }>;

    const filteredLessons = typedLessons?.filter(
        lesson => lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleCloseModal = () => {
        setIsLessonModalOpen(false);
        setEditingLessonId(null);
    };

    const handleOpenAddModal = () => {
        setEditingLessonId(null);
        setIsLessonModalOpen(true);
    };

    const handleOpenEditModal = (lessonId: string) => {
        setEditingLessonId(lessonId);
        setIsLessonModalOpen(true);
    };

    if (!activeStudioId) {
        return (
            <div className="min-h-screen bg-[#F9F6F5] p-4">
                <div className="text-center py-8">
                    <p className="text-sm md:text-base">No studio selected. Please select a studio.</p>
                </div>
            </div>
        );
    }

    const onDeleteLesson = async (lessonId: string) => {
        try {
            await deleteLesson(lessonId).unwrap();
            setConfirmAction({ isOpen: false, lessonId: null });
        } catch (error) {
            console.error('Failed to delete lesson', error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);

        return `${date.toLocaleString('en-US', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`;
    };

    return (
        <div className="min-h-screen px-4 md:px-10">
            <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm p-4 md:p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="flex items-center">
                        <h1 className="text-lg md:text-xl font-medium text-[#00474E]">Lessons</h1>
                        <button
                            onClick={handleOpenAddModal}
                            className="ml-2 text-[#00474E]"
                            title="Add lesson"
                        >
                            <Image
                                src='/assets/add-new-icon.svg'
                                height={17}
                                width={17}
                                alt='Add Lesson'
                                className="w-4 h-4 md:w-5 md:h-5"
                            />
                        </button>
                    </div>

                    <div className="relative w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Search by lesson"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-4 py-2 pr-10 rounded-full bg-gray-100 text-sm w-full md:w-80"
                        />
                        <div className="absolute right-3 top-2.5 text-gray-400">
                            <Image
                                src='/assets/search-icon.svg'
                                height={17}
                                width={17}
                                alt="search icon"
                                className="w-4 h-4 md:w-5 md:h-5"
                            />
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-4 text-sm md:text-base">Loading lessons...</div>
                ) : error ? (
                    <div className="text-center py-4 text-red-500 text-sm md:text-base">Error loading lessons</div>
                ) : filteredLessons.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm md:text-base">
                        {searchQuery ? 'No lessons match your search' : 'No lessons available'}
                    </div>
                ) : (
                    <div className="space-y-0">
                        {filteredLessons.map((lesson) => (
                            <div
                                key={lesson.lesson_id}
                                onMouseEnter={() => !isMobile && setHoveredLessonId(lesson.lesson_id)}
                                onMouseLeave={() => !isMobile && setHoveredLessonId(null)}
                                className="flex justify-between items-center py-3 md:py-4 border-b border-gray-200 relative group"
                            >
                                <div
                                    className="flex-1 cursor-pointer"
                                    onClick={() => handleOpenEditModal(lesson.lesson_id)}
                                >
                                    <h3 className="text-sm md:text-base">{lesson.title}</h3>
                                    <p className="text-xs md:text-sm text-gray-500">{formatDate(lesson.created_at)}</p>
                                </div>

                                {(hoveredLessonId === lesson.lesson_id || isMobile) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmAction({ isOpen: true, lessonId: lesson.lesson_id });
                                        }}
                                        className="text-gray-400 hover:text-red-500 ml-2"
                                        title="Delete lesson"
                                    >
                                        <Image
                                            src='/assets/bin-icon.svg'
                                            width={17}
                                            height={17}
                                            alt='delete lesson'
                                            className="w-4 h-4 md:w-5 md:h-5"
                                        />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isLessonModalOpen && (
                <LessonModal
                    isOpen={isLessonModalOpen}
                    onClose={handleCloseModal}
                    studioId={String(activeStudioId) || ''}
                    lessonId={editingLessonId || undefined}
                />
            )}

            <ConfirmationModal
                isOpen={confirmAction.isOpen}
                onClose={() => setConfirmAction({ isOpen: false, lessonId: null })}
                onConfirm={() => {
                    if (confirmAction.lessonId) {
                        onDeleteLesson(confirmAction.lessonId);
                    }
                }}
                title="Delete Lesson"
                message="Are you sure you want to delete this lesson?"
                confirmText="Delete"
                confirmVariant="danger"
            />
        </div>
    );
}