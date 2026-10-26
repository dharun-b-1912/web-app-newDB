import React from 'react';
import { CoursesView } from '../../lms/subviews/CoursesView';

export const TlTrainingView: React.FC = () => {
  return (
    <div className="space-y-6">
      <CoursesView />
    </div>
  );
};
