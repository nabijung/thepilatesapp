// src/components/account/InstructorAccountForm.tsx
'use client';

import { Formik, Form } from 'formik';
import * as Yup from 'yup';

import Card from '@/components/ui/Card';
import { useUpdateInstructorProfileMutation } from '@/store/api/instructorsApi';
import { Instructor } from '@/types/models';

import { CustomFormField } from '../ui/FormField';

interface InstructorAccountFormProps {
    profile: Instructor | undefined;
    userId: string | undefined;
}

// Create validation schema with Yup
const InstructorAccountSchema = Yup.object().shape({
    email: Yup.string()
        .email('Invalid email address')
        .required('Email is required')
});

export default function InstructorAccountForm({ profile, userId }: InstructorAccountFormProps) {
    const [updateProfile, { isLoading, isSuccess, isError, error }] = useUpdateInstructorProfileMutation();

    // Don't render form if no profile or userId
    if (!profile || !userId) {
        return (
            <Card title="Account Information">
                <div className="py-4 text-center text-gray-500">
                    No account information available.
                </div>
            </Card>
        );
    }

    // Initialize form values from profile
    const initialValues = {
        email: profile.email || '',
    };

    return (
        <Card title="Account Information">
            <Formik
                initialValues={initialValues}
                validationSchema={InstructorAccountSchema}
                onSubmit={async (values) => {
                    await updateProfile({
                        instructorId: userId,
                        profileData: {
                            email: values.email,
                        }
                    });
                }}
            >
                {({ isSubmitting }) => (
                    <Form className="space-y-4">
                        {isSuccess && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                                Account information updated successfully.
                            </div>
                        )}

                        {isError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                                {error instanceof Error ? error.message : "Failed to update account information"}
                            </div>
                        )}

                        <div>
                            <p className="text-sm text-gray-700">
                                First Name: <span className="font-medium">{profile.first_name}</span>
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-700">
                                Last Name: <span className="font-medium">{profile.last_name}</span>
                            </p>
                        </div>

                        <div>
                            <CustomFormField
                                id="email"
                                name="email"
                                type="email"
                                label="Email"
                                disabled
                            />
                            {/* <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p> */}
                        </div>

                        <button
                            type="submit"
                            disabled={true}
                            // disabled={isLoading || isSubmitting}
                            className="w-full py-2 px-4 bg-[#FD7363] text-white rounded-md hover:bg-[#FF6A4A]"
                        >
                            {isLoading || isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </Form>
                )}
            </Formik>
        </Card>
    );
}