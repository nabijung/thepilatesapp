// Updated version of ExistingUserPasswordSetup component

import { Formik, Form } from 'formik';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import * as Yup from 'yup';

import { CustomFormField } from '@/components/ui/FormField';
import { useCheckUserExistsMutation, useSetPasswordMutation } from '@/store/api/authApi';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { addToast } from '@/store/slices/toastSlice';
import { UserType } from '@/types/index';

interface ExistingUserPasswordSetupProps {
    isOpen: boolean;
    onClose: () => void;
    email?: string;
    userType?: UserType;
    showEmailInput?: boolean;
    showUserTypeToggle?: boolean;
}

const PasswordSchema = Yup.object().shape({
    password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('Password is required'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Please confirm your password'),
    studioId: Yup.string()
        .required('Studio ID is required')
});

const EmailSchema = Yup.object().shape({
    email: Yup.string()
        .email('Invalid email address')
        .required('Email is required')
});

export default function ExistingUserPasswordSetup({
    isOpen,
    onClose,
    email = '',
    userType = 'student',
    showEmailInput = false,
    showUserTypeToggle = false
}: ExistingUserPasswordSetupProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [setPassword, { isLoading: isSettingPassword }] = useSetPasswordMutation();
    const [checkUserExists, { isLoading: isCheckingUser }] = useCheckUserExistsMutation();

    const [userEmail, setUserEmail] = useState(email);
    const [selectedUserType, setSelectedUserType] = useState<UserType>(userType);
    const [step, setStep] = useState(showEmailInput ? 1 : 2);
    const [error, setError] = useState<string | null>(null);

    const userIsFromSignup = showEmailInput == false;

    if (!isOpen) return null;

    // First step: Email input and user type selection
    const renderStep1 = () => (
        <Formik
            initialValues={{ email: userEmail }}
            validationSchema={EmailSchema}
            onSubmit={async (values) => {
                try {
                    const result: any = await checkUserExists({
                        email: values.email,
                        userType: selectedUserType
                    }).unwrap();

                    if (result?.data?.exists && result?.data?.userType) {
                        setUserEmail(values.email);
                        setSelectedUserType(result?.data?.userType);
                        setStep(2);
                        setError(null);
                    } else {
                        setError(`No ${selectedUserType} account found with this email.`);
                    }
                } catch (error) {
                    console.error('Failed to check user:', error);
                    setError('Failed to check if user exists. Please try again.');
                }
            }}
        >
            {({ isValid, dirty, isSubmitting }) => (
                <Form className="space-y-6">
                    {showUserTypeToggle && (
                        <div className="flex justify-center mb-6">
                            <div className="inline-flex rounded-[50px] border border-black overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setSelectedUserType('student')}
                                    className={`px-6 w-full border-r border-black border-r-[0.1px] py-2 text-sm ${selectedUserType === 'student'
                                        ? 'bg-[#FDC6C0] text-gray-800'
                                        : 'bg-white text-gray-800'
                                        }`}
                                >
                                    Student
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedUserType('instructor')}
                                    className={`px-6 py-2 px-6 border-l border-black border-l-[0.1px] text-sm ${selectedUserType === 'instructor'
                                        ? 'bg-[#FDC6C0] text-gray-800'
                                        : 'bg-white text-gray-800'
                                        }`}
                                >
                                    Instructor
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <CustomFormField
                            id="email"
                            name="email"
                            type="email"
                            label="Email Address"
                        />
                    </div>

                    {error && <div className="text-red-500 text-sm">{error}</div>}

                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!isValid || !dirty || isSubmitting || isCheckingUser}
                            className="px-4 py-2 bg-[#FD7363] text-white rounded-md hover:bg-[#FF6A4A] disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {isCheckingUser ? 'Checking...' : 'Continue'}
                        </button>
                    </div>
                </Form>
            )}
        </Formik>
    );

    // Second step: Password setup
    const renderStep2 = () => (
        <Formik
            initialValues={{
                password: '',
                confirmPassword: '',
                studioId: ''
            }}
            enableReinitialize={true}
            validationSchema={PasswordSchema}
            onSubmit={async (values) => {
                try {
                    const result: any = await setPassword({
                        email: userEmail, // Use the stored email, not the form value
                        password: values.password,
                        confirmPassword: values.confirmPassword,
                        userType: selectedUserType,
                        studioId: values.studioId
                    }).unwrap();

                    if (result.success) {
                        dispatch(setCredentials(result.data));
                        dispatch(addToast({
                            type: 'success',
                            message: 'Password set successfully. Welcome!'
                        }));

                        // Redirect user based on their type
                        if (result.data.userType === 'student') {
                            router.push('/dashboard');
                        } else {
                            router.push('/clients');
                        }
                    }
                } catch (error) {
                    console.error('Failed to set password:', error);
                    dispatch(addToast({
                        type: 'error',
                        message: 'Failed to set your password. Please try again.'
                    }));
                }
            }}
        // The enableReinitialize prop is false by default, so it shouldn't use the email as password
        >
            {({ isValid, dirty, isSubmitting }) => (
                <Form className="space-y-6">
                    {
                        //header to show depending on where user opened modal from
                        !userIsFromSignup ? <div className="mb-4">
                            <p className="text-center font-medium text-gray-700">
                                Setting up your account for: <span className="text-[#FD7363]">{userEmail}</span>
                            </p>
                            <p className="text-center text-sm text-gray-500">
                                Account type: {selectedUserType === 'student' ? 'Student' : 'Instructor'}
                            </p>
                        </div>
                            :
                            undefined
                    }

                    <div>
                        <CustomFormField
                            id="password"
                            name="password"
                            type="password"
                            label="Create Password"
                        />
                    </div>

                    <div>
                        <CustomFormField
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            label="Confirm Password"
                        />
                    </div>

                    <div>
                        <CustomFormField
                            id="studioId"
                            name="studioId"
                            label="Studio ID"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {
                                userIsFromSignup ?
                                    'Reach out to a studio that invited you for their studio ID'
                                    :
                                    'Enter the Studio ID that was provided to you'
                            }
                        </p>
                    </div>

                    {error && <div className="text-red-500 text-sm">{error}</div>}

                    <div className="flex justify-end space-x-2">
                        {step === 2 && showEmailInput && (
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full mr-3 px-4 py-2 border border-gray-300 rounded-md text-sm"
                            >
                                Back
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={!isValid || !dirty || isSubmitting || isSettingPassword}
                            className="w-full px-4 py-2 bg-[#FD7363] text-white rounded-md hover:bg-[#FF6A4A] disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {isSettingPassword ? 'Finalizing...' : 'Finalize'}
                        </button>
                    </div>
                </Form>
            )}
        </Formik>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-auto mx-[20px]">
                <div className="flex justify-between items-center mb-6">
                    <div className='text-[18px] font-semibold text-[#00474E]'>
                        {
                            userIsFromSignup ? <h2>
                                Looks like a studio already created your account
                            </h2> :
                                <h2 className="">
                                    {step === 1 ? 'Redeem Your Account' : 'Create Your Password'}
                                </h2>
                        }
                    </div>
                    <button onClick={() => {
                        onClose()
                        setStep(1)
                        setUserEmail('')
                    }} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>

                {step === 1 ? renderStep1() : renderStep2()}
            </div>
        </div>
    );
}