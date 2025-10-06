// src/app/instructors/page.tsx
'use client';

import Image from 'next/image';
import { useState, useMemo } from 'react';

import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useGetStudioInstructorsQuery, useApproveInstructorMutation } from '@/store/api/instructorsApi';
import { useAppSelector } from '@/store/hooks';

export default function StudioInstructorsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const isMobile = useIsMobile();

    const { user } = useAppSelector((state) => state.auth);

    const [confirmAction, setConfirmAction] = useState({
        isOpen: false,
        studioInstructorId: null as string | null,
        action: null as 'approve' | 'reject' | null
    });

    const { activeStudio } = useAppSelector(state => state.studio);
    const activeStudioId = activeStudio?.studio_id;

    const { data: instructors, isLoading, error } = useGetStudioInstructorsQuery(
        String(activeStudioId) || '',
        { skip: !activeStudioId }
    );

    const [approveInstructor, { isLoading: isApproving }] = useApproveInstructorMutation();

    const typedInstructors = instructors as Array<{
        id: string;
        first_name: string;
        last_name: string;
        is_admin: boolean;
        is_approved: boolean;
        studio_instructor_id: string;
    }>;

    const filteredInstructors = typedInstructors?.filter(
        instructor =>
            `${instructor.first_name} ${instructor.last_name}`
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
    ) || [];

    const isAdmin = useMemo(() => activeStudio?.is_admin, [activeStudio]);

    const handleApproveInstructor = async (studioInstructorId: string, approved: 'approve' | 'reject') => {
        try {
            await approveInstructor({
                studioInstructorId,
                action: approved,
            }).unwrap();
            setConfirmAction({ isOpen: false, studioInstructorId: null, action: null });
        } catch (error) {
            console.error('Failed to approve/reject instructor:', error);
        }
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

    return (
        <div className="min-h-screen p-4 md:p-10">
            <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm p-4 md:p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h1 className="text-lg md:text-xl font-medium text-[#00474E]">Studio Instructors</h1>

                    <div className="relative w-full md:w-72">
                        <input
                            type="text"
                            placeholder="Search by instructor"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-full bg-gray-100 text-sm"
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
                    <div className="text-center py-4 text-sm md:text-base">Loading instructors...</div>
                ) : error ? (
                    <div className="text-center py-4 text-red-500 text-sm md:text-base">Error loading instructors</div>
                ) : filteredInstructors.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm md:text-base">
                        {searchQuery ? 'No instructors match your search' : 'No instructors available'}
                    </div>
                ) : (
                    <div className="space-y-0">
                        {filteredInstructors.map((instructor) => {
                            const isLoggedInUser = instructor.id === user?.id;

                            return (
                                <div
                                    key={instructor.id}
                                    className="flex justify-between items-center py-3 md:py-4 px-2 border-b border-gray-200 relative"
                                >
                                    <div className="text-sm md:text-base text-[#1D1B20]">
                                        {instructor.first_name} {instructor.last_name}
                                        {instructor.is_admin && (
                                            <span className="ml-2 px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                    {isAdmin && !isLoggedInUser && (
                                        <div className="flex space-x-1 md:space-x-2">
                                            {!instructor.is_approved &&
                                                <button
                                                    onClick={() => setConfirmAction({
                                                        isOpen: true,
                                                        studioInstructorId: instructor.studio_instructor_id,
                                                        action: 'approve'
                                                    })}
                                                    disabled={isApproving}
                                                    className="p-1 md:p-1.5"
                                                    title="Approve"
                                                >
                                                    <Image
                                                        src="/assets/approve.svg"
                                                        alt="approve"
                                                        width={isMobile ? 18 : 20}
                                                        height={isMobile ? 18 : 20}
                                                    />
                                                </button>
                                            }
                                            <button
                                                onClick={() => setConfirmAction({
                                                    isOpen: true,
                                                    studioInstructorId: instructor.studio_instructor_id,
                                                    action: 'reject'
                                                })}
                                                disabled={isApproving}
                                                className="p-1 md:p-1.5"
                                                title="Reject"
                                            >
                                                <Image
                                                    src="/assets/reject.svg"
                                                    alt="reject"
                                                    width={isMobile ? 14 : 15}
                                                    height={isMobile ? 14 : 15}
                                                />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={confirmAction.isOpen}
                onClose={() => setConfirmAction({ isOpen: false, studioInstructorId: null, action: null })}
                onConfirm={() => {
                    if (confirmAction.studioInstructorId && confirmAction.action) {
                        handleApproveInstructor(
                            confirmAction.studioInstructorId,
                            confirmAction.action
                        );
                    }
                }}
                title={confirmAction.action === 'approve' ? "Approve Instructor" : "Reject Instructor"}
                message={
                    confirmAction.action === 'approve'
                        ? "Are you sure you want to approve this instructor? They will gain access to studio content and clients."
                        : "Are you sure you want to reject this instructor? They will be removed from your studio."
                }
                confirmText={confirmAction.action === 'approve' ? "Approve" : "Reject"}
                confirmVariant={confirmAction.action === 'approve' ? "success" : "danger"}
            />
        </div>
    );
}
