// src/components/studio/ChangeStudioModal.tsx
'use client';

import Checkbox from '@mui/material/Checkbox';
import { Form, Formik } from 'formik';
import { useState, useEffect } from 'react';
import * as Yup from 'yup'

import { useGetInstructorStudiosQuery } from '@/store/api/instructorsApi';
import { useGetStudentStudiosQuery } from '@/store/api/studentsApi';
import { useChangeStudioMutation } from '@/store/api/studiosApi';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setActiveStudio, setStudios, Studio } from '@/store/slices/studioSlice';

import { CustomFormField } from '../ui/FormField';

interface ChangeStudioModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChangeStudioModal({ isOpen, onClose }: ChangeStudioModalProps) {
    const dispatch = useAppDispatch();
    const { user, userType } = useAppSelector((state) => state.auth);
    const { studios: storeStudios, activeStudio } = useAppSelector((state) => state.studio);

    const [selectedStudioId, setSelectedStudioId] = useState<string | null>(
        activeStudio ? String(activeStudio.studio_id) : null
    );

    // Fetch user's studios based on user type
    const {
        data: studentStudios,
        isLoading: studentStudiosLoading
    } = useGetStudentStudiosQuery(String(user?.id) || '', {
        skip: !user?.id || userType !== 'student'
    });

    const {
        data: instructorStudios,
        isLoading: instructorStudiosLoading
    } = useGetInstructorStudiosQuery(String(user?.id) || '', {
        skip: !user?.id || userType !== 'instructor'
    });

    const studios = userType === 'student' ? studentStudios : instructorStudios;
    const isLoading = userType === 'student' ? studentStudiosLoading : instructorStudiosLoading;

    const typedStudios = studios as Array<{
        studio_id: string;
        name: string;
        is_approved: boolean;
        short_id?: string;
    }>;

    // Mutation for joining new studio
    const [changeStudio, { isLoading: isChanging }] = useChangeStudioMutation();

    const ChangeStudioSchema = Yup.object().shape({
        studioId: Yup.string()
            .required('Required'),
    })

    // Update redux store with fetched studios
    useEffect(() => {
        if (studios && !isLoading) {
            dispatch(setStudios(studios as Studio[]));
        }
    }, [studios, isLoading, dispatch]);

    // Handle studio selection
    const handleStudioSelection = (studioId: string) => {
        setSelectedStudioId(studioId);


        const selectedStudio = studios?.find(s => String((s as any).studio_id) === studioId);
        console.log('changing to', selectedStudio)

        if (selectedStudio) {
            dispatch(setActiveStudio(selectedStudio as Studio));
            // onClose();
        }
    };

    // Handle join studio button click
    const handleJoinStudio = async (studioIdInput) => {
        if (!user?.id || !userType) return;

        try {
            const result = await changeStudio({
                userId: String(user.id),
                userType,
                studioId: studioIdInput.trim()
            }).unwrap();

            console.log('Mutation result:', result);

            // Reset input and refresh studios
            // setStudioIdInput('');

            // Close modal
            // onClose();
        } catch (error) {
            console.error('Failed to join studio', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-auto mx-[20px]">
                {/* Close button */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-[#00474E]">Change Studio</h2>
                    <button
                        onClick={() => {
                            // setStudioIdInput('')
                            onClose()
                        }}
                        className="text-gray-500 hover:text-gray-700 text-3xl"
                    >
                        ×
                    </button>
                </div>

                {/* Enter studio ID section */}
                <Formik
                    initialValues={{
                        studioId: ''
                    }}
                    onSubmit={async (values, { resetForm }) => {
                        await handleJoinStudio(values.studioId)
                        // resetForm()
                    }}
                    validationSchema={ChangeStudioSchema}
                >
                    {props => {

                        const isValid = props.isValid && Object.keys(props.touched).length > 0

                        return (
                            <Form>
                                <div className="mb-6">

                                    <CustomFormField
                                        type="text"
                                        label="Enter a studio ID"
                                        name="studioId"
                                    />

                                    <button
                                        // onClick={handleJoinStudio}
                                        disabled={!isValid}
                                        className="w-full mt-4 py-3 bg-[#FD7363] text-white rounded-md hover:bg-[#FF6A4A] disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        {isChanging ? 'Joining...' : 'Join Studio'}
                                    </button>
                                </div>
                            </Form>
                        )
                    }}
                </Formik>

                {/* Your Studios section */}
                {typedStudios && studios.length > 0 && (
                    <>
                        <h3 className="font-semibold text-lg text-[#00554A] mb-4">Your Studios</h3>
                        <div className="space-y-4 divide-y">
                            {typedStudios.map((studio) => {

                                const shortStudioId = studio.short_id || '';

                                const is_approved = studio.is_approved

                                return (
                                    <div
                                        key={studio.studio_id}
                                        className="flex items-center py-4 border-b border-gray-200 relative"
                                    >
                                        {
                                            studio?.is_approved == false && <div className='absolute right-2 top-3 text-xs text-[green] '> pending approval
                                            </div>
                                        }
                                        <Checkbox
                                            onClick={() => handleStudioSelection(String(studio.studio_id))}
                                            checked={String(studio.studio_id) === selectedStudioId}
                                            sx={{
                                                color: '#65558F',
                                                '&.Mui-checked': {
                                                    color: '#65558F',
                                                },
                                            }}
                                            disabled={!is_approved}
                                        />
                                        <div>
                                            <div className="font-medium">{studio.name}</div>
                                            <div className="text-sm text-gray-500">{shortStudioId}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                {/* Loading state */}
                {isLoading && (
                    <div className="text-center py-4">Loading your studios...</div>
                )}

                {/* No studios state */}
                {!isLoading && studios && studios.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                        You don't have any studios yet.
                    </div>
                )}
            </div>
        </div>
    );
}