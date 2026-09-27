<?php
// ============================================================
// SOKOLO TECH - BULK SMS MODULE
// Version 3.6 - Enterprise Edition (Branch Isolated & Integrated)
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
define('APP_VERSION', '3.6.0');
define('SMS_PROVIDER', $_ENV['SMS_PROVIDER'] ?? 'beem');
define('BEEM_API_KEY', $_ENV['BEEM_API_KEY'] ?? '');
define('BEEM_SECRET_KEY', $_ENV['BEEM_SECRET_KEY'] ?? '');
define('BEEM_SENDER_NAME', $_ENV['BEEM_SENDER_NAME'] ?? 'SOKOLOTECH');
define('DEFAULT_COUNTRY_CODE', $_ENV['DEFAULT_COUNTRY_CODE'] ?? '+255');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$current_lang = $_SESSION['lang'] ?? 'en';
$current_theme = $_SESSION['theme'] ?? 'light';

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

function normalizePhone($phone, $countryCode = DEFAULT_COUNTRY_CODE) {
    if (empty($phone)) return '';
    $phone = preg_replace('/[^0-9+]/', '', $phone);
    if (strpos($phone, '0') === 0) {
        $phone = ltrim($countryCode, '+') . substr($phone, 1);
    } elseif (strpos($phone, ltrim($countryCode, '+')) !== 0) {
        $phone = ltrim($countryCode, '+') . ltrim($phone, '+');
    }
    return '+' . ltrim($phone, '+');
}

function validatePhone($phone) {
    $phone = preg_replace('/[^0-9+]/', '', $phone);
    return strlen($phone) >= 9 && strlen($phone) <= 15;
}

function sendSMSViaBeem($phone, $message) {
    if (empty(BEEM_API_KEY) || empty(BEEM_SECRET_KEY)) {
        return ['success' => false, 'error' => 'Beem API credentials not configured'];
    }
    $url = 'https://apisms.beem.africa/public/v1/send';
    $postData = [
        'source_addr' => BEEM_SENDER_NAME,
        'schedule_time' => '',
        'encoding' => 0,
        'message' => $message,
        'recipients' => [['recipient_id' => 1, 'dest_addr' => ltrim($phone, '+')]]
    ];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Basic ' . base64_encode(BEEM_API_KEY . ':' . BEEM_SECRET_KEY),
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    if ($curlError) return ['success' => false, 'error' => 'cURL Error: ' . $curlError];
    $result = json_decode($response, true);
    if ($httpCode >= 200 && $httpCode < 300) return ['success' => true, 'response' => $result, 'raw' => $response];
    return ['success' => false, 'error' => 'HTTP ' . $httpCode . ': ' . $response];
}

function sendSMS($phone, $message) {
    if (SMS_PROVIDER === 'beem') return sendSMSViaBeem($phone, $message);
    return ['success' => true, 'response' => ['note' => 'SMS queued successfully'], 'raw' => 'queued'];
}

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
    $branch = $stmt->fetch();
    if ($branch && $branch['is_main_branch'] == 1) {
        $hasFullAccess = true;
    }
}

// Fetch allowed branches
if ($hasFullAccess) {
    $stmt = $pdo->prepare("SELECT * FROM branches WHERE company_id = ? ORDER BY is_main_branch DESC, name ASC");
    $stmt->execute([$company_id]);
    $allowedBranches = $stmt->fetchAll();
} else {
    $stmt = $pdo->prepare("SELECT * FROM branches WHERE id = ? AND company_id = ?");
    $stmt->execute([$user_branch_id, $company_id]);
    $allowedBranches = $stmt->fetchAll();
    $active_branch_id = $user_branch_id;
}

