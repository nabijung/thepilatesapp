// src/components/exercises/ExerciseList.tsx
'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import hideScrollbarStyles from '@/app/styles/hideScrollbar.module.css';

import { useGetAllExerciseListsQuery, useGetExercisesByListIdQuery } from '@/store/api/exercisesApi';
import { addToast } from '@/store/slices/toastSlice';
import { useAppDispatch } from '@/store/hooks';
import { Exercise, ExerciseList } from '@/services/exercise.service';

interface ExerciseListComponentProps {
    onSelectExercise?: (exercise: Exercise, listName: string) => void;
    selectedExercises?: string[];
    showCheckboxes?: boolean;
    maxHeight?: string;
}

export default function ExerciseListComponent({
    onSelectExercise,
    selectedExercises = [],
    showCheckboxes = true,
    maxHeight = '400px',
}: ExerciseListComponentProps) {
    const dispatch = useAppDispatch();
    const [activeListId, setActiveListId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const exercisesContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftIndicator, setShowLeftIndicator] = useState(false);
    const [showRightIndicator, setShowRightIndicator] = useState(true);
    const [showBottomIndicator, setShowBottomIndicator] = useState(true);

    // Fetch exercise lists
    const {
        data: lists,
        isLoading: listsLoading,
        error: listsError
    } = useGetAllExerciseListsQuery();

    // Fetch exercises for the active list
    const {
        data: exercises,
        isLoading: exercisesLoading,
        error: exercisesError
    } = useGetExercisesByListIdQuery(activeListId || '', {
        skip: !activeListId
    });

    // Set the first list as active when data loads
    useEffect(() => {
        if (lists && lists.length > 0 && !activeListId) {
            setActiveListId(lists[0].exercise_list_id);
        }
    }, [lists, activeListId]);

    // Handle errors
    useEffect(() => {
        if (listsError) {
            dispatch(addToast({
                type: 'error',
                message: 'Failed to load exercise lists. Please try again.'
            }));
        }

        if (exercisesError) {
            dispatch(addToast({
                type: 'error',
                message: 'Failed to load exercises. Please try again.'
            }));
        }
    }, [listsError, exercisesError, dispatch]);

    // Filter exercises by search query
    const filteredExercises = exercises?.filter(exercise =>
        exercise.exercise_name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // Get the active list name
    const activeListName = activeListId
        ? lists?.find(list => list.exercise_list_id === activeListId)?.name
        : '';

    const handleExerciseClick = (exercise: Exercise) => {
        if (onSelectExercise && activeListName) {
            onSelectExercise(exercise, activeListName);
        }
    };

    const isLoading = listsLoading || exercisesLoading;

    // Check scroll position for horizontal indicators
    const checkScrollIndicators = () => {
        const container = tabsContainerRef.current;
        if (!container) return;

        setShowLeftIndicator(container.scrollLeft > 0);
        setShowRightIndicator(
            container.scrollLeft < (container.scrollWidth - container.clientWidth - 10)
        );
    };

    // Check scroll position for vertical indicator
    const checkVerticalScroll = () => {
        const container = exercisesContainerRef.current;
        if (!container) return;

        const hasVerticalScroll = container.scrollHeight > container.clientHeight;
        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 20;

        setShowBottomIndicator(hasVerticalScroll && !isAtBottom);
    };

    // Add scroll listeners
    useEffect(() => {
        const tabsContainer = tabsContainerRef.current;
        const exercisesContainer = exercisesContainerRef.current;

        const handleResize = () => {
            checkScrollIndicators();
            checkVerticalScroll();
        };

        if (tabsContainer) {
            checkScrollIndicators();
            tabsContainer.addEventListener('scroll', checkScrollIndicators);
        }

        if (exercisesContainer) {
            checkVerticalScroll();
            exercisesContainer.addEventListener('scroll', checkVerticalScroll);
        }

        window.addEventListener('resize', handleResize);

        return () => {
            tabsContainer?.removeEventListener('scroll', checkScrollIndicators);
            exercisesContainer?.removeEventListener('scroll', checkVerticalScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Exercise List Tabs with scroll indicators */}
            <div className="relative flex-shrink-0">
                <div
                    ref={tabsContainerRef}
                    className={`overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0 ${hideScrollbarStyles.scrollContainer} sm:!-ms-overflow-style-auto sm:!scrollbar-width-auto`}
                >
                    <div className="inline-flex rounded-[50px] border border-black overflow-hidden min-w-fit">
                        {lists?.map((list, index) => (
                            <button
                                type="button"
                                key={list.exercise_list_id}
                                onClick={() => setActiveListId(list.exercise_list_id)}
                                className={`px-6 text-nowrap border-r last:border-r-0 border-black border-r-[0.1px] py-2 text-sm ${activeListId === list.exercise_list_id
                                    ? 'bg-[#FDC6C0] text-gray-800'
                                    : 'bg-white text-gray-800'
                                    }`}
                            >
                                {list.name}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Scroll indicators - only show on mobile */}
                {showLeftIndicator && (
                    <div className={`absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none sm:hidden ${hideScrollbarStyles.scrollIndicator}`}></div>
                )}
                {showRightIndicator && (
                    <div className={`absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none sm:hidden ${hideScrollbarStyles.scrollIndicator}`}></div>
                )}
            </div>

            {/* Search Bar */}
            <div className="relative flex-shrink-0">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        // Reset scroll position and check indicators when search changes
                        if (exercisesContainerRef.current) {
                            exercisesContainerRef.current.scrollTop = 0;
                            checkVerticalScroll();
                        }
                    }}
                    placeholder="Search exercises..."
                    className="w-full px-4 py-2 pr-10 bg-[#F5F5F5] rounded-[50px] text-sm focus:outline-none focus:border-gray-400"
                />
                <div className="absolute right-3 top-2.5 text-gray-400">
                    <Image
                        src='/assets/search-icon.svg'
                        height={17}
                        width={17}
                        alt="search icon"
                        className="w-4 h-4"
                    />
                </div>
            </div>

            {/* Exercises List (scrollable only this part) */}
            <div className="relative flex-1 min-h-0">
                <div
                    ref={exercisesContainerRef}
                    className="overflow-y-auto pr-2 scrollbar-thin scrollbar-track-[#F5F5F5] scrollbar-thumb-[#FDC6C0] hover:scrollbar-thumb-[#FD7363] scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                    style={{ maxHeight: maxHeight }}
                >
                    {isLoading ? (
                        <div className="py-4 text-center">Loading exercises...</div>
                    ) : (
                        <div className="space-y-2">
                            {filteredExercises.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    {searchQuery ? 'No exercises match your search' : 'No exercises available'}
                                </p>
                            ) : (
                                filteredExercises.map(exercise => {
                                    const isSelected = selectedExercises.includes(exercise.exercise_id);

                                    return (
                                        <div
                                            key={exercise.exercise_id}
                                            className={`p-3 border-0 cursor-pointer ${isSelected ? 'border-[#FD7363] bg-red-50' : 'hover:bg-gray-50'}`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleExerciseClick(exercise);
                                            }}
                                        >
                                            <div className="flex items-start space-x-2">
                                                {showCheckboxes && (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => { }}
                                                        className="mt-1 accent-[#65558F] focus:ring-[#65558F]"
                                                    />
                                                )}
                                                <div>
                                                    <h4 className="font-medium text-sm">{exercise.exercise_name}</h4>
                                                    <p className="text-xs text-gray-500">{activeListName}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}