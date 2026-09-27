<?php
// ============================================================
// SOKOLO TECH - ID CARD MODULE
// Version 3.6 - Enterprise Edition
// ============================================================

if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'sokolo_db');
define('DB_USER', $_ENV['DB_USER'] ?? 'sokolo_sokolo');
define('DB_PASS', $_ENV['DB_PASS'] ?? 'sokolo@2000');
define('APP_NAME', 'SOKOLO TECH');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id']) || !isset($_SESSION['company_id'])) {
    header('Location: index.php?page=login');
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

function e($str) { return htmlspecialchars($str ?? '', ENT_QUOTES, 'UTF-8'); }

$company_id = $_SESSION['company_id'];
$user_role = $_SESSION['user_role'] ?? 'staff';
$user_branch_id = $_SESSION['branch_id'] ?? null;
$active_branch_id = $_SESSION['active_branch_id'] ?? $user_branch_id;

$stmt = $pdo->prepare("SELECT * FROM companies WHERE id = ?");
$stmt->execute([$company_id]);
$company = $stmt->fetch();

$hasFullAccess = ($user_role === 'company_admin');
if (!$hasFullAccess && $user_branch_id) {
    $stmt = $pdo->prepare("SELECT is_main_branch FROM branches WHERE id = ? AND company_id = ?");
    $stmt->execute([$user_branch_id, $company_id]);
    $b = $stmt->fetch();
    if ($b && $b['is_main_branch'] == 1) {
        $hasFullAccess = true;
    }
}

// Fetch branches
if ($hasFullAccess) {
    $stmt = $pdo->prepare("SELECT * FROM branches WHERE company_id = ? ORDER BY is_main_branch DESC, name ASC");
    $stmt->execute([$company_id]);
    $branches = $stmt->fetchAll();
} else {
    $stmt = $pdo->prepare("SELECT * FROM branches WHERE id = ? AND company_id = ?");
    $stmt->execute([$user_branch_id, $company_id]);
    $branches = $stmt->fetchAll();
}

$selectedBranchId = isset($_GET['branch_id']) && $_GET['branch_id'] !== '' ? (int)$_GET['branch_id'] : ($active_branch_id ?: null);
if (!$hasFullAccess) {
    $selectedBranchId = $user_branch_id;
}

$searchQuery = trim($_GET['search'] ?? '');
$cardType = $_GET['type'] ?? 'clients';

