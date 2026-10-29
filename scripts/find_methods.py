with open('src/services/attendance/attendanceReportExportService.ts', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if 'async generate' in line or 'generateCsv' in line or 'generatePdf' in line:
            print(f'Line {i}: {line.strip()[:80]}')
