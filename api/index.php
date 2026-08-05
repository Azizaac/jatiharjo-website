<?php
/**
 * VERCEL PHP ROUTER
 * Routes all PHP requests from the root to their respective files
 * since Vercel requires serverless functions to be in /api/
 */

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH);

// Default to index.php for directory roots
if (empty($path) || substr($path, -1) === '/') {
    $path .= 'index.php';
}

// Security: Prevent directory traversal
$normalizedPath = basename($path) === $path ? $path : ltrim($path, '/');
$targetFile = realpath(__DIR__ . '/../' . $normalizedPath);
$rootDir = realpath(__DIR__ . '/../');

// Ensure target exists and is within the root directory (prevent LFI)
if ($targetFile && is_dir($targetFile)) {
    $targetFile = realpath($targetFile . '/index.php');
}

if ($targetFile && is_file($targetFile) && strpos($targetFile, $rootDir) === 0) {
    $extension = pathinfo($targetFile, PATHINFO_EXTENSION);
    
    if ($extension === 'php') {
        // Essential to ensure relative includes/requires in the target script work
        chdir(dirname($targetFile));
        
        // Execute the script
        require $targetFile;
    } else {
        // Serve static files that somehow bypassed Vercel's edge network
        $mime = mime_content_type($targetFile);
        if ($mime) header("Content-Type: $mime");
        readfile($targetFile);
    }
} else {
    http_response_code(404);
    echo "404 Not Found";
}
