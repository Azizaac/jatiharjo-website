<?php
/**
 * DESA JATIHARJO - FLAT-FILE JSON BACKEND HANDLER
 * No Database Required (Bebas MySQL / XAMPP / Laragon)
 *
 * SECURITY HARDENING:
 * - Session-based auth check
 * - CSRF token validation
 * - MIME type check for file upload (not just extension)
 * - image_url_input whitelist validation
 * - File size limit enforced
 * - Path traversal prevention
 * - Input length limits
 * - Security headers
 */

// --- Secure Session Configuration ---
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_strict_mode', 1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Security headers
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

// --- SESSION TIMEOUT (1 hour) ---
if (!empty($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > 3600) {
    session_unset();
    session_destroy();
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Sesi Anda telah habis. Silakan login kembali.']);
    exit;
}

// --- CSRF VALIDATION ---
$submittedToken = $_POST['csrf_token'] ?? '';
if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $submittedToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Token keamanan tidak valid. Silakan refresh halaman.']);
    exit;
}

$dataFile  = __DIR__ . '/data.json';
$uploadDir = __DIR__ . '/assets/images/uploads/';

// --- ALLOWED MIME TYPES FOR UPLOAD ---
define('ALLOWED_MIME_TYPES', ['image/jpeg', 'image/png', 'image/webp']);
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'webp']);
define('MAX_FILE_SIZE_BYTES', 2 * 1024 * 1024); // 2 MB

// Helper to read data.json
function getJsonData($filePath) {
    if (!file_exists($filePath)) {
        return ['products' => [], 'settings' => []];
    }
    $content = file_get_contents($filePath);
    return json_decode($content, true) ?: ['products' => [], 'settings' => []];
}

// Helper to write data.json atomically
function saveJsonData($filePath, $data) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    // Write to temp file first, then rename (atomic write to prevent corruption)
    $tmpFile = $filePath . '.tmp';
    if (file_put_contents($tmpFile, $json, LOCK_EX) === false) {
        return false;
    }
    return rename($tmpFile, $filePath);
}

// Sanitize text input: strip tags, limit length
function sanitizeText($value, $maxLength = 500) {
    $value = strip_tags(trim((string)$value));
    return mb_substr($value, 0, $maxLength);
}

// Validate and sanitize image URL — only allow http/https with no JS
function sanitizeImageUrl($url) {
    $url = trim($url);
    if (empty($url)) return null;
    // Only allow http/https URLs
    if (!preg_match('/^https?:\/\//i', $url)) return null;
    // Reject data URIs, javascript:, vbscript:
    if (preg_match('/^(javascript|vbscript|data):/i', $url)) return null;
    // Basic URL validation
    $parsed = parse_url($url);
    if (!$parsed || !isset($parsed['host'])) return null;
    // Max length
    if (strlen($url) > 2048) return null;
    return htmlspecialchars($url, ENT_QUOTES, 'UTF-8');
}

$action = $_POST['action'] ?? '';
$data   = getJsonData($dataFile);

