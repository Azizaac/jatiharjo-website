<?php
/**
 * DESA JATIHARJO - FLAT-FILE JSON BACKEND HANDLER
 * No Database Required (Bebas MySQL / XAMPP / Laragon)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Require Admin Session
if (empty($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Akses ditolak. Silakan login terlebih dahulu.']);
    exit;
}

$dataFile = __DIR__ . '/data.json';
$uploadDir = __DIR__ . '/assets/images/uploads/';

// Helper to read data.json
function getJsonData($filePath) {
    if (!file_exists($filePath)) {
        return ['products' => [], 'settings' => []];
    }
    $content = file_get_contents($filePath);
    return json_decode($content, true) ?: ['products' => [], 'settings' => []];
}

// Helper to write data.json
function saveJsonData($filePath, $data) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return file_put_contents($filePath, $json) !== false;
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$data = getJsonData($dataFile);

header('Content-Type: application/json; charset=utf-8');

try {
    if ($action === 'save_product') {
        $id          = !empty($_POST['id']) ? (int)$_POST['id'] : null;
        $owner       = trim($_POST['owner'] ?? '');
        $title       = trim($_POST['title'] ?? '');
        $category    = trim($_POST['category'] ?? 'hasil-bumi');
        $description = trim($_POST['description'] ?? '');
        $price       = trim($_POST['price'] ?? '');
        $wa_number   = trim($_POST['wa_number'] ?? '');
        $image_url_input = trim($_POST['image_url_input'] ?? '');

        if (empty($owner) || empty($title) || empty($description) || empty($price)) {
            echo json_encode(['success' => false, 'error' => 'Semua kolom bertanda * wajib diisi.']);
            exit;
        }

        // Clean WA
        $wa_number = preg_replace('/[^0-9]/', '', $wa_number);
        if (empty($wa_number)) $wa_number = '6281234567890';

        // File upload handling
        $image_path = null;
        if (isset($_FILES['image_file']) && $_FILES['image_file']['error'] === UPLOAD_ERR_OK) {
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            $ext = strtolower(pathinfo($_FILES['image_file']['name'], PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
                $newFileName = 'umkm_' . time() . '_' . rand(100, 999) . '.' . $ext;
                if (move_uploaded_file($_FILES['image_file']['tmp_name'], $uploadDir . $newFileName)) {
                    $image_path = 'assets/images/uploads/' . $newFileName;
                }
            }
        }

        if (!$image_path && !empty($image_url_input)) {
            $image_path = $image_url_input;
        }

        if ($id) {
            // Edit product
            foreach ($data['products'] as &$p) {
                if ($p['id'] == $id) {
                    $p['owner'] = $owner;
                    $p['title'] = $title;
                    $p['category'] = $category;
                    $p['description'] = $description;
                    $p['price'] = $price;
                    $p['wa_number'] = $wa_number;
                    if ($image_path) $p['image_path'] = $image_path;
                    break;
                }
            }
            $msg = 'Produk UMKM berhasil diperbarui.';
        } else {
            // Add product
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

        saveJsonData($dataFile, $data);
        echo json_encode(['success' => true, 'message' => $msg]);
        exit;

    } elseif ($action === 'delete_product') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id > 0) {
            $data['products'] = array_values(array_filter($data['products'], function($p) use ($id) {
                return $p['id'] != $id;
            }));
            saveJsonData($dataFile, $data);
            echo json_encode(['success' => true, 'message' => 'Produk UMKM berhasil dihapus.']);
            exit;
        }
        echo json_encode(['success' => false, 'error' => 'ID tidak valid.']);
        exit;

    } elseif ($action === 'save_settings') {
        $keys = [
            'stat_sawah_val', 'stat_sawah_label',
            'stat_sapi_val', 'stat_sapi_label',
            'stat_umkm_val', 'stat_umkm_label',
            'stat_poktan_val', 'stat_poktan_label',
            'wa_kelompok_ternak', 'wa_kelompok_tani', 'wa_daftar_umkm'
        ];

        foreach ($keys as $k) {
            if (isset($_POST[$k])) {
                $val = trim((string)$_POST[$k]);
                if (strpos($k, 'wa_') === 0) {
                    $val = preg_replace('/[^0-9]/', '', $val);
                }
                $data['settings'][$k] = $val;
            }
        }

        saveJsonData($dataFile, $data);
        echo json_encode(['success' => true, 'message' => 'Pengaturan data berhasil diperbarui.']);
        exit;

    } else {
        echo json_encode(['success' => false, 'error' => 'Aksi tidak dikenali.']);
        exit;
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}
