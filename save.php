<?php
/**
 * DESA JATIHARJO - SUPABASE BACKEND HANDLER
 * Menggunakan Supabase PostgreSQL (PostgREST) untuk CRUD.
 */

require_once __DIR__ . '/auth.php';

header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Content-Type: application/json; charset=utf-8');

// --- AUTH CHECK ---
if (!verify_stateless_session()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Akses ditolak. Silakan login terlebih dahulu.']);
    exit;
}

$submittedToken = $_POST['csrf_token'] ?? '';
if (!verify_csrf_token($submittedToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Token keamanan tidak valid. Silakan refresh halaman.']);
    exit;
}

define('ALLOWED_MIME_TYPES', ['image/jpeg', 'image/png', 'image/webp']);
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'webp']);
define('MAX_FILE_SIZE_BYTES', 2 * 1024 * 1024);

// --- LOAD ENV ---
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
    echo json_encode(['success' => false, 'error' => 'Supabase URL/Key belum dikonfigurasi.']);
    exit;
}

// --- HELPERS ---
function sanitizeText($value, $maxLength = 500) {
    $value = strip_tags(trim((string)$value));
    return mb_substr($value, 0, $maxLength);
}

function sanitizeImageUrl($url) {
    $url = trim((string)$url);
    if ($url === '' || strlen($url) > 2048) {
        return null;
    }
    // Hanya izinkan http/https, tolak javascript:/vbscript:/data:
    if (!preg_match('/^https?:\/\//i', $url) || preg_match('/^(javascript|vbscript|data):/i', $url)) {
        return null;
    }
    // Kembalikan URL mentah (tanpa htmlspecialchars) — escaping dilakukan di frontend
    // agar parameter query seperti &w=800 tidak rusak menjadi &amp;w=800 di DB.
    return $url;
}

// Update: helper upload ke Supabase Storage bucket "uploads", mengembalikan public URL atau null
function uploadToSupabaseStorage($fileInfo, $prefix, $supabaseUrl, $supabaseKey) {
    if (!isset($fileInfo) || $fileInfo['error'] !== UPLOAD_ERR_OK) return null;
    if ($fileInfo['size'] > MAX_FILE_SIZE_BYTES) return ['error' => 'Ukuran file terlalu besar. Maksimum 2MB.'];

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $detectedMime = finfo_file($finfo, $fileInfo['tmp_name']);
    finfo_close($finfo);
    $ext = strtolower(pathinfo($fileInfo['name'], PATHINFO_EXTENSION));

    if (!in_array($detectedMime, ALLOWED_MIME_TYPES, true) || !in_array($ext, ALLOWED_EXTENSIONS, true)) {
        return ['error' => 'Tipe file tidak diizinkan. Hanya JPG, PNG, dan WEBP yang diterima.'];
    }

    $newFileName = $prefix . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
    $fileContent = file_get_contents($fileInfo['tmp_name']);

    $endpoint = rtrim($supabaseUrl, '/') . '/storage/v1/object/uploads/' . $newFileName;
    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $fileContent);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: $supabaseKey",
        "Authorization: Bearer $supabaseKey",
        "Content-Type: $detectedMime",
        "x-upsert: true"
    ]);
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 || $httpCode === 201) {
        return ['url' => rtrim($supabaseUrl, '/') . '/storage/v1/object/public/uploads/' . $newFileName];
    }
    return ['error' => 'Gagal mengupload gambar ke Supabase.'];
}

function supabaseUpsertSettings($payloads, $supabaseUrl, $supabaseKey) {
    $dbEndpoint = rtrim($supabaseUrl, '/') . '/rest/v1/settings';
    $ch = curl_init($dbEndpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payloads));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: $supabaseKey",
        "Authorization: Bearer $supabaseKey",
        "Content-Type: application/json",
        "Prefer: resolution=merge-duplicates"
    ]);
    curl_setopt($ch, CURLOPT_ENCODING, "");
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $httpCode;
}

function supabaseGetSettingValue($key, $supabaseUrl, $supabaseKey) {
    $endpoint = rtrim($supabaseUrl, '/') . '/rest/v1/settings?key=eq.' . urlencode($key) . '&select=value';
    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_ENCODING, "");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: $supabaseKey",
        "Authorization: Bearer $supabaseKey"
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($res, true);
    if (is_array($data) && count($data) > 0 && isset($data[0]['value'])) return $data[0]['value'];
    return null;
}

