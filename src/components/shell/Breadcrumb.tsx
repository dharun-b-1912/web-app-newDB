import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
      <span className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
        <Home className="w-3.5 h-3.5" />
      </span>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="hover:text-gray-900 transition-colors font-medium text-gray-600 cursor-pointer"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-semibold text-[#07563D]">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