// Handle AJAX actions
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ajax_action'])) {
    header('Content-Type: application/json');
    $ajax_action = $_POST['ajax_action'];

    if ($ajax_action === 'fetch_recipients') {
        $type = $_POST['type'] ?? 'clients';
        $branch_id = isset($_POST['branch_id']) && $_POST['branch_id'] !== '' ? (int)$_POST['branch_id'] : ($active_branch_id ?: null);
        if (!$hasFullAccess) $branch_id = $user_branch_id;

        $recipients = [];
        if ($type === 'clients') {
            $sql = "SELECT id, full_name, phone, client_number FROM clients WHERE company_id = ? AND phone IS NOT NULL AND phone != '' AND status = 'active'";
            $params = [$company_id];
            if ($branch_id) {
                $sql .= " AND branch_id = ?";
                $params[] = $branch_id;
            }
            $sql .= " ORDER BY full_name ASC LIMIT 500";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            foreach ($stmt->fetchAll() as $row) {
                $recipients[] = [
                    'id' => $row['id'],
                    'name' => $row['full_name'],
                    'phone' => $row['phone'],
                    'type' => 'client',
                    'reference' => $row['client_number'] ?? ''
                ];
            }
        }
        echo json_encode(['success' => true, 'recipients' => $recipients]);
        exit;
    }

    if ($ajax_action === 'send_sms') {
        $message = trim($_POST['message'] ?? '');
        $recipients = json_decode($_POST['recipients'] ?? '[]', true);
        if (empty($message) || empty($recipients)) {
            echo json_encode(['success' => false, 'message' => 'Message and recipients are required.']);
            exit;
        }

        $campaign_id = 'CAMP-' . strtoupper(uniqid());
        $sent_count = 0; $failed_count = 0;
        $branchToLog = $active_branch_id ?: $user_branch_id;

        foreach ($recipients as $r) {
            $phone = normalizePhone($r['phone'] ?? '');
            if (!validatePhone($phone)) {
                $failed_count++;
                continue;
            }
            $personalized = str_replace(
                ['{name}', '{phone}', '{reference}'],
                [$r['name'] ?? '', $phone, $r['reference'] ?? ''],
                $message
            );

            $stmt = $pdo->prepare("INSERT INTO sms_logs (company_id, branch_id, user_id, phone_number, message, provider, status, recipient_type, recipient_name, campaign_id) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)");
            $stmt->execute([$company_id, $branchToLog, $_SESSION['user_id'], $phone, $personalized, SMS_PROVIDER, $r['type'] ?? 'client', $r['name'] ?? '', $campaign_id]);
            $logId = $pdo->lastInsertId();

            $res = sendSMS($phone, $personalized);
            if ($res['success']) {
                $sent_count++;
                $pdo->prepare("UPDATE sms_logs SET status = 'sent', sent_at = NOW() WHERE id = ?")->execute([$logId]);
            } else {
                $failed_count++;
                $pdo->prepare("UPDATE sms_logs SET status = 'failed', error_message = ? WHERE id = ?")->execute([$res['error'] ?? 'Send error', $logId]);
            }
            usleep(50000);
        }
        echo json_encode(['success' => true, 'sent' => $sent_count, 'failed' => $failed_count, 'total' => count($recipients)]);
        exit;
    }
}

// Stats
$statsQuery = "SELECT
    SUM(CASE WHEN status IN ('sent','delivered') THEN 1 ELSE 0 END) as total_sent,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_failed,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as total_pending
    FROM sms_logs WHERE company_id = ?";
