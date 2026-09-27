<?php
// ============================================================
// SOKOLO TECH - ENTERPRISE DASHBOARD & BRANCH PORTAL
// Version 3.7 - Enterprise Edition
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
define('APP_VERSION', '3.7.0');
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('SESSION_TIMEOUT', 3600);

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => SESSION_TIMEOUT,
        'path' => '/',
        'domain' => '',
        'secure' => isset($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
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
function formatMoney($amount, $currency = 'TZS') { return $currency . ' ' . number_format((float)$amount, 2); }

function logAudit($pdo, $action, $tableName = null, $recordId = null, $oldValues = null, $newValues = null) {
    if (!isset($_SESSION['user_id'])) return;
    try {
        $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, company_id, branch_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $_SESSION['user_id'],
            $_SESSION['company_id'] ?? null,
            $_SESSION['active_branch_id'] ?? ($_SESSION['branch_id'] ?? null),
            $action, $tableName, $recordId,
            $oldValues ? json_encode($oldValues) : null,
            $newValues ? json_encode($newValues) : null,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ]);
    } catch (PDOException $e) {}
}

function uploadSecureFile($fileInputName, $prefix = 'doc') {
    if (!isset($_FILES[$fileInputName]) || $_FILES[$fileInputName]['error'] !== UPLOAD_ERR_OK) {
        return null;
    }
    $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $_FILES[$fileInputName]['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, $allowedMimes)) return null;
    if ($_FILES[$fileInputName]['size'] > 10 * 1024 * 1024) return null;

    $ext = strtolower(pathinfo($_FILES[$fileInputName]['name'], PATHINFO_EXTENSION));
    if (in_array($ext, ['php', 'phtml', 'exe', 'sh', 'pl', 'cgi', 'js'])) return null;

    $filename = $prefix . '_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
    $targetPath = UPLOAD_DIR . $filename;
    if (move_uploaded_file($_FILES[$fileInputName]['tmp_name'], $targetPath)) {
        return 'uploads/' . $filename;
    }
    return null;
}

// Check Login
if (!isset($_SESSION['user_id']) || !isset($_SESSION['company_id'])) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND status = 'active' LIMIT 1");
        $stmt->execute([$email]);
        $u = $stmt->fetch();
        if ($u && password_verify($password, $u['password'])) {
            $_SESSION['user_id'] = $u['id'];
            $_SESSION['user_name'] = $u['full_name'];
            $_SESSION['user_role'] = $u['role'];
            $_SESSION['company_id'] = $u['company_id'];
            $_SESSION['branch_id'] = $u['branch_id'];
            $_SESSION['active_branch_id'] = $u['branch_id'];
            $_SESSION['last_activity'] = time();
            logAudit($pdo, 'login', 'users', $u['id']);
            header('Location: dashboard.php');
            exit;
        } else {
            $login_error = "Invalid credentials or inactive account.";
        }
    }
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8"><title><?= APP_NAME ?> - Sign In</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-light d-flex align-items-center justify-content-center vh-100">
        <div class="card p-4 shadow-sm" style="max-width: 400px; width: 100%; border-radius: 14px;">
            <div class="text-center mb-3">
                <h4 class="fw-bold text-primary"><?= APP_NAME ?></h4>
                <p class="text-muted small">Sign in to branch portal</p>
            </div>
            <?php if (!empty($login_error)): ?><div class="alert alert-danger py-2 small"><?= e($login_error) ?></div><?php endif; ?>
            <form method="POST">
                <input type="hidden" name="login" value="1">
                <div class="mb-3"><label class="form-label small fw-bold">Email Address</label><input type="email" name="email" class="form-control" required autofocus></div>
                <div class="mb-3"><label class="form-label small fw-bold">Password</label><input type="password" name="password" class="form-control" required></div>
                <button type="submit" class="btn btn-primary w-100 fw-bold">Sign In</button>
            </form>
        </div>
    </body>
    </html>
    <?php
    exit;
}

$company_id = $_SESSION['company_id'];
$user_role = $_SESSION['user_role'];
$user_branch_id = $_SESSION['branch_id'];

// Check Head Office privilege
$isHeadOfficeUser = ($user_role === 'company_admin' || $user_role === 'super_admin');
if (!$isHeadOfficeUser && $user_branch_id) {
    $stmt = $pdo->prepare("SELECT is_main_branch FROM branches WHERE id = ? AND company_id = ?");
    $stmt->execute([$user_branch_id, $company_id]);
    $bRow = $stmt->fetch();
    if ($bRow && $bRow['is_main_branch'] == 1) {
        $isHeadOfficeUser = true;
    }
}

// Fetch branches
$stmt = $pdo->prepare("SELECT * FROM branches WHERE company_id = ? ORDER BY is_main_branch DESC, name ASC");
$stmt->execute([$company_id]);
$allBranches = $stmt->fetchAll();

// Handle branch switcher
if (isset($_GET['switch_branch'])) {
    $target = $_GET['switch_branch'];
    if ($isHeadOfficeUser) {
        if ($target === 'all' || $target === '0') {
            $_SESSION['active_branch_id'] = null;
        } else {
            $tid = (int)$target;
            foreach ($allBranches as $b) {
                if ($b['id'] == $tid) {
                    $_SESSION['active_branch_id'] = $tid;
                    break;
                }
            }
        }
    } else {
        $_SESSION['active_branch_id'] = $user_branch_id;
    }
    header('Location: dashboard.php');
    exit;
}

if (!$isHeadOfficeUser) {
    $active_branch_id = $user_branch_id;
    $_SESSION['active_branch_id'] = $user_branch_id;
} else {
    $active_branch_id = $_SESSION['active_branch_id'] ?? null;
}

$active_branch_name = "HEAD OFFICE (ALL BRANCHES)";
if ($active_branch_id) {
    foreach ($allBranches as $b) {
        if ($b['id'] == $active_branch_id) {
            $active_branch_name = "BRANCH: " . strtoupper($b['name']);
            break;
        }
    }
}

$stmt = $pdo->prepare("SELECT * FROM companies WHERE id = ?");
$stmt->execute([$company_id]);
$company = $stmt->fetch();
$currency = $company['currency'] ?? 'TZS';