$cards = [];
if ($cardType === 'clients') {
    $sql = "SELECT c.*, b.name as branch_name, b.is_main_branch FROM clients c JOIN branches b ON c.branch_id = b.id WHERE c.company_id = ?";
    $params = [$company_id];
    if ($selectedBranchId) {
        $sql .= " AND c.branch_id = ?";
        $params[] = $selectedBranchId;
    }
    if ($searchQuery !== '') {
        $sql .= " AND (c.full_name LIKE ? OR c.client_number LIKE ? OR c.phone LIKE ?)";
        $params[] = "%$searchQuery%";
        $params[] = "%$searchQuery%";
        $params[] = "%$searchQuery%";
    }
    $sql .= " ORDER BY c.full_name ASC LIMIT 100";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $cards = $stmt->fetchAll();
} else {
    $sql = "SELECT u.*, b.name as branch_name, b.is_main_branch FROM users u LEFT JOIN branches b ON u.branch_id = b.id WHERE u.company_id = ?";
    $params = [$company_id];
    if ($selectedBranchId) {
        $sql .= " AND u.branch_id = ?";
        $params[] = $selectedBranchId;
    }
    if ($searchQuery !== '') {
        $sql .= " AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)";
        $params[] = "%$searchQuery%";
        $params[] = "%$searchQuery%";
        $params[] = "%$searchQuery%";
    }
    $sql .= " ORDER BY u.full_name ASC LIMIT 100";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $cards = $stmt->fetchAll();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= APP_NAME ?> - ID Cards</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 16px; margin: 0; }
        .id-badge-container {
            width: 320px; height: 480px;
            background: linear-gradient(145deg, #0f172a 0%, #1e3a5f 100%);
            border-radius: 18px; color: #fff; position: relative; overflow: hidden;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2); padding: 20px;
            display: flex; flex-direction: column; justify-content: space-between; margin: 0 auto;
            border: 2px solid rgba(255,255,255,0.1);
        }
        .id-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 10px; }
        .id-header .logo-box { width: 38px; height: 38px; border-radius: 10px; background: #0d6efd; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
        .id-photo {
            width: 96px; height: 96px; border-radius: 50%; border: 3px solid #0d6efd;
            margin: 10px auto; overflow: hidden; display: flex; align-items: center; justify-content: center;
            font-size: 2rem; font-weight: 800; background: #1e293b;
        }
        .id-photo img { width: 100%; height: 100%; object-fit: cover; }
        .id-details { text-align: center; }
        .id-details h5 { font-size: 1.05rem; font-weight: 800; margin-bottom: 2px; }
        .id-details .id-num { font-size: 0.75rem; color: #38bdf8; font-family: monospace; font-weight: 700; margin-bottom: 8px; }
        .id-info-table { width: 100%; font-size: 0.72rem; text-align: left; border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 6px; }
        .id-info-table td { padding: 3px 0; color: #cbd5e1; }
        .id-info-table td:last-child { text-align: right; font-weight: 700; color: #fff; }
        .id-footer { border-top: 1px solid rgba(255,255,255,0.15); padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.62rem; color: #94a3b8; }
        @media print { .no-print { display: none !important; } body { padding: 0; background: #fff; } }
    </style>
</head>
<body>
<div class="no-print mb-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="fw-bold m-0"><i class="bi bi-person-vcard text-primary"></i> ID Card Generator</h4>
        <button class="btn btn-primary btn-sm" onclick="window.print()"><i class="bi bi-printer"></i> Print Batch</button>
    </div>
    <div class="card p-3 shadow-sm border-0">
        <form method="GET" class="row g-2 align-items-center">
            <div class="col-md-3">
                <div class="btn-group w-100">
                    <a href="?type=clients&branch_id=<?= $selectedBranchId ?>" class="btn btn-sm <?= $cardType === 'clients' ? 'btn-primary' : 'btn-outline-secondary' ?>">Clients</a>
                    <a href="?type=users&branch_id=<?= $selectedBranchId ?>" class="btn btn-sm <?= $cardType === 'users' ? 'btn-primary' : 'btn-outline-secondary' ?>">Staff</a>
                </div>
            </div>
            <?php if ($hasFullAccess && count($branches) > 1): ?>
            <div class="col-md-3">
                <select name="branch_id" class="form-select form-select-sm" onchange="this.form.submit()">
                    <option value="">All Branches</option>
                    <?php foreach ($branches as $br): ?>
                        <option value="<?= $br['id'] ?>" <?= ($selectedBranchId == $br['id']) ? 'selected' : '' ?>><?= e($br['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <?php endif; ?>
            <div class="col-md-4">
                <input type="text" name="search" class="form-control form-control-sm" placeholder="Search name or ID..." value="<?= e($searchQuery) ?>">
                <input type="hidden" name="type" value="<?= e($cardType) ?>">
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary btn-sm w-100"><i class="bi bi-search"></i> Search</button>
            </div>
        </form>
    </div>
</div>

<div class="row g-4">
    <?php if (empty($cards)): ?>
        <div class="col-12 text-center text-muted py-5">No records found for current branch scope.</div>
    <?php else: ?>
        <?php foreach ($cards as $item): ?>
            <?php
            $isClient = ($cardType === 'clients');
            $idStr = $isClient ? ($item['client_number'] ?? 'CL-' . $item['id']) : ('EMP-' . $item['id']);
            $cardElId = "card-" . $item['id'];
            ?>
            <div class="col-12 col-sm-6 col-md-4 col-xl-3">
                <div class="id-badge-container" id="<?= $cardElId ?>">
                    <div class="id-header">
                        <div class="logo-box"><i class="bi bi-building"></i></div>
                        <div>
                            <h6 class="m-0 fw-bold"><?= e($company['name'] ?? APP_NAME) ?></h6>
                            <small class="text-muted"><?= $isClient ? 'Official Client Card' : 'Staff Card' ?></small>
                        </div>
                    </div>
                    <div class="id-photo">
                        <?php if (!empty($item['photo']) && file_exists(__DIR__ . '/' . $item['photo'])): ?>
                            <img src="<?= e($item['photo']) ?>" alt="Photo">
                        <?php else: ?>
                            <?= strtoupper(substr($item['full_name'], 0, 1)) ?>
                        <?php endif; ?>
                    </div>
                    <div class="id-details">
                        <h5><?= e($item['full_name']) ?></h5>
                        <div class="id-num"><?= e($idStr) ?></div>
                        <table class="id-info-table">
                            <tr><td>Branch:</td><td><?= e($item['branch_name'] ?? 'Head Office') ?></td></tr>
                            <tr><td>Phone:</td><td><?= e($item['phone'] ?? '-') ?></td></tr>
                            <?php if ($isClient): ?>
                                <tr><td>National ID:</td><td><?= e($item['national_id'] ?? '-') ?></td></tr>
                            <?php else: ?>
                                <tr><td>Role:</td><td><?= ucwords(str_replace('_', ' ', $item['role'] ?? 'Staff')) ?></td></tr>
                            <?php endif; ?>
                        </table>
                    </div>
                    <div class="id-footer">
                        <div>ISSUED: <?= date('M Y') ?></div>
                        <div><i class="bi bi-qr-code fs-3 text-info"></i></div>
                    </div>
                </div>
                <div class="text-center mt-2 no-print">
                    <button class="btn btn-sm btn-outline-primary" onclick="downloadCard('<?= $cardElId ?>', '<?= e($item['full_name']) ?>')"><i class="bi bi-download"></i> Download PNG</button>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<script>
function downloadCard(id, name) {
    const el = document.getElementById(id);
    html2canvas(el, { scale: 3 }).then(canvas => {
        const a = document.createElement('a');
        a.download = 'IDCard_' + name.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
    });
}
</script>
</body>
</html>
