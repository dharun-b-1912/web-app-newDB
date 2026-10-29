with open('src/features/attendance/components/SendAttendanceReportModal.tsx', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if 'reportFormat' in line:
            print(f'Line {i}: {line.strip()[:100]}')
