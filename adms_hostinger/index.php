<?php
// JOY PeopleHR - ADMS Reverse Proxy to Supabase Edge Function
// Supports eSSL / ZKTeco Cloud ADMS Protocols (GET/POST /iclock/*)
error_reporting(0);
ini_set('display_errors', '0');

// CRITICAL: Disable all PHP output compression for embedded biometric terminals
@ini_set('zlib.output_compression', 'Off');
@ini_set('output_buffering', 'Off');
@set_time_limit(180);

$edgeFunctionUrl = 'https://ysiajemrqakfngasehhi.supabase.co/functions/v1/adms-gateway';
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$targetUrl = $edgeFunctionUrl . $requestUri;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$input = file_get_contents('php://input');

// Request logger for live debugging (rotate if > 5MB)
$logFile = __DIR__ . '/adms_requests.log';
if (@file_exists($logFile) && @filesize($logFile) > 5 * 1024 * 1024) {
    @rename($logFile, __DIR__ . '/adms_requests.log.old');
}
$logLine = date('Y-m-d H:i:s') . ' | IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . ' | ' . $method . ' ' . $requestUri . ($input ? ' | Body: ' . substr($input, 0, 100) : '') . "\n";
@file_put_contents($logFile, $logLine, FILE_APPEND);

if (isset($_GET['view_logs'])) {
    header('Content-Type: text/plain; charset=utf-8');
    if (file_exists($logFile)) {
        echo file_get_contents($logFile);
    } else {
        echo "No logs yet.";
    }
    exit;
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 120);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$headers = [];
if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        $lower = strtolower($name);
        if ($lower === 'host' || $lower === 'content-length' || $lower === 'connection' || $lower === 'accept-encoding') {
            continue;
        }
        $headers[] = "$name: $value";
    }
}
// Force upstream identity encoding
$headers[] = 'Accept-Encoding: identity';

if (!empty($_SERVER['CONTENT_TYPE'])) {
    $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
}

if (!empty($input) || in_array($method, ['POST', 'PUT', 'PATCH'])) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_HEADER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    $errLine = date('Y-m-d H:i:s') . ' | CURL_FAIL: ' . $curlError . "\n";
    @file_put_contents($logFile, $errLine, FILE_APPEND);
    http_response_code(502);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Gateway Proxy Error: " . $curlError;
    exit;
}

$respHeaders = substr($response, 0, $headerSize);
$respBody = substr($response, $headerSize);

// Log response for diagnosis
$resLogLine = date('Y-m-d H:i:s') . ' | RES: ' . $httpCode . ' | Body: ' . trim(substr($respBody, 0, 80)) . "\n";
@file_put_contents($logFile, $resLogLine, FILE_APPEND);

http_response_code($httpCode ?: 200);

// CRITICAL HARDWARE COMPATIBILITY:
// Embedded biometric microcontrollers (eSSL MB160) CANNOT decompress gzip/brotli.
// We must send uncompressed ASCII text directly.
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-transform, no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
header('Content-Encoding: identity');
header('Content-Length: ' . strlen($respBody));

echo $respBody;

