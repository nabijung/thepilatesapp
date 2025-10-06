// src/components/clients/ClientList.tsx
'use client';

import Image from 'next/image'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useMemo, useEffect, useRef } from 'react';

import InstructorAddStudentModal from '@/components/clients/InstructorAddStudentModal';
import Card from '@/components/ui/Card';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useApproveClientMutation } from '@/store/api/clientsApi';
import {
    useGetInstructorStudiosQuery,
    useGetStudioClientsQuery,
} from '@/store/api/instructorsApi';
import { useAppSelector } from '@/store/hooks';

import ConfirmationModal from '../ui/ConfirmationModal';

interface ClientListProps {
    onStudioChange?: (studioId: string) => void;
}

export default function ClientList(props: ClientListProps) {
    const { user } = useAppSelector((state) => state.auth);
    const instructorId = user?.id;
    const pathname = usePathname();
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const isMobile = useIsMobile();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const [confirmAction, setConfirmAction] = useState({
        isOpen: false,
        clientId: null as string | null,
        action: null as 'approve' | 'reject' | null
    });

    const { activeStudio } = useAppSelector(state => state.studio);
    const activeStudioId = activeStudio?.studio_id

    // For approving clients
    const [approveClient] = useApproveClientMutation();

    // Fetch studios
    const { data: studios, isLoading: studiosLoading } = useGetInstructorStudiosQuery(
        String(instructorId) || '',
        { skip: !instructorId }
    );

    // Only fetch students if we have an active studio
    const { data: students, isLoading: studentsLoading } = useGetStudioClientsQuery(
        String(activeStudio?.studio_id) || '',
        { skip: !activeStudio?.studio_id }
    );

    // Check if user is admin of studio
    const isAdmin = useMemo(() => {
        if (!activeStudio) return false

        return activeStudio?.is_admin
    }, [activeStudio])

    // Expand the list on desktop
    useEffect(() => {
        if (!isMobile) {
            setIsCollapsed(false);
        }
    }, [isMobile]);

    // Handle approve/reject client
    const handleApproveClient = async (clientId: string, approved: 'approve' | 'reject') => {
        try {
            await approveClient({
                studioStudentId: clientId,
                action: approved
            }).unwrap();
        } catch (error) {
            console.error('Failed to approve/reject client:', error);
        }
    };

    const typedStudents = (students || []) as unknown as Array<{
        id: string;
        first_name: string;
        last_name: string;
        is_approved: boolean;
        studio_student_id: string;
        profile_picture_url?: string;
    }>;

    // Filter clients based on search
    const filteredStudents = typedStudents?.filter(
        student => `${student.first_name} ${student.last_name}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
    ) || [];

    // Sort filtered students by last name (ascending alphabetical order)
    const sortedStudents = filteredStudents.sort((a, b) =>
        a.last_name.localeCompare(b.last_name, undefined, { sensitivity: 'base' })
    );

    if (studiosLoading) {
        return <div className="py-4 text-center">Loading studios...</div>;
    }

    if (!studios || studios.length === 0 || !activeStudioId) {
        return (
            <Card title="No Studios Available">
                <div className="py-4 text-center text-gray-500">
                    You don't have any studios yet.
                </div>
            </Card>
        );
    }

    return (
        <div className="w-full">
            <Card
                extraContainerClass="h-full"
            >
                <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center">
                        <div className='text-lg font-bold text-[#00474E] mr-1'>
                            Clients
                        </div>
                        <button
                            onClick={() => setIsAddStudentModalOpen(true)}
                            className="p-1 rounded-full hover:bg-gray-100"
                            title="Add new student"
                        >
                            <Image
                                src="/assets/add-new-icon.svg"
                                alt="Add student"
                                width={20}
                                height={20}
                            />
                        </button>
                    </div>

                    {isMobile && (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="text-gray-500 p-2"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                    )}
                </div>

                <div
                    ref={contentRef}
                    className={`transition-[grid-template-rows] duration-300 ease-in-out grid ${isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
                >
                    <div className="overflow-hidden">
                        {/* Search Bar */}
                        <div className="pb-3 mb-3 px-4">
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    placeholder="Search clients..."
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

                        {studentsLoading ? (
                            <div className="py-4 text-center">Loading clients...</div>
                        ) : (
                            <div className="divide-y max-h-[calc(100vh-300px)] overflow-y-auto">
                                {sortedStudents.length > 0 ? (
                                    sortedStudents.map((student) => {
                                        const isCurrentClient = pathname === `/clients/${student.id}`;

                                        return (
                                            <div
                                                key={student.id}
                                                className={`p-4 ${isCurrentClient ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                                            >
                                                <Link
                                                    href={`/clients/${student.id}?studioId=${activeStudioId}`}
                                                    className="flex justify-between items-center"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white overflow-hidden">
                                                            {student.profile_picture_url ? (
                                                                <img
                                                                    src={student.profile_picture_url}
                                                                    alt={student.first_name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                student.first_name.charAt(0)
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-medium text-sm">{student.first_name} {student.last_name}</h3>
                                                            {!student.is_approved && (
                                                                <span className="text-xs text-yellow-600 ml-1">Pending</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {isAdmin && !student.is_approved && (
                                                        <div className="flex space-x-2">
                                                            {!student.is_approved && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setConfirmAction({
                                                                            isOpen: true,
                                                                            clientId: student.studio_student_id,
                                                                            action: 'approve'
                                                                        });
                                                                    }}
                                                                    className="text-green-500 hover:text-green-700"
                                                                    title="Approve"
                                                                >
                                                                    <Image
                                                                        src="/assets/approve.svg"
                                                                        alt={'approve'}
                                                                        width={17}
                                                                        height={17}
                                                                    />
                                                                </button>
                                                            )}

                                                            {!student.is_approved && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setConfirmAction({
                                                                            isOpen: true,
                                                                            clientId: student.studio_student_id,
                                                                            action: 'reject'
                                                                        });
                                                                    }}
                                                                    className="text-red-500 hover:text-red-700"
                                                                    title="Reject"
                                                                >
                                                                    <Image
                                                                        src="/assets/reject.svg"
                                                                        alt={'reject'}
                                                                        width={17}
                                                                        height={17}
                                                                    />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </Link>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-6 text-center text-gray-500">
                                        {searchQuery
                                            ? "No clients match your search"
                                            : "No clients available"}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <InstructorAddStudentModal
                    isOpen={isAddStudentModalOpen}
                    onClose={() => setIsAddStudentModalOpen(false)}
                    studioId={String(activeStudioId)}
                />

                <ConfirmationModal
                    isOpen={confirmAction.isOpen}
                    onClose={() => setConfirmAction({ ...confirmAction, isOpen: false })}
                    onConfirm={() => {
                        if (confirmAction.clientId && confirmAction.action) {
                            handleApproveClient(confirmAction.clientId, confirmAction.action);
                            setConfirmAction({ isOpen: false, clientId: null, action: null });
                        }
                    }}
                    title={`${confirmAction.action === 'approve' ? 'Approve' : 'Reject'} Client`}
                    message={`Are you sure you want to ${confirmAction.action === 'approve' ? 'approve' : 'reject'} this client?`}
                    confirmText={confirmAction.action === 'approve' ? 'Approve' : 'Reject'}
                    confirmButtonColor={confirmAction.action === 'approve' ? 'green' : 'red'}
                />
            </Card>
        </div>
    );
}