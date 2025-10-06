// src/app/clients/[id]/page.tsx
"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Formik, Form } from "formik";
import * as Yup from "yup";

import ClientList from "@/components/clients/ClientList";
import HomeworkSection from "@/components/homework/HomeworkSection";
import NotebookSection from "@/components/notebook/NotebookSection";
import ProgressPhotosSection from "@/components/progress/ProgressPhotoSection";
import Card from "@/components/ui/Card";
import Tabs from "@/components/ui/Tabs";
import { CustomFormField } from "@/components/ui/FormField";
import {
  useGetClientDetailsQuery,
  useUpdateClientGoalsMutation,
  useUpdateClientNotesMutation,
  useUploadClientProfilePictureMutation,
  useUpdateClientProfileMutation,
} from "@/store/api/clientsApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addToast } from "@/store/slices/toastSlice";
import { ClientDetails, ApiQueryResult } from "@/types/index";
import { IoIosArrowBack } from "react-icons/io";
import { validateFile } from "@/utils/fileValidation";
import { useGetInstructorStudiosQuery } from "@/store/api/instructorsApi";

const ClientProfileSchema = Yup.object().shape({
  birthday: Yup.string().nullable(),
  height: Yup.string().nullable(),
  weight: Yup.string().nullable(),
  pathologies: Yup.string().nullable(),
  occupation: Yup.string().nullable(),
});

