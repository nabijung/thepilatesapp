// src/components/notebook/NotebookEntryModal.tsx
"use client";

import { Formik, Form, ErrorMessage, FormikProps, Field } from "formik";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  FaChevronDown as ChevronDown,
  FaChevronUp as ChevronUp,
} from "react-icons/fa6";
import { FaInfoCircle } from "react-icons/fa";
import * as Yup from "yup";

import ChecklistTab from "@/components/notebook/ChecklistTab";
import ScrollIndicator from "@/components/ui/ScrollIndicator";
import {
  useAddNotebookEntryMutation,
  useCreateDraftEntryMutation,
  useUpdateNotebookEntryMutation,
  useAutosaveNotebookEntryMutation,
  useGetNotebookEntryQuery,
} from "@/store/api/notebookApi";
import { notebookApi } from "@/store/api/notebookApi";
import { addToast } from "@/store/slices/toastSlice";
import { useAppDispatch } from "@/store/hooks";

import scrollFadeStyles from "@/app/styles/scrollFade.module.css";
import hideScrollbarStyles from "@/app/styles/hideScrollbar.module.css";
import { CustomFormField } from "../ui/FormField";

// Add a new style for tooltip animation
const tooltipAnimation = `
@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-10px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
}
.animatedTooltip {
  animation: fadeInOut 3s ease-in-out forwards;
}
`;

interface ChecklistItem {
  id: number;
  checked: boolean;
  text: string;
  exercise_id?: string;
  exercise_list_id?: string;
  listName?: string;
}

interface NotebookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studioId: string;
  notebookId: string;
  instructorId: string;
  entryId?: string; // Optional: If provided, we're in edit mode
  mode?: "add" | "edit"; // Default is create
}

const NotebookEntrySchema = Yup.object().shape({
  title: Yup.string(), // Make title optional
  date: Yup.date().required("Date is required"),
  content: Yup.string(),
});

// Separator for the auto-populated exercises section in notes
const EXERCISE_SEPARATOR = "------------------------------";

