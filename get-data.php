<?php
/**
 * DESA JATIHARJO - GET DATA API
 * Mengambil data dari Supabase PostgreSQL Database (Realtime DB).
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        putenv(trim($name) . '=' . trim($value, '"\''));
    }
}
$supabaseUrl = getenv('SUPABASE_URL');
$supabaseKey = getenv('SUPABASE_KEY');

if (!$supabaseUrl || !$supabaseKey) {
    echo json_encode(['products' => [], 'settings' => []]);
    exit;
}

// Fetch Products (Diurutkan berdasarkan ID)
$productsUrl = rtrim($supabaseUrl, '/') . '/rest/v1/products?select=*&order=id.asc';
$chP = curl_init($productsUrl);
curl_setopt($chP, CURLOPT_RETURNTRANSFER, true);
curl_setopt($chP, CURLOPT_TIMEOUT, 10);
curl_setopt($chP, CURLOPT_HTTPHEADER, [
    "apikey: $supabaseKey",
    "Authorization: Bearer $supabaseKey"
]);
$productsRes = curl_exec($chP);
curl_close($chP);
$products = json_decode($productsRes, true) ?: [];

// Memastikan error dari PostgREST (misal tabel belum ada) tidak merusak JSON response
if (isset($products['message'])) {
    $products = [];
}

// Fetch Settings
$settingsUrl = rtrim($supabaseUrl, '/') . '/rest/v1/settings?select=*';
$chS = curl_init($settingsUrl);
curl_setopt($chS, CURLOPT_RETURNTRANSFER, true);
curl_setopt($chS, CURLOPT_TIMEOUT, 10);
curl_setopt($chS, CURLOPT_HTTPHEADER, [
    "apikey: $supabaseKey",
    "Authorization: Bearer $supabaseKey"
]);
$settingsRes = curl_exec($chS);
curl_close($chS);
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