export default function ClientInformationPage() {
  const searchParams = useSearchParams();
  const [studioId, setStudioId] = useState<string | null>(
    searchParams.get("studioId"),
  );
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("notebook");
  const [isCurrentStudioAdmin, setIsCurrentStudioAdmin] = useState(false);
  const dispatch = useAppDispatch();

  const { user, userType } = useAppSelector((state) => state.auth);
  const instructorId = user.id;

  const { data: studios, isLoading: studiosLoading } =
    useGetInstructorStudiosQuery(String(instructorId) || "", {
      skip: !instructorId,
    });

  const params = useParams<{ id: string }>();
  const clientId = params.id;

  // Redirect instructors to account page if they try to access their own profile as a client
  useEffect(() => {
    if (userType === "instructor" && String(user.id) === clientId) {
      router.replace("/account");
    }
  }, [userType, user.id, clientId, router]);

  useEffect(() => {
    if (studios) {
      const currentStudio = (
        studios as { studio_id: string; is_admin: boolean }[]
      ).find((studio) => studio.studio_id === studioId);

      setIsCurrentStudioAdmin(currentStudio.is_admin);
    }
  }, [studios, params.id]);

  // State for instructor notes
  const [instructorNotes, setInstructorNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [clientGoals, setClientGoals] = useState("");
  const [isSavingGoals, setIsSavingGoals] = useState(false);

  // Profile picture state
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const studentId = clientId;

  const {
    data: client,
    isLoading,
    error,
  } = useGetClientDetailsQuery({
    clientId,
    studioId: studioId || "",
  }) as ApiQueryResult<ClientDetails>;

  // RTK mutation for updating notes
  const [updateNotes] = useUpdateClientNotesMutation();
  const [updateGoals] = useUpdateClientGoalsMutation();
  const [uploadClientProfilePicture] = useUploadClientProfilePictureMutation();
  const [updateClientProfile] = useUpdateClientProfileMutation();

  // Update local state when client data is loaded
  useEffect(() => {
    if (client?.instructor_notes !== undefined) {
      setInstructorNotes(client.instructor_notes || "");
    }
  }, [client?.instructor_notes]);
  useEffect(() => {
    if (client?.goals !== undefined) {
      setClientGoals(client.goals || "");
    }
  }, [client?.goals]);

  // Handle studio change from ClientList
  const handleStudioChange = (newStudioId: string) => {
    setStudioId(newStudioId);
    router.push(`/clients/${params.id}?studioId=${newStudioId}`);
  };

  /**
   * Calculates age from a date of birth string
   * @param birthday - Date of birth in 'YYYY-MM-DD' format
   * @returns Age in years, or null if birthday is invalid
   */
  function calculateAge(birthday: string | null | undefined): number | null {
    if (!birthday) return null;

    try {
      const birthDate = new Date(birthday);

      // Check if date is valid
      if (isNaN(birthDate.getTime())) return null;

      const today = new Date();

      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();

      // Adjust age if birthday hasn't occurred yet this year
      if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return age;
    } catch (error) {
      console.error("Error calculating age:", error);

      return null;
    }
  }

  const clientAge = useMemo(() => {
    return calculateAge(client?.birthday);
  }, [client]);

  // Handle saving instructor notes
  const handleSaveNotes = async () => {
    if (!client?.studio_student_id) return;

    setIsSaving(true);
    try {
      await updateNotes({
        studioStudentId: client.studio_student_id,
        notes: instructorNotes,
        clientId,
      }).unwrap();

      dispatch(
        addToast({
          type: "success",
          message: "Notes Updated Successfully",
        }),
      );
    } catch (error) {
      console.error("Failed to save notes:", error);
      dispatch(
        addToast({
          type: "error",
          message: "Failed to save notes.",
        }),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGoals = async () => {
    if (!client?.studio_student_id) return;

    setIsSavingGoals(true);
    try {
      await updateGoals({
        studioStudentId: client.studio_student_id,
        goals: clientGoals,
        clientId,
      }).unwrap();

      dispatch(
        addToast({
          type: "success",
          message: "Goals Updated Successfully",
        }),
      );
    } catch (error) {
      console.error("Failed to save goals:", error);
      dispatch(
        addToast({
          type: "error",
          message: "Failed to save goals.",
        }),
      );
    } finally {
      setIsSavingGoals(false);
    }
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = () => {
    // Check if clientId from URL parameter or client.id (if exists) or client.studio_student_id is available
    const clientIdForUpload = params.id || client?.id;
    if (!clientIdForUpload || !studioId) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Validate the file
        const validation = validateFile(file);
        if (!validation.valid) {
          setUploadError(validation.error || "Invalid file");
          return;
        }

        setIsUploading(true);
        try {
          await uploadClientProfilePicture({
            clientId: clientIdForUpload,
            studioId,
            file,
          }).unwrap();

          setUploadError(null); // Clear any previous errors
          dispatch(
            addToast({
              type: "success",
              message: "Profile picture updated successfully",
            }),
          );
        } catch (error: any) {
          console.error("Failed to upload profile picture:", error);
          setUploadError(error.message || "Failed to upload profile picture");
          dispatch(
            addToast({
              type: "error",
              message: "Failed to upload profile picture",
            }),
          );
        } finally {
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">Loading client information...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading client information
      </div>
    );
  }

  if (!client) {
    return <div className="text-center py-8">Client not found</div>;
  }

  const tabContent = () => {
    switch (activeTab) {
      case "information":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[#00474E] mb-5">
                {client.first_name} {client.last_name}
              </h1>

              <div className="mb-6 flex flex-col items-center ">
                <div className="w-24 h-24 rounded-full overflow-hidden mb-4  bg-gray-200 flex items-center justify-center">
                  {client.profile_picture_url ? (
                    <img
                      src={client.profile_picture_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-3xl text-white bg-teal-500 w-full h-full flex items-center justify-center">
                      {client.first_name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={handleProfilePictureUpload}
                    disabled={isUploading}
                    className="px-4 py-2 bg-[#FF7A5A] text-white rounded-md hover:bg-[#FF6A4A] focus:outline-none focus:ring-2 focus:ring-[#00474E] focus:ring-opacity-50 text-sm"
                  >
                    {isUploading
                      ? "Uploading..."
                      : client.profile_picture_url
                        ? "Change Photo"
                        : "Add Photo"}
                  </button>

                  {uploadError && (
                    <div className="mt-2 p-2 bg-red-100 text-red-700 rounded-md text-xs">
                      {uploadError}
                    </div>
                  )}
                </div>
              </div>

              {/* Edit/Cancel buttons */}
              <div className="mb-4">
                {!isEditingProfile ? (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="px-4 py-2 bg-[#FF7A5A] text-white rounded-md hover:bg-[#FF6A4A] text-sm"
                  >
                    Edit Information
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {!isEditingProfile ? (
                <div className="space-y-2 text-sm md:text-base">
                  {isCurrentStudioAdmin ? (
                    <p>
                      <span className="font-medium">Email:</span> {client.email}
                    </p>
                  ) : null}
                  <p>
                    <span className="font-medium">Birthday:</span>{" "}
                    {client.birthday || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">Age:</span>{" "}
                    {clientAge || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">Height:</span>{" "}
                    {client.height || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">Weight:</span>{" "}
                    {client.weight || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">Pathologies:</span>{" "}
                    {client.pathologies || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">Occupation:</span>{" "}
                    {client.occupation || "N/A"}
                  </p>
                </div>
              ) : (
                <Formik
                  initialValues={{
                    birthday: client.birthday || "",
                    height: String(client.height || ""),
                    weight: String(client.weight || ""),
                    pathologies: client.pathologies || "",
                    occupation: client.occupation || "",
                  }}
                  validationSchema={ClientProfileSchema}
                  onSubmit={async (values, { setSubmitting }) => {
                    try {
                      await updateClientProfile({
                        clientId,
                        studioId: studioId!,
                        profileData: {
                          birthday: values.birthday || null,
                          height: values.height || null,
                          weight: values.weight || null,
                          pathologies: values.pathologies || null,
                          occupation: values.occupation || null,
                        },
                      }).unwrap();

                      dispatch(
                        addToast({
                          type: "success",
                          message: "Client profile updated successfully",
                        }),
                      );
                      setIsEditingProfile(false);
                    } catch (error) {
                      console.error("Failed to update client profile:", error);
                      dispatch(
                        addToast({
                          type: "error",
                          message:
                            "Failed to update client profile. Please try again.",
                        }),
                      );
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  enableReinitialize
                >
                  {({ isSubmitting }) => (
                    <Form className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600">
                          {client.email}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Email cannot be changed
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CustomFormField
                          id="birthday"
                          name="birthday"
                          type="date"
                          label="Birthday"
                        />
                        <CustomFormField
                          id="height"
                          name="height"
                          label="Height"
                          placeholder="e.g., 5'10&quot;, 178 cm"
                        />
                        <CustomFormField
                          id="weight"
                          name="weight"
                          label="Weight"
                          placeholder="e.g., 150 lbs, 68 kg"
                        />
                        <CustomFormField
                          id="occupation"
                          name="occupation"
                          label="Occupation"
                          className="md:col-span-2"
                        />
                        <CustomFormField
                          as="textarea"
                          id="pathologies"
                          name="pathologies"
                          label="Pathologies"
                          className="md:col-span-2"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2 pt-4">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-6 py-2 bg-[#FF7A5A] text-white rounded-md hover:bg-[#FF6A4A] disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </Form>
                  )}
                </Formik>
              )}
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-bold mb-4 text-[#00474E]">
                  Instructor Notes
                </h3>
                <div className="p-4 bg-[#F5F5F5] min-h-32">
                  <textarea
                    className="w-full h-32 bg-transparent resize-none focus:outline-none text-sm md:text-base"
                    placeholder="Let other instructors know about specifics for this client"
                    value={instructorNotes}
                    onChange={(e) => setInstructorNotes(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This information is not visible by the client
                </p>
                <button
                  type="button"
                  disabled={isSaving}
                  className="mt-4 px-6 py-2 bg-[#FF7A5A] text-white rounded-md hover:bg-[#FF6A4A] disabled:bg-gray-300 disabled:cursor-not-allowed w-full"
                  onClick={handleSaveNotes}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>

              <div>
                <h3 className="font-bold mb-4 text-[#00474E]">Client Goals</h3>
                <div className="p-4 bg-[#F5F5F5] min-h-32">
                  <textarea
                    className="w-full h-32 bg-transparent resize-none focus:outline-none text-sm md:text-base"
                    placeholder="Client's fitness and pilates goals"
                    value={clientGoals}
                    onChange={(e) => setClientGoals(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This information is visible by the client
                </p>
                <button
                  type="button"
                  disabled={isSavingGoals}
                  className="mt-4 px-6 py-2 bg-[#FF7A5A] text-white rounded-md hover:bg-[#FF6A4A] disabled:bg-gray-300 disabled:cursor-not-allowed w-full"
                  onClick={handleSaveGoals}
                >
                  {isSavingGoals ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        );
      case "notebook":
        return (
          <NotebookSection
            studentId={String(studentId)}
            studioId={String(studioId)}
            instructorId={String(instructorId)}
          />
        );
      case "homework":
        return (
          <HomeworkSection
            studentId={String(studentId)}
            studioId={String(studioId)}
          />
        );
      case "progress":
        return (
          <ProgressPhotosSection
            studentId={String(studentId)}
            studioId={String(studioId)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row max-w-6xl mx-auto p-4 sm:px-6 md:px-10 md:gap-6">
      {/* Mobile: Fullwidth ClientList, Desktop: 1/3 width */}
      <div className="w-full md:w-1/3 mb-4 md:mb-0 hidden sm:block">
        <ClientList onStudioChange={handleStudioChange} />
      </div>
      <button
        onClick={() => router.back()}
        className="block sm:hidden text-3xl mb-4  w-[fit-content]"
      >
        <IoIosArrowBack />
      </button>

      {/* Mobile: Fullwidth Card, Desktop: 2/3 width */}
      <div className="w-full md:w-2/3">
        <Card>
          <Tabs
            tabs={[
              { id: "notebook", label: "Notebook" },
              { id: "information", label: "Client Information" },
              { id: "homework", label: "Homework" },
              { id: "progress", label: "Progress Photos" },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="mt-6 px-4 sm:px-6">{tabContent()}</div>
        </Card>
      </div>
    </div>
  );
}
