import * as fs from 'fs';

const filePath = 'src/features/vendor/components/VendorDocumentVaultTab.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const startMarker = `  // Complete Enterprise Documents Dataset (Vendor Org + Individual Employee Documents)\r\n  const [documents, setDocuments] = useState<VendorDocumentRecord[]>([`;
const startMarkerLF = `  // Complete Enterprise Documents Dataset (Vendor Org + Individual Employee Documents)\n  const [documents, setDocuments] = useState<VendorDocumentRecord[]>([`;

const endMarker = `  ]);\r\n\r\n  // Expiring soon documents (< 30 days) across entire vault`;
const endMarkerLF = `  ]);\n\n  // Expiring soon documents (< 30 days) across entire vault`;

let startIndex = content.indexOf(startMarker);
let isCRLF = true;
if (startIndex === -1) {
  startIndex = content.indexOf(startMarkerLF);
  isCRLF = false;
}

if (startIndex === -1) {
  console.error('Could not find start marker!');
  process.exit(1);
}

const endTarget = isCRLF ? endMarker : endMarkerLF;
const endIndex = content.indexOf(endTarget, startIndex);

if (endIndex === -1) {
  console.error('Could not find end marker!');
  process.exit(1);
}

const replacement = isCRLF 
  ? `  // =========================================================================\r\n  // ZERO-MOCK POLICY: Dynamic Database Document Vault State\r\n  // Vault starts empty and populates strictly from database/cloud storage\r\n  // =========================================================================\r\n  const [documents, setDocuments] = useState<VendorDocumentRecord[]>([]);\r\n\r\n  useEffect(() => {\r\n    let isMounted = true;\r\n    VendorDocumentService.listDocuments({ vendorId })\r\n      .then((docs) => {\r\n        if (isMounted && docs) {\r\n          setDocuments(docs);\r\n        }\r\n      })\r\n      .catch((err) => {\r\n        console.error('[VendorDocumentVault] Error loading live documents:', err);\r\n      });\r\n\r\n    return () => {\r\n      isMounted = false;\r\n    };\r\n  }, [vendorId]);\r\n\r\n  // Expiring soon documents (< 30 days) across entire vault`
  : `  // =========================================================================\n  // ZERO-MOCK POLICY: Dynamic Database Document Vault State\n  // Vault starts empty and populates strictly from database/cloud storage\n  // =========================================================================\n  const [documents, setDocuments] = useState<VendorDocumentRecord[]>([]);\n\n  useEffect(() => {\n    let isMounted = true;\n    VendorDocumentService.listDocuments({ vendorId })\n      .then((docs) => {\n        if (isMounted && docs) {\n          setDocuments(docs);\n        }\n      })\n      .catch((err) => {\n        console.error('[VendorDocumentVault] Error loading live documents:', err);\n      });\n\n    return () => {\n      isMounted = false;\n    };\n  }, [vendorId]);\n\n  // Expiring soon documents (< 30 days) across entire vault`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex + endTarget.length);

// Also replace the hardcoded "6 Staff Active at Chennai Central Hub"
content = content.replace(
  '6 Staff Active at Chennai Central Hub',
  '{deployedWorkers.length} Staff Active'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated VendorDocumentVaultTab.tsx!');
