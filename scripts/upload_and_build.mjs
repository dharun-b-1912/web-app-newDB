import fs from 'fs';
import path from 'path';

const url = 'https://srv1754-files.hstgr.io/rest/7e93ac695ef031df/api/tus/public_html';
const authKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJsb2NhbGUiOiJlbl9VUyIsInZpZXdNb2RlIjoibGlzdCIsInNpbmdsZUNsaWNrIjpmYWxzZSwicmVkaXJlY3RBZnRlckNvcHlNb3ZlIjpmYWxzZSwicGVybSI6eyJhZG1pbiI6ZmFsc2UsImV4ZWN1dGUiOmZhbHNlLCJjcmVhdGUiOnRydWUsInJlbmFtZSI6dHJ1ZSwibW9kaWZ5Ijp0cnVlLCJkZWxldGUiOnRydWUsInNoYXJlIjpmYWxzZSwiZG93bmxvYWQiOnRydWV9LCJjb21tYW5kcyI6W10sImxvY2tQYXNzd29yZCI6dHJ1ZSwiaGlkZURvdGZpbGVzIjpmYWxzZSwiZGF0ZUZvcm1hdCI6ZmFsc2UsInVzZXJuYW1lIjoidTkxNzAyMzY0NSIsImFjZUVkaXRvclRoZW1lIjoiIn0sImlzcyI6IkZpbGUgQnJvd3NlciIsImV4cCI6MTc4ODAyMjg5OCwiaWF0IjoxNzg4MDAxMjk4fQ.Z_zWTHDMhRt_lZZY2cwQBiy0CnaDVCopH-JOKwCycgY';
const restAuthKey = '1cc6d4af8a01e7ed37758c326bb05d7c57d91188b35557d1b48fd2299abb743a-7e93ac695ef031df';

const filePath = path.join(process.cwd(), 'deploy_package.tar.gz');
const fileBuffer = fs.readFileSync(filePath);
const fileSize = fileBuffer.length;

console.log(`Starting upload of deploy_package.tar.gz (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);

// 1. Create upload
const createRes = await fetch(`${url}/deploy_package.tar.gz?override=true`, {
  method: 'POST',
  headers: {
    'X-Auth': authKey,
    'X-Auth-Rest': restAuthKey,
    'Tus-Resumable': '1.0.0',
    'Upload-Length': String(fileSize),
    'Upload-Offset': '0',
  },
});

console.log('Create POST status:', createRes.status, createRes.statusText);

// 2. Patch upload binary
const patchRes = await fetch(`${url}/deploy_package.tar.gz?override=true`, {
  method: 'PATCH',
  headers: {
    'X-Auth': authKey,
    'X-Auth-Rest': restAuthKey,
    'Tus-Resumable': '1.0.0',
    'Content-Type': 'application/offset+octet-stream',
    'Upload-Offset': '0',
  },
  body: fileBuffer,
});

console.log('Upload PATCH status:', patchRes.status, patchRes.statusText);
if (patchRes.ok || patchRes.status === 204) {
  console.log('Upload completed successfully!');
} else {
  const text = await patchRes.text();
  console.error('Upload failed:', text);
}
