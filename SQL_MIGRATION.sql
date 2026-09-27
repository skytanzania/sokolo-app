-- ============================================================
-- SOKOLO TECH - DATABASE MIGRATION SCRIPT
-- Branch Management, Approval Workflows & Document Management
-- ============================================================

-- 1. Ensure Branches Table has Main Branch & Identity Columns
ALTER TABLE `branches`
    ADD COLUMN IF NOT EXISTS `code` VARCHAR(50) DEFAULT NULL AFTER `name`,
    ADD COLUMN IF NOT EXISTS `region` VARCHAR(100) DEFAULT NULL AFTER `address`,
    ADD COLUMN IF NOT EXISTS `district` VARCHAR(100) DEFAULT NULL AFTER `region`,
    ADD COLUMN IF NOT EXISTS `is_main_branch` TINYINT(1) DEFAULT 0 AFTER `manager_name`,
    ADD COLUMN IF NOT EXISTS `status` ENUM('active','inactive') DEFAULT 'active' AFTER `is_main_branch`;

-- 2. Ensure Clients Table has Branch and Document Columns
ALTER TABLE `clients`
    ADD COLUMN IF NOT EXISTS `branch_id` INT NOT NULL DEFAULT 1 AFTER `company_id`,
    ADD COLUMN IF NOT EXISTS `client_number` VARCHAR(50) DEFAULT NULL AFTER `branch_id`,
    ADD COLUMN IF NOT EXISTS `region` VARCHAR(100) DEFAULT NULL AFTER `address`,
    ADD COLUMN IF NOT EXISTS `district` VARCHAR(100) DEFAULT NULL AFTER `region`,
    ADD COLUMN IF NOT EXISTS `photo` VARCHAR(255) DEFAULT NULL AFTER `marital_status`,
    ADD COLUMN IF NOT EXISTS `id_document` VARCHAR(255) DEFAULT NULL AFTER `photo`,
    ADD INDEX IF NOT EXISTS `idx_client_branch` (`branch_id`),
    ADD INDEX IF NOT EXISTS `idx_client_company` (`company_id`);

-- 3. Ensure Loans Table has Head Office Approval & Fee Columns
ALTER TABLE `loans`
    ADD COLUMN IF NOT EXISTS `branch_id` INT NOT NULL DEFAULT 1 AFTER `company_id`,
    ADD COLUMN IF NOT EXISTS `loan_type` VARCHAR(50) DEFAULT 'personal' AFTER `loan_number`,
    ADD COLUMN IF NOT EXISTS `processing_fee` DECIMAL(15,2) DEFAULT 0.00 AFTER `repayment_frequency`,
    ADD COLUMN IF NOT EXISTS `processing_fee_type` ENUM('percentage','fixed') DEFAULT 'percentage' AFTER `processing_fee`,
    ADD COLUMN IF NOT EXISTS `insurance_fee` DECIMAL(15,2) DEFAULT 0.00 AFTER `processing_fee_type`,
    ADD COLUMN IF NOT EXISTS `insurance_fee_type` ENUM('percentage','fixed') DEFAULT 'percentage' AFTER `insurance_fee`,
    ADD COLUMN IF NOT EXISTS `service_fee` DECIMAL(15,2) DEFAULT 0.00 AFTER `insurance_fee_type`,
    ADD COLUMN IF NOT EXISTS `other_fees` DECIMAL(15,2) DEFAULT 0.00 AFTER `service_fee`,
    ADD COLUMN IF NOT EXISTS `total_fees` DECIMAL(15,2) DEFAULT 0.00 AFTER `other_fees`,
    ADD COLUMN IF NOT EXISTS `net_disbursement` DECIMAL(15,2) DEFAULT 0.00 AFTER `total_fees`,
    ADD COLUMN IF NOT EXISTS `fees_collected` DECIMAL(15,2) DEFAULT 0.00 AFTER `penalty_paid`,
    ADD COLUMN IF NOT EXISTS `approved_by` INT DEFAULT NULL AFTER `due_date`,
    ADD COLUMN IF NOT EXISTS `approval_date` DATE DEFAULT NULL AFTER `approved_by`,
    ADD COLUMN IF NOT EXISTS `approval_notes` TEXT DEFAULT NULL AFTER `approval_date`,
    ADD COLUMN IF NOT EXISTS `rejection_reason` TEXT DEFAULT NULL AFTER `approval_notes`,
    ADD COLUMN IF NOT EXISTS `guarantor_name` VARCHAR(255) DEFAULT NULL AFTER `notes`,
    ADD COLUMN IF NOT EXISTS `guarantor_phone` VARCHAR(50) DEFAULT NULL AFTER `guarantor_name`,
    ADD COLUMN IF NOT EXISTS `guarantor_id` VARCHAR(100) DEFAULT NULL AFTER `guarantor_phone`,
    ADD COLUMN IF NOT EXISTS `guarantor_relationship` VARCHAR(100) DEFAULT NULL AFTER `guarantor_id`,
    ADD COLUMN IF NOT EXISTS `guarantor_address` TEXT DEFAULT NULL AFTER `guarantor_relationship`,
    ADD INDEX IF NOT EXISTS `idx_loan_branch` (`branch_id`),
    ADD INDEX IF NOT EXISTS `idx_loan_status` (`status`);

-- 4. Ensure Expenses Table has Branch Association & Head Office Approval Columns
ALTER TABLE `expenses`
    ADD COLUMN IF NOT EXISTS `branch_id` INT NOT NULL DEFAULT 1 AFTER `company_id`,
    ADD COLUMN IF NOT EXISTS `status` ENUM('pending','approved','rejected') DEFAULT 'pending' AFTER `reference`,
    ADD COLUMN IF NOT EXISTS `approved_by` INT DEFAULT NULL AFTER `status`,
    ADD COLUMN IF NOT EXISTS `approved_at` TIMESTAMP NULL DEFAULT NULL AFTER `approved_by`,
    ADD COLUMN IF NOT EXISTS `rejection_reason` TEXT DEFAULT NULL AFTER `approved_at`,
    ADD COLUMN IF NOT EXISTS `approval_notes` TEXT DEFAULT NULL AFTER `rejection_reason`,
    ADD COLUMN IF NOT EXISTS `document_path` VARCHAR(255) DEFAULT NULL AFTER `approval_notes`,
    ADD INDEX IF NOT EXISTS `idx_expense_branch` (`branch_id`),
    ADD INDEX IF NOT EXISTS `idx_expense_status` (`status`);

-- 5. Documents Table for upload progress and validation
CREATE TABLE IF NOT EXISTS `documents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `company_id` INT NOT NULL,
    `branch_id` INT NOT NULL,
    `client_id` INT DEFAULT NULL,
    `loan_id` INT DEFAULT NULL,
    `expense_id` INT DEFAULT NULL,
    `document_type` VARCHAR(100) NOT NULL,
    `document_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` INT DEFAULT 0,
    `mime_type` VARCHAR(100) DEFAULT NULL,
    `uploaded_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_doc_branch` (`branch_id`),
    INDEX `idx_doc_client` (`client_id`),
    INDEX `idx_doc_loan` (`loan_id`),
    INDEX `idx_doc_expense` (`expense_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
