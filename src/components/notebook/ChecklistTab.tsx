// src/components/notebook/ChecklistTab.tsx
'use client';

import { useState, useEffect } from 'react';

import ExerciseListComponent from '@/components/exercises/ExerciseList';
import { Exercise } from '@/services/exercise.service';

interface ChecklistItem {
    id: number;
    checked: boolean;
    text: string;
    exercise_id?: string;
    exercise_list_id?: string;
    listName?: string;
}

interface ChecklistTabProps {
    items: ChecklistItem[];
    onExerciseSelect: (exercise: Exercise, listName: string) => void;
}

export default function ChecklistTab({ items, onExerciseSelect }: ChecklistTabProps) {

    // Get selected exercise IDs for the ExerciseList component
    const selectedExerciseIds = items
        .filter(item => item.exercise_id)
        .map(item => item.exercise_id as string);

    // Responsive maxHeight for the scrollable exercises list
    const maxHeight = 'calc(100vh - 500px)';

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Exercise List Component */}
            <ExerciseListComponent
                onSelectExercise={onExerciseSelect}
                selectedExercises={selectedExerciseIds}
                showCheckboxes={true}
                maxHeight={maxHeight}
            />

        </div>
    );
}