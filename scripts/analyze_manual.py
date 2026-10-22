import pypdf
import sys

pdf_path = r'd:\web-app (2)\Joy PeopleHR\Test Data\manuals\Ai_Face_Magnum-New.pdf'
try:
    reader = pypdf.PdfReader(pdf_path)
    print(f"Total Pages: {len(reader.pages)}")
    keywords = ['multi', 'verification', 'combination', 'access control', 'group', 'unlock']
    found = {}
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ''
        for kw in keywords:
            if kw in text.lower():
                found.setdefault(i + 1, []).append(kw)
    print("Matches found on pages:", found)
    
    # Print pages that mention 'multi'
    for page_num, kws in found.items():
        if 'multi' in kws or 'combination' in kws:
            print(f"\n--- PAGE {page_num} ---")
            txt = reader.pages[page_num - 1].extract_text() or ''
            for line in txt.split('\n'):
                if any(k in line.lower() for k in ['multi', 'combination', 'group', 'verif', 'access']):
                    print("  ", line)
except Exception as e:
    print("Error:", e)