// Handle Actions
$notice_msg = ''; $notice_type = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $act = $_POST['action'];

    // 1. REGISTER CLIENT
    if ($act === 'register_client') {
        $fullName = trim($_POST['full_name'] ?? '');
        $nationalId = trim($_POST['national_id'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $region = trim($_POST['region'] ?? '');
        $district = trim($_POST['district'] ?? '');
        $address = trim($_POST['address'] ?? '');
        $gender = $_POST['gender'] ?? 'male';
        $dob = $_POST['date_of_birth'] ?? null;

        $targetBranchId = $isHeadOfficeUser ? ($active_branch_id ?: ($allBranches[0]['id'] ?? 1)) : $user_branch_id;

        if (empty($fullName) || empty($phone)) {
            $notice_msg = "Client full name and phone number are required."; $notice_type = "danger";
        } else {
            $dupStmt = $pdo->prepare("SELECT id FROM clients WHERE company_id = ? AND (phone = ? OR (national_id = ? AND national_id != '')) LIMIT 1");
            $dupStmt->execute([$company_id, $phone, $nationalId]);
            if ($dupStmt->fetch()) {
                $notice_msg = "A client with this phone number or National ID already exists."; $notice_type = "warning";
            } else {
                $photoPath = uploadSecureFile('photo', 'client');
                $idDocPath = uploadSecureFile('id_document', 'client_id');
                $clientNumber = 'CL-' . strtoupper(uniqid());

                $stmt = $pdo->prepare("INSERT INTO clients (company_id, branch_id, client_number, full_name, national_id, phone, address, region, district, gender, date_of_birth, photo, id_document, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')");
                $stmt->execute([$company_id, $targetBranchId, $clientNumber, $fullName, $nationalId, $phone, $address, $region, $district, $gender, $dob, $photoPath, $idDocPath]);
                $cid = $pdo->lastInsertId();

                logAudit($pdo, 'register_client', 'clients', $cid, null, ['name' => $fullName, 'branch' => $targetBranchId]);
                $notice_msg = "Client registered successfully! Client Number: $clientNumber"; $notice_type = "success";
            }
        }
    }

    // 2. APPLY FOR LOAN (Branch workflow -> sets 'pending' requiring Head Office review)
    if ($act === 'submit_loan_application') {
        $clientId = (int)($_POST['client_id'] ?? 0);
        $amount = (float)($_POST['amount'] ?? 0);
        $duration = (int)($_POST['duration_months'] ?? 12);
        $interestRate = (float)($_POST['interest_rate'] ?? 10);
        $loanType = $_POST['loan_type'] ?? 'personal';
        $purpose = trim($_POST['purpose'] ?? '');

        $chk = $pdo->prepare("SELECT branch_id FROM clients WHERE id = ? AND company_id = ?");
        $chk->execute([$clientId, $company_id]);
        $cl = $chk->fetch();

        if (!$cl || (!$isHeadOfficeUser && $cl['branch_id'] != $user_branch_id)) {
            $notice_msg = "Unauthorized client access."; $notice_type = "danger";
        } elseif ($amount <= 0) {
            $notice_msg = "Please enter a valid loan amount."; $notice_type = "danger";
        } else {
            $loanNum = 'LN-' . strtoupper(uniqid());
            $interest = $amount * ($interestRate / 100) * ($duration / 12);
            $totalPayable = $amount + $interest;

            $stmt = $pdo->prepare("INSERT INTO loans (company_id, branch_id, client_id, loan_number, loan_type, amount, interest_rate, duration_months, total_interest, total_payable, balance, status, purpose, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)");
            $stmt->execute([$company_id, $cl['branch_id'], $clientId, $loanNum, $loanType, $amount, $interestRate, $duration, $interest, $totalPayable, $totalPayable, $purpose, $_SESSION['user_id']]);
            $lid = $pdo->lastInsertId();

            logAudit($pdo, 'submit_loan_application', 'loans', $lid, null, ['amount' => $amount]);
            $notice_msg = "Loan application submitted for Head Office Review! Loan #: $loanNum"; $notice_type = "success";
        }
    }

    // 3. GRANT LOAN (Authorized Head Office Direct Grant)
    if ($act === 'grant_loan') {
        if (!$isHeadOfficeUser) {
            $notice_msg = "Unauthorized: Branch users cannot bypass Head Office approval."; $notice_type = "danger";
        } else {
            $clientId = (int)($_POST['client_id'] ?? 0);
            $amount = (float)($_POST['amount'] ?? 0);
            $duration = (int)($_POST['duration_months'] ?? 12);
            $interestRate = (float)($_POST['interest_rate'] ?? 10);
            $loanType = $_POST['loan_type'] ?? 'personal';
            $purpose = trim($_POST['purpose'] ?? '');

            $chk = $pdo->prepare("SELECT branch_id FROM clients WHERE id = ? AND company_id = ?");
            $chk->execute([$clientId, $company_id]);
            $cl = $chk->fetch();

            if (!$cl || $amount <= 0) {
                $notice_msg = "Invalid parameters for granting loan."; $notice_type = "danger";
            } else {
                $loanNum = 'LN-' . strtoupper(uniqid());
                $interest = $amount * ($interestRate / 100) * ($duration / 12);
                $totalPayable = $amount + $interest;
                $disbursed = date('Y-m-d');
                $due = date('Y-m-d', strtotime("+$duration months"));

                $stmt = $pdo->prepare("INSERT INTO loans (company_id, branch_id, client_id, loan_number, loan_type, amount, interest_rate, duration_months, total_interest, total_payable, balance, status, purpose, disbursed_date, due_date, approved_by, approval_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, CURDATE(), ?)");
                $stmt->execute([$company_id, $cl['branch_id'], $clientId, $loanNum, $loanType, $amount, $interestRate, $duration, $interest, $totalPayable, $totalPayable, $purpose, $disbursed, $due, $_SESSION['user_id'], $_SESSION['user_id']]);
                $lid = $pdo->lastInsertId();

                logAudit($pdo, 'grant_loan', 'loans', $lid, null, ['amount' => $amount]);
                $notice_msg = "Loan $loanNum successfully granted and disbursed!"; $notice_type = "success";
            }
        }
    }

    // 4. HEAD OFFICE APPROVE/REJECT LOAN
    if ($act === 'ho_approve_loan' || $act === 'ho_reject_loan') {
        if (!$isHeadOfficeUser) {
            $notice_msg = "Unauthorized: Only Head Office can approve or reject loans."; $notice_type = "danger";
        } else {
            $lid = (int)($_POST['loan_id'] ?? 0);
            $notes = trim($_POST['notes'] ?? '');
            if ($act === 'ho_approve_loan') {
                $pdo->prepare("UPDATE loans SET status = 'active', approved_by = ?, approval_date = CURDATE(), approval_notes = ? WHERE id = ? AND company_id = ?")
                    ->execute([$_SESSION['user_id'], $notes, $lid, $company_id]);
                logAudit($pdo, 'approve_loan', 'loans', $lid);
                $notice_msg = "Loan approved and activated!"; $notice_type = "success";
            } else {
                $pdo->prepare("UPDATE loans SET status = 'rejected', approved_by = ?, approval_date = CURDATE(), rejection_reason = ? WHERE id = ? AND company_id = ?")
                    ->execute([$_SESSION['user_id'], $notes, $lid, $company_id]);
                logAudit($pdo, 'reject_loan', 'loans', $lid);
                $notice_msg = "Loan application rejected."; $notice_type = "warning";
            }
        }
    }

    // 5. SUBMIT EXPENSE (Branch creates -> sets 'pending')
    if ($act === 'submit_expense') {
        $category = trim($_POST['category'] ?? 'Operations');
        $desc = trim($_POST['description'] ?? '');
        $amount = (float)($_POST['amount'] ?? 0);
        $date = $_POST['expense_date'] ?? date('Y-m-d');
        $method = $_POST['payment_method'] ?? 'cash';
        $ref = trim($_POST['reference'] ?? '');

        $targetBranchId = $isHeadOfficeUser ? ($active_branch_id ?: ($allBranches[0]['id'] ?? 1)) : $user_branch_id;
        $doc = uploadSecureFile('receipt_file', 'expense');

        if ($amount <= 0) {
            $notice_msg = "Valid expense amount required."; $notice_type = "danger";
        } else {
            $stmt = $pdo->prepare("INSERT INTO expenses (company_id, branch_id, category, description, amount, expense_date, payment_method, reference, recorded_by, document_path, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')");
            $stmt->execute([$company_id, $targetBranchId, $category, $desc, $amount, $date, $method, $ref, $_SESSION['user_id'], $doc]);
            $eid = $pdo->lastInsertId();

            logAudit($pdo, 'submit_expense', 'expenses', $eid, null, ['amount' => $amount]);
            $notice_msg = "Expense submitted for Head Office approval!"; $notice_type = "success";
        }
    }

    // 6. HEAD OFFICE APPROVE/REJECT EXPENSE
    if ($act === 'ho_approve_expense' || $act === 'ho_reject_expense') {
        if (!$isHeadOfficeUser) {
            $notice_msg = "Unauthorized: Only Head Office can approve expenses."; $notice_type = "danger";
        } else {
            $eid = (int)($_POST['expense_id'] ?? 0);
            $notes = trim($_POST['notes'] ?? '');
            if ($act === 'ho_approve_expense') {
                $pdo->prepare("UPDATE expenses SET status = 'approved', approved_by = ?, approved_at = NOW(), approval_notes = ? WHERE id = ? AND company_id = ?")
                    ->execute([$_SESSION['user_id'], $notes, $eid, $company_id]);
                logAudit($pdo, 'approve_expense', 'expenses', $eid);
                $notice_msg = "Expense approved!"; $notice_type = "success";
            } else {
                $pdo->prepare("UPDATE expenses SET status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ? WHERE id = ? AND company_id = ?")
                    ->execute([$_SESSION['user_id'], $notes, $eid, $company_id]);
                logAudit($pdo, 'reject_expense', 'expenses', $eid);
                $notice_msg = "Expense rejected."; $notice_type = "warning";
            }
        }
    }

    // 7. RECORD REPAYMENT
    if ($act === 'record_repayment') {
        $loanId = (int)($_POST['loan_id'] ?? 0);
        $amount = (float)($_POST['amount'] ?? 0);
        $method = $_POST['payment_method'] ?? 'cash';
        $ref = trim($_POST['reference'] ?? '');
        $date = $_POST['payment_date'] ?? date('Y-m-d');

        $stmt = $pdo->prepare("SELECT * FROM loans WHERE id = ? AND company_id = ? AND status = 'active'");
        $stmt->execute([$loanId, $company_id]);
        $loan = $stmt->fetch();

        if (!$loan || (!$isHeadOfficeUser && $loan['branch_id'] != $user_branch_id)) {
            $notice_msg = "Unauthorized loan payment access."; $notice_type = "danger";
        } elseif ($amount <= 0) {
            $notice_msg = "Valid payment amount required."; $notice_type = "danger";
        } else {
            $receiptNum = 'RCP-' . strtoupper(uniqid());
            $newPaid = $loan['amount_paid'] + $amount;
            $newBal = max(0, $loan['total_payable'] - $newPaid);
            $newStatus = ($newBal <= 0) ? 'completed' : 'active';

            $pdo->beginTransaction();
            $pdo->prepare("INSERT INTO payments (company_id, branch_id, loan_id, client_id, receipt_number, amount, payment_method, reference, payment_date, collected_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                ->execute([$company_id, $loan['branch_id'], $loanId, $loan['client_id'], $receiptNum, $amount, $method, $ref, $date, $_SESSION['user_id']]);
            $pdo->prepare("UPDATE loans SET amount_paid = ?, balance = ?, status = ? WHERE id = ?")
                ->execute([$newPaid, $newBal, $newStatus, $loanId]);
            $pdo->commit();

            logAudit($pdo, 'record_payment', 'payments', null, null, ['amount' => $amount, 'loan' => $loan['loan_number']]);
            $notice_msg = "Payment recorded successfully! Receipt: $receiptNum"; $notice_type = "success";
        }
    }
}

// ------------------------------------------------------------
// SERVER-SIDE QUERY DATA ISOLATION BY ACTIVE BRANCH
// ------------------------------------------------------------
$view = $_GET['page'] ?? 'dashboard';

// Dynamic branch filter conditions
$bSql = ""; $bParams = [$company_id];
if ($active_branch_id) {
    $bSql = " AND branch_id = ?";
    $bParams[] = $active_branch_id;
}

// 1. Dashboard Statistics (strict isolation)
$qStats = "SELECT
    (SELECT COUNT(*) FROM clients WHERE company_id = ?" . ($active_branch_id ? " AND branch_id = $active_branch_id" : "") . " AND status = 'active') as total_clients,
    (SELECT COUNT(*) FROM loans WHERE company_id = ?" . ($active_branch_id ? " AND branch_id = $active_branch_id" : "") . " AND status = 'active') as active_loans,
    (SELECT COUNT(*) FROM loans WHERE company_id = ?" . ($active_branch_id ? " AND branch_id = $active_branch_id" : "") . " AND status = 'pending') as pending_loans,
    (SELECT COALESCE(SUM(amount), 0) FROM loans WHERE company_id = ?" . ($active_branch_id ? " AND branch_id = $active_branch_id" : "") . " AND status IN ('active','completed')) as total_disbursed,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE company_id = ?" . ($active_branch_id ? " AND branch_id = $active_branch_id" : "") . ") as total_collected,
    (SELECT COALESCE(SUM(balance), 0) FROM loans WHERE company_id = ?" . ($active_branch_id ? " AND branch_id = $active_branch_id" : "") . " AND status = 'active') as total_outstanding,
    (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE company_id = ?" . ($active_branch_id ? " AND branch_id = $active_branch_id" : "") . " AND status = 'approved') as total_expenses,
    (SELECT COUNT(*) FROM expenses WHERE company_id = ?" . ($active_branch_id ? " AND branch_id = $active_branch_id" : "") . " AND status = 'pending') as pending_expenses
";
$stmt = $pdo->prepare($qStats);
$stmt->execute([$company_id, $company_id, $company_id, $company_id, $company_id, $company_id, $company_id, $company_id]);
$stats = $stmt->fetch();

// 2. Clients
$stmt = $pdo->prepare("SELECT c.*, b.name as branch_name FROM clients c JOIN branches b ON c.branch_id = b.id WHERE c.company_id = ?" . ($active_branch_id ? " AND c.branch_id = ?" : "") . " ORDER BY c.created_at DESC LIMIT 200");
$stmt->execute($bParams);
$clients = $stmt->fetchAll();

// 3. Loans
$stmt = $pdo->prepare("SELECT l.*, c.full_name as client_name, b.name as branch_name FROM loans l JOIN clients c ON l.client_id = c.id JOIN branches b ON l.branch_id = b.id WHERE l.company_id = ?" . ($active_branch_id ? " AND l.branch_id = ?" : "") . " ORDER BY l.created_at DESC LIMIT 200");
$stmt->execute($bParams);
$loans = $stmt->fetchAll();

// 4. Pending Loans for Review
$stmt = $pdo->prepare("SELECT l.*, c.full_name as client_name, b.name as branch_name, u.full_name as creator_name FROM loans l JOIN clients c ON l.client_id = c.id JOIN branches b ON l.branch_id = b.id LEFT JOIN users u ON l.created_by = u.id WHERE l.company_id = ? AND l.status = 'pending'" . ($active_branch_id ? " AND l.branch_id = $active_branch_id" : "") . " ORDER BY l.created_at DESC");
$stmt->execute([$company_id]);
$pendingLoans = $stmt->fetchAll();

// 5. Pending Expenses for Review
$stmt = $pdo->prepare("SELECT e.*, b.name as branch_name, u.full_name as submitter_name FROM expenses e JOIN branches b ON e.branch_id = b.id LEFT JOIN users u ON e.recorded_by = u.id WHERE e.company_id = ? AND e.status = 'pending'" . ($active_branch_id ? " AND e.branch_id = $active_branch_id" : "") . " ORDER BY e.created_at DESC");
$stmt->execute([$company_id]);
$pendingExpenses = $stmt->fetchAll();

// 6. Expenses List
$stmt = $pdo->prepare("SELECT e.*, b.name as branch_name FROM expenses e JOIN branches b ON e.branch_id = b.id WHERE e.company_id = ?" . ($active_branch_id ? " AND e.branch_id = ?" : "") . " ORDER BY e.expense_date DESC LIMIT 100");
$stmt->execute($bParams);
$expenses = $stmt->fetchAll();

// 7. Repayments List
$stmt = $pdo->prepare("SELECT p.*, c.full_name as client_name, l.loan_number, b.name as branch_name FROM payments p JOIN clients c ON p.client_id = c.id JOIN loans l ON p.loan_id = l.id JOIN branches b ON p.branch_id = b.id WHERE p.company_id = ?" . ($active_branch_id ? " AND p.branch_id = ?" : "") . " ORDER BY p.payment_date DESC LIMIT 100");
$stmt->execute($bParams);
$payments = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= APP_NAME ?> - <?= e($active_branch_name) ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        :root { --sidebar-w: 260px; --topbar-h: 64px; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; }
        .sidebar { position: fixed; top: 0; left: 0; width: var(--sidebar-w); height: 100vh; background: #0f172a; color: #fff; z-index: 1000; overflow-y: auto; }
        .sidebar-brand { padding: 18px 20px; font-size: 1.15rem; font-weight: 800; color: #fff; text-decoration: none; display: block; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .sidebar-menu { list-style: none; padding: 10px 0; margin: 0; }
        .sidebar-menu a { display: flex; align-items: center; padding: 11px 20px; color: #94a3b8; text-decoration: none; font-size: 0.88rem; font-weight: 600; border-left: 3px solid transparent; transition: 0.2s; }
        .sidebar-menu a:hover, .sidebar-menu a.active { color: #fff; background: #1e293b; border-left-color: #0d6efd; }
        .sidebar-menu a i { margin-right: 12px; font-size: 1.1rem; }
        .topbar { position: fixed; top: 0; left: var(--sidebar-w); right: 0; height: var(--topbar-h); background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; z-index: 999; }
        .main-wrapper { margin-left: var(--sidebar-w); padding-top: calc(var(--topbar-h) + 20px); padding-bottom: 40px; padding-left: 24px; padding-right: 24px; }
        .stat-card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .stat-card .val { font-size: 1.45rem; font-weight: 800; }
        .card-custom { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .badge-branch-tag { background: #dbeafe; color: #1e40af; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 100px; display: inline-flex; align-items: center; gap: 4px; }
        .badge-ho-tag { background: #fef3c7; color: #92400e; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 100px; display: inline-flex; align-items: center; gap: 4px; }
        .upload-progress-box { display: none; margin-top: 10px; }
        .table th { font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 700; }
        .table td { font-size: 0.85rem; vertical-align: middle; }
        @media (max-width: 991px) {
            .sidebar { transform: translateX(-100%); transition: 0.3s; }
            .sidebar.show { transform: translateX(0); }
            .topbar { left: 0; }
            .main-wrapper { margin-left: 0; }
        }
    </style>
</head>
<body>

<!-- SIDEBAR -->
<nav class="sidebar" id="sidebar">
    <a href="dashboard.php" class="sidebar-brand">
        <i class="bi bi-building"></i> <?= APP_NAME ?>
        <small class="d-block text-muted" style="font-size:0.65rem;">ENTERPRISE V<?= APP_VERSION ?></small>
    </a>
    <ul class="sidebar-menu">
        <li><a href="?page=dashboard" class="<?= $view === 'dashboard' ? 'active' : '' ?>"><i class="bi bi-speedometer2"></i> Dashboard</a></li>
        <li><a href="?page=clients" class="<?= $view === 'clients' ? 'active' : '' ?>"><i class="bi bi-people"></i> Clients</a></li>
        <li><a href="?page=loans" class="<?= $view === 'loans' ? 'active' : '' ?>"><i class="bi bi-cash-stack"></i> Loans</a></li>
        <li><a href="?page=repayments" class="<?= $view === 'repayments' ? 'active' : '' ?>"><i class="bi bi-receipt"></i> Repayments</a></li>
        <li><a href="?page=expenses" class="<?= $view === 'expenses' ? 'active' : '' ?>"><i class="bi bi-cart-dash"></i> Expenses</a></li>
        <?php if ($isHeadOfficeUser): ?>
            <li><a href="?page=loan_approvals" class="<?= $view === 'loan_approvals' ? 'active' : '' ?>"><i class="bi bi-clipboard-check"></i> Loan Approvals <?php if ($stats['pending_loans'] > 0): ?><span class="badge bg-danger ms-auto"><?= $stats['pending_loans'] ?></span><?php endif; ?></a></li>
            <li><a href="?page=expense_approvals" class="<?= $view === 'expense_approvals' ? 'active' : '' ?>"><i class="bi bi-cart-check"></i> Expense Approvals <?php if ($stats['pending_expenses'] > 0): ?><span class="badge bg-warning text-dark ms-auto"><?= $stats['pending_expenses'] ?></span><?php endif; ?></a></li>
        <?php endif; ?>
        <li><a href="?page=reports" class="<?= $view === 'reports' ? 'active' : '' ?>"><i class="bi bi-bar-chart"></i> Reports</a></li>
        <li><a href="bulk_sms.php" target="_blank"><i class="bi bi-chat-dots"></i> Bulk SMS</a></li>
        <li><a href="id_cards.php" target="_blank"><i class="bi bi-person-vcard"></i> ID Cards</a></li>
        <li><a href="index.php?logout=1"><i class="bi bi-box-arrow-right"></i> Logout</a></li>
    </ul>
</nav>

<!-- TOPBAR -->
<div class="topbar">
    <div class="d-flex align-items-center gap-3">
        <button class="btn btn-sm btn-outline-secondary d-lg-none" onclick="document.getElementById('sidebar').classList.toggle('show')"><i class="bi bi-list"></i></button>
        <!-- CURRENT BRANCH INDICATOR -->
        <span class="<?= $active_branch_id ? 'badge-branch-tag' : 'badge-ho-tag' ?>">
            <i class="bi bi-geo-alt-fill"></i> CURRENT CONTEXT: <?= e($active_branch_name) ?>
        </span>
    </div>

    <!-- BRANCH SWITCHER -->
    <?php if ($isHeadOfficeUser): ?>
        <div class="dropdown">
            <button class="btn btn-sm btn-outline-primary dropdown-toggle fw-bold" data-bs-toggle="dropdown">
                <i class="bi bi-arrow-left-right"></i> Switch Branch
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                <li><a class="dropdown-item fw-bold text-primary <?= !$active_branch_id ? 'bg-light' : '' ?>" href="?switch_branch=all"><i class="bi bi-globe"></i> HEAD OFFICE (All Branches)</a></li>
                <li><hr class="dropdown-divider"></li>
                <?php foreach ($allBranches as $b): ?>
                    <li>
                        <a class="dropdown-item d-flex justify-content-between align-items-center <?= ($active_branch_id == $b['id']) ? 'active' : '' ?>" href="?switch_branch=<?= $b['id'] ?>">
                            <span><?= e($b['name']) ?> <?= $b['is_main_branch'] ? '(Main HQ)' : '' ?></span>
                        </a>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php else: ?>
        <span class="badge bg-secondary">Assigned: <?= e($allBranches[0]['name'] ?? 'Branch') ?></span>
    <?php endif; ?>
</div>

<!-- MAIN CONTENT -->
<div class="main-wrapper">

    <?php if (!empty($notice_msg)): ?>
        <div class="alert alert-<?= $notice_type ?> alert-dismissible fade show">
            <?= e($notice_msg) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <!-- ============================================== -->
    <!-- VIEW: DASHBOARD                                -->
    <!-- ============================================== -->
    <?php if ($view === 'dashboard'): ?>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="fw-bold m-0"><i class="bi bi-speedometer2 text-primary"></i> <?= e($active_branch_name) ?> Overview</h4>
        </div>

        <!-- Metric Cards -->
        <div class="row g-3 mb-4">
            <div class="col-6 col-md-3">
                <div class="stat-card">
                    <small class="text-muted d-block fw-bold">TOTAL CLIENTS</small>
                    <span class="val text-primary"><?= number_format((int)$stats['total_clients']) ?></span>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="stat-card">
                    <small class="text-muted d-block fw-bold">ACTIVE LOANS</small>
                    <span class="val text-success"><?= number_format((int)$stats['active_loans']) ?></span>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="stat-card">
                    <small class="text-muted d-block fw-bold">PENDING APPROVALS</small>
                    <span class="val text-warning"><?= number_format((int)$stats['pending_loans']) ?></span>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="stat-card">
                    <small class="text-muted d-block fw-bold">OUTSTANDING BAL</small>
                    <span class="val text-danger" style="font-size:1.1rem;"><?= formatMoney($stats['total_outstanding'], $currency) ?></span>
                </div>
            </div>
        </div>

        <div class="row g-3 mb-4">
            <div class="col-6 col-md-3">
                <div class="stat-card">
                    <small class="text-muted d-block fw-bold">TOTAL DISBURSED</small>
                    <span class="val" style="font-size:1.1rem;"><?= formatMoney($stats['total_disbursed'], $currency) ?></span>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="stat-card">
                    <small class="text-muted d-block fw-bold">TOTAL COLLECTED</small>
                    <span class="val text-success" style="font-size:1.1rem;"><?= formatMoney($stats['total_collected'], $currency) ?></span>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="stat-card">
                    <small class="text-muted d-block fw-bold">TOTAL EXPENSES</small>
                    <span class="val text-danger" style="font-size:1.1rem;"><?= formatMoney($stats['total_expenses'], $currency) ?></span>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="stat-card">
                    <small class="text-muted d-block fw-bold">PENDING EXPENSES</small>
                    <span class="val text-warning"><?= number_format((int)$stats['pending_expenses']) ?></span>
                </div>
            </div>
        </div>

        <!-- Quick Action Buttons -->
        <div class="card-custom">
            <h6 class="fw-bold mb-3"><i class="bi bi-lightning-charge text-warning"></i> Branch Quick Actions</h6>
            <div class="d-flex flex-wrap gap-2">
                <button class="btn btn-primary btn-sm fw-bold" data-bs-toggle="modal" data-bs-target="#registerClientModal"><i class="bi bi-person-plus"></i> Register New Client</button>
                <button class="btn btn-success btn-sm fw-bold" data-bs-toggle="modal" data-bs-target="#applyLoanModal"><i class="bi bi-cash-stack"></i> Submit Loan Application</button>
                <button class="btn btn-danger btn-sm fw-bold" data-bs-toggle="modal" data-bs-target="#expenseModal"><i class="bi bi-cart-dash"></i> Submit Expense</button>
                <button class="btn btn-info btn-sm fw-bold text-white" data-bs-toggle="modal" data-bs-target="#repaymentModal"><i class="bi bi-receipt"></i> Record Repayment</button>
            </div>
        </div>

        <!-- Recent Branch Loans -->
        <div class="card-custom">
            <h6 class="fw-bold mb-3"><i class="bi bi-clock-history"></i> Recent Active Loans (Branch Context)</h6>
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead><tr><th>Loan #</th><th>Client</th><th>Branch</th><th>Amount</th><th>Total Payable</th><th>Balance</th><th>Status</th></tr></thead>
                    <tbody>
                        <?php if (empty($loans)): ?>
                            <tr><td colspan="7" class="text-center text-muted py-4">No loans found in current branch scope.</td></tr>
                        <?php else: ?>
                            <?php foreach (array_slice($loans, 0, 8) as $l): ?>
                                <tr>
                                    <td><strong><?= e($l['loan_number']) ?></strong></td>
                                    <td><?= e($l['client_name']) ?></td>
                                    <td><span class="badge bg-light text-dark border"><?= e($l['branch_name']) ?></span></td>
                                    <td><?= formatMoney($l['amount'], $currency) ?></td>
                                    <td><?= formatMoney($l['total_payable'], $currency) ?></td>
                                    <td class="text-danger fw-bold"><?= formatMoney($l['balance'], $currency) ?></td>
                                    <td><span class="badge bg-<?= $l['status'] === 'active' ? 'success' : ($l['status'] === 'pending' ? 'warning' : 'secondary') ?>"><?= strtoupper($l['status']) ?></span></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>

    <!-- ============================================== -->
    <!-- VIEW: CLIENTS WITH "GRANT LOAN" BUTTON         -->
    <!-- ============================================== -->
    <?php if ($view === 'clients'): ?>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="fw-bold m-0"><i class="bi bi-people-fill text-primary"></i> Client Directory</h4>
            <button class="btn btn-primary btn-sm fw-bold" data-bs-toggle="modal" data-bs-target="#registerClientModal"><i class="bi bi-person-plus"></i> Register Client</button>
        </div>

        <div class="card-custom">
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead><tr><th>Client #</th><th>Full Name</th><th>Phone</th><th>Branch</th><th>Location</th><th>Actions</th></tr></thead>
                    <tbody>
                        <?php if (empty($clients)): ?>
                            <tr><td colspan="6" class="text-center text-muted py-4">No clients registered under current branch.</td></tr>
                        <?php else: ?>
                            <?php foreach ($clients as $c): ?>
                                <tr>
                                    <td><strong><?= e($c['client_number']) ?></strong></td>
                                    <td><?= e($c['full_name']) ?></td>
                                    <td><?= e($c['phone']) ?></td>
                                    <td><span class="badge bg-light text-dark border"><?= e($c['branch_name']) ?></span></td>
                                    <td><?= e(($c['district'] ?? '') . ', ' . ($c['region'] ?? '')) ?></td>
                                    <td>
                                        <!-- GRANT LOAN BUTTON: Authorized Head Office directly grants, Branch submits application -->
                                        <?php if ($isHeadOfficeUser): ?>
                                            <button class="btn btn-sm btn-success fw-bold" onclick="openGrantLoanModal(<?= $c['id'] ?>, '<?= e(addslashes($c['full_name'])) ?>', '<?= e($c['client_number']) ?>', '<?= e($c['branch_name']) ?>')">
                                                <i class="bi bi-cash-coin"></i> GRANT LOAN
                                            </button>
                                        <?php else: ?>
                                            <button class="btn btn-sm btn-outline-primary" onclick="openApplyLoanModal(<?= $c['id'] ?>, '<?= e(addslashes($c['full_name'])) ?>')">
                                                <i class="bi bi-file-earmark-plus"></i> Apply Loan
                                            </button>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>

    <!-- ============================================== -->
    <!-- VIEW: HEAD OFFICE LOAN APPROVALS               -->
    <!-- ============================================== -->
    <?php if ($view === 'loan_approvals' && $isHeadOfficeUser): ?>
        <h4 class="fw-bold mb-3"><i class="bi bi-clipboard-check text-primary"></i> Pending Loan Approvals (Head Office Review)</h4>
        <div class="card-custom">
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead><tr><th>Loan #</th><th>Client</th><th>Branch</th><th>Amount</th><th>Duration</th><th>Applied By</th><th>Action</th></tr></thead>
                    <tbody>
                        <?php if (empty($pendingLoans)): ?>
                            <tr><td colspan="7" class="text-center text-muted py-4">No pending loan applications requiring Head Office review.</td></tr>
                        <?php else: ?>
                            <?php foreach ($pendingLoans as $pl): ?>
                                <tr>
                                    <td><strong><?= e($pl['loan_number']) ?></strong></td>
                                    <td><?= e($pl['client_name']) ?></td>
                                    <td><span class="badge bg-light text-dark border"><?= e($pl['branch_name']) ?></span></td>
                                    <td class="fw-bold text-primary"><?= formatMoney($pl['amount'], $currency) ?></td>
                                    <td><?= $pl['duration_months'] ?> Months</td>
                                    <td><?= e($pl['creator_name'] ?? 'Branch Staff') ?></td>
                                    <td>
                                        <form method="POST" class="d-inline">
                                            <input type="hidden" name="action" value="ho_approve_loan">
                                            <input type="hidden" name="loan_id" value="<?= $pl['id'] ?>">
                                            <button type="submit" class="btn btn-sm btn-success fw-bold" onclick="return confirm('Approve this loan application?')"><i class="bi bi-check-lg"></i> Approve</button>
                                        </form>
                                        <form method="POST" class="d-inline ms-1">
                                            <input type="hidden" name="action" value="ho_reject_loan">
                                            <input type="hidden" name="loan_id" value="<?= $pl['id'] ?>">
                                            <button type="submit" class="btn btn-sm btn-danger fw-bold" onclick="return confirm('Reject this loan application?')"><i class="bi bi-x-lg"></i> Reject</button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>

    <!-- ============================================== -->
    <!-- VIEW: HEAD OFFICE EXPENSE APPROVALS            -->
    <!-- ============================================== -->
    <?php if ($view === 'expense_approvals' && $isHeadOfficeUser): ?>
        <h4 class="fw-bold mb-3"><i class="bi bi-cart-check text-warning"></i> Pending Expense Approvals (Head Office Review)</h4>
        <div class="card-custom">
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead><tr><th>Date</th><th>Branch</th><th>Category</th><th>Description</th><th>Amount</th><th>Receipt</th><th>Action</th></tr></thead>
                    <tbody>
                        <?php if (empty($pendingExpenses)): ?>
                            <tr><td colspan="7" class="text-center text-muted py-4">No pending branch expenses requiring review.</td></tr>
                        <?php else: ?>
                            <?php foreach ($pendingExpenses as $pe): ?>
                                <tr>
                                    <td><?= date('M d, Y', strtotime($pe['expense_date'])) ?></td>
                                    <td><span class="badge bg-light text-dark border"><?= e($pe['branch_name']) ?></span></td>
                                    <td><?= e($pe['category']) ?></td>
                                    <td><?= e($pe['description']) ?></td>
                                    <td class="text-danger fw-bold"><?= formatMoney($pe['amount'], $currency) ?></td>
                                    <td>
                                        <?php if (!empty($pe['document_path'])): ?>
                                            <a href="<?= e($pe['document_path']) ?>" target="_blank" class="btn btn-sm btn-outline-info"><i class="bi bi-file-earmark-text"></i> View</a>
                                        <?php else: ?>-<?php endif; ?>
                                    </td>
                                    <td>
                                        <form method="POST" class="d-inline">
                                            <input type="hidden" name="action" value="ho_approve_expense">
                                            <input type="hidden" name="expense_id" value="<?= $pe['id'] ?>">
                                            <button type="submit" class="btn btn-sm btn-success fw-bold" onclick="return confirm('Approve this expense?')"><i class="bi bi-check-lg"></i> Approve</button>
                                        </form>
                                        <form method="POST" class="d-inline ms-1">
                                            <input type="hidden" name="action" value="ho_reject_expense">
                                            <input type="hidden" name="expense_id" value="<?= $pe['id'] ?>">
                                            <button type="submit" class="btn btn-sm btn-danger fw-bold" onclick="return confirm('Reject this expense?')"><i class="bi bi-x-lg"></i> Reject</button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>

    <!-- ============================================== -->
    <!-- VIEW: REPAYMENTS & EXPENSES & REPORTS          -->
    <!-- ============================================== -->
    <?php if ($view === 'repayments'): ?>
        <h4 class="fw-bold mb-3"><i class="bi bi-receipt text-primary"></i> Repayments History (Branch Scope)</h4>
        <div class="card-custom">
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead><tr><th>Date</th><th>Receipt #</th><th>Client</th><th>Loan #</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead>
                    <tbody>
                        <?php if (empty($payments)): ?>
                            <tr><td colspan="7" class="text-center text-muted py-4">No repayments recorded in this branch context.</td></tr>
                        <?php else: ?>
                            <?php foreach ($payments as $p): ?>
                                <tr>
                                    <td><?= date('M d, Y', strtotime($p['payment_date'])) ?></td>
                                    <td><strong><?= e($p['receipt_number']) ?></strong></td>
                                    <td><?= e($p['client_name']) ?></td>
                                    <td><?= e($p['loan_number']) ?></td>
                                    <td class="text-success fw-bold"><?= formatMoney($p['amount'], $currency) ?></td>
                                    <td><?= strtoupper($p['payment_method']) ?></td>
                                    <td><?= e($p['reference'] ?: '-') ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>

    <?php if ($view === 'expenses'): ?>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="fw-bold m-0"><i class="bi bi-cart-dash text-primary"></i> Branch Expenses</h4>
            <button class="btn btn-danger btn-sm fw-bold" data-bs-toggle="modal" data-bs-target="#expenseModal"><i class="bi bi-plus-lg"></i> Submit Expense</button>
        </div>
        <div class="card-custom">
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead><tr><th>Date</th><th>Branch</th><th>Category</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                        <?php if (empty($expenses)): ?>
                            <tr><td colspan="6" class="text-center text-muted py-4">No expenses recorded.</td></tr>
                        <?php else: ?>
                            <?php foreach ($expenses as $x): ?>
                                <tr>
                                    <td><?= date('M d, Y', strtotime($x['expense_date'])) ?></td>
                                    <td><?= e($x['branch_name']) ?></td>
                                    <td><?= e($x['category']) ?></td>
                                    <td><?= e($x['description']) ?></td>
                                    <td class="text-danger fw-bold"><?= formatMoney($x['amount'], $currency) ?></td>
                                    <td>
                                        <span class="badge bg-<?= $x['status'] === 'approved' ? 'success' : ($x['status'] === 'pending' ? 'warning text-dark' : 'danger') ?>">
                                            <?= strtoupper($x['status']) ?>
                                        </span>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    <?php endif; ?>

</div>

<!-- ============================================== -->
<!-- MODALS WITH PROGRESS INDICATORS               -->
<!-- ============================================== -->

<!-- 1. REGISTER CLIENT MODAL -->
<div class="modal fade" id="registerClientModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <form method="POST" enctype="multipart/form-data" id="clientRegForm" onsubmit="handleAjaxUpload(event, 'clientRegForm', 'clientProgressBar', 'clientProgressText')">
                <input type="hidden" name="action" value="register_client">
                <div class="modal-header"><h5 class="modal-title fw-bold">Register New Client (Branch Context)</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                <div class="modal-body">
                    <div class="alert alert-info py-2 small">Branch is automatically assigned from the active working branch: <strong><?= e($active_branch_name) ?></strong></div>
                    <div class="row g-2">
                        <div class="col-md-6 mb-2"><label class="form-label small fw-bold">Full Name *</label><input type="text" name="full_name" class="form-control" required></div>
                        <div class="col-md-6 mb-2"><label class="form-label small fw-bold">Phone Number *</label><input type="tel" name="phone" class="form-control" placeholder="07xxxxxxxx" required></div>
                        <div class="col-md-6 mb-2"><label class="form-label small fw-bold">National ID</label><input type="text" name="national_id" class="form-control"></div>
                        <div class="col-md-6 mb-2"><label class="form-label small fw-bold">Gender</label><select name="gender" class="form-select"><option value="male">Male</option><option value="female">Female</option></select></div>
                        <div class="col-md-6 mb-2"><label class="form-label small fw-bold">Region</label><input type="text" name="region" class="form-control" placeholder="e.g. Dar es Salaam"></div>
                        <div class="col-md-6 mb-2"><label class="form-label small fw-bold">District</label><input type="text" name="district" class="form-control" placeholder="e.g. Kinondoni"></div>
                        <div class="col-12 mb-2"><label class="form-label small fw-bold">Physical Address</label><input type="text" name="address" class="form-control"></div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label small fw-bold">Profile Picture</label>
                            <input type="file" name="photo" class="form-control" accept="image/*">
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="form-label small fw-bold">ID Document (PDF or Image)</label>
                            <input type="file" name="id_document" class="form-control" accept=".pdf,image/*">
                        </div>
                    </div>

                    <!-- Upload Progress UI -->
                    <div class="upload-progress-box" id="clientProgressBox">
                        <div class="progress" style="height:10px;"><div id="clientProgressBar" class="progress-bar progress-bar-striped progress-bar-animated" style="width:0%;"></div></div>
                        <small id="clientProgressText" class="text-muted fw-bold d-block mt-1">Uploading... 0%</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary fw-bold">Register Client</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- 2. GRANT LOAN MODAL (Head Office Profile Action) -->
<div class="modal fade" id="grantLoanModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <form method="POST">
                <input type="hidden" name="action" value="grant_loan">
                <input type="hidden" name="client_id" id="grantClientId">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title fw-bold"><i class="bi bi-cash-coin"></i> GRANT LOAN (Head Office Authorized)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="p-3 bg-light rounded border mb-3">
                        <div class="fw-bold text-dark" id="grantClientName">Client Name</div>
                        <small class="text-muted" id="grantClientInfo">Client # | Branch</small>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Loan Amount (<?= $currency ?>) *</label>
                        <input type="number" name="amount" class="form-control" min="1000" step="100" required>
                    </div>
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold">Duration (Months) *</label>
                            <input type="number" name="duration_months" class="form-control" value="12" min="1" required>
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold">Interest Rate (%) *</label>
                            <input type="number" name="interest_rate" class="form-control" value="10" step="0.5" required>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Loan Type</label>
                        <select name="loan_type" class="form-select">
                            <option value="personal">Personal Loan</option>
                            <option value="business">Business Loan</option>
                            <option value="emergency">Emergency Loan</option>
                            <option value="salary">Salary Advance</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Purpose</label>
                        <input type="text" name="purpose" class="form-control" placeholder="Loan purpose...">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-success fw-bold" onclick="return confirm('Confirm granting and activating this loan directly?')">Grant Loan Now</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- 3. APPLY FOR LOAN MODAL (Branch Application Workflow) -->
<div class="modal fade" id="applyLoanModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <form method="POST">
                <input type="hidden" name="action" value="submit_loan_application">
                <div class="modal-header"><h5 class="modal-title fw-bold">Submit Loan Application (Head Office Approval Required)</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Select Client *</label>
                        <select name="client_id" class="form-select" id="applyLoanClientSelect" required>
                            <option value="">-- Choose Client --</option>
                            <?php foreach ($clients as $cl): ?>
                                <option value="<?= $cl['id'] ?>"><?= e($cl['full_name']) ?> (<?= e($cl['client_number']) ?>)</option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3"><label class="form-label small fw-bold">Requested Amount *</label><input type="number" name="amount" class="form-control" min="1000" step="100" required></div>
                    <div class="row g-2 mb-3">
                        <div class="col-6"><label class="form-label small fw-bold">Duration (Months)</label><input type="number" name="duration_months" class="form-control" value="12" min="1" required></div>
                        <div class="col-6"><label class="form-label small fw-bold">Interest Rate (%)</label><input type="number" name="interest_rate" class="form-control" value="10" step="0.5" required></div>
                    </div>
                    <div class="mb-3"><label class="form-label small fw-bold">Purpose</label><input type="text" name="purpose" class="form-control"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary fw-bold">Submit for HO Review</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- 4. SUBMIT EXPENSE MODAL (Branch -> Head Office Approval) -->
<div class="modal fade" id="expenseModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <form method="POST" enctype="multipart/form-data" id="expenseForm" onsubmit="handleAjaxUpload(event, 'expenseForm', 'expProgressBar', 'expProgressText')">
                <input type="hidden" name="action" value="submit_expense">
                <div class="modal-header"><h5 class="modal-title fw-bold">Submit Branch Expense (Requires HO Approval)</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                <div class="modal-body">
                    <div class="mb-3"><label class="form-label small fw-bold">Category *</label><input type="text" name="category" class="form-control" placeholder="Rent, Utilities, Fuel, Stationery..." required></div>
                    <div class="mb-3"><label class="form-label small fw-bold">Amount (<?= $currency ?>) *</label><input type="number" name="amount" class="form-control" min="100" step="50" required></div>
                    <div class="mb-3"><label class="form-label small fw-bold">Description</label><textarea name="description" class="form-control" rows="2"></textarea></div>
                    <div class="mb-3"><label class="form-label small fw-bold">Receipt / Supporting Document</label><input type="file" name="receipt_file" class="form-control" accept="image/*,.pdf"></div>
                    <div class="upload-progress-box" id="expProgressBox">
                        <div class="progress" style="height:10px;"><div id="expProgressBar" class="progress-bar progress-bar-striped progress-bar-animated" style="width:0%;"></div></div>
                        <small id="expProgressText" class="text-muted fw-bold d-block mt-1">Uploading... 0%</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-danger fw-bold">Submit Expense</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- 5. RECORD REPAYMENT MODAL -->
<div class="modal fade" id="repaymentModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <form method="POST">
                <input type="hidden" name="action" value="record_repayment">
                <div class="modal-header"><h5 class="modal-title fw-bold">Record Repayment</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Select Active Loan *</label>
                        <select name="loan_id" class="form-select" required>
                            <option value="">-- Choose Active Loan --</option>
                            <?php foreach ($loans as $l): ?>
                                <?php if ($l['status'] === 'active'): ?>
                                    <option value="<?= $l['id'] ?>"><?= e($l['loan_number']) ?> - <?= e($l['client_name']) ?> (Bal: <?= formatMoney($l['balance'], $currency) ?>)</option>
                                <?php endif; ?>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3"><label class="form-label small fw-bold">Repayment Amount (<?= $currency ?>) *</label><input type="number" name="amount" class="form-control" min="100" step="50" required></div>
                    <div class="mb-3"><label class="form-label small fw-bold">Payment Method</label><select name="payment_method" class="form-select"><option value="cash">Cash</option><option value="mobile_money">Mobile Money (M-Pesa / Tigo / Airtel)</option><option value="bank_transfer">Bank Transfer</option></select></div>
                    <div class="mb-3"><label class="form-label small fw-bold">Payment Reference</label><input type="text" name="reference" class="form-control" placeholder="Transaction ID or Receipt Ref"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-success fw-bold">Save Repayment</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script>
function openGrantLoanModal(clientId, clientName, clientNumber, branchName) {
    document.getElementById('grantClientId').value = clientId;
    document.getElementById('grantClientName').textContent = clientName;
    document.getElementById('grantClientInfo').textContent = `${clientNumber} | ${branchName}`;
    new bootstrap.Modal(document.getElementById('grantLoanModal')).show();
}

function openApplyLoanModal(clientId, clientName) {
    const sel = document.getElementById('applyLoanClientSelect');
    if (sel) sel.value = clientId;
    new bootstrap.Modal(document.getElementById('applyLoanModal')).show();
}

// Reusable Ajax Upload Progress Handler
function handleAjaxUpload(event, formId, barId, textId) {
    const form = document.getElementById(formId);
    const files = form.querySelectorAll('input[type="file"]');
    let hasFile = false;
    files.forEach(f => { if (f.files.length > 0) hasFile = true; });

    if (!hasFile) {
        return true; // proceed with standard submission
    }

    event.preventDefault();
    const box = form.querySelector('.upload-progress-box');
    const bar = document.getElementById(barId);
    const txt = document.getElementById(textId);
    if (box) box.style.display = 'block';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', form.action || 'dashboard.php', true);

    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            bar.style.width = percent + '%';
            txt.textContent = `Uploading... ${percent}%`;
        }
    };

    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
            txt.textContent = 'Upload completed successfully! Reloading...';
            bar.classList.remove('progress-bar-animated');
            bar.classList.add('bg-success');
            setTimeout(() => { window.location.reload(); }, 600);
        } else {
            txt.textContent = 'Upload failed with status ' + xhr.status;
            bar.classList.add('bg-danger');
        }
    };

    xhr.onerror = function() {
        txt.textContent = 'Network upload error.';
        bar.classList.add('bg-danger');
    };

    const formData = new FormData(form);
    xhr.send(formData);
}
</script>
</body>
</html>
