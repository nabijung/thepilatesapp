// src/app/login/page.tsx
'use client';

import { Formik, Form } from 'formik';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import * as Yup from 'yup';

import ExistingUserPasswordSetup from '@/components/auth/ExistingUserPasswordSetup';
import { CustomFormField } from '@/components/ui/FormField';
import Logo from '@/components/ui/Logo';
import { useLoginMutation } from '@/store/api/authApi';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { UserType } from '@/types/index';

export default function LoginPage() {
    const [userType, setUserType] = useState<UserType>('student');
    const [showRedeemModal, setShowRedeemModal] = useState(false);
    const router = useRouter();
    const dispatch = useAppDispatch();

    // Using RTK Query hook for login
    const [login, { isLoading }] = useLoginMutation();

    // Validation schema
    const LoginSchema = Yup.object().shape({
        email: Yup.string()
            .email('Invalid email address')
            .required('Email is required'),
        password: Yup.string()
            .required('Password is required'),
    });

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <Logo width={46} height={70} textClasses="text-[50px]" />
                </div>

                {/* User Type Toggle */}
                <div className="flex justify-center mb-6">
                    <div className="inline-flex rounded-[50px] border border-black overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setUserType('student')}
                            className={`px-6 w-full border-r border-black border-r-[0.1px] py-2 text-sm ${userType === 'student'
                                ? 'bg-[#FDC6C0] text-gray-800'
                                : 'bg-white text-gray-800'
                                }`}
                        >
                            Student
                        </button>
                        <button
                            type="button"
                            onClick={() => setUserType('instructor')}
                            className={`px-6 py-2 px-6 border-l border-black border-l-[0.1px] text-sm ${userType === 'instructor'
                                ? 'bg-[#FDC6C0] text-gray-800'
                                : 'bg-white text-gray-800'
                                }`}
                        >
                            Instructor
                        </button>
                    </div>
                </div>

                <Formik
                    initialValues={{
                        email: '',
                        password: '',
                    }}
                    validationSchema={LoginSchema}
                    onSubmit={async (values, { setFieldError }) => {
                        try {
                            const result: any = await login({
                                email: values.email,
                                password: values.password,
                                userType
                            }).unwrap();

                            if ((result as any).success) {
                                // Store user and userType
                                dispatch(setCredentials((result as any).data));

                                // Redirect based on user type
                                if ((result as any).data.userType === 'student') {
                                    router.push('/dashboard');
                                } else {
                                    router.push('/clients'); // Redirect instructor to clients page
                                }
                            }
                        } catch (error) {
                            console.error('Login error:', error);
                        }
                    }}
                >
                    {({ errors, touched }) => (
                        <Form className="space-y-6">
                            <div>
                                <CustomFormField
                                    id="email"
                                    name="email"
                                    type="email"
                                    label="Email"
                                />
                            </div>

                            <div>
                                <CustomFormField
                                    id="password"
                                    name="password"
                                    type="password"
                                    label="Password"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-2 px-4 bg-[#FD7363] text-white rounded-md hover:bg-[#FF6A4A]"
                            >
                                {isLoading ? 'Logging in...' : 'Login'}
                            </button>
                        </Form>
                    )}
                </Formik>

                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                        Don't have an account? <Link href="/signup" className="text-[#FD7363]">Sign up</Link>
                    </p>
                    <div className='flex justify-center gap-x-[3px] text-sm text-gray-600 mt-2 '>
                        <p className=" ">
                            Need to redeem an account?
                        </p>
                        <button
                            onClick={() => setShowRedeemModal(true)}
                            className="text-[#FD7363]"
                        >
                            Click here
                        </button>
                    </div>
                </div>
            </div>

            {/* Redeem Account Modal */}
            <ExistingUserPasswordSetup
                isOpen={showRedeemModal}
                onClose={() => setShowRedeemModal(false)}
                showEmailInput={true}
                showUserTypeToggle={true}
                userType={userType}
            />
        </div>
    );
}