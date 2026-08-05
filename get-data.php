<?php
/**
 * DESA JATIHARJO - PUBLIC DATA API
 * Serves read-only data.json content for the frontend (public website).
 * data.json is blocked via .htaccess, this PHP endpoint provides safe access.
 *
 * SECURITY:
 * - Read-only (no write operations)
 * - Outputs only the expected data structure
 * - Security headers set
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');


$dataFile = __DIR__ . '/data.json';

if (!file_exists($dataFile)) {
    echo json_encode(['products' => [], 'settings' => []]);
    exit;
}

$content = file_get_contents($dataFile);
$data    = json_decode($content, true);

if (!is_array($data)) {
    echo json_encode(['products' => [], 'settings' => []]);
    exit;
}

// Only expose expected keys (no internal fields leak)
$safe = [
    'products' => [],
    'settings' => []
];

// Sanitize products for public output
if (!empty($data['products']) && is_array($data['products'])) {
    foreach ($data['products'] as $p) {
        // Strip HTML tags from text fields — textContent in JS handles XSS display
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

// Sanitize settings for public output
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
            // WA numbers: digits only
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
