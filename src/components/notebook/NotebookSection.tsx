// src/components/notebook/NotebookSection.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';

import { useIsMobile } from '@/hooks/useIsMobile';
import { useGetClientDetailsQuery } from '@/store/api/clientsApi';
import { useGetNotebookEntriesQuery } from '@/store/api/notebookApi';
import { useDeleteNotebookEntryMutation } from '@/store/api/notebookApi';
import { ClientDetails, ApiQueryResult } from '@/types/index'

import ConfirmationModal from '../ui/ConfirmationModal';

import NotebookEntryModal from './NotebookEntryModal';

interface NotebookSectionProps {
    studentId: string;
    studioId: string;
    instructorId: string;
}

export default function NotebookSection({ studentId, studioId, instructorId }: NotebookSectionProps) {
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const isMobile = useIsMobile();

    const { data: notebookEntries, isLoading, error } = useGetNotebookEntriesQuery({
        studentId,
        studioId
    });

    const { data: client } = useGetClientDetailsQuery({
        clientId: studentId,
        studioId: studioId || ''
    }) as ApiQueryResult<ClientDetails>

    const [deleteEntry] = useDeleteNotebookEntryMutation();
    const [confirmDelete, setConfirmDelete] = useState({
        isOpen: false,
        entryId: null as string | null
    });
    const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);

    const notebookId = notebookEntries?.notebookId || 'temp-notebook-id';
    const filteredEntries = notebookEntries?.entries?.filter(
        entry => entry.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleAddEntry = () => {
        setCurrentEntryId(null);
        setModalMode('add');
        setIsEntryModalOpen(true);
    };

    const handleEditEntry = (entryId: string) => {
        setCurrentEntryId(entryId);
        setModalMode('edit');
        setIsEntryModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsEntryModalOpen(false);
        setTimeout(() => {
            setCurrentEntryId(null);
            setModalMode('add');
        }, 300);
    };

    return (
        <div className="p-2 md:p-4">
            <h1 className="text-xl md:text-2xl font-bold text-[#00474E] mb-4 md:mb-5">
                {client?.first_name} {client?.last_name}
            </h1>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-3">
                <div className="flex items-center">
                    <h2 className="text-base md:text-lg font-medium text-[#00474E]">Notebook Entries</h2>
                    <button onClick={handleAddEntry} className="ml-2">
                        <Image
                            src='/assets/add-new-icon.svg'
                            height={17}
                            width={17}
                            alt='Add entry'
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
                        className="w-full px-4 py-2 pr-10 bg-[#F5F5F5] rounded-[50px] text-sm focus:outline-none focus:border-gray-400"
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
                <div className="text-center py-4 text-sm md:text-base">Loading entries...</div>
            ) : error ? (
                <div className="text-center py-4 text-red-500 text-sm md:text-base">Error loading entries</div>
            ) : filteredEntries.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm md:text-base">
                    {searchQuery ? 'No entries match your search' : 'No notebook entries yet'}
                </div>
            ) : (
                <div className="space-y-2 md:space-y-4">
                    {filteredEntries.map((entry) => {
                        const isChecklist = entry.contents.startsWith('[') && entry.contents.endsWith(']');

                        return (
                            <div
                                key={entry.entry_id}
                                className="border-b border-gray-300 p-2 md:p-4 relative group cursor-pointer"
                                onMouseEnter={() => !isMobile && setHoveredEntryId(entry.entry_id)}
                                onMouseLeave={() => !isMobile && setHoveredEntryId(null)}
                                onClick={() => handleEditEntry(entry.entry_id)}
                            >
                                {(hoveredEntryId === entry.entry_id || isMobile) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDelete({ isOpen: true, entryId: entry.entry_id });
                                        }}
                                        className="absolute top-1 right-1 md:top-3 md:right-3 text-gray-400 hover:text-red-500 p-1"
                                        title="Delete entry"
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
                                    <span className="text-md md:text-lg text-gray-500">
                                        {new Date((entry as any).entry_date ? `${(entry as any).entry_date}T00:00:00` : entry.created_at).toLocaleDateString()}
                                    </span>
                                    <h4 className="font-[400] text-[#49454F] text-sm md:text-base">{entry.title}</h4>

                                    {/* {!isChecklist && (
                                        <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-2">
                                            {entry.contents}
                                        </p>
                                         */}

                                    {/* {isChecklist && (
                                        <div className="flex items-center text-xs md:text-sm text-gray-600 mt-1">
                                            <span className="mr-1">📋</span>
                                        </div>
                                    )} */}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <NotebookEntryModal
                isOpen={isEntryModalOpen}
                onClose={handleCloseModal}
                studentId={studentId}
                studioId={studioId}
                notebookId={notebookId}
                instructorId={instructorId}
                entryId={currentEntryId || undefined}
                mode={modalMode}
            />

            <ConfirmationModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, entryId: null })}
                onConfirm={() => {
                    if (confirmDelete.entryId) {
                        deleteEntry({
                            entryId: confirmDelete.entryId
                        });
                        setConfirmDelete({ isOpen: false, entryId: null });
                    }
                }}
                title="Delete Notebook Entry"
                message="Are you sure you want to delete this notebook entry? This action cannot be undone."
                confirmText="Delete"
                confirmVariant="danger"
            />
        </div>
    );
}