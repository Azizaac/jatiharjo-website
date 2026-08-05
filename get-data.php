<?php
/**
 * DESA JATIHARJO - PUBLIC DATA API (SUPABASE STORAGE EDITION)
 * Mengambil data dari Supabase Storage Bucket 'uploads' (data.json)
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

// 1. Load Environment Variables (.env)
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

$localFile = __DIR__ . '/data.json';
$content = null;

// 2. Fetch dari Supabase Storage jika dikonfigurasi
if ($supabaseUrl && $supabaseKey) {
    // Bucket uploads bersifat public, jadi kita bisa akses public URL
    $storageUrl = rtrim($supabaseUrl, '/') . '/storage/v1/object/public/uploads/data.json';
    
    // Gunakan cURL untuk menghindari masalah allow_url_fopen di Vercel
    $ch = curl_init($storageUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $content = $response;
    }
}

// 3. Fallback ke File Lokal jika Supabase gagal/belum di-upload
if (!$content && file_exists($localFile)) {
    $content = file_get_contents($localFile);
}

// 4. Parse & Sanitasi
$data = json_decode($content, true);
if (!is_array($data)) {
    echo json_encode(['products' => [], 'settings' => []]);
    exit;
}

$safe = ['products' => [], 'settings' => []];

if (!empty($data['products']) && is_array($data['products'])) {
    foreach ($data['products'] as $p) {
        $safe['products'][] = [
            'id'          => (int)($p['id'] ?? 0),
            'owner'       => strip_tags((string)($p['owner'] ?? '')),
            'title'       => strip_tags((string)($p['title'] ?? '')),
            'category'    => strip_tags((string)($p['category'] ?? '')),
            'description' => strip_tags((string)($p['description'] ?? '')),
            'price'       => strip_tags((string)($p['price'] ?? '')),
            'image_path'  => strip_tags((string)($p['image_path'] ?? '')),
            'wa_number'   => preg_replace('/[^0-9]/', '', $p['wa_number'] ?? '')
        ];
    }
}

$allowedSettingKeys = [
    'stat_sawah_val', 'stat_sawah_label',
    'stat_sapi_val', 'stat_sapi_label',
    'stat_umkm_val', 'stat_umkm_label',
    'stat_poktan_val', 'stat_poktan_label',
    'wa_kelompok_ternak', 'wa_kelompok_tani', 'wa_daftar_umkm'
];

if (!empty($data['settings']) && is_array($data['settings'])) {
    foreach ($allowedSettingKeys as $key) {
        if (isset($data['settings'][$key])) {
            $val = $data['settings'][$key];
            if (strpos($key, 'wa_') === 0) {
                $val = preg_replace('/[^0-9]/', '', $val);
            } else {
                $val = strip_tags((string)$val);
            }
            $safe['settings'][$key] = $val;
        }
    }
}

echo json_encode($safe, JSON_UNESCAPED_UNICODE);
