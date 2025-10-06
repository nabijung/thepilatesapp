// src/components/homework/HomeworkSection.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';

import HomeworkViewModal from './HomeworkViewModal'; // Import the new component
import AssignHomeworkModal from './AssignHomeworkModal';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useGetClientDetailsQuery } from '@/store/api/clientsApi';
import { useGetStudentHomeworkQuery, useDeleteHomeworkMutation } from '@/store/api/homeworkApi';
import { ClientDetails, ApiQueryResult } from '@/types/index'

interface HomeworkSectionProps {
    studentId: string;
    studioId: string;
}

export default function HomeworkSection({ studentId, studioId }: HomeworkSectionProps) {
    const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false); // New state for view modal
    const [selectedHomework, setSelectedHomework] = useState<any>(null); // State to track selected homework
    const [searchQuery, setSearchQuery] = useState('');
    const isMobile = useIsMobile();

    const { data: client } = useGetClientDetailsQuery({
        clientId: studentId,
        studioId: studioId || ''
    }) as ApiQueryResult<ClientDetails>

    const { data: homework, isLoading, error } = useGetStudentHomeworkQuery({ studentId, studioId });

    const [deleteHomework] = useDeleteHomeworkMutation();
    const [confirmDelete, setConfirmDelete] = useState({
        isOpen: false,
        homeworkId: null as string | null
    });
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

    const filteredHomework = homework?.filter(
        item => item.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleOpenEditModal = (homework: any) => {
        setSelectedHomework(homework);
        setIsHomeworkModalOpen(true);
    };

    // New handler to open the view modal
    const handleOpenViewModal = (homework: any) => {
        setSelectedHomework(homework);
        setIsViewModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsHomeworkModalOpen(false);
        setSelectedHomework(null);
    };

    const handleAddNewHomework = () => {
        setSelectedHomework(null);
        setIsHomeworkModalOpen(true);
    };

    return (
        <div className="p-2 md:p-4">
            <h1 className="text-xl md:text-2xl font-bold text-[#00474E] mb-4 md:mb-5">
                {client?.first_name} {client?.last_name}
            </h1>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                <div className="flex items-center">
                    <h2 className="text-base md:text-lg font-medium text-[#00474E]">Homework</h2>
                    <button
                        onClick={handleAddNewHomework}
                        className="ml-2"
                    >
                        <Image
                            src='/assets/add-new-icon.svg'
                            height={17}
                            width={17}
                            alt='Add homework'
                            className="w-4 h-4 md:w-5 md:h-5"
                        />
                    </button>
                </div>

                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder="Search by entry"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 pr-10 bg-[#F5F5F5] rounded-[50px] text-sm"
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
                <div className="text-center py-4 text-sm md:text-base">Loading homework...</div>
            ) : error ? (
                <div className="text-center py-4 text-red-500 text-sm md:text-base">Error loading homework</div>
            ) : filteredHomework.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm md:text-base">
                    {searchQuery ? 'No homework matches your search' : 'No homework assigned yet'}
                </div>
            ) : (
                <div className="space-y-2 md:space-y-3">
                    {filteredHomework.map((item, index) => {
                        return (
                            <div
                                key={item.student_lesson_id}
                                className="border-b border-gray-300 p-2 md:p-4 rounded-md relative cursor-pointer group"
                                onMouseEnter={() => !isMobile && setHoveredItemId(String(item.student_lesson_id))}
                                onMouseLeave={() => !isMobile && setHoveredItemId(null)}
                                onClick={() => handleOpenViewModal(item)} // Open view modal instead of edit modal
                            >
                                {(hoveredItemId === String(item.student_lesson_id) || isMobile) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDelete({ isOpen: true, homeworkId: String(item.student_lesson_id) });
                                        }}
                                        className="absolute top-1 right-1 md:top-2 md:right-2 text-gray-400 hover:text-red-500"
                                        title="Delete homework"
                                    >
                                        <Image
                                            src='/assets/bin-icon.svg'
                                            width={17}
                                            height={17}
                                            alt="Delete"
                                            className="w-4 h-4 md:w-5 md:h-5"
                                        />
                                    </button>
                                )}

                                <div>
                                    <div>
                                        <h4 className="font-medium text-sm md:text-base">{item.title}</h4>
                                        <p className="text-xs md:text-sm text-gray-600">
                                            {item.level}, {item.reps} reps
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-1 md:mt-2">
                                        {item.is_completed && (
                                            <span className="text-green-500 text-xs md:text-sm">Completed</span>
                                        )}
                                        <span className="text-xs md:text-sm text-gray-500">
                                            {new Date((item as any).assigned_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <AssignHomeworkModal
                isOpen={isHomeworkModalOpen}
                onClose={handleCloseModal}
                studentId={studentId}
                studioId={studioId}
                existingHomework={selectedHomework}
                mode={selectedHomework ? 'edit' : 'create'}
            />

            {/* Add the new HomeworkViewModal */}
            <HomeworkViewModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                lesson={selectedHomework}
            />

            <ConfirmationModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, homeworkId: null })}
                onConfirm={() => {
                    if (confirmDelete.homeworkId) {
                        deleteHomework(confirmDelete.homeworkId);
                        setConfirmDelete({ isOpen: false, homeworkId: null });
                    }
                }}
                title="Delete Homework"
                message="Are you sure you want to delete this homework assignment? This action cannot be undone."
                confirmText="Delete"
                confirmVariant="danger"
            />
        </div>
    );
}