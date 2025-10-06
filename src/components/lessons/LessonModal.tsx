// src/components/lessons/LessonModal.tsx
'use client';

import { Formik, Form } from 'formik';
import { useRef } from 'react';
import * as Yup from 'yup';

import { CustomFormField } from '@/components/ui/FormField';
import { useAddLessonMutation, useUpdateLessonMutation, useGetLessonQuery } from '@/store/api/lessonsApi';

interface LessonModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioId: string;
    lessonId?: string; // Optional - if provided, we're in edit mode
    onLessonAdded?: (lessonId: string) => void;
}

const LessonSchema = Yup.object().shape({
    title: Yup.string().required('Title is required'),
    level: Yup.string().required('Level is required'),
    reps: Yup.string().required('Reps is required'),
    video_url: Yup.string().url('Enter a valid URL').nullable(),
    instructions: Yup.string().nullable()
});

export default function LessonModal({
    isOpen,
    onClose,
    studioId,
    lessonId,
    onLessonAdded
}: LessonModalProps) {
    const formRef = useRef<unknown>(null);
    const isEditMode = !!lessonId && lessonId !== 'null';

    // Only fetch lesson data if in edit mode and modal is open
    const { data: lesson, isLoading: isLoadingLesson } = useGetLessonQuery(lessonId || '', {
        skip: !isOpen || !isEditMode
    });

    const [addLesson, { isLoading: isAdding }] = useAddLessonMutation();
    const [updateLesson, { isLoading: isUpdating }] = useUpdateLessonMutation();

    const isLoading = isAdding || isUpdating || isLoadingLesson;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-[20px]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[#00474E]">
                        {isEditMode ? 'Edit lesson' : 'Add a new lesson'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500">
                        ✕
                    </button>
                </div>

                {isEditMode && isLoadingLesson ? (
                    <div className="py-4 text-center">Loading lesson...</div>
                ) : (
                    <Formik
                        initialValues={{
                            title: isEditMode ? ((lesson as any)?.title || '') : '',
                            level: isEditMode ? ((lesson as any)?.level || 'Beginner') : 'Beginner',
                            reps: isEditMode ? ((lesson as any)?.reps || '') : '',
                            video_url: isEditMode ? ((lesson as any)?.video_url || '') : '',
                            instructions: isEditMode ? ((lesson as any)?.instructions || '') : ''
                        }}
                        validationSchema={LessonSchema}
                        onSubmit={async (values) => {
                            try {
                                if (isEditMode && lessonId) {
                                    // Update existing lesson
                                    await updateLesson({
                                        lessonId,
                                        ...values
                                    }).unwrap();
                                } else {
                                    // Add new lesson
                                    const result = await addLesson({
                                        studioId,
                                        ...values
                                    }).unwrap();

                                    if (onLessonAdded && (result as any).lesson_id) {
                                        onLessonAdded((result as any).lesson_id);
                                    }
                                }
                                onClose();
                            } catch (error) {
                                console.error(`Failed to ${isEditMode ? 'update' : 'add'} lesson:`, error);
                            }
                        }}
                        innerRef={formRef as any}
                        enableReinitialize
                    >
                        {() => (
                            <Form className="space-y-6">
                                <div>
                                    <CustomFormField
                                        label="Title"
                                        id="title"
                                        name="title"
                                    />
                                </div>

                                <div>
                                    <CustomFormField
                                        label="Level"
                                        as="select"
                                        select={true}
                                        id="level"
                                        name="level"
                                        className='!w-1/2'
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </CustomFormField>
                                </div>

                                <div>
                                    <CustomFormField
                                        label="Reps"
                                        id="reps"
                                        name="reps"
                                        className="!w-[150px]"
                                    />
                                </div>

                                <div>
                                    <CustomFormField
                                        label="Vimeo or YouTube link"
                                        id="video_url"
                                        name="video_url"
                                    />
                                </div>

                                <div>
                                    <CustomFormField
                                        as="textarea"
                                        id="instructions"
                                        name="instructions"
                                        label="Instructions"
                                    />
                                </div>

                                <div className="flex space-x-2 mt-4">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="px-4 py-2 rounded-md text-white bg-[#FD7363] hover:bg-[#FF6A4A] w-full"
                                    >
                                        {isLoading
                                            ? (isEditMode ? 'Saving...' : 'Adding...')
                                            : (isEditMode ? 'Save Changes' : 'Add Lesson')}
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                )}
            </div>
        </div>
    );
}