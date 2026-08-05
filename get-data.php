<?php
/**
 * DESA JATIHARJO - GET DATA API
 * Mengambil data dari Supabase PostgreSQL Database (Realtime DB).
 */
header('Content-Type: application/json; charset=utf-8');
// Izinkan Vercel CDN mencache data publik selama 60 detik untuk performa super cepat,
// tapi tetap izinkan bypass jika URL mengandung query string unik (seperti di admin.js)
header('Cache-Control: public, s-maxage=60, stale-while-revalidate=300');

$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        putenv(trim($name) . '=' . trim($value, '"\''));
    }
}
$supabaseUrl = getenv('SUPABASE_URL') ?: $_ENV['SUPABASE_URL'] ?? $_SERVER['SUPABASE_URL'] ?? '';
$supabaseKey = getenv('SUPABASE_KEY') ?: $_ENV['SUPABASE_KEY'] ?? $_SERVER['SUPABASE_KEY'] ?? '';

if (!$supabaseUrl || !$supabaseKey) {
    echo json_encode(['products' => [], 'settings' => []]);
    exit;
}

// Siapkan Multiple cURL untuk Parallel Requests
$mh = curl_multi_init();

// Request 1: Fetch Products
$productsUrl = rtrim($supabaseUrl, '/') . '/rest/v1/products?select=*&order=id.asc';
$chP = curl_init($productsUrl);
curl_setopt($chP, CURLOPT_RETURNTRANSFER, true);
curl_setopt($chP, CURLOPT_TIMEOUT, 10);
curl_setopt($chP, CURLOPT_ENCODING, ""); // Auto-GZIP Compression
curl_setopt($chP, CURLOPT_HTTPHEADER, [
    "apikey: $supabaseKey",
    "Authorization: Bearer $supabaseKey"
]);
curl_multi_add_handle($mh, $chP);

// Request 2: Fetch Settings
$settingsUrl = rtrim($supabaseUrl, '/') . '/rest/v1/settings?select=*';
$chS = curl_init($settingsUrl);
curl_setopt($chS, CURLOPT_RETURNTRANSFER, true);
curl_setopt($chS, CURLOPT_TIMEOUT, 10);
curl_setopt($chS, CURLOPT_ENCODING, ""); // Auto-GZIP Compression
curl_setopt($chS, CURLOPT_HTTPHEADER, [
    "apikey: $supabaseKey",
    "Authorization: Bearer $supabaseKey"
]);
curl_multi_add_handle($mh, $chS);

// Eksekusi secara paralel
$active = null;
do {
    $mrc = curl_multi_exec($mh, $active);
} while ($mrc == CURLM_CALL_MULTI_PERFORM);

while ($active && $mrc == CURLM_OK) {
    if (curl_multi_select($mh) == -1) {
        usleep(100);
    }
    do {
        $mrc = curl_multi_exec($mh, $active);
    } while ($mrc == CURLM_CALL_MULTI_PERFORM);
}

// Ambil hasil respons
$productsRes = curl_multi_getcontent($chP);
$settingsRes = curl_multi_getcontent($chS);

// Bersihkan memory cURL
curl_multi_remove_handle($mh, $chP);
curl_multi_remove_handle($mh, $chS);
curl_multi_close($mh);

$products = json_decode($productsRes, true) ?: [];

// Memastikan error dari PostgREST tidak merusak JSON response
if (isset($products['message'])) {
    $products = [];
}

$settingsRaw = json_decode($settingsRes, true) ?: [];

$settings = [];
if (!isset($settingsRaw['message']) && is_array($settingsRaw)) {
    foreach ($settingsRaw as $row) {
        if (isset($row['key']) && isset($row['value'])) {
            $settings[$row['key']] = $row['value'];
        }
    }
}

echo json_encode([
    'products' => $products,
    'settings' => $settings
]);
