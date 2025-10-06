// src/components/dashboard/StudentDashboard.tsx
'use client';

import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CheckIcon from '@mui/icons-material/Check';
import Image from 'next/image'
import { useEffect, useState } from 'react'

import HomeworkViewModal from '@/components/homework/HomeworkViewModal'; // Updated import
import ChangeStudioModal from '@/components/studio/ChangeStudioModal';
import Card from '@/components/ui/Card';
import { useGetStudentHomeworkQuery } from '@/store/api/homeworkApi';
import { useGetProgressPhotosQuery } from '@/store/api/photosApi';
import { useGetStudentStudiosQuery, useGetStudioStudentRelationshipQuery } from '@/store/api/studentsApi';
import { useAppSelector } from '@/store/hooks';

import PhotoViewerModal from '../photo/PhotoViewerModal';

interface StudentDashboardProps {
    studentId: string;
}

export default function StudentDashboard({ studentId }: StudentDashboardProps) {

    const { data: studios, isLoading: studiosLoading } = useGetStudentStudiosQuery(studentId);
    const typedStudios = studios as Array<{
        studio_id: string;
        name: string;
        is_approved: boolean;
        short_id?: string;
    }>;

    const [isChangeStudioModalOpen, setIsChangeStudioModalOpen] = useState(false);
    const { activeStudio } = useAppSelector(state => state.studio);

    // State for homework modal
    const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
    const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);

    // Only fetch lessons if we have an active studio
    const { data: lessons, isLoading: lessonsLoading, error } = useGetStudentHomeworkQuery(
        { studentId, studioId: String(activeStudio?.studio_id) },
        { skip: !activeStudio?.studio_id }
    )


    const { data: studioRelationship, isLoading: clientLoading } = useGetStudioStudentRelationshipQuery(
        { studentId, studioId: String(activeStudio?.studio_id) },
        { skip: !studentId || !activeStudio?.studio_id }
    );

    const studioStudentId = studioRelationship?.studio_student_id

    const [selectedPhoto, setSelectedPhoto] = useState(null);

    const { data: photos, isLoading: photosLoading } = useGetProgressPhotosQuery(
        studioStudentId || '',
        { skip: !studioStudentId }
    );

    // Find the currently selected lesson from the lessons array
    // This ensures we always have the most up-to-date version of the lesson
    const selectedLesson = selectedLessonId && lessons
        ? lessons.find(lesson => lesson?.lesson_id.toString() === selectedLessonId.toString())
        : null;

    // Handle lesson click
    const handleLessonClick = (lesson: any) => {
        setSelectedLessonId(lesson.lesson_id);
        setIsHomeworkModalOpen(true);
    };

    // Effect to update the selected lesson when lessons are updated
    useEffect(() => {
        if (selectedLessonId && lessons && !lessons.some(lesson => lesson.lesson_id.toString() === selectedLessonId.toString())) {
            // If the selected lesson is no longer in the lessons array, close the modal
            setIsHomeworkModalOpen(false);
            setSelectedLessonId(null);
        }
    }, [lessons, selectedLessonId]);

    if (studiosLoading) {
        return <div className="py-8 text-center">Loading studios...</div>;
    }

    if (!typedStudios || typedStudios.length === 0 || !activeStudio) {
        return (
            <>
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <Card title="Welcome to Prospire">
                        <div className="py-8 text-center">
                            <p className="text-lg text-gray-600 mb-4">
                                You don't have any approved studios yet.
                            </p>
                            {typedStudios && typedStudios.length > 0 ? (
                                typedStudios.filter(studio => !studio.is_approved).map((studio, index) => (
                                    <p key={studio.studio_id} className="text-gray-500">
                                        Your studio membership for {studio.name} is pending approval.
                                    </p>
                                ))
                            ) : (
                                <button
                                    onClick={() => {
                                        setIsChangeStudioModalOpen(true);
                                    }}
                                    className="bg-[#FD7363] text-white px-4 py-2 rounded-md"
                                >
                                    Join a Studio
                                </button>
                            )}
                        </div>
                    </Card>
                </div>
                <ChangeStudioModal
                    isOpen={isChangeStudioModalOpen}
                    onClose={() => setIsChangeStudioModalOpen(false)}
                />
            </>
        );
    }

    return (
        <div className="px-4 sm:px-6 mt-12 sm:mt-15">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <Card
                    title="Homework"
                    extraContainerClass={'h-full'}
                >
                    {lessonsLoading ? (
                        <div>Loading homework...</div>
                    ) : !lessons || lessons.length === 0 ? (
                        <div className="py-4 text-center text-gray-500">No homework assigned yet</div>
                    ) : (
                        <div>
                            {lessons.map((lesson, index) => (
                                <button
                                    onClick={() => handleLessonClick(lesson)}
                                    key={index}
                                    className="border-b border-gray-100 py-3 w-full text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex-grow pr-2">
                                            <h3 className="font-medium text-left">{lesson.title}</h3>
                                            <p className="text-sm text-gray-600">Reps: {lesson.reps}</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {lesson.is_completed && (
                                                <CheckIcon sx={{ color: '#22c55e', fontSize: 25 }} />
                                            )}
                                            <div className="text-gray-400">
                                                <ArrowForwardIosIcon sx={{ color: '#9CA3AF', fontSize: 25 }} />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </Card>

                <Card title="Progress Photos">
                    {photosLoading || clientLoading ? (
                        <div className="py-4 text-center">Loading photos...</div>
                    ) : !studioStudentId ? (
                        <div className="py-4 text-center text-gray-500">Studio connection not found</div>
                    ) : !photos || photos.length === 0 ? (
                        <div className="py-4 text-center text-gray-500">No progress photos yet</div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            {photos.map((photo) => (
                                <div
                                    key={photo.id}
                                    className="aspect-square bg-gray-200 rounded overflow-hidden cursor-pointer"
                                    onClick={() => setSelectedPhoto(photo)}
                                >
                                    <img
                                        src={photo.url}
                                        alt={`Progress photo from ${new Date(photo.date).toLocaleDateString()}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* HomeworkViewModal */}
            <HomeworkViewModal
                isOpen={isHomeworkModalOpen}
                onClose={() => setIsHomeworkModalOpen(false)}
                lesson={selectedLesson as {
                    lesson_id: string | number;
                    title: string;
                    reps: string;
                    instructions: string;
                    video_url?: string;
                    level?: string;
                    student_lesson_id: string | number;
                    is_completed: boolean;
                }}
            />

            {/* Change Studio Modal */}
            <ChangeStudioModal
                isOpen={isChangeStudioModalOpen}
                onClose={() => setIsChangeStudioModalOpen(false)}
            />

            <PhotoViewerModal
                isOpen={!!selectedPhoto}
                onClose={() => setSelectedPhoto(null)}
                photo={selectedPhoto}
            />
        </div>
    );
}