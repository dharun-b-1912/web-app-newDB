import os

target_edge = r"d:\web-app (2)\Joy PeopleHR\supabase\functions\attendance-report-dispatcher\excelGenerator.ts"

# Read existing excelGenerator to keep daily sheets intact
with open(target_edge, "r", encoding="utf-8") as f:
    orig_code = f.read()

print(f"Original excelGenerator.ts read: {len(orig_code)} characters")