export default function NotebookEntryModal({
  isOpen,
  onClose,
  studentId,
  studioId,
  notebookId,
  instructorId,
  entryId,
  mode = "add",
}: NotebookEntryModalProps) {
  const dispatch = useAppDispatch();
  const isEditMode =
    mode === "edit" && entryId !== null && entryId !== undefined;
  const [isNotes, setIsNotes] = useState(true);
  const [addEntry, { isLoading: isAddLoading }] = useAddNotebookEntryMutation();
  const [createDraftEntry] = useCreateDraftEntryMutation();
  const [updateEntry, { isLoading: isUpdateLoading }] =
    useUpdateNotebookEntryMutation();
  const [autosaveEntry] = useAutosaveNotebookEntryMutation();
  const formikRef = useRef<FormikProps<any>>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // For scroll indicator
  const [isScrollable, setIsScrollable] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  // Track if tooltip should be shown
  const [showTooltip, setShowTooltip] = useState(false);
  // Track the original content without the auto-populated section
  const [userEnteredContent, setUserEnteredContent] = useState("");
  // Track full content including auto-populated exercises
  const [fullContent, setFullContent] = useState("");
  
  // Autosave state
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // For new entries: track the created entry ID for autosave
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(entryId || null);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);

  // Debounced autosave function
  const debouncedAutosave = useCallback(
    async (values: any) => {
      // Get the correct entry ID for autosave
      const entryIdForAutosave = isEditMode ? entryId : currentEntryId;
      
      // Only autosave if we have an entry ID
      if (!entryIdForAutosave) return;
      
      // Clear existing timeout
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }

      // Set new timeout for autosave
      autosaveTimeoutRef.current = setTimeout(async () => {
        try {
          setAutosaveStatus('saving');
          
          // Get current values from passed parameters (most up-to-date)
          let currentUserContent = values.content || '';
          
          // If there are checked exercises, extract only the user-entered content (after separator)
          if (checklistItems.some(item => item.checked) && currentUserContent.includes(EXERCISE_SEPARATOR)) {
            const userContentStart = currentUserContent.indexOf(EXERCISE_SEPARATOR) + EXERCISE_SEPARATOR.length + 1;
            currentUserContent = currentUserContent.substring(userContentStart);
          }
          
          const finalTitle = values.title || `Entry ${new Date().toISOString().split('T')[0]}`;
          const exerciseSelected = checklistItems.length > 0 ? JSON.stringify(checklistItems) : '';

          await autosaveEntry({
            entryId: entryIdForAutosave,
            title: finalTitle,
            contents: currentUserContent,
            exercise_selected: exerciseSelected,
            entry_date: values.date,
          }).unwrap();

          setAutosaveStatus('saved');
          setLastSaved(new Date());
          
          // Clear saved status after 3 seconds
          setTimeout(() => {
            setAutosaveStatus('idle');
          }, 3000);
        } catch (error) {
          console.error('Autosave failed:', error);
          setAutosaveStatus('error');
          setTimeout(() => {
            setAutosaveStatus('idle');
          }, 3000);
        }
      }, 3000); // 3 second delay
    },
    [isEditMode, entryId, currentEntryId, autosaveEntry, checklistItems]
  );

  // Create initial entry for new entries when user starts typing
  const createInitialEntry = useCallback(async (values: any) => {
    if (isEditMode || currentEntryId) return;
    
    try {
      const finalTitle = values.title || `Entry ${new Date().toISOString().split('T')[0]}`;
      const exerciseSelected = checklistItems.length > 0 ? JSON.stringify(checklistItems) : '';
      
      const newEntry = await createDraftEntry({
        studentId,
        instructorId,
        studioId,
        title: finalTitle,
        contents: values.content || '',
        exercise_selected: exerciseSelected,
        entry_date: values.date || new Date().toISOString().split('T')[0],
      }).unwrap();
      
      setCurrentEntryId(newEntry.entry_id);
    } catch (error) {
      console.error('Failed to create initial entry:', error);
    }
  }, [isEditMode, currentEntryId, createDraftEntry, studentId, instructorId, studioId, checklistItems]);

  // Handle content changes for new entries
  const handleContentChange = useCallback((values: any) => {
    if (!isEditMode && !hasStartedTyping) {
      setHasStartedTyping(true);
      // Create initial entry when user starts typing
      createInitialEntry(values);
    }
    
    // Trigger autosave
    debouncedAutosave(values);
  }, [isEditMode, hasStartedTyping, createInitialEntry, debouncedAutosave]);

  // Cleanup autosave timeout on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Clear all state when modal is closed
      setChecklistItems([]);
      setUserEnteredContent("");
      setFullContent("");
      setIsNotes(true);
      setAutosaveStatus('idle');
      setLastSaved(null);
      setShowTooltip(false);
      setCurrentEntryId(entryId || null); // Reset to original entryId or null
      setHasStartedTyping(false); // Reset typing state
      
      // Clear autosave timeout
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    }
  }, [isOpen, entryId]);

  // Enhanced version - add style tag for tooltip animation
  useEffect(() => {
    // Add the animation styles to the document
    const styleElement = document.createElement("style");
    styleElement.innerHTML = tooltipAnimation;
    document.head.appendChild(styleElement);

    return () => {
      // Clean up on unmount
      if (styleElement && document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  // Check for scrollability
  useEffect(() => {
    const container = modalContentRef.current;
    if (!container) return;

    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setIsScrollable(scrollHeight > clientHeight);
      setIsAtTop(scrollTop <= 10);
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
    };

    checkScrollPosition();
    container.addEventListener("scroll", checkScrollPosition);

    const resizeObserver = new ResizeObserver(checkScrollPosition);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", checkScrollPosition);
      resizeObserver.disconnect();
    };
  }, [isOpen, isNotes, checklistItems]);

  // Generate the auto-populated exercises text
  const generateExercisesText = (exercises: ChecklistItem[]): string => {
    if (exercises.length === 0) return "";

    // Filter only checked exercises and sort them by list name
    const checkedExercises = exercises.filter((item) => item.checked);
    if (checkedExercises.length === 0) return "";

    return (
      checkedExercises.map((item) => item.text.toUpperCase()).join("\n") +
      "\n" +
      EXERCISE_SEPARATOR +
      "\n"
    );
  };

  // Update the text area with exercises + user content
  useEffect(() => {
    if (isNotes && formikRef.current) {
      const exercisesSection = generateExercisesText(checklistItems);
      const newFullContent = exercisesSection + userEnteredContent;
      setFullContent(newFullContent);
      formikRef.current.setFieldValue("content", newFullContent);
    }
  }, [checklistItems, userEnteredContent, isNotes]);

  // Skip this query if we're in add mode
  const { data: entryData, isLoading: isEntryLoading } =
    useGetNotebookEntryQuery(
      { entryId: entryId || "" },
      { skip: !isEditMode || !isOpen },
    );

  // When entry data is loaded, update form values
  useEffect(() => {
    if (isEditMode && entryData && formikRef.current) {
      try {
        let isExerciseList = false;
        let parsedExercises: ChecklistItem[] = [];
        let notesContent = "";

        // Check if we have exercise_selected data
        if (entryData.exercise_selected) {
          try {
            parsedExercises = JSON.parse(entryData.exercise_selected);
            isExerciseList =
              Array.isArray(parsedExercises) &&
              parsedExercises.length > 0 &&
              parsedExercises.every(
                (item) => "checked" in item && "text" in item,
              );
          } catch (e) {
            console.error("Error parsing exercise_selected:", e);
            isExerciseList = false;
          }
        }

        // For backwards compatibility, also check contents for checklist format
        if (!isExerciseList && entryData.contents) {
          try {
            const parsedContent = JSON.parse(entryData.contents);
            // Verify if the content looks like a checklist
            isExerciseList =
              Array.isArray(parsedContent) &&
              parsedContent.length > 0 &&
              parsedContent.every(
                (item) => "checked" in item && "text" in item,
              );

            if (isExerciseList) {
              parsedExercises = parsedContent;
            }
          } catch (e) {
            // If parsing fails, it's not a JSON - assume regular notes
            notesContent = entryData.contents;
          }
        } else if (entryData.contents) {
          notesContent = entryData.contents;
        }

        // Set checklist items if we have any
        if (isExerciseList && parsedExercises.length > 0) {
          // Map the items with IDs
          const itemsWithIds = parsedExercises.map((item, index) => ({
            ...item,
            id: index,
          }));
          setChecklistItems(itemsWithIds);
        }

        // Set the user content (excluding auto-populated section)
        if (notesContent) {
          const exercisesSection = generateExercisesText(parsedExercises);

          if (exercisesSection && notesContent.includes(EXERCISE_SEPARATOR)) {
            const userContentStart =
              notesContent.indexOf(EXERCISE_SEPARATOR) +
              EXERCISE_SEPARATOR.length +
              1;
            setUserEnteredContent(notesContent.substring(userContentStart));
          } else {
            setUserEnteredContent(notesContent);
          }

          // Set the full content in the form
          formikRef.current.setFieldValue("content", notesContent);
          setFullContent(notesContent);
        }

        // Set the active tab based on what we have
        if (isExerciseList && !notesContent) {
          setIsNotes(false);
        } else {
          setIsNotes(true);
        }

        // Set other form values
        formikRef.current.setFieldValue("title", entryData.title || "");
        formikRef.current.setFieldValue(
          "date",
          (entryData as any).entry_date
            ? (entryData as any).entry_date
            : new Date(entryData.created_at).toISOString().split("T")[0],
        );
      } catch (e) {
        // Handle parsing error
        console.error("Error parsing entry data:", e);
        setIsNotes(true);
        setChecklistItems([]);

        if (entryData.contents) {
          formikRef.current.setFieldValue("content", entryData.contents);
          setUserEnteredContent(entryData.contents);
          setFullContent(entryData.contents);
        }
      }
    } else if (!isEditMode && isOpen) {
      // Reset for new entry
      setChecklistItems([]);
      setUserEnteredContent("");
      setFullContent("");
      setIsNotes(true);
      
      // Also reset the form content field to ensure no previous content persists
      if (formikRef.current) {
        formikRef.current.setFieldValue("content", "");
      }
    }
  }, [entryData, isEditMode, isOpen]);

  const handleExerciseSelect = (exercise: any, listName: string) => {
    // Check if the exercise is already in the checklist
    const existingItem = checklistItems.find(
      (item) =>
        item.text === exercise.exercise_name &&
        item.exercise_id === exercise.exercise_id,
    );

    if (existingItem) {
      // Remove if it exists (toggle behavior)
      setChecklistItems((prevItems) =>
        prevItems.filter(
          (item) =>
            !(
              item.text === exercise.exercise_name &&
              item.exercise_id === exercise.exercise_id
            ),
        ),
      );
      return;
    }

    // Add new item to checklist
    setChecklistItems((prevItems) => [
      ...prevItems,
      {
        id: prevItems.length, // Use array length for new ID
        checked: true,
        text: exercise.exercise_name,
        exercise_id: exercise.exercise_id,
        exercise_list_id: exercise.exercise_list_id,
        listName,
      },
    ]);
  };

  const isLoading = isAddLoading || isUpdateLoading || isEntryLoading;

  // Handle modal close
  const handleClose = useCallback(() => {
    // If we created a draft entry for autosave, invalidate the cache to refresh the list
    if (currentEntryId && !isEditMode && hasStartedTyping) {
      dispatch(notebookApi.util.invalidateTags(['NotebookEntries']));
    }
    
    setChecklistItems([]);
    setUserEnteredContent("");
    setFullContent("");
    onClose();
  }, [currentEntryId, isEditMode, hasStartedTyping, dispatch, onClose]);

  if (!isOpen) return null;



  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-[20px] sm:p-[30px]">
      <div className="relative bg-white rounded-lg w-full max-h-[calc(100vh-40px)] sm:max-h-[calc(100vh-60px)] flex flex-col">
        {!isLoading && (
          <Formik
            innerRef={formikRef}
            initialValues={{
              title: isEditMode && entryData ? entryData.title : "",
              date:
                isEditMode && entryData
                  ? ((entryData as any).entry_date
                    ? (entryData as any).entry_date
                    : new Date(entryData.created_at).toISOString().split("T")[0])
                  : new Date().toISOString().split("T")[0],
              content: "",
            }}
            enableReinitialize={true}
            validationSchema={NotebookEntrySchema}
            onSubmit={async (values, { resetForm }) => {
              try {
                console.log("SUBMITTING WITH VALUES", values);
                // If no title is provided, use the date as title
                const finalTitle = values.title
                  ? values.title
                  : new Date(values.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    });

                // Save the exercises checklist to exercise_selected
                const exerciseSelected = JSON.stringify(
                  checklistItems
                    .filter((item) => item.text.trim() !== "")
                    .filter((item) => item.checked === true),
                );

                // Make sure we're using the most up-to-date user content
                // If the form is in notes mode, we need to extract user content from the current form value
                let currentUserContent = "";
                const currentFormContent = values.content || "";

                // Extract user content if we're in notes mode and have exercises
                if (checklistItems.some((item) => item.checked)) {
                  const separatorIndex =
                    currentFormContent.indexOf(EXERCISE_SEPARATOR);
                  if (separatorIndex !== -1) {
                    const afterSeparator = currentFormContent.slice(
                      separatorIndex + EXERCISE_SEPARATOR.length,
                    );
                    currentUserContent = afterSeparator.replace(/^\n/, "");
                  } else {
                    currentUserContent = currentFormContent;
                  }
                } else {
                  currentUserContent = currentFormContent;
                }

                // Only send the user-entered content, not the auto-populated exercises
                const finalContent = currentUserContent;

                if (isEditMode && entryId) {
                  // Update existing entry
                  await updateEntry({
                    entryId,
                    title: finalTitle,
                    contents: finalContent,
                    exercise_selected: exerciseSelected,
                    entry_date: values.date,
                  }).unwrap();

                  dispatch(
                    addToast({
                      type: "success",
                      message: "Entry updated successfully",
                    }),
                  );
                } else if (currentEntryId) {
                  // Update the entry we created for autosave
                  await updateEntry({
                    entryId: currentEntryId,
                    title: finalTitle,
                    contents: finalContent,
                    exercise_selected: exerciseSelected,
                    entry_date: values.date,
                  }).unwrap();

                  dispatch(
                    addToast({
                      type: "success",
                      message: "Entry created successfully",
                    }),
                  );
                } else {
                  // Create new entry (fallback)
                  await addEntry({
                    studentId,
                    instructorId,
                    studioId,
                    title: finalTitle,
                    contents: finalContent,
                    exercise_selected: exerciseSelected,
                    entry_date: values.date,
                  }).unwrap();

                  dispatch(
                    addToast({
                      type: "success",
                      message: "Entry created successfully",
                    }),
                  );
                }

                resetForm();
                setChecklistItems([]);
                setUserEnteredContent("");
                setFullContent("");
                // Don't cleanup draft entry since it was successfully submitted
                setCurrentEntryId(null);
                setHasStartedTyping(false);
                handleClose();
              } catch (error) {
                console.error(
                  `Failed to ${isEditMode ? "update" : "add"} notebook entry:`,
                  error,
                );

                dispatch(
                  addToast({
                    type: "error",
                    message: `Failed to ${isEditMode ? "update" : "create"} entry. Please try again.`,
                  }),
                );
              }
            }}
          >
            {({ errors, touched, values, setFieldValue }) => (
              <Form id="notebook-entry-form" className="flex flex-col h-full">
                {/* Fixed Header */}
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                    <h2 className="text-xl font-medium text-gray-800">
                      {isEditMode
                        ? "Edit Notebook Entry"
                        : "New Notebook Entry"}
                    </h2>
                      {(isEditMode || currentEntryId) && (
                        <div className="flex items-center gap-2 mt-1">
                          {autosaveStatus === 'saving' && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                              Saving...
                            </span>
                          )}
                          {autosaveStatus === 'saved' && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              ✓ Saved {lastSaved && new Date(lastSaved).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </span>
                          )}
                          {autosaveStatus === 'error' && (
                            <span className="text-xs text-red-600 flex items-center gap-1">
                              ⚠ Auto-save failed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleClose}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                      <div>
                        <Field name="date">
                          {({ field, form }: { field: any; form: any }) => (
                            <CustomFormField
                              id="date"
                              name="date"
                              type="date"
                              label="Date"
                              className="w-full sm:max-w-[300px]"
                              extraInputClasses="!border-t-0 !border-r-0 !border-l-0 !rounded-[0px] border-b-black"
                              onChange={(e) => {
                                // Call Formik's onChange first
                                field.onChange(e);
                                
                                // Then trigger autosave
                                const currentValues = form.values;
                                if (isEditMode || currentEntryId) {
                                  debouncedAutosave({
                                    ...currentValues,
                                    date: e.target.value
                                  });
                                } else {
                                  handleContentChange({
                                    ...currentValues,
                                    date: e.target.value
                                  });
                                }
                              }}
                            />
                          )}
                        </Field>
                        <ErrorMessage
                          name="date"
                          component="div"
                          className="text-red-500 text-xs mt-1"
                        />
                      </div>

                      <div>
                        <Field name="title">
                          {({ field, form }: { field: any; form: any }) => (
                            <CustomFormField
                              id="title"
                              name="title"
                              type="text"
                              label="Title (Optional)"
                              placeholder="Enter title or leave blank"
                              className="w-full sm:max-w-[300px]"
                              onChange={(e) => {
                                // Call Formik's onChange first
                                field.onChange(e);
                                
                                // Then trigger autosave
                                const currentValues = form.values;
                                if (isEditMode || currentEntryId) {
                                  debouncedAutosave({
                                    ...currentValues,
                                    title: e.target.value
                                  });
                                } else {
                                  handleContentChange({
                                    ...currentValues,
                                    title: e.target.value
                                  });
                                }
                              }}
                            />
                          )}
                        </Field>
                      </div>
                    </div>

                    {/* Checklist/Notes toggle */}
                    <div className="flex">
                      <div className="inline-flex rounded-[50px] border border-black overflow-hidden">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();

                            // If we're already in Notes tab, do nothing
                            if (isNotes) return;

                            // Switching from Checklist to Notes
                            // Update the content with any selected exercises
                            if (checklistItems.some((item) => item.checked)) {
                              const exercisesSection =
                                generateExercisesText(checklistItems);
                              const newFullContent =
                                exercisesSection + userEnteredContent;
                              setFullContent(newFullContent);

                              // Update Formik's value
                              if (formikRef.current) {
                                formikRef.current.setFieldValue(
                                  "content",
                                  newFullContent,
                                );
                              }
                            }

                            setIsNotes(true);
                          }}
                          className={`px-6 w-full border-r border-black border-r-[0.1px] py-2 text-sm ${
                            isNotes
                              ? "bg-[#FDC6C0] text-gray-800"
                              : "bg-white text-gray-800"
                          }`}
                        >
                          Notes
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();

                            // If we're already in Checklist tab, do nothing
                            if (!isNotes) return;

                            // Switching from Notes to Checklist
                            // Save the current content as userEnteredContent
                            if (formikRef.current) {
                              const currentFormContent =
                                formikRef.current.values.content || "";

                              // Extract user-entered content (after the separator if present)
                              if (
                                checklistItems.some((item) => item.checked) &&
                                currentFormContent.includes(EXERCISE_SEPARATOR)
                              ) {
                                const userContentStart =
                                  currentFormContent.indexOf(
                                    EXERCISE_SEPARATOR,
                                  ) +
                                  EXERCISE_SEPARATOR.length +
                                  1;
                                const extractedUserContent =
                                  currentFormContent.substring(
                                    userContentStart,
                                  );
                                setUserEnteredContent(extractedUserContent);
                              } else {
                                // If no exercises or separator, all content is user-entered
                                setUserEnteredContent(currentFormContent);
                              }
                            }

                            setIsNotes(false);
                          }}
                          className={`px-6 py-2 w-full px-6 border-l border-black border-l-[0.1px] text-sm ${
                            !isNotes
                              ? "bg-[#FDC6C0] text-gray-800"
                              : "bg-white text-gray-800"
                          }`}
                        >
                          Checklist
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scrollable Content Area */}
                <div
                  className="flex-1 overflow-hidden min-h-0 p-6 pt-0 flex flex-col"
                  ref={modalContentRef}
                >
                  {isLoading ? (
                    <div className="text-center py-8">
                      Loading entry data...
                    </div>
                  ) : (
                    <div className="flex-1 overflow-hidden">
                      {isNotes ? (
                        <div className="relative h-full">
                          {showTooltip && (
                            <div className="absolute top-0 left-0 max-w-[400px] flex items-center bg-[#FFF4F2] text-[#FD7363] p-2 pl-3 rounded-md text-xs mb-2 z-10 shadow-sm animatedTooltip">
                              <FaInfoCircle className="mr-2 flex-shrink-0" />
                              <span>
                                Please use the Checklist tab to modify selected
                                exercises. <br />
                                Notes can be edited below the seperator.
                              </span>
                            </div>
                          )}
                          <Field name="content">
                            {({ field, form }: { field: any; form: any }) => (
                              <textarea
                                {...field}
                                id="content"
                                placeholder="Start typing..."
                                rows={6}
                                className={`w-full border-0 bg-[#F5F5F5] max-w-[400px] px-4 py-3 rounded-lg`}
                                ref={textareaRef}
                                onChange={(e) => {
                                  // Get the new value
                                  const currentContent = e.target.value;

                                  // Check if the auto-populated section has been modified
                                  const exercisesSection =
                                    generateExercisesText(checklistItems);

                                  // Only check for modifications if we have exercises that should be displayed
                                  if (
                                    checklistItems.some((item) => item.checked)
                                  ) {
                                    // Get the expected section text and check if it's been modified
                                    const separatorIndex =
                                      currentContent.indexOf(
                                        EXERCISE_SEPARATOR,
                                      );

                                    // Check for any of these modification cases:
                                    // 1. Separator is missing entirely
                                    // 2. Content before and including separator doesn't match expected exercise section
                                    const sectionIsModified =
                                      separatorIndex === -1 || // Separator removed
                                      currentContent.substring(
                                        0,
                                        separatorIndex +
                                          EXERCISE_SEPARATOR.length,
                                      ) !==
                                        exercisesSection.substring(
                                          0,
                                          exercisesSection.indexOf(
                                            EXERCISE_SEPARATOR,
                                          ) + EXERCISE_SEPARATOR.length,
                                        ); // Any part modified

                                    if (sectionIsModified) {
                                      // Show tooltip if user is trying to edit the auto-populated section
                                      setShowTooltip(true);
                                      setTimeout(
                                        () => setShowTooltip(false),
                                        3000,
                                      ); // Hide after 3 seconds

                                      // Reset to proper content with exercises at the top
                                      const properContent =
                                        exercisesSection + userEnteredContent;

                                      // Set the field value directly
                                      form.setFieldValue(
                                        "content",
                                        properContent,
                                      );
                                      setFullContent(properContent);
                                      return;
                                    }
                                  }

                                  // Let Formik handle the change normally
                                  field.onChange(e);
                                  setFullContent(currentContent);

                                  // Extract the user-entered portion (everything after the separator)
                                  if (
                                    checklistItems.some(
                                      (item) => item.checked,
                                    ) &&
                                    currentContent.includes(EXERCISE_SEPARATOR)
                                  ) {
                                    const userContentStart =
                                      currentContent.indexOf(
                                        EXERCISE_SEPARATOR,
                                      ) +
                                      EXERCISE_SEPARATOR.length +
                                      1;
                                    const newUserContent =
                                      currentContent.substring(
                                        userContentStart,
                                      );
                                    setUserEnteredContent(newUserContent);
                                  } else {
                                    // If no exercises or separator, all content is user-entered
                                    setUserEnteredContent(currentContent);
                                  }

                                  // Trigger autosave for both edit mode and new entries with current content
                                  if (isEditMode || currentEntryId) {
                                    // Pass the current content instead of outdated form.values
                                    debouncedAutosave({
                                      ...form.values,
                                      content: currentContent
                                    });
                                  } else {
                                    // For new entries, trigger the content change handler
                                    handleContentChange({
                                      ...form.values,
                                      content: currentContent
                                    });
                                  }
                                }}
                              />
                            )}
                          </Field>
                        </div>
                      ) : (
                        <div className="h-full max-h-[calc(100vh-400px)]">
                          <ChecklistTab
                            items={checklistItems}
                            onExerciseSelect={handleExerciseSelect}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Fixed Footer */}
                <div className="border-t p-6 mt-auto">
                  <div className="text-xs text-gray-500 text-center mb-4">
                    This information is not visible by the client
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full px-4 py-3 rounded-md text-white font-medium bg-[#FD7363] hover:bg-[#FF6A4A] disabled:bg-gray-300"
                    >
                      {isLoading
                        ? "Processing..."
                        : isEditMode
                          ? "Update Entry"
                          : "Create Entry"}
                    </button>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        )}
      </div>
    </div>
  );
}
