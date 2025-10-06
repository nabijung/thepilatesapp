// src/components/homework/AssignHomeworkModal.tsx
'use client';

import { Formik, Form, ErrorMessage } from 'formik';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import * as Yup from 'yup';

import { useAssignHomeworkMutation, useUpdateHomeworkMutation, useUpdateHomeworkStatusMutation } from '@/store/api/homeworkApi';
import { useGetStudioLessonsQuery } from '@/store/api/lessonsApi';

import { CustomFormField } from '../ui/FormField';

interface AssignHomeworkModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentId: string;
    studioId: string;
    existingHomework?: unknown; // For editing mode
    mode?: 'create' | 'edit'; // Default is create
}

const HomeworkSchema = Yup.object().shape({
    lessonId: Yup.string().required('Please select a lesson'),
    date: Yup.date().required('Date is required'),
    isCompleted: Yup.boolean()
});

export default function AssignHomeworkModal({
    isOpen,
    onClose,
    studentId,
    studioId,
    existingHomework,
    mode = 'create'
}: AssignHomeworkModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const { data: lessons, isLoading: lessonsLoading } = useGetStudioLessonsQuery(studioId);
    const [assignHomework, { isLoading: isAssigning }] = useAssignHomeworkMutation();
    const [updateHomeworkStatus] = useUpdateHomeworkStatusMutation();
    const [updateHomework] = useUpdateHomeworkMutation();

    // Initialize initial values based on mode and existingHomework
    const initialValues = {
        lessonId: (existingHomework as any)?.lesson_id || '',
        date: (existingHomework as any)?.assigned_date ? new Date((existingHomework as any).assigned_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isCompleted: (existingHomework as any)?.is_completed || false
    };

    // Reset search when the modal opens
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    const formatDateForServer = (dateStr: string) => {
        // Create a date object without timezone conversion by parsing the parts
        const [year, month, day] = dateStr.split('-').map(Number);

        // Create a new date in UTC to avoid timezone shifts
        const date = new Date(Date.UTC(year, month - 1, day));

        return date.toISOString();
    };

    const typedLessons = lessons as Array<{
        lesson_id: string;
        title: string;
        level: string;
        reps: string;
    }>;

    const filteredLessons = typedLessons?.filter(
        lesson => lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // If in edit mode and we have a specific lesson, make sure it's included in filtered results
    if (mode === 'edit' && existingHomework && typedLessons) {
        const selectedLesson = typedLessons.find(lesson =>
            lesson.lesson_id === (existingHomework as any)?.lesson_id
        );

        if (selectedLesson && !filteredLessons.some(lesson => lesson.lesson_id === selectedLesson.lesson_id)) {
            filteredLessons.unshift(selectedLesson);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold">
                        {mode === 'create' ? 'Add a new homework' : 'Edit homework'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 text-2xl sm:text-3xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                <Formik
                    initialValues={initialValues}
                    validationSchema={HomeworkSchema}
                    onSubmit={async (values, { resetForm }) => {
                        try {
                            if (mode === 'create') {
                                // Create new homework assignment with properly formatted date
                                await assignHomework({
                                    studentId,
                                    lessonId: values.lessonId,
                                    date: formatDateForServer(values.date)
                                }).unwrap();
                            } else if (mode === 'edit' && existingHomework) {
                                // Handle edit - first update the completion status if changed
                                if (values.isCompleted !== (existingHomework as any).is_completed) {
                                    await updateHomeworkStatus({
                                        studentLessonId: (existingHomework as any).student_lesson_id,
                                        isCompleted: values.isCompleted
                                    }).unwrap();
                                }
                            }

                            resetForm();
                            onClose();
                        } catch (error) {
                            console.error('Failed to handle homework:', error);
                        }
                    }}
                >
                    {({ errors, touched, setFieldValue, values }) => (
                        <Form className="space-y-4">
                            <div>
                                <CustomFormField
                                    id="date"
                                    name="date"
                                    type="date"
                                    label="Due Date"
                                    className="mb-4 w-full sm:max-w-[300px]"
                                    disabled={mode === 'edit'}
                                    extraInputClasses='!border-t-0 !border-r-0 !border-l-0 !rounded-[0px] border-b-black'
                                />
                                <ErrorMessage name="date" component="div" className="text-red-500 text-xs mt-1" />
                            </div>

                            {/* Show completion toggle in edit mode */}
                            {mode === 'edit' && (
                                <div className="flex items-center space-x-2">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={values.isCompleted}
                                            onChange={() => setFieldValue('isCompleted', !values.isCompleted)}
                                            className="accent-[#65558F] focus:ring-[#65558F]"
                                        />
                                        <span>Completed</span>
                                    </label>
                                </div>
                            )}

                            <div className="relative w-full sm:max-w-[350px]">
                                <input
                                    type="text"
                                    placeholder="Search for lessons"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2 pr-10 bg-[#F5F5F5] rounded-[50px]"
                                />
                                <div className="absolute right-3 top-2.5 text-gray-400">
                                    <Image
                                        src='/assets/search-icon.svg'
                                        height={17}
                                        width={17}
                                        alt="search icon"
                                    />
                                </div>
                            </div>

                            {lessonsLoading ? (
                                <div className="text-center py-4">Loading lessons...</div>
                            ) : filteredLessons.length === 0 ? (
                                <div className="text-center py-4 text-gray-500">
                                    {searchQuery ? 'No lessons match your search' : 'No lessons available'}
                                </div>
                            ) : (
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    {filteredLessons.map((lesson) => (
                                        <div
                                            key={lesson.lesson_id}
                                            className={`p-3 border-b rounded-md cursor-pointer ${values.lessonId === lesson.lesson_id
                                                ? 'border-[#FD7363] bg-red-50'
                                                : 'hover:bg-gray-50'
                                                }`}
                                            onClick={() => setFieldValue('lessonId', lesson.lesson_id)}
                                        >
                                            <div className="flex items-start space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={values.lessonId === lesson.lesson_id}
                                                    onChange={() => setFieldValue('lessonId', lesson.lesson_id)}
                                                    className="mt-1 accent-[#65558F] focus:ring-[#65558F]"
                                                />
                                                <div>
                                                    <h4 className="font-medium text-sm sm:text-base">{lesson.title}</h4>
                                                    <p className="text-xs sm:text-sm text-gray-500">
                                                        {lesson.level}, {lesson.reps} reps
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <ErrorMessage name="lessonId" component="div" className="text-red-500 text-xs mt-1" />

                            <div className="flex justify-end space-x-2 mt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAssigning}
                                    className={`px-4 py-2 rounded-md text-white text-sm sm:text-base ${!isAssigning
                                        ? 'bg-[#FD7363] hover:bg-[#FF6A4A]'
                                        : 'bg-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {isAssigning
                                        ? 'Saving...'
                                        : mode === 'create'
                                            ? 'Create Entry'
                                            : 'Save Changes'
                                    }
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
        </div>
    );
}