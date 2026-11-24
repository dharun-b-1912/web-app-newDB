/**
 * Universal name formatting utility for employees and contacts across Joy PeopleHR.
 * Prevents artifact formatting like "BASUDED ." when last_name is '.', '-', or whitespace.
 */
export function formatEmployeeName(emp?: any): string {
  if (!emp) return 'Employee';
  if (typeof emp === 'string') {
    const trimmed = emp.trim();
    if (trimmed.endsWith(' .')) return trimmed.slice(0, -2).trim();
    if (trimmed.endsWith(' .')) return trimmed.slice(0, -2).trim();
    if (trimmed === '.') return 'Employee';
    return trimmed;
  }

  const dName = (emp.display_name || '').trim();
  const fName = (emp.first_name || '').trim();
  const rawLName = (emp.last_name || '').trim();
  const lName = (rawLName === '.' || rawLName === '-' || rawLName.toLowerCase() === 'n/a') ? '' : rawLName;

  // Prefer clean display_name if available and not carrying trailing dot
  if (dName && dName !== '.' && !dName.endsWith(' .')) {
    return dName;
  }

  const joined = `${fName} ${lName}`.trim();
  if (joined && joined !== '.') {
    if (joined.endsWith(' .')) return joined.slice(0, -2).trim();
    return joined;
  }
  return emp.name || emp.employee_name || 'Employee';
}

