// src/app/signup/page.tsx
'use client';

import { Formik, Form } from 'formik';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import * as Yup from 'yup';

import ExistingUserPasswordSetup from '@/components/auth/ExistingUserPasswordSetup';
import { CustomFormField } from '@/components/ui/FormField';
import Logo from '@/components/ui/Logo';
import { useCheckUserExistsMutation, useSignupMutation } from '@/store/api/authApi';
import { UserType } from '@/types/index';

type FirstStepFormValues = {
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  confirmPassword: string,
}

export default function SignupPage() {
  const [userType, setUserType] = useState<'student' | 'instructor'>('student');
  const [step, setStep] = useState<1 | 2>(1);
  const [formValues, setFormValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    studioId: '',
    studioName: '',
    studioLocation: '',
  });

  // State for existing user modal
  const [showExistingUserModal, setShowExistingUserModal] = useState(false);
  const [existingUserInfo, setExistingUserInfo] = useState<{
    email: string;
    userType: UserType;
  } | null>(null);

  const router = useRouter();

  // Using RTK Query hooks
  const [signup, { isLoading }] = useSignupMutation();
  const [checkUserExists, { isLoading: isChecking }] = useCheckUserExistsMutation();

  // Validation schema for step 1 - no studioId required for either type
  const SignupSchema = Yup.object().shape({
    firstName: Yup.string()
      .required('First name is required'),
    lastName: Yup.string()
      .required('Last name is required'),
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    password: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('Confirm password is required'),
  });

  // Validation schema for instructor step 2
  // Either studioId OR (studioName AND studioLocation) are required
  // Updated StudioSchema to avoid cyclic dependencies
  const StudioSchema = Yup.object().shape({
    studioId: Yup.string(),
    studioName: Yup.string(),
    studioLocation: Yup.string(),
  }).test(
    'either-id-or-studio-details',
    'Either provide a Studio ID or complete Studio Name and Location',
    function (values) {
      // If studioId is provided, it's valid
      if (values.studioId) {
        return true;
      }

      // If neither studioId nor studio details are provided, it's invalid
      if (!values.studioName && !values.studioLocation) {
        return this.createError({
          path: 'studioId',
          message: 'Either Studio ID or Studio details are required'
        });
      }

      // If one studio detail is provided but not the other, it's invalid
      if (values.studioName && !values.studioLocation) {
        return this.createError({
          path: 'studioLocation',
          message: 'Studio location is required when creating a new studio'
        });
      }

      if (!values.studioName && values.studioLocation) {
        return this.createError({
          path: 'studioName',
          message: 'Studio name is required when creating a new studio'
        });
      }

      // Both studio details are provided, it's valid
      return true;
    }
  );

  // Handle first step submission
  const handleFirstStep = async (values: FirstStepFormValues) => {
    try {


      // User doesn't exist, continue normal flow
      if (userType === 'instructor') {
        // Save values and go to step 2
        setFormValues({
          ...formValues,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword,
        });
        setStep(2);
      } else {
        // First check if the user already exists
        const result: any = await checkUserExists({
          email: values.email
        }).unwrap();

        if (result.data.exists && result.data.userType) {
          // User exists, show modal to set password
          setExistingUserInfo({
            email: values.email,
            userType: result.data.userType
          });
          setShowExistingUserModal(true);
          return;
        }

        // For students, complete signup directly
        await handleStudentSignup(values);
      }
    } catch (error) {
      console.error('Error in first step:', error);
    }
  };

  // Handle student signup
  const handleStudentSignup = async (values: FirstStepFormValues) => {
    try {
      await signup({
        email: values.email,
        password: values.password,
        userType,
        firstName: values.firstName,
        lastName: values.lastName,
      }).unwrap();

      // On successful signup, redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Signup error:', error);
    }
  };

  // Handle going back to step 1
  const handleBack = () => {
    setStep(1);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo width={46} height={70} textClasses="text-[50px]" />
        </div>

        {/* Only show the user type toggle in step 1 */}
        {step === 1 && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex  rounded-[50px] border border-black overflow-hidden">
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
        )}

        {/* Step 1: Basic signup for both user types */}
        {step === 1 && (
          <Formik
            initialValues={{
              firstName: formValues.firstName,
              lastName: formValues.lastName,
              email: formValues.email,
              password: formValues.password,
              confirmPassword: formValues.confirmPassword,
            }}
            validationSchema={SignupSchema}
            onSubmit={handleFirstStep}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form className="space-y-6">
                <div>
                  <CustomFormField
                    id="firstName"
                    name="firstName"
                    label="First Name"
                    type="text"
                  />
                </div>

                <div>
                  <CustomFormField
                    id="lastName"
                    name="lastName"
                    label="Last Name"
                    type="text"
                  />
                </div>

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

                <div>
                  <CustomFormField
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    label="Confirm Password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isChecking || isSubmitting}
                  className="w-full py-2 px-4 bg-[#FD7363] text-white rounded-md hover:bg-[#FF6A4A]"
                >
                  {isLoading || isChecking || isSubmitting
                    ? 'Processing...'
                    : userType === 'instructor' ? 'Continue' : 'Sign Up'
                  }
                </button>
              </Form>
            )}
          </Formik>
        )}

        {/* Step 2: Studio details for instructors */}
        {step === 2 && (
          <>
            <h2 className="text-center font-[500] mb-5 mt-3">Already have a studio? Enter your studio ID</h2>
            <Formik
              initialValues={{
                studioId: formValues.studioId,
                studioName: formValues.studioName,
                studioLocation: formValues.studioLocation,
              }}
              validationSchema={StudioSchema}
              onSubmit={async (values, { setFieldError }) => {
                try {
                  // Save studio values to form state
                  setFormValues({
                    ...formValues,
                    studioId: values.studioId,
                    studioName: values.studioName,
                    studioLocation: values.studioLocation,
                  });

                  // Combine data from both steps for instructor signup
                  await signup({
                    email: formValues.email,
                    password: formValues.password,
                    userType: 'instructor',
                    firstName: formValues.firstName,
                    lastName: formValues.lastName,
                    // If studioId is provided, include it directly
                    studioId: values.studioId || undefined,
                    // If creating a new studio, include these fields directly
                    studioName: values.studioId ? undefined : values.studioName,
                    studioLocation: values.studioId ? undefined : values.studioLocation
                  }).unwrap();

                  // On successful signup, redirect to login
                  router.push('/login');
                } catch (error) {
                  console.error('Signup error:', error);
                  // setFieldError('studioId', error.data?.message || 'Error creating account. Please try again.');
                }
              }}
            >
              {({ errors, values, setFieldValue }) => (
                <Form className="space-y-6">
                  <div>
                    <CustomFormField
                      id="studioId"
                      name="studioId"
                      label="Studio ID"
                      type="text"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value;
                        setFieldValue('studioId', value);
                        // Clear studio name/location if ID is provided
                        if (value) {
                          setFieldValue('studioName', '');
                          setFieldValue('studioLocation', '');
                        }
                      }}
                    />
                  </div>

                  <div className="text-center my-4">
                    <span className="font-[500]">or create a new studio</span>
                  </div>

                  <div>
                    <CustomFormField
                      label="Studio Name"
                      id="studioName"
                      name="studioName"
                      type="text"
                      disabled={!!values.studioId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = e.target.value;
                        setFieldValue('studioName', value);
                        // Clear studio ID if name is provided
                        if (value) {
                          setFieldValue('studioId', '');
                        }
                      }}
                    />
                  </div>

                  <div>
                    <CustomFormField
                      id="studioLocation"
                      name="studioLocation"
                      label="Studio Location"
                      type="text"
                      disabled={!!values.studioId}
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="w-1/2 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-1/2 py-2 px-4 bg-[#FD7363] text-white rounded-md hover:bg-[#FF6A4A]"
                    >
                      {isLoading ? 'Signing up...' : 'Sign Up'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </>
        )}

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Already have an account? <Link href="/login" className="text-[#FD7363]">Log in</Link>
          </p>
        </div>
      </div>

      {/* Modal for existing users to set password */}
      {existingUserInfo && (
        <ExistingUserPasswordSetup
          isOpen={showExistingUserModal}
          onClose={() => setShowExistingUserModal(false)}
          email={existingUserInfo.email}
          userType={existingUserInfo.userType}
        />
      )}
    </div>
  );
}