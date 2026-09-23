<?php
/**
 * SUPABASE KEEP-ALIVE
 * Endpoint ini dipanggil oleh Vercel Cron Job setiap 3 hari
 * untuk mencegah Supabase free tier auto-pause karena tidak aktif.
 */

$supabaseUrl = getenv('SUPABASE_URL') ?: $_ENV['SUPABASE_URL'] ?? $_SERVER['SUPABASE_URL'] ?? '';
$supabaseKey = getenv('SUPABASE_KEY') ?: $_ENV['SUPABASE_KEY'] ?? $_SERVER['SUPABASE_KEY'] ?? '';

header('Content-Type: application/json');

if (!$supabaseUrl || !$supabaseKey) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'SUPABASE_URL / SUPABASE_KEY belum dikonfigurasi di environment Vercel.']);
    exit;
}

// Ping tabel products (ambil 1 baris saja)
$endpoint = rtrim($supabaseUrl, '/') . '/rest/v1/products?select=id&limit=1';

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_HTTPHEADER     => [
        "apikey: $supabaseKey",
        "Authorization: Bearer $supabaseKey",
    ],
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $curlError]);
    exit;
}

if ($httpCode >= 200 && $httpCode < 300) {
    echo json_encode([
        'ok'   => true,
        'msg'  => 'Supabase berhasil di-ping, database tetap aktif.',
        'time' => date('Y-m-d H:i:s T'),
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'ok'       => false,
        'httpCode' => $httpCode,
        'response' => $response,
    ]);
}
