// src/components/clients/InstructorAddStudentModal.tsx
'use client';

import { Formik, Form } from 'formik';
import * as Yup from 'yup';

import { CustomFormField } from '@/components/ui/FormField';
import { useAddStudentByInstructorMutation } from '@/store/api/clientsApi';
import { addToast } from '@/store/slices/toastSlice';
import { useAppSelector, useAppDispatch } from '@/store/hooks';

interface InstructorAddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioId?: string;
}

const AddStudentSchema = Yup.object().shape({
    firstName: Yup.string().required('First name is required'),
    lastName: Yup.string().required('Last name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
});

export default function InstructorAddStudentModal({ isOpen, onClose, studioId }: InstructorAddStudentModalProps) {
    const dispatch = useAppDispatch();
    const { activeStudio } = useAppSelector(state => state.studio);
    const [addStudent, { isLoading }] = useAddStudentByInstructorMutation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-auto mx-[20px]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Add a new student</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>

                <Formik
                    initialValues={{
                        firstName: '',
                        lastName: '',
                        email: '',
                    }}
                    validationSchema={AddStudentSchema}
                    onSubmit={async (values, { resetForm }) => {
                        const targetStudioId = studioId || activeStudio?.studio_id;
                        if (!targetStudioId) {
                            alert('No active studio selected');
                            return;
                        }

                        try {
                            await addStudent({
                                firstName: values.firstName,
                                lastName: values.lastName,
                                email: values.email,
                                studioId: String(targetStudioId),
                            }).unwrap();

                            resetForm();
                            onClose();
                            dispatch(addToast({
                                type: 'success',
                                message: 'Student created successfully'
                            }));
                        } catch (error) {
                            console.error('Failed to add student:', error);
                        }
                    }}
                >
                    {({ isValid, dirty }) => (
                        <Form className="space-y-6">
                            <div>
                                <CustomFormField
                                    id="firstName"
                                    name="firstName"
                                    label="First Name"
                                    type="text"
                                    placeholder="First name"
                                />
                            </div>

                            <div>
                                <CustomFormField
                                    id="lastName"
                                    name="lastName"
                                    label="Last Name"
                                    type="text"
                                    placeholder="Last name"
                                />
                            </div>

                            <div>
                                <CustomFormField
                                    id="email"
                                    name="email"
                                    label="Email"
                                    type="email"
                                    placeholder="Email address"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !isValid || !dirty}
                                className="w-full py-3 bg-[#FD7363] text-white rounded-md hover:bg-[#FF6A4A] disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Creating Student...' : 'Create Student'}
                            </button>
                        </Form>
                    )}
                </Formik>
            </div>
        </div>
    );
}