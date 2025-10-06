// src/components/photo/ProgressPhotosSection.tsx
import Image from 'next/image';
import { useState } from 'react';

import { useIsMobile } from '@/hooks/useIsMobile';
import { validateFile } from '@/utils/fileValidation';
import { useGetClientDetailsQuery } from '@/store/api/clientsApi';
import { useGetProgressPhotosQuery, useDeleteProgressPhotoMutation, useUploadProgressPhotoMutation } from '@/store/api/photosApi';
import { ClientDetails, ApiQueryResult } from '@/types/index'

import PhotoViewerModal from '../photo/PhotoViewerModal';
import ConfirmationModal from '../ui/ConfirmationModal';

interface ProgressPhotosSectionProps {
    studentId: string;
    studioId: string | null;
}

interface UploadPhotoParams {
    studioStudentId: string;
    file: File;
    studioId?: string;
}

export default function ProgressPhotosSection({ studentId, studioId }: ProgressPhotosSectionProps) {
    const isMobile = useIsMobile();

    const { data: client, isLoading: clientLoading, error: clientError } = useGetClientDetailsQuery({
        clientId: studentId,
        studioId: studioId || ''
    }, { skip: !studentId || !studioId }) as ApiQueryResult<ClientDetails>

    const studioStudentId = client?.studio_student_id

    const { data: photos, isLoading: photosLoading, error: photosError } = useGetProgressPhotosQuery(
        studioStudentId || '',
        { skip: !studioStudentId }
    );

    const [uploadPhoto, { isLoading: isUploading }] = useUploadProgressPhotoMutation();
    const [deletePhoto] = useDeleteProgressPhotoMutation();
    const [hoveredPhotoId, setHoveredPhotoId] = useState<string | null>(null);
    const [selectedPhotoForView, setSelectedPhotoForView] = useState<unknown | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        photoId: null as string | null
    });

    const handleUploadClick = () => {
        if (!studioStudentId) {
            setUploadError('Unable to upload: Student-studio relationship not found');

            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && studioStudentId) {
                // Validate the file
                const validation = validateFile(file);
                if (!validation.valid) {
                    setUploadError(validation.error || 'Invalid file');

                    return;
                }

                try {
                    await uploadPhoto({
                        studioStudentId,
                        file,
                        studioId
                    } as UploadPhotoParams).unwrap();
                    setUploadError(null); // Clear any previous errors
                } catch (error: any) {
                    console.error('Failed to upload photo:', error);
                    setUploadError(error.message || 'Failed to upload photo');
                }
            }
        };
        input.click();
    };

    const handleDeletePhoto = (photoId: string) => {
        setConfirmModal({
            isOpen: true,
            photoId
        });
    };

    const handlePhotoClick = (photo: unknown) => {
        setSelectedPhotoForView(photo);
    };

    const closePhotoViewer = () => {
        setSelectedPhotoForView(null);
    };

    // Combined loading state
    const isLoading = clientLoading || photosLoading;

    // Combined error state
    const error = clientError || photosError;

    if (isLoading) {
        return <div className="py-6 text-center text-gray-500">Loading progress photos...</div>;
    }

    if (error) {
        return <div className="py-6 text-center text-red-500">Error loading progress photos</div>;
    }

    if (!studioStudentId) {
        return <div className="py-6 text-center text-gray-500">Student is not associated with this studio</div>;
    }

    return (
        <div>
            {client && (
                <h1 className="text-2xl font-bold text-[#00474E] mb-5">
                    {client.first_name} {client.last_name}
                </h1>
            )}

            <div className="flex items-center mb-6">
                <h2 className="text-lg font-medium text-[#00474E]">Progress Photos</h2>
                <button
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className="ml-2"
                >
                    <Image
                        src='/assets/add-new-icon.svg'
                        height={17}
                        width={17}
                        alt='Add photo'
                    />
                </button>
            </div>

            {uploadError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                    {uploadError}
                </div>
            )}

            {
                !photos || photos.length === 0 ? (
                    <div className="py-6 text-center text-gray-500">No progress photos yet</div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {photos.map((photo) => (
                            <div
                                key={photo.id}
                                className="relative aspect-square border border-gray-200 rounded overflow-hidden group"
                                onMouseEnter={() => !isMobile && setHoveredPhotoId(photo.id)}
                                onMouseLeave={() => !isMobile && setHoveredPhotoId(null)}
                                onClick={() => handlePhotoClick(photo)}
                            >
                                <img
                                    src={photo.url}
                                    alt={`Progress photo from ${new Date(photo.date).toLocaleDateString()}`}
                                    className="w-full h-full object-cover cursor-pointer"
                                />

                                {/* For desktop: Show on hover */}
                                {!isMobile && hoveredPhotoId === photo.id && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent opening the photo viewer
                                            handleDeletePhoto(photo.id);
                                        }}
                                        className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md"
                                        title="Delete photo"
                                    >
                                        <Image
                                            src='/assets/bin-icon.svg'
                                            height={17}
                                            width={17}
                                            alt='Delete photo'
                                        />
                                    </button>
                                )}

                                {/* For mobile: Always show with opacity */}
                                {isMobile && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent opening the photo viewer
                                            handleDeletePhoto(photo.id);
                                        }}
                                        className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md"
                                        title="Delete photo"
                                    >
                                        <Image
                                            src='/assets/bin-icon.svg'
                                            height={17}
                                            width={17}
                                            alt='Delete photo'
                                        />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Photo Viewer Modal */}
            <PhotoViewerModal
                isOpen={!!selectedPhotoForView}
                onClose={closePhotoViewer}
                photo={selectedPhotoForView as { id: string; url: string; date: string; }}
            />

            {/* Confirmation Modal for Delete */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, photoId: null })}
                onConfirm={() => {
                    if (confirmModal.photoId && studioStudentId) {
                        deletePhoto({
                            photoId: confirmModal.photoId,
                            studioStudentId,
                            studioId: studioId as string
                        });
                        setConfirmModal({ isOpen: false, photoId: null });
                    }
                }}
                title="Delete Photo"
                message="Are you sure you want to delete this photo? This action cannot be undone."
                confirmText="Delete"
                confirmVariant="danger"
            />
        </div>
    );
}