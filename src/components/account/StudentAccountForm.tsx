// src/components/account/StudentAccountForm.tsx
'use client';

import { Formik, Form } from 'formik';
import Image from 'next/image';
import { useState } from 'react';
import * as Yup from 'yup';

import Card from '@/components/ui/Card';
import { CustomFormField } from '@/components/ui/FormField';
import { validateFile } from '@/utils/fileValidation';
import { useUpdateStudentProfileMutation, useUploadProfilePictureMutation } from '@/store/api/studentsApi';
import { useAppSelector } from '@/store/hooks';
import { Student } from '@/types/models';

interface StudentAccountFormProps {
    profile: Student | undefined;
    userId: string | undefined;
    studioStudentData?: {
        studio_student_id: string;
        goals: string | null;
    };
}

// Validation schema
const StudentAccountSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email').required('Required'),
    birthday: Yup.string().nullable(),
    height: Yup.number().typeError('Height must be a number').nullable(),
    weight: Yup.number().typeError('Weight must be a number').nullable(),
    occupation: Yup.string().nullable(),
    pathologies: Yup.string().nullable(),
    goals: Yup.string().nullable()
});

export default function StudentAccountForm({
    profile,
    userId,
    studioStudentData
}: StudentAccountFormProps) {
    const [updateProfile, { isLoading, isSuccess, isError, error }] = useUpdateStudentProfileMutation();
    const [uploadProfilePicture, { isLoading: isUploading }] = useUploadProfilePictureMutation();
    const { activeStudio } = useAppSelector(state => state.studio);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

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
        birthday: profile.birthday || '',
        height: profile.height || '',
        weight: profile.weight || '',
        occupation: profile.occupation || '',
        pathologies: profile.pathologies || '',
        goals: studioStudentData?.goals || ''
    };

    const handleProfilePictureUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && userId) {
                // Validate the file
                const validation = validateFile(file);
                if (!validation.valid) {
                    setUploadError(validation.error || 'Invalid file');
                    setUploadSuccess(false);
                    return;
                }

                try {
                    await uploadProfilePicture({
                        studentId: userId,
                        file
                    }).unwrap();
                    setUploadError(null); // Clear any previous errors
                    setUploadSuccess(true);
                } catch (error: any) {
                    console.error('Failed to upload profile picture:', error);
                    setUploadError(error.message || 'Failed to upload profile picture');
                    setUploadSuccess(false);
                }
            }
        };
        input.click();
    };

    return (
        <>
            <Card title="Profile Picture">
                <div className="p-6 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-gray-200 flex items-center justify-center">
                        {profile.profile_picture_url ? (
                            <img
                                src={profile.profile_picture_url}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-3xl text-gray-400">
                                {profile.first_name.charAt(0)}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleProfilePictureUpload}
                        disabled={isUploading}

                        className="mt-2 px-4 py-2 bg-[#FD7363] text-white rounded-md hover:bg-[#FF6A4A] focus:outline-none focus:ring-2 focus:ring-[#00474E] focus:ring-opacity-50 flex items-center"
                    >
                        {isUploading ? (
                            <span>Uploading...</span>
                        ) : (
                            <>
                                <span className="mr-2">
                                    {profile.profile_picture_url ? 'Change' : 'Upload'} Profile Picture
                                </span>
                            </>
                        )}
                    </button>

                    {uploadError && (
                        <div className="mt-3 p-3 bg-red-100 text-red-700 rounded-md w-full text-sm">
                            {uploadError}
                        </div>
                    )}

                    {uploadSuccess && (
                        <div className="mt-3 p-3 bg-green-100 text-green-700 rounded-md w-full text-sm">
                            Profile picture updated successfully.
                        </div>
                    )}
                </div>
            </Card>

            <Card title="Account Information" extraContainerClass="mt-6">
                <Formik
                    initialValues={initialValues}
                    validationSchema={StudentAccountSchema}
                    onSubmit={async (values) => {
                        await updateProfile({
                            studentId: userId,
                            profileData: {
                                email: values.email,
                                birthday: values.birthday,
                                height: values.height ? parseInt(String(values.height)) : null,
                                weight: values.weight ? parseInt(String(values.weight)) : null,
                                occupation: values.occupation,
                                pathologies: values.pathologies,
                                // If we have an active studio and studioStudentData, include goals
                                goals: activeStudio && studioStudentData ? values.goals : undefined,
                                studioStudentId: studioStudentData?.studio_student_id
                            }
                        });
                    }}
                    enableReinitialize={true}
                >
                    {({ isSubmitting }) => (
                        <Form className="space-y-6">
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
                                <CustomFormField
                                    id="email"
                                    name="email"
                                    type="email"
                                    label="Email"
                                    disabled
                                />
                                <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
                            </div>

                            <div>
                                <CustomFormField
                                    id="birthday"
                                    name="birthday"
                                    type="date"
                                    label="Birthday"
                                />
                            </div>

                            <div>
                                <CustomFormField
                                    id="height"
                                    name="height"
                                    type="text"
                                    label="Height (cm)"
                                />
                            </div>

                            <div>
                                <CustomFormField
                                    id="weight"
                                    name="weight"
                                    type="text"
                                    label="Weight (kg)"
                                />
                            </div>

                            <div>
                                <CustomFormField
                                    id="occupation"
                                    name="occupation"
                                    type="text"
                                    label="Occupation"
                                />
                            </div>

                            <div>
                                <CustomFormField
                                    id="pathologies"
                                    name="pathologies"
                                    as="textarea"
                                    label="Pathologies"
                                    rows={3}
                                />
                            </div>

                            {activeStudio && studioStudentData && (
                                <div>
                                    <CustomFormField
                                        id="goals"
                                        name="goals"
                                        as="textarea"
                                        label="Goals"
                                        rows={3}
                                    />
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading || isSubmitting}
                                    className="w-full py-2 px-4 bg-[#FD7363] text-white rounded-md hover:bg-[#FF6A4A]"
                                >
                                    {isLoading || isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </Card>
        </>
    );
}