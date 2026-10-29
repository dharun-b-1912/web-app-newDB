with open('supabase/functions/attendance-report-dispatcher/excelGenerator.ts', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if 'sheet' in line.lower() and ('add' in line.lower() or 'name' in line.lower() or 'workbook' in line.lower() or 'ws' in line.lower()):
            print(f'Line {i}: {line.strip()[:100]}')
