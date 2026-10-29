import os

service_file = r"d:\web-app (2)\Joy PeopleHR\src\services\attendance\attendanceReportExportService.ts"

with open(service_file, "r", encoding="utf-8") as f:
    code = f.read()

# Check where sheet 1 starts in attendanceReportExportService.ts
s1 = code.find("const wsDash = wb.addWorksheet('Executive Dashboard'")
b1 = code.find("const rawBuffer = await wb.xlsx.writeBuffer();")

print(f"Frontend service: Sheet 1 at {s1}, Buffer at {b1}")
