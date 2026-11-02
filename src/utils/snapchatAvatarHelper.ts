/**
 * Joy PeopleHR — Employee Profile Photo & Identity Resolver
 * Provides authentic employee profile pictures across Web and Mobile.
 * Uses the employee's genuine uploaded profile photo; falls back to clean corporate initials if no photo is uploaded.
 */

export function isFemaleGender(gender?: string, name?: string): boolean {
  if (gender) {
    const g = gender.trim().toUpperCase();
    if (g === 'FEMALE' || g === 'F') return true;
    if (g === 'MALE' || g === 'M') return false;
  }
  return false;
}

/**
 * Universal Avatar resolver using the employee's authentic uploaded profile photo.
 * Falls back to clean corporate initials when no photo is present.
 */
export function getEmployeeAvatarUrl(
  emp: {
    employee_name?: string;
    display_name?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    gender?: string;
    employee_code?: string;
    avatar_url?: string;
  },
  options?: {
    size?: number;
  }
): string {
  const name =
    emp.employee_name ||
    emp.display_name ||
    emp.name ||
    (emp.first_name ? `${emp.first_name} ${emp.last_name || ''}`.trim() : '') ||
    emp.employee_code ||
    'Staff';

  // If candidate has an authentic uploaded profile photo, use it directly
  if (emp.avatar_url && emp.avatar_url.trim() !== '' && !emp.avatar_url.includes('dicebear.com')) {
    return emp.avatar_url;
  }

  // Clean professional initials avatar fallback
  const cleanName = encodeURIComponent(name);
  const size = options?.size || 160;
  return `https://ui-avatars.com/api/?name=${cleanName}&background=07563D&color=fff&bold=true&size=${size}`;
}