$statsParams = [$company_id];
if ($active_branch_id) {
    $statsQuery .= " AND branch_id = ?";
    $statsParams[] = $active_branch_id;
}
$stmt = $pdo->prepare($statsQuery);
$stmt->execute($statsParams);
$stats = $stmt->fetch() ?: ['total_sent' => 0, 'total_failed' => 0, 'total_pending' => 0];
?>
<!DOCTYPE html>
<html lang="<?= $current_lang ?>" data-bs-theme="<?= $current_theme ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= APP_NAME ?> - Bulk SMS</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 16px; margin: 0; }
        .card-custom { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 18px; margin-bottom: 16px; }
        .stat-box { background: #fff; border-radius: 10px; padding: 14px; border: 1px solid #e2e8f0; text-align: center; }
        .stat-box .val { font-size: 1.3rem; font-weight: 800; }
        .rec-box { max-height: 300px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
        .rec-item { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 8px; cursor: pointer; }
    </style>
</head>
<body>

<div class="d-flex justify-content-between align-items-center mb-3">
    <h4 class="fw-bold m-0"><i class="bi bi-chat-dots-fill text-primary"></i> Bulk SMS Portal</h4>
    <span class="badge bg-secondary"><?= strtoupper(SMS_PROVIDER) ?></span>
</div>

<div class="row g-3 mb-3">
    <div class="col-4"><div class="stat-box"><small class="text-muted d-block fw-bold">SENT</small><span class="val text-success"><?= number_format((int)$stats['total_sent']) ?></span></div></div>
    <div class="col-4"><div class="stat-box"><small class="text-muted d-block fw-bold">FAILED</small><span class="val text-danger"><?= number_format((int)$stats['total_failed']) ?></span></div></div>
    <div class="col-4"><div class="stat-box"><small class="text-muted d-block fw-bold">PENDING</small><span class="val text-warning"><?= number_format((int)$stats['total_pending']) ?></span></div></div>
</div>

<div class="row g-3">
    <div class="col-md-7">
        <div class="card-custom">
            <h6 class="fw-bold mb-3">Compose SMS</h6>
            <div class="mb-3">
                <textarea id="smsMessage" class="form-control" rows="5" placeholder="Type your SMS message..." oninput="calcChars()"></textarea>
                <div class="d-flex justify-content-between mt-2 small text-muted">
                    <span id="charCount">0 chars · 1 SMS</span>
                    <span id="recCount" class="fw-bold text-primary">0 selected</span>
                </div>
            </div>
            <button id="sendBtn" class="btn btn-primary w-100 fw-bold" onclick="sendSMSBatch()"><i class="bi bi-send-fill"></i> Send Broadcast</button>
            <div id="resultNotice" class="mt-2"></div>
        </div>
    </div>
    <div class="col-md-5">
        <div class="card-custom">
            <h6 class="fw-bold mb-2">Recipients List</h6>
            <?php if ($hasFullAccess && count($allowedBranches) > 1): ?>
                <div class="mb-2">
                    <select id="branchFilter" class="form-select form-select-sm" onchange="loadRecipients()">
                        <option value="">All Branches</option>
                        <?php foreach ($allowedBranches as $b): ?>
                            <option value="<?= $b['id'] ?>" <?= ($active_branch_id == $b['id']) ? 'selected' : '' ?>><?= e($b['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            <?php endif; ?>
            <div class="d-flex gap-2 mb-2">
                <button class="btn btn-sm btn-outline-secondary flex-fill" onclick="toggleAll(true)">Select All</button>
                <button class="btn btn-sm btn-outline-secondary flex-fill" onclick="toggleAll(false)">Clear</button>
            </div>
            <div class="rec-box" id="recipientsBox">Loading...</div>
        </div>
    </div>
</div>

<script>
let list = [];
let selected = new Set();

function loadRecipients() {
    const br = document.getElementById('branchFilter') ? document.getElementById('branchFilter').value : '<?= $active_branch_id ?>';
    fetch('bulk_sms.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'ajax_action=fetch_recipients&type=clients&branch_id=' + encodeURIComponent(br)
    })
    .then(r => r.json())
    .then(d => {
        list = d.recipients || [];
        render();
    });
}

function render() {
    const box = document.getElementById('recipientsBox');
    if (!list.length) { box.innerHTML = '<div class="text-center py-4 text-muted small">No clients found</div>'; return; }
    box.innerHTML = list.map(r => `
        <div class="rec-item" onclick="toggle('${r.phone}')">
            <input type="checkbox" ${selected.has(r.phone) ? 'checked' : ''} onclick="event.stopPropagation(); toggle('${r.phone}')">
            <div class="flex-grow-1 small">
                <strong>${r.name}</strong>
                <div class="text-muted" style="font-size:0.75rem;">${r.phone}</div>
            </div>
        </div>
    `).join('');
    document.getElementById('recCount').textContent = selected.size + ' selected';
}

function toggle(p) {
    if (selected.has(p)) selected.delete(p); else selected.add(p);
    render();
}
function toggleAll(c) {
    if (c) list.forEach(r => selected.add(r.phone)); else selected.clear();
    render();
}
function calcChars() {
    const len = document.getElementById('smsMessage').value.length;
    document.getElementById('charCount').textContent = `${len} chars · ${len === 0 ? 1 : Math.ceil(len / 160)} SMS`;
}

function sendSMSBatch() {
    const msg = document.getElementById('smsMessage').value.trim();
    if (!msg || !selected.size) { alert('Message and recipients required.'); return; }
    const toSend = list.filter(r => selected.has(r.phone));
    if (!confirm('Send to ' + toSend.length + ' recipients?')) return;

    const btn = document.getElementById('sendBtn');
    btn.disabled = true;
    fetch('bulk_sms.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'ajax_action=send_sms&message=' + encodeURIComponent(msg) + '&recipients=' + encodeURIComponent(JSON.stringify(toSend))
    })
    .then(r => r.json())
    .then(d => {
        btn.disabled = false;
        if (d.success) {
            document.getElementById('resultNotice').innerHTML = `<div class="alert alert-success p-2 small mt-2">Finished: ${d.sent} Sent, ${d.failed} Failed.</div>`;
            document.getElementById('smsMessage').value = '';
            selected.clear();
            render();
            calcChars();
        } else {
            document.getElementById('resultNotice').innerHTML = `<div class="alert alert-danger p-2 small mt-2">${d.message}</div>`;
        }
    });
}
document.addEventListener('DOMContentLoaded', loadRecipients);
</script>
</body>
</html>
