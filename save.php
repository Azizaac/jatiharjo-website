<?php
/**
 * DESA JATIHARJO - SUPABASE BACKEND HANDLER
 * Menggunakan Supabase PostgreSQL (PostgREST) untuk CRUD.
 */

ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_strict_mode', 1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Content-Type: application/json; charset=utf-8');

// --- AUTH CHECK ---
if (empty($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Akses ditolak. Silakan login terlebih dahulu.']);
    exit;
}

if (!empty($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > 3600) {
    session_unset();
    session_destroy();
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Sesi Anda telah habis. Silakan login kembali.']);
    exit;
}

$submittedToken = $_POST['csrf_token'] ?? '';
if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $submittedToken)) {
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
$supabaseUrl = getenv('SUPABASE_URL');
$supabaseKey = getenv('SUPABASE_KEY');

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
    $url = trim($url);
    if (empty($url) || !preg_match('/^https?:\/\//i', $url) || preg_match('/^(javascript|vbscript|data):/i', $url) || strlen($url) > 2048) {
        return null;
    }
    return htmlspecialchars($url, ENT_QUOTES, 'UTF-8');
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
            // INSERT
            if (!$image_path) {
                $payload['image_path'] = 'assets/images/umkm.png';
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