$action = $_POST['action'] ?? '';

try {
    if ($action === 'save_product') {
        $id          = !empty($_POST['id']) ? (int)$_POST['id'] : null;
        $owner       = sanitizeText($_POST['owner'] ?? '', 200);
        $title       = sanitizeText($_POST['title'] ?? '', 200);
        $category    = sanitizeText($_POST['category'] ?? 'hasil-bumi', 50);
        $description = sanitizeText($_POST['description'] ?? '', 1000);
        $price       = sanitizeText($_POST['price'] ?? '', 100);
        $wa_number   = preg_replace('/[^0-9]/', '', $_POST['wa_number'] ?? '');
        $image_url_input = sanitizeImageUrl($_POST['image_url_input'] ?? '');

        if (empty($owner) || empty($title) || empty($description) || empty($price)) {
            echo json_encode(['success' => false, 'error' => 'Semua kolom bertanda * wajib diisi.']);
            exit;
        }

        $validCategories = ['hasil-bumi', 'makanan', 'kerajinan'];
        if (!in_array($category, $validCategories, true)) $category = 'hasil-bumi';

        if (empty($wa_number)) $wa_number = '6281234567890';
        if (strlen($wa_number) > 15) $wa_number = substr($wa_number, 0, 15);

        $image_path = null;
        if (isset($_FILES['image_file']) && $_FILES['image_file']['error'] === UPLOAD_ERR_OK) {
            if ($_FILES['image_file']['size'] > MAX_FILE_SIZE_BYTES) {
                echo json_encode(['success' => false, 'error' => 'Ukuran file terlalu besar. Maksimum 2MB.']);
                exit;
            }

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $detectedMime = finfo_file($finfo, $_FILES['image_file']['tmp_name']);
            finfo_close($finfo);
            $ext = strtolower(pathinfo($_FILES['image_file']['name'], PATHINFO_EXTENSION));

            if (!in_array($detectedMime, ALLOWED_MIME_TYPES, true) || !in_array($ext, ALLOWED_EXTENSIONS, true)) {
                echo json_encode(['success' => false, 'error' => 'Tipe file tidak diizinkan. Hanya JPG, PNG, dan WEBP yang diterima.']);
                exit;
            }

            $newFileName = 'umkm_' . bin2hex(random_bytes(8)) . '.' . $ext;
            $fileContent = file_get_contents($_FILES['image_file']['tmp_name']);

            // Upload to Supabase Storage
            $endpoint = rtrim($supabaseUrl, '/') . '/storage/v1/object/uploads/' . $newFileName;
            $ch = curl_init($endpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
            curl_setopt($ch, CURLOPT_POSTFIELDS, $fileContent);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "apikey: $supabaseKey",
                "Authorization: Bearer $supabaseKey",
                "Content-Type: $detectedMime",
                "x-upsert: true"
            ]);
            curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 || $httpCode === 201) {
                $image_path = rtrim($supabaseUrl, '/') . '/storage/v1/object/public/uploads/' . $newFileName;
            } else {
                echo json_encode(['success' => false, 'error' => 'Gagal mengupload gambar ke Supabase.']);
                exit;
            }
        }

        if (!$image_path && !empty($image_url_input)) {
            $image_path = $image_url_input;
        }

        // Siapkan Payload Database
        $payload = [
            'owner'       => $owner,
            'title'       => $title,
            'category'    => $category,
            'description' => $description,
            'price'       => $price,
            'wa_number'   => $wa_number
        ];
        if ($image_path) {
            $payload['image_path'] = $image_path;
        }

        if ($id) {
            // UPDATE
            $dbEndpoint = rtrim($supabaseUrl, '/') . '/rest/v1/products?id=eq.' . $id;
            $ch = curl_init($dbEndpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "apikey: $supabaseKey",
                "Authorization: Bearer $supabaseKey",
                "Content-Type: application/json",
                "Prefer: return=minimal"
            ]);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300) {
                echo json_encode(['success' => true, 'message' => 'Produk UMKM berhasil diperbarui.']);
            } else {
                echo json_encode(['success' => false, 'error' => 'Gagal mengupdate database Supabase (Kode: '.$httpCode.').']);
            }
            exit;
        } else {
            // Mencegah error 409 Conflict akibat sequence Postgres tidak sinkron
            // dengan mencari ID terbesar dan menambahkannya 1 secara manual.
            $maxIdEndpoint = rtrim($supabaseUrl, '/') . '/rest/v1/products?select=id&order=id.desc&limit=1';
            $chMax = curl_init($maxIdEndpoint);
            curl_setopt($chMax, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($chMax, CURLOPT_HTTPHEADER, [
                "apikey: $supabaseKey",
                "Authorization: Bearer $supabaseKey"
            ]);
            curl_setopt($chMax, CURLOPT_ENCODING, ""); // Auto-GZIP Compression
            $maxRes = curl_exec($chMax);
            curl_close($chMax);
            
            $nextId = 1;
            $maxData = json_decode($maxRes, true);
            if (is_array($maxData) && count($maxData) > 0 && isset($maxData[0]['id'])) {
                $nextId = (int)$maxData[0]['id'] + 1;
            }
            $payload['id'] = $nextId;
            if (!isset($payload['image_path'])) {
                $payload['image_path'] = 'assets/images/umkm.webp';
            }

            $dbEndpoint = rtrim($supabaseUrl, '/') . '/rest/v1/products';
            $ch = curl_init($dbEndpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "apikey: $supabaseKey",
                "Authorization: Bearer $supabaseKey",
                "Content-Type: application/json",
                "Prefer: return=minimal"
            ]);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300) {
                echo json_encode(['success' => true, 'message' => 'Produk UMKM baru berhasil ditambahkan.']);
            } else {
                echo json_encode(['success' => false, 'error' => 'Gagal menyimpan ke database Supabase (Kode: '.$httpCode.').']);
            }
            exit;
        }

    } elseif ($action === 'delete_product') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id > 0) {
            $dbEndpoint = rtrim($supabaseUrl, '/') . '/rest/v1/products?id=eq.' . $id;
            $ch = curl_init($dbEndpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "apikey: $supabaseKey",
                "Authorization: Bearer $supabaseKey",
                "Content-Type: application/json"
            ]);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300) {
                echo json_encode(['success' => true, 'message' => 'Produk UMKM berhasil dihapus.']);
            } else {
                echo json_encode(['success' => false, 'error' => 'Gagal menghapus produk dari database (Kode: '.$httpCode.').']);
            }
            exit;
        }
        echo json_encode(['success' => false, 'error' => 'ID tidak valid.']);
        exit;

    } elseif ($action === 'save_settings') {
        $allowedNumericKeys = ['stat_sawah_val', 'stat_sapi_val', 'stat_umkm_val', 'stat_poktan_val'];
        $allowedTextKeys = ['stat_sawah_label', 'stat_sapi_label', 'stat_umkm_label', 'stat_poktan_label'];
        $allowedWaKeys = ['wa_kelompok_ternak', 'wa_kelompok_tani', 'wa_daftar_umkm'];
        $allowedJsonKeys = ['pertanian_data', 'peternakan_data'];

        $payloads = [];

        foreach ($allowedNumericKeys as $k) {
            if (isset($_POST[$k])) {
                $val = (int)$_POST[$k];
                if ($val < 0) $val = 0;
                $payloads[] = ['key' => $k, 'value' => (string)$val];
            }
        }
        foreach ($allowedTextKeys as $k) {
            if (isset($_POST[$k])) {
                $payloads[] = ['key' => $k, 'value' => sanitizeText($_POST[$k], 100)];
            }
        }
        foreach ($allowedWaKeys as $k) {
            if (isset($_POST[$k])) {
                $val = preg_replace('/[^0-9]/', '', $_POST[$k]);
                if (strlen($val) > 15) $val = substr($val, 0, 15);
                $payloads[] = ['key' => $k, 'value' => $val];
            }
        }
        foreach ($allowedJsonKeys as $k) {
            if (isset($_POST[$k])) {
                // Ensure it is a valid JSON string before saving
                $val = trim($_POST[$k]);
                if (!empty($val) && json_decode($val) !== null) {
                    $payloads[] = ['key' => $k, 'value' => $val];
                }
            }
        }

        if (count($payloads) > 0) {
            $dbEndpoint = rtrim($supabaseUrl, '/') . '/rest/v1/settings';
            $ch = curl_init($dbEndpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payloads));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "apikey: $supabaseKey",
                "Authorization: Bearer $supabaseKey",
                "Content-Type: application/json",
                "Prefer: resolution=merge-duplicates"
            ]);
            curl_setopt($ch, CURLOPT_ENCODING, ""); // Auto-GZIP Compression
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300) {
                echo json_encode(['success' => true, 'message' => 'Pengaturan data berhasil diperbarui.']);
            } else {
                echo json_encode(['success' => false, 'error' => 'Gagal menyimpan pengaturan ke database (Kode: '.$httpCode.').']);
            }
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'Tidak ada pengaturan yang diubah.']);
        exit;

    } elseif ($action === 'save_gallery') {
        // Update: CRUD tabel gallery (Supabase). Kolom: title, category, date, description, image_path
        $id          = !empty($_POST['id']) ? (int)$_POST['id'] : null;
        $title       = sanitizeText($_POST['title'] ?? '', 200);
        $category    = sanitizeText($_POST['category'] ?? 'Kegiatan', 50);
        $date        = sanitizeText($_POST['date'] ?? '', 50);
        $description = sanitizeText($_POST['description'] ?? '', 1000);
        $image_url_input = sanitizeImageUrl($_POST['image_url_input'] ?? '');

        if (empty($title)) {
            echo json_encode(['success' => false, 'error' => 'Judul foto dokumentasi wajib diisi.']);
            exit;
        }

        $validGalleryCats = ['Kegiatan', 'Pertanian', 'Peternakan', 'UMKM', 'Lingkungan'];
        if (!in_array($category, $validGalleryCats, true)) $category = 'Kegiatan';

        $image_path = null;
        if (isset($_FILES['image_file']) && $_FILES['image_file']['error'] === UPLOAD_ERR_OK) {
            $up = uploadToSupabaseStorage($_FILES['image_file'], 'gallery', $supabaseUrl, $supabaseKey);
            if (!is_array($up) || isset($up['error'])) {
                echo json_encode(['success' => false, 'error' => (is_array($up) && isset($up['error'])) ? $up['error'] : 'Gagal mengupload gambar ke Supabase.']);
                exit;
            }
            $image_path = $up['url'];
        }
        if (!$image_path && !empty($image_url_input)) $image_path = $image_url_input;

        $payload = [
            'title'       => $title,
            'category'    => $category,
            'date'        => $date,
            'description' => $description
        ];
        if ($image_path) $payload['image_path'] = $image_path;

        if ($id) {
            $dbEndpoint = rtrim($supabaseUrl, '/') . '/rest/v1/gallery?id=eq.' . $id;
            $ch = curl_init($dbEndpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "apikey: $supabaseKey",
                "Authorization: Bearer $supabaseKey",
                "Content-Type: application/json",
                "Prefer: return=minimal"
            ]);
            curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($httpCode >= 200 && $httpCode < 300) {
                echo json_encode(['success' => true, 'message' => 'Foto galeri berhasil diperbarui.']);
            } else {
                echo json_encode(['success' => false, 'error' => 'Gagal mengupdate galeri (Kode: '.$httpCode.'). Pastikan tabel "gallery" sudah dibuat di Supabase.']);
            }
            exit;
        } else {
            $maxIdEndpoint = rtrim($supabaseUrl, '/') . '/rest/v1/gallery?select=id&order=id.desc&limit=1';
            $chMax = curl_init($maxIdEndpoint);
            curl_setopt($chMax, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($chMax, CURLOPT_ENCODING, "");
            curl_setopt($chMax, CURLOPT_HTTPHEADER, [
                "apikey: $supabaseKey",
                "Authorization: Bearer $supabaseKey"
            ]);
            $maxRes = curl_exec($chMax);
            curl_close($chMax);
            $nextId = 1;
            $maxData = json_decode($maxRes, true);
            if (is_array($maxData) && count($maxData) > 0 && isset($maxData[0]['id'])) {
                $nextId = (int)$maxData[0]['id'] + 1;
            }
            $payload['id'] = $nextId;
            if (!isset($payload['image_path'])) $payload['image_path'] = 'assets/images/hero.webp';

            $dbEndpoint = rtrim($supabaseUrl, '/') . '/rest/v1/gallery';
            $ch = curl_init($dbEndpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "apikey: $supabaseKey",
                "Authorization: Bearer $supabaseKey",
                "Content-Type: application/json",
                "Prefer: return=minimal"
            ]);
            curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($httpCode >= 200 && $httpCode < 300) {
                echo json_encode(['success' => true, 'message' => 'Foto dokumentasi baru berhasil ditambahkan.']);
            } else {
                echo json_encode(['success' => false, 'error' => 'Gagal menyimpan galeri (Kode: '.$httpCode.'). Pastikan tabel "gallery" sudah dibuat di Supabase.']);
            }
            exit;
        }

    } elseif ($action === 'delete_gallery') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id > 0) {
            $dbEndpoint = rtrim($supabaseUrl, '/') . '/rest/v1/gallery?id=eq.' . $id;
            $ch = curl_init($dbEndpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "apikey: $supabaseKey",
                "Authorization: Bearer $supabaseKey",
                "Content-Type: application/json"
            ]);
            curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($httpCode >= 200 && $httpCode < 300) {
                echo json_encode(['success' => true, 'message' => 'Foto galeri berhasil dihapus.']);
            } else {
                echo json_encode(['success' => false, 'error' => 'Gagal menghapus galeri (Kode: '.$httpCode.').']);
            }
            exit;
        }
        echo json_encode(['success' => false, 'error' => 'ID foto tidak valid.']);
        exit;

    } elseif ($action === 'save_carousel_images') {
        // Update: simpan 3 slot gambar carousel hero ke Supabase settings.hero_images (JSON array)
        $carouselType = trim($_POST['carousel_type'] ?? '');
        if ($carouselType !== 'hero') {
            echo json_encode(['success' => false, 'error' => 'Jenis carousel tidak valid. Saat ini hanya hero yang dikelola di tab Carousel.']);
            exit;
        }
        $dataKey = 'hero_images';

        $currentRaw = supabaseGetSettingValue($dataKey, $supabaseUrl, $supabaseKey);
        $current = ['', '', ''];
        if ($currentRaw) {
            $decoded = json_decode($currentRaw, true);
            if (is_array($decoded)) {
                for ($i = 0; $i < 3; $i++) $current[$i] = $decoded[$i] ?? '';
            }
        }
        $slots = $current;

        for ($i = 0; $i <= 2; $i++) {
            $fileKey = "image_file_slot_{$i}";
            $pathKey = "slot_{$i}";
            $deleteKey = "delete_slot_{$i}";

            if (!empty($_POST[$deleteKey])) { $slots[$i] = ''; continue; }

            if (isset($_FILES[$fileKey]) && $_FILES[$fileKey]['error'] === UPLOAD_ERR_OK) {
                $up = uploadToSupabaseStorage($_FILES[$fileKey], 'hero', $supabaseUrl, $supabaseKey);
                if (!is_array($up) || isset($up['error'])) {
                    echo json_encode(['success' => false, 'error' => (is_array($up) && isset($up['error'])) ? $up['error'] : 'Gagal mengupload gambar ke Supabase.']);
                    exit;
                }
                $slots[$i] = $up['url'];
            } elseif (isset($_POST[$pathKey])) {
                $v = trim((string)$_POST[$pathKey]);
                // Izinkan URL https atau path relatif assets/, tolak javascript:/data:
                if ($v === '' || preg_match('/^(javascript|vbscript|data):/i', $v)) {
                    if ($v !== '' && preg_match('/^(javascript|vbscript|data):/i', $v)) continue;
                    $slots[$i] = $v;
                } elseif (preg_match('/^https?:\/\//i', $v) || preg_match('/^assets\//', $v)) {
                    $slots[$i] = $v;
                }
            }
        }

        $httpCode = supabaseUpsertSettings([['key' => $dataKey, 'value' => json_encode(array_values($slots))]], $supabaseUrl, $supabaseKey);
        if ($httpCode >= 200 && $httpCode < 300) {
            echo json_encode(['success' => true, 'message' => 'Gambar carousel hero berhasil diperbarui.', 'images' => array_values($slots)]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Gagal menyimpan carousel (Kode: '.$httpCode.').']);
        }
        exit;

    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Aksi tidak dikenali.']);
        exit;
    }
} catch (Exception $e) {
    error_log('save.php error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Terjadi kesalahan internal. Silakan coba lagi.']);
    exit;
}