try {
    // ==================== SAVE PRODUCT ====================
    if ($action === 'save_product') {
        $id          = !empty($_POST['id']) ? (int)$_POST['id'] : null;
        $owner       = sanitizeText($_POST['owner'] ?? '', 200);
        $title       = sanitizeText($_POST['title'] ?? '', 200);
        $category    = sanitizeText($_POST['category'] ?? 'hasil-bumi', 50);
        $description = sanitizeText($_POST['description'] ?? '', 1000);
        $price       = sanitizeText($_POST['price'] ?? '', 100);
        $wa_number   = preg_replace('/[^0-9]/', '', $_POST['wa_number'] ?? '');
        $image_url_input = sanitizeImageUrl($_POST['image_url_input'] ?? '');

        // Validate required fields
        if (empty($owner) || empty($title) || empty($description) || empty($price)) {
            echo json_encode(['success' => false, 'error' => 'Semua kolom bertanda * wajib diisi.']);
            exit;
        }

        // Validate category whitelist
        $validCategories = ['hasil-bumi', 'makanan', 'kerajinan'];
        if (!in_array($category, $validCategories, true)) {
            $category = 'hasil-bumi';
        }

        // Validate WA number
        if (empty($wa_number)) $wa_number = '6281234567890';
        if (strlen($wa_number) > 15) $wa_number = substr($wa_number, 0, 15);

        // --- FILE UPLOAD HANDLING ---
        $image_path = null;
        if (isset($_FILES['image_file']) && $_FILES['image_file']['error'] === UPLOAD_ERR_OK) {

            // Check file size
            if ($_FILES['image_file']['size'] > MAX_FILE_SIZE_BYTES) {
                echo json_encode(['success' => false, 'error' => 'Ukuran file terlalu besar. Maksimum 2MB.']);
                exit;
            }

            // Check MIME type using finfo (not just extension — prevents extension spoofing)
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $detectedMime = finfo_file($finfo, $_FILES['image_file']['tmp_name']);
            finfo_close($finfo);

            $ext = strtolower(pathinfo($_FILES['image_file']['name'], PATHINFO_EXTENSION));

            if (!in_array($detectedMime, ALLOWED_MIME_TYPES, true) || !in_array($ext, ALLOWED_EXTENSIONS, true)) {
                echo json_encode(['success' => false, 'error' => 'Tipe file tidak diizinkan. Hanya JPG, PNG, dan WEBP yang diterima.']);
                exit;
            }

            // Create upload directory if needed
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            // Generate safe random filename (no user-controlled characters)
            $newFileName = 'umkm_' . bin2hex(random_bytes(8)) . '.' . $ext;
            $destination = $uploadDir . $newFileName;

            // Prevent path traversal
            $realUploadDir = realpath($uploadDir);
            $realDest      = realpath(dirname($destination)) . DIRECTORY_SEPARATOR . basename($destination);
            if (strpos($realDest, $realUploadDir) !== 0) {
                echo json_encode(['success' => false, 'error' => 'Path file tidak valid.']);
                exit;
            }

            if (move_uploaded_file($_FILES['image_file']['tmp_name'], $destination)) {
                $image_path = 'assets/images/uploads/' . $newFileName;
            }
        }

        // Fallback to URL input (already sanitized above)
        if (!$image_path && !empty($image_url_input)) {
            $image_path = $image_url_input;
        }

        // Save product
        if ($id) {
            // Edit existing product
            $found = false;
            foreach ($data['products'] as &$p) {
                if ($p['id'] == $id) {
                    $p['owner']       = $owner;
                    $p['title']       = $title;
                    $p['category']    = $category;
                    $p['description'] = $description;
                    $p['price']       = $price;
                    $p['wa_number']   = $wa_number;
                    if ($image_path) $p['image_path'] = $image_path;
                    $found = true;
                    break;
                }
            }
            unset($p);
            if (!$found) {
                echo json_encode(['success' => false, 'error' => 'Produk tidak ditemukan.']);
                exit;
            }
            $msg = 'Produk UMKM berhasil diperbarui.';
        } else {
            // Add new product
            $newId = 1;
            foreach ($data['products'] as $p) {
                if ($p['id'] >= $newId) $newId = $p['id'] + 1;
            }
            $data['products'][] = [
                'id'          => $newId,
                'owner'       => $owner,
                'title'       => $title,
                'category'    => $category,
                'description' => $description,
                'price'       => $price,
                'image_path'  => $image_path ?: 'assets/images/umkm.png',
                'wa_number'   => $wa_number
            ];
            $msg = 'Produk UMKM baru berhasil ditambahkan.';
        }

        if (!saveJsonData($dataFile, $data)) {
            echo json_encode(['success' => false, 'error' => 'Gagal menyimpan data. Periksa izin file data.json.']);
            exit;
        }

        echo json_encode(['success' => true, 'message' => $msg]);
        exit;

    // ==================== DELETE PRODUCT ====================
    } elseif ($action === 'delete_product') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id > 0) {
            $prevCount = count($data['products']);
            $data['products'] = array_values(array_filter($data['products'], function($p) use ($id) {
                return $p['id'] != $id;
            }));
            if (count($data['products']) === $prevCount) {
                echo json_encode(['success' => false, 'error' => 'Produk tidak ditemukan.']);
                exit;
            }
            if (!saveJsonData($dataFile, $data)) {
                echo json_encode(['success' => false, 'error' => 'Gagal menghapus data.']);
                exit;
            }
            echo json_encode(['success' => true, 'message' => 'Produk UMKM berhasil dihapus.']);
            exit;
        }
        echo json_encode(['success' => false, 'error' => 'ID tidak valid.']);
        exit;

    // ==================== SAVE SETTINGS ====================
    } elseif ($action === 'save_settings') {
        $allowedNumericKeys = [
            'stat_sawah_val', 'stat_sapi_val', 'stat_umkm_val', 'stat_poktan_val'
        ];
        $allowedTextKeys = [
            'stat_sawah_label', 'stat_sapi_label', 'stat_umkm_label', 'stat_poktan_label'
        ];
        $allowedWaKeys = [
            'wa_kelompok_ternak', 'wa_kelompok_tani', 'wa_daftar_umkm'
        ];

        foreach ($allowedNumericKeys as $k) {
            if (isset($_POST[$k])) {
                $val = (int)$_POST[$k];
                if ($val < 0) $val = 0;
                $data['settings'][$k] = (string)$val;
            }
        }

        foreach ($allowedTextKeys as $k) {
            if (isset($_POST[$k])) {
                $data['settings'][$k] = sanitizeText($_POST[$k], 100);
            }
        }

        foreach ($allowedWaKeys as $k) {
            if (isset($_POST[$k])) {
                $val = preg_replace('/[^0-9]/', '', $_POST[$k]);
                if (strlen($val) > 15) $val = substr($val, 0, 15);
                $data['settings'][$k] = $val;
            }
        }

        if (!saveJsonData($dataFile, $data)) {
            echo json_encode(['success' => false, 'error' => 'Gagal menyimpan pengaturan.']);
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'Pengaturan data berhasil diperbarui.']);
        exit;

    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Aksi tidak dikenali.']);
        exit;
    }
} catch (Exception $e) {
    // Don't expose internal error messages to client
    error_log('save.php error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Terjadi kesalahan internal. Silakan coba lagi.']);
    exit;
}
