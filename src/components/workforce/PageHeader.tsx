import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  badge,
  actions,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-3 md:flex-row md:items-start md:justify-between', className)}>
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-[13px] font-medium text-[#90A1B9] mb-1 font-sans">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-[#90A1B9]">›</span>}
                <span className={idx === breadcrumbs.length - 1 ? 'text-[#0F172B] font-semibold' : ''}>
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[29px] font-bold text-[#0F172B] tracking-tight font-sans leading-[1.2]">
            {title}
          </h1>
          {badge}
        </div>

        {description && (
          <p className="text-[14px] text-[#62748E] font-normal leading-[1.5] max-w-[640px] font-sans">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 pt-1 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};
