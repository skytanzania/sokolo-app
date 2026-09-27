import React, { useState, useEffect, useMemo, useRef } from 'react';

const APP_NAME = 'SOKOLO TECH';
import {
  Building2, Users, CreditCard, Receipt, FileText, BarChart3,
  MessageSquare, ShieldCheck, CheckCircle2, XCircle, Clock,
  ArrowRightLeft, Plus, Search, Filter, Eye, Printer, Download,
  Upload, AlertTriangle, ChevronDown, Check, DollarSign,
  Briefcase, Phone, Mail, MapPin, Calendar, Lock, ShieldAlert,
  HelpCircle, RefreshCw, FileCheck2, Send, Trash2, UserCheck,
  AlertCircle, ChevronRight, Sparkles
} from 'lucide-react';

// ==========================================
// TYPES & DATA STRUCTURES
// ==========================================

export type UserRole = 'company_admin' | 'branch_manager' | 'loan_officer' | 'cashier';

export interface Branch {
  id: number;
  name: string;
  code: string;
  location: string;
  isMainBranch: boolean;
  status: 'active' | 'inactive';
  manager: string;
  phone: string;
}

export interface Client {
  id: number;
  branchId: number;
  clientNumber: string;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  location: string;
  occupation: string;
  gender: 'male' | 'female';
  dob: string;
  photoUrl?: string;
  idDocUrl?: string;
  creditScore: number;
  createdAt: string;
}

export interface Loan {
  id: number;
  branchId: number;
  clientId: number;
  loanNumber: string;
  loanType: 'personal' | 'business' | 'emergency' | 'agriculture' | 'salary';
  amount: number;
  interestRate: number;
  durationMonths: number;
  repaymentFrequency: 'monthly' | 'weekly';
  totalInterest: number;
  totalFees: number;
  totalPayable: number;
  amountPaid: number;
  balance: number;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'rejected';
  purpose: string;
  applicationDate: string;
  approvalDate?: string;
  approvedBy?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  disbursedDate?: string;
}

export interface Expense {
  id: number;
  branchId: number;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  recordedBy: string;
  approvedBy?: string;
  approvalNotes?: string;
  rejectionReason?: string;
}

export interface Payment {
  id: number;
  branchId: number;
  loanId: number;
  clientId: number;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  collectedBy: string;
}

export interface AuditLog {
  id: number;
  user: string;
  role: string;
  branchName: string;
  action: string;
  details: string;
  timestamp: string;
}

// Initial Mock Branches
const INITIAL_BRANCHES: Branch[] = [
  { id: 1, name: 'Head Office (Dar es Salaam HQ)', code: 'HQ-DAR', location: 'Ilala, Dar es Salaam', isMainBranch: true, status: 'active', manager: 'Juma Mkwawa', phone: '+255 712 345 678' },
  { id: 2, name: 'Arusha Branch', code: 'BR-ARU', location: 'Kaloleni, Arusha', isMainBranch: false, status: 'active', manager: 'David Mollel', phone: '+255 754 112 233' },
  { id: 3, name: 'Dodoma City Branch', code: 'BR-DOM', location: 'Kikuyu, Dodoma', isMainBranch: false, status: 'active', manager: 'Fatma Salum', phone: '+255 765 998 877' },
  { id: 4, name: 'Mwanza Lake Branch', code: 'BR-MZA', location: 'Nyamagana, Mwanza', isMainBranch: false, status: 'active', manager: 'Emanuel Joseph', phone: '+255 784 445 566' },
];

// Initial Mock Clients
const INITIAL_CLIENTS: Client[] = [
  {
    id: 101, branchId: 1, clientNumber: 'CL-DAR-001', fullName: 'Baraka Mohamed Ali',
    nationalId: '19850412-11101-00001', phone: '+255 713 001 122', email: 'baraka@example.com',
    location: 'Kinondoni, Dar es Salaam', occupation: 'Hardware Store Retailer', gender: 'male',
    dob: '1985-04-12', creditScore: 82, createdAt: '2026-01-10'
  },
  {
    id: 102, branchId: 1, clientNumber: 'CL-DAR-002', fullName: 'Neema Zawadi Mwangi',
    nationalId: '19920824-11102-00002', phone: '+255 715 334 455', email: 'neema@example.com',
    location: 'Temeke, Dar es Salaam', occupation: 'Textile Tailor', gender: 'female',
    dob: '1992-08-24', creditScore: 78, createdAt: '2026-02-05'
  },
  {
    id: 201, branchId: 2, clientNumber: 'CL-ARU-001', fullName: 'Lukas Sokoine Mollel',
    nationalId: '19881103-22101-00003', phone: '+255 754 778 899', email: 'lukas@example.com',
    location: 'Meru, Arusha', occupation: 'Dairy Farmer', gender: 'male',
    dob: '1988-11-03', creditScore: 85, createdAt: '2026-01-15'
  },
  {
    id: 202, branchId: 2, clientNumber: 'CL-ARU-002', fullName: 'Grace Tumaini Kimaro',
    nationalId: '19940315-22102-00004', phone: '+255 756 221 100', email: 'grace@example.com',
    location: 'Unga Limited, Arusha', occupation: 'Coffee Barista Shop', gender: 'female',
    dob: '1994-03-15', creditScore: 74, createdAt: '2026-03-01'
  },
  {
    id: 301, branchId: 3, clientNumber: 'CL-DOM-001', fullName: 'Hassan Juma Bakari',
    nationalId: '19810620-33101-00005', phone: '+255 767 114 433', email: 'hassan@example.com',
    location: 'Chamwino, Dodoma', occupation: 'Grape Vineyard Owner', gender: 'male',
    dob: '1981-06-20', creditScore: 88, createdAt: '2026-02-12'
  },
  {
    id: 401, branchId: 4, clientNumber: 'CL-MZA-001', fullName: 'Rehema Kasimu Masanja',
    nationalId: '19900910-44101-00006', phone: '+255 784 887 766', email: 'rehema@example.com',
    location: 'Ilemela, Mwanza', occupation: 'Fish Processing Trader', gender: 'female',
    dob: '1990-09-10', creditScore: 80, createdAt: '2026-02-28'
  },
];

// Initial Mock Loans
const INITIAL_LOANS: Loan[] = [
  {
    id: 1001, branchId: 1, clientId: 101, loanNumber: 'LN-DAR-8841', loanType: 'business',
    amount: 5000000, interestRate: 12, durationMonths: 12, repaymentFrequency: 'monthly',
    totalInterest: 600000, totalFees: 150000, totalPayable: 5600000, amountPaid: 2800000,
    balance: 2800000, status: 'active', purpose: 'Hardware store inventory expansion',
    applicationDate: '2026-01-12', approvalDate: '2026-01-14', approvedBy: 'Juma Mkwawa (Head Office)',
    disbursedDate: '2026-01-15'
  },
  {
    id: 1002, branchId: 1, clientId: 102, loanNumber: 'LN-DAR-8842', loanType: 'personal',
    amount: 1500000, interestRate: 10, durationMonths: 6, repaymentFrequency: 'monthly',
    totalInterest: 75000, totalFees: 45000, totalPayable: 1575000, amountPaid: 1575000,
    balance: 0, status: 'completed', purpose: 'Sewing equipment purchase',
    applicationDate: '2026-02-08', approvalDate: '2026-02-09', approvedBy: 'Juma Mkwawa (Head Office)',
    disbursedDate: '2026-02-10'
  },
  {
    id: 2001, branchId: 2, clientId: 201, loanNumber: 'LN-ARU-9011', loanType: 'agriculture',
    amount: 4000000, interestRate: 10, durationMonths: 12, repaymentFrequency: 'monthly',
    totalInterest: 400000, totalFees: 120000, totalPayable: 4400000, amountPaid: 1100000,
    balance: 3300000, status: 'active', purpose: 'Dairy cow feed and milker machine',
    applicationDate: '2026-01-20', approvalDate: '2026-01-22', approvedBy: 'Juma Mkwawa (Head Office)',
    disbursedDate: '2026-01-25'
  },
  {
    id: 2002, branchId: 2, clientId: 202, loanNumber: 'LN-ARU-9012', loanType: 'business',
    amount: 2500000, interestRate: 12, durationMonths: 8, repaymentFrequency: 'monthly',
    totalInterest: 200000, totalFees: 75000, totalPayable: 2700000, amountPaid: 0,
    balance: 2700000, status: 'pending', purpose: 'Coffee shop espresso grinder and seating upgrade',
    applicationDate: '2026-03-24'
  },
  {
    id: 3001, branchId: 3, clientId: 301, loanNumber: 'LN-DOM-7721', loanType: 'agriculture',
    amount: 6000000, interestRate: 10, durationMonths: 12, repaymentFrequency: 'monthly',
    totalInterest: 600000, totalFees: 180000, totalPayable: 6600000, amountPaid: 0,
    balance: 6600000, status: 'pending', purpose: 'Irrigation pump and trellis wires',
    applicationDate: '2026-03-26'
  },
];

// Initial Mock Expenses
const INITIAL_EXPENSES: Expense[] = [
  {
    id: 501, branchId: 2, category: 'Branch Utilities', description: 'Electric power tokens & broadband internet',
    amount: 280000, expenseDate: '2026-03-20', paymentMethod: 'Mobile Money (M-Pesa)', status: 'pending',
    recordedBy: 'David Mollel (Arusha)'
  },
  {
    id: 502, branchId: 3, category: 'Stationery', description: 'Loan application paper booklets & receipt rolls',
    amount: 145000, expenseDate: '2026-03-22', paymentMethod: 'Cash', status: 'pending',
    recordedBy: 'Fatma Salum (Dodoma)'
  },
  {
    id: 503, branchId: 1, category: 'Office Rent', description: 'Monthly HQ commercial premise lease',
    amount: 1800000, expenseDate: '2026-03-01', paymentMethod: 'Bank Transfer (CRDB)', status: 'approved',
    recordedBy: 'Sarah Kimaro (Head Office)', approvedBy: 'Juma Mkwawa (Head Office)'
  }
];

export default function App() {
  // Current active user & role simulation
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string; role: UserRole; branchId: number }>({
    id: 1,
    name: 'Juma Mkwawa',
    role: 'company_admin', // Head Office Admin by default
    branchId: 1
  });

  // State: Branches, Clients, Loans, Expenses, Payments, Audit Logs
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [loans, setLoans] = useState<Loan[]>(INITIAL_LOANS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 1, user: 'Juma Mkwawa', role: 'Head Office Admin', branchName: 'Head Office (Dar es Salaam HQ)',
      action: 'SYSTEM_STARTUP', details: 'Initialized branch isolation and loan approval workflow.',
      timestamp: '2026-09-27 08:30:15'
    }
  ]);

  // Active Branch Context:
  // null = Head Office View (All branches aggregated or HQ context)
  // number = Specific branch view (Branch A, Branch B, etc.)
  const [activeBranchId, setActiveBranchId] = useState<number | null>(() => {
    const saved = localStorage.getItem('sokolo_active_branch_id');
    return saved !== null ? (saved === 'null' ? null : Number(saved)) : null;
  });

  // Persist branch context
  useEffect(() => {
    localStorage.setItem('sokolo_active_branch_id', activeBranchId === null ? 'null' : String(activeBranchId));
  }, [activeBranchId]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'loans' | 'approvals' | 'expenses' | 'sms' | 'idcards' | 'audit'>('dashboard');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedClientForProfile, setSelectedClientForProfile] = useState<Client | null>(null);
  const [grantLoanModalOpen, setGrantLoanModalOpen] = useState(false);
  const [grantLoanTargetClient, setGrantLoanTargetClient] = useState<Client | null>(null);
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [newExpenseModalOpen, setNewExpenseModalOpen] = useState(false);
  const [reviewLoanModalTarget, setReviewLoanModalTarget] = useState<Loan | null>(null);
  const [reviewExpenseModalTarget, setReviewExpenseModalTarget] = useState<Expense | null>(null);

  // File upload progress state for upload simulation
  const [uploadProgress, setUploadProgress] = useState<{ active: boolean; percent: number; label: string; status: 'idle' | 'uploading' | 'success' | 'error' }>({
    active: false,
    percent: 0,
    label: '',
    status: 'idle'
  });

  // Add audit log helper
  const addAuditLog = (action: string, details: string) => {
    const activeBranchName = activeBranchId
      ? branches.find(b => b.id === activeBranchId)?.name || 'Branch'
      : 'Head Office';
    const newEntry: AuditLog = {
      id: Date.now(),
      user: currentUser.name,
      role: currentUser.role === 'company_admin' ? 'Head Office Admin' : 'Branch Staff',
      branchName: activeBranchName,
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setAuditLogs(prev => [newEntry, ...prev]);
  };

  // Switch role helper for testing
  const switchUserRole = (newRole: UserRole, branchId: number, name: string) => {
    setCurrentUser({ id: Date.now(), name, role: newRole, branchId });
    if (newRole !== 'company_admin') {
      // Branch user is strictly locked to their branch
      setActiveBranchId(branchId);
    }
    addAuditLog('ROLE_SWITCH', `Switched session to ${name} (${newRole}) on branch ${branchId}`);
  };

  // Branch switcher logic
  const handleBranchSwitch = (targetBranchId: number | null) => {
    // If not head office user, enforce branch lock
    if (currentUser.role !== 'company_admin' && targetBranchId !== currentUser.branchId) {
      alert("Permission Denied: Branch users cannot switch to other branch contexts.");
      return;
    }
    setActiveBranchId(targetBranchId);
    const bName = targetBranchId ? branches.find(b => b.id === targetBranchId)?.name : 'Head Office (All Branches)';
    addAuditLog('BRANCH_SWITCH', `Active branch context changed to: ${bName}`);
  };

  // Data Filtering by Active Branch Context (Strict Branch Data Isolation)
  const filteredClients = useMemo(() => {
    let result = clients;
    if (activeBranchId !== null) {
      result = result.filter(c => c.branchId === activeBranchId);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(c => c.fullName.toLowerCase().includes(q) || c.clientNumber.toLowerCase().includes(q) || c.phone.includes(q));
    }
    return result;
  }, [clients, activeBranchId, searchTerm]);

  const filteredLoans = useMemo(() => {
    let result = loans;
    if (activeBranchId !== null) {
      result = result.filter(l => l.branchId === activeBranchId);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(l => l.loanNumber.toLowerCase().includes(q) || l.purpose.toLowerCase().includes(q));
    }
    return result;
  }, [loans, activeBranchId, searchTerm]);

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (activeBranchId !== null) {
      result = result.filter(e => e.branchId === activeBranchId);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(e => e.category.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }
    return result;
  }, [expenses, activeBranchId, searchTerm]);

  // Pending items requiring Head Office approval
  const pendingLoansList = useMemo(() => {
    if (activeBranchId !== null) {
      return loans.filter(l => l.status === 'pending' && l.branchId === activeBranchId);
    }
    return loans.filter(l => l.status === 'pending');
  }, [loans, activeBranchId]);

  const pendingExpensesList = useMemo(() => {
    if (activeBranchId !== null) {
      return expenses.filter(e => e.status === 'pending' && e.branchId === activeBranchId);
    }
    return expenses.filter(e => e.status === 'pending');
  }, [expenses, activeBranchId]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const branchLoans = activeBranchId ? loans.filter(l => l.branchId === activeBranchId) : loans;
    const branchClients = activeBranchId ? clients.filter(c => c.branchId === activeBranchId) : clients;
    const branchExpenses = activeBranchId ? expenses.filter(e => e.branchId === activeBranchId) : expenses;

    const totalDisbursed = branchLoans.filter(l => l.status === 'active' || l.status === 'completed').reduce((sum, l) => sum + l.amount, 0);
    const totalCollected = branchLoans.reduce((sum, l) => sum + l.amountPaid, 0);
    const totalOutstanding = branchLoans.filter(l => l.status === 'active').reduce((sum, l) => sum + l.balance, 0);
    const approvedExpenses = branchExpenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);

    return {
      clientCount: branchClients.length,
      activeLoansCount: branchLoans.filter(l => l.status === 'active').length,
      pendingLoansCount: branchLoans.filter(l => l.status === 'pending').length,
      pendingExpensesCount: branchExpenses.filter(e => e.status === 'pending').length,
      totalDisbursed,
      totalCollected,
      totalOutstanding,
      approvedExpenses
    };
  }, [activeBranchId, clients, loans, expenses]);

  // Simulated Asynchronous File Upload with Progress Tracking
  const simulateFileUpload = (fileLabel: string, callback: () => void) => {
    setUploadProgress({ active: true, percent: 0, label: fileLabel, status: 'uploading' });
    let p = 0;
    const interval = setInterval(() => {
      p += Math.floor(Math.random() * 20) + 15;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setUploadProgress({ active: true, percent: 100, label: fileLabel, status: 'success' });
        setTimeout(() => {
          setUploadProgress({ active: false, percent: 0, label: '', status: 'idle' });
          callback();
        }, 600);
      } else {
        setUploadProgress({ active: true, percent: p, label: fileLabel, status: 'uploading' });
      }
    }, 120);
  };

  // Action: Head Office directly grants loan (or branch routes to HO application)
  const handleGrantOrApplyLoanSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const amount = Number(formData.get('amount') || 0);
    const duration = Number(formData.get('duration') || 12);
    const rate = Number(formData.get('interest_rate') || 12);
    const loanType = (formData.get('loan_type') as any) || 'personal';
    const purpose = String(formData.get('purpose') || '');
    const isDirectGrantAction = formData.get('action_type') === 'direct_grant';

    if (!grantLoanTargetClient) return;

    if (amount <= 0) {
      alert("Please enter a valid loan amount.");
      return;
    }

    // Permission Enforcement
    if (isDirectGrantAction && currentUser.role !== 'company_admin') {
      alert("Security Violation: Only authorized Head Office personnel can directly grant loans. This application must be submitted for Head Office Review.");
      return;
    }

    const totalInterest = Math.round(amount * (rate / 100) * (duration / 12));
    const totalFees = Math.round(amount * 0.025);
    const totalPayable = amount + totalInterest;

    simulateFileUpload('Supporting Loan Documents', () => {
      const loanNum = `LN-${grantLoanTargetClient.clientNumber.split('-')[1] || 'BR'}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (isDirectGrantAction && currentUser.role === 'company_admin') {
        // Direct Grant by Head Office
        const newLoan: Loan = {
          id: Date.now(),
          branchId: grantLoanTargetClient.branchId,
          clientId: grantLoanTargetClient.id,
          loanNumber: loanNum,
          loanType,
          amount,
          interestRate: rate,
          durationMonths: duration,
          repaymentFrequency: 'monthly',
          totalInterest,
          totalFees,
          totalPayable,
          amountPaid: 0,
          balance: totalPayable,
          status: 'active',
          purpose,
          applicationDate: new Date().toISOString().substring(0, 10),
          approvalDate: new Date().toISOString().substring(0, 10),
          approvedBy: `${currentUser.name} (Head Office)`,
          disbursedDate: new Date().toISOString().substring(0, 10)
        };
        setLoans(prev => [newLoan, ...prev]);
        addAuditLog('GRANT_LOAN', `Directly granted and disbursed loan ${loanNum} of TZS ${amount.toLocaleString()} for client ${grantLoanTargetClient.fullName}`);
        alert(`Loan ${loanNum} of TZS ${amount.toLocaleString()} has been granted and disbursed successfully!`);
      } else {
        // Branch User Loan Submission -> Head Office Review
        const newLoan: Loan = {
          id: Date.now(),
          branchId: grantLoanTargetClient.branchId,
          clientId: grantLoanTargetClient.id,
          loanNumber: loanNum,
          loanType,
          amount,
          interestRate: rate,
          durationMonths: duration,
          repaymentFrequency: 'monthly',
          totalInterest,
          totalFees,
          totalPayable,
          amountPaid: 0,
          balance: totalPayable,
          status: 'pending',
          purpose,
          applicationDate: new Date().toISOString().substring(0, 10)
        };
        setLoans(prev => [newLoan, ...prev]);
        addAuditLog('SUBMIT_LOAN_APPLICATION', `Submitted loan application ${loanNum} for client ${grantLoanTargetClient.fullName} to Head Office queue.`);
        alert(`Loan application ${loanNum} submitted for Head Office Review. Awaiting Head Office approval.`);
      }

      setGrantLoanModalOpen(false);
      setGrantLoanTargetClient(null);
    });
  };

  // Head Office Decision on Loan
  const handleReviewLoanDecision = (decision: 'approved' | 'rejected', notes: string) => {
    if (!reviewLoanModalTarget) return;
    if (currentUser.role !== 'company_admin') {
      alert("Unauthorized: Only Head Office users can approve or reject loans.");
      return;
    }

    setLoans(prev => prev.map(l => {
      if (l.id === reviewLoanModalTarget.id) {
        return {
          ...l,
          status: decision === 'approved' ? 'active' : 'rejected',
          approvalDate: new Date().toISOString().substring(0, 10),
          approvedBy: `${currentUser.name} (Head Office)`,
          approvalNotes: decision === 'approved' ? notes : undefined,
          rejectionReason: decision === 'rejected' ? notes : undefined,
          disbursedDate: decision === 'approved' ? new Date().toISOString().substring(0, 10) : undefined
        };
      }
      return l;
    }));

    addAuditLog(decision === 'approved' ? 'LOAN_APPROVED_HO' : 'LOAN_REJECTED_HO', `${decision.toUpperCase()} loan ${reviewLoanModalTarget.loanNumber}. Notes: ${notes}`);
    setReviewLoanModalTarget(null);
  };

  // Branch submits expense
  const handleExpenseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const category = String(formData.get('category') || 'Operations');
    const description = String(formData.get('description') || '');
    const amount = Number(formData.get('amount') || 0);
    const paymentMethod = String(formData.get('payment_method') || 'Cash');

    const targetBranch = activeBranchId !== null ? activeBranchId : currentUser.branchId;

    if (amount <= 0) {
      alert("Please enter a valid expense amount.");
      return;
    }

    simulateFileUpload('Expense Receipt & Invoices', () => {
      const newExp: Expense = {
        id: Date.now(),
        branchId: targetBranch,
        category,
        description,
        amount,
        expenseDate: new Date().toISOString().substring(0, 10),
        paymentMethod,
        status: 'pending',
        recordedBy: `${currentUser.name} (${branches.find(b => b.id === targetBranch)?.code || 'Branch'})`,
        receiptUrl: 'uploads/receipt_sample.pdf'
      };
      setExpenses(prev => [newExp, ...prev]);
      addAuditLog('SUBMIT_EXPENSE', `Submitted expense of TZS ${amount.toLocaleString()} (${category}) for Head Office review.`);
      alert("Expense submitted successfully! It is now pending Head Office approval.");
      setNewExpenseModalOpen(false);
    });
  };

  // Head Office reviews expense
  const handleReviewExpenseDecision = (decision: 'approved' | 'rejected', notes: string) => {
    if (!reviewExpenseModalTarget) return;
    if (currentUser.role !== 'company_admin') {
      alert("Unauthorized: Only Head Office users can approve or reject expenses.");
      return;
    }

    setExpenses(prev => prev.map(e => {
      if (e.id === reviewExpenseModalTarget.id) {
        return {
          ...e,
          status: decision === 'approved' ? 'approved' : 'rejected',
          approvedBy: `${currentUser.name} (Head Office)`,
          approvalNotes: decision === 'approved' ? notes : undefined,
          rejectionReason: decision === 'rejected' ? notes : undefined
        };
      }
      return e;
    }));

    addAuditLog(decision === 'approved' ? 'EXPENSE_APPROVED_HO' : 'EXPENSE_REJECTED_HO', `${decision.toUpperCase()} expense #${reviewExpenseModalTarget.id} of TZS ${reviewExpenseModalTarget.amount.toLocaleString()}`);
    setReviewExpenseModalTarget(null);
  };

  // Branch Registers Client
  const handleClientRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const fullName = String(formData.get('full_name') || '');
    const nationalId = String(formData.get('national_id') || '');
    const phone = String(formData.get('phone') || '');
    const location = String(formData.get('location') || '');
    const occupation = String(formData.get('occupation') || '');
    const gender = (formData.get('gender') as any) || 'male';
    const dob = String(formData.get('dob') || '1990-01-01');

    // Auto assigned to current branch context
    const branchForClient = activeBranchId !== null ? activeBranchId : currentUser.branchId;

    // Duplicate check
    const existing = clients.find(c => c.phone === phone || (c.nationalId && c.nationalId === nationalId));
    if (existing) {
      alert(`Duplicate Registration Error: A client with phone ${phone} or National ID ${nationalId} already exists (${existing.fullName} in ${branches.find(b => b.id === existing.branchId)?.name}).`);
      return;
    }

    simulateFileUpload('Client Photo & National ID Document', () => {
      const branchCode = branches.find(b => b.id === branchForClient)?.code?.replace('BR-', '') || 'HQ';
      const clientNumber = `CL-${branchCode}-${String(clients.length + 1).padStart(3, '0')}`;

      const newClient: Client = {
        id: Date.now(),
        branchId: branchForClient,
        clientNumber,
        fullName,
        nationalId,
        phone,
        email: `${fullName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        location,
        occupation,
        gender,
        dob,
        creditScore: Math.floor(70 + Math.random() * 25),
        createdAt: new Date().toISOString().substring(0, 10),
        photoUrl: gender === 'female'
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
      };

      setClients(prev => [newClient, ...prev]);
      addAuditLog('REGISTER_CLIENT', `Registered new client ${fullName} (${clientNumber}) under branch ${branchForClient}`);
      alert(`Client ${fullName} successfully registered with ID ${clientNumber} under branch context!`);
      setNewClientModalOpen(false);
    });
  };

  const activeBranchLabel = activeBranchId
    ? branches.find(b => b.id === activeBranchId)?.name || 'Unknown Branch'
    : 'HEAD OFFICE (ALL BRANCHES)';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* ======================================================== */}
      {/* TOP HEADER: Branding, Active Branch Indicator & Switcher */}
      {/* ======================================================== */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 font-black text-xl">
              S
            </div>
            <div>
              <div className="font-extrabold tracking-wider text-base sm:text-lg flex items-center gap-2">
                SOKOLO TECH <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">Enterprise</span>
              </div>
              <div className="text-xs text-slate-400 hidden sm:block">Microfinance Management System v3.7</div>
            </div>
          </div>

          {/* Center: Branch Indicator */}
          <div className="hidden md:flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-sm ${
              activeBranchId === null
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
            }`}>
              <Building2 className="w-3.5 h-3.5" />
              <span>CURRENT BRANCH CONTEXT:</span>
              <span className="uppercase text-white tracking-wide">{activeBranchLabel}</span>
            </div>
          </div>

          {/* Right: Branch Switcher & User Profile */}
          <div className="flex items-center gap-3">
            {/* Branch Switcher Dropdown */}
            <div className="relative group">
              <button
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-2 transition"
                title="Switch Branch Context"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                <span className="max-w-[120px] sm:max-w-[160px] truncate">
                  {activeBranchId === null ? 'HQ - All Branches' : branches.find(b => b.id === activeBranchId)?.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 hidden group-hover:block text-xs">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-700/60">
                  Switch Active Branch Context
                </div>
                {currentUser.role === 'company_admin' ? (
                  <>
                    <button
                      onClick={() => handleBranchSwitch(null)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-700/50 transition ${activeBranchId === null ? 'bg-blue-600/20 text-blue-300 font-bold' : 'text-slate-300'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-amber-400" />
                        HEAD OFFICE (Global All)
                      </span>
                      {activeBranchId === null && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                    {branches.map(b => (
                      <button
                        key={b.id}
                        onClick={() => handleBranchSwitch(b.id)}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-700/50 transition ${activeBranchId === b.id ? 'bg-blue-600/20 text-blue-300 font-bold' : 'text-slate-300'}`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className={`w-2 h-2 rounded-full ${b.isMainBranch ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                          {b.name}
                        </span>
                        {activeBranchId === b.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="px-3 py-2 text-slate-400 italic">
                    Restricted: Branch users are locked to their assigned branch.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Testing Role Switcher */}
            <div className="relative group">
              <button className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">{currentUser.name}</span>
                <span className="text-[10px] bg-blue-500/30 px-1 rounded">{currentUser.role === 'company_admin' ? 'HQ Admin' : 'Branch Staff'}</span>
              </button>

              <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 hidden group-hover:block text-xs">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400">
                  Switch Active Role (Test Approval Rules)
                </div>
                <button
                  onClick={() => switchUserRole('company_admin', 1, 'Juma Mkwawa')}
                  className={`w-full text-left p-2 rounded-lg mt-1 flex flex-col hover:bg-slate-700 transition ${currentUser.role === 'company_admin' ? 'bg-blue-600 text-white' : 'text-slate-200'}`}
                >
                  <span className="font-bold">Juma Mkwawa (Head Office Admin)</span>
                  <span className="text-[10px] opacity-80">Has approval permissions, can GRANT loans directly.</span>
                </button>
                <button
                  onClick={() => switchUserRole('branch_manager', 2, 'David Mollel')}
                  className={`w-full text-left p-2 rounded-lg mt-1 flex flex-col hover:bg-slate-700 transition ${currentUser.role === 'branch_manager' ? 'bg-blue-600 text-white' : 'text-slate-200'}`}
                >
                  <span className="font-bold">David Mollel (Arusha Branch Manager)</span>
                  <span className="text-[10px] opacity-80">Locked to Arusha. Must submit loans/expenses for HO approval.</span>
                </button>
                <button
                  onClick={() => switchUserRole('loan_officer', 3, 'Fatma Salum')}
                  className={`w-full text-left p-2 rounded-lg mt-1 flex flex-col hover:bg-slate-700 transition ${currentUser.role === 'loan_officer' ? 'bg-blue-600 text-white' : 'text-slate-200'}`}
                >
                  <span className="font-bold">Fatma Salum (Dodoma Loan Officer)</span>
                  <span className="text-[10px] opacity-80">Locked to Dodoma. Cannot grant loans independently.</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MOBILE BRANCH INDICATOR                                   */}
      {/* ======================================================== */}
      <div className="md:hidden bg-slate-800 px-4 py-2 border-b border-slate-700 text-xs text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate">
          <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-semibold text-white truncate">{activeBranchLabel}</span>
        </div>
        <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">
          {activeBranchId ? 'BRANCH ISOLATION ON' : 'HQ GLOBAL'}
        </span>
      </div>

      {/* ======================================================== */}
      {/* MAIN NAVIGATION BAR                                      */}
      {/* ======================================================== */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'clients' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Clients</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">{filteredClients.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('loans')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'loans' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Loans</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">{filteredLoans.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition relative ${
                activeTab === 'approvals' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-amber-600" />
              <span>Head Office Approvals</span>
              {(pendingLoansList.length + pendingExpensesList.length > 0) && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] animate-pulse">
                  {pendingLoansList.length + pendingExpensesList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'expenses' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Expenses</span>
            </button>

            <button
              onClick={() => setActiveTab('sms')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'sms' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Bulk SMS</span>
            </button>

            <button
              onClick={() => setActiveTab('idcards')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'idcards' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>ID Cards</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'audit' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Audit Trail</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ======================================================== */}
      {/* GLOBAL UPLOAD PROGRESS MODAL OVERLAY                     */}
      {/* ======================================================== */}
      {uploadProgress.active && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6 animate-bounce" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">Uploading Document</h3>
            <p className="text-xs text-slate-500 mb-4">{uploadProgress.label}</p>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden border border-slate-200">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-200 flex items-center justify-end pr-1 text-[9px] text-white font-bold"
                style={{ width: `${uploadProgress.percent}%` }}
              >
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 font-semibold mb-2">
              <span>{uploadProgress.status === 'success' ? 'Upload Complete!' : 'Uploading...'}</span>
              <span className="text-blue-600 font-bold">{uploadProgress.percent}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN VIEW CONTENT CONTAINER                              */}
      {/* ======================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">

        {/* ======================================================== */}
        {/* TAB 1: DASHBOARD OVERVIEW                                */}
        {/* ======================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Context Notice Banner */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>{activeBranchLabel}</span>
                  {activeBranchId && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Branch View</span>}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {activeBranchId
                    ? `Displaying strictly isolated metrics and data for ${activeBranchLabel}.`
                    : 'Displaying comprehensive Head Office consolidated data across all operating branches.'}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setNewClientModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Client</span>
                </button>
                <button
                  onClick={() => setNewExpenseModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Submit Expense</span>
                </button>
              </div>
            </div>

            {/* Statistics Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Branch Clients</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.clientCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">Active registered borrowers</div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Active Loans</span>
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.activeLoansCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">Total disbursed portfolio</div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Outstanding</span>
                  <DollarSign className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-lg sm:text-2xl font-black text-red-600">
                  TZS {(stats.totalOutstanding / 1000000).toFixed(2)}M
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Principal + interest balance</div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Pending HO Review</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600">
                  {stats.pendingLoansCount + stats.pendingExpensesCount}
                </div>
                <div className="text-[11px] text-amber-600/80 font-medium mt-1">
                  {stats.pendingLoansCount} loans, {stats.pendingExpensesCount} expenses
                </div>
              </div>
            </div>

            {/* Quick Pending Approvals Callout (If Any) */}
            {(stats.pendingLoansCount > 0 || stats.pendingExpensesCount > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-amber-900">Items Awaiting Head Office Decision</h2>
                    <p className="text-xs text-amber-700">
                      Branches cannot self-approve. {stats.pendingLoansCount} loan application(s) and {stats.pendingExpensesCount} expense(s) are awaiting authorized Head Office action.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('approvals')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition shrink-0"
                >
                  Review Approvals Queue
                </button>
              </div>
            )}

            {/* Recent Loans List in Current Branch Scope */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Recent Loans in {activeBranchLabel}</span>
                </h2>
                <button
                  onClick={() => setActiveTab('loans')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  View All Loans
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Loan #</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Branch</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Balance</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLoans.slice(0, 6).map(l => {
                      const client = clients.find(c => c.id === l.clientId);
                      const branch = branches.find(b => b.id === l.branchId);
                      return (
                        <tr key={l.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 font-mono font-bold text-blue-600">{l.loanNumber}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{client?.fullName || 'Client'}</td>
                          <td className="py-3 px-3 text-slate-500">{branch?.code || 'HQ'}</td>
                          <td className="py-3 px-3 font-bold text-slate-900">TZS {l.amount.toLocaleString()}</td>
                          <td className="py-3 px-3 font-bold text-red-600">TZS {l.balance.toLocaleString()}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              l.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              l.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              l.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {l.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CLIENT DIRECTORY & PROFILES                       */}
        {/* ======================================================== */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Branch Clients Directory</span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Viewing clients belonging to {activeBranchLabel}. Click on any client to view profile and access the <strong>GRANT LOAN</strong> button.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, ID, phone..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden transition"
                  />
                </div>
                <button
                  onClick={() => setNewClientModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Client</span>
                </button>
              </div>
            </div>

            {/* Clients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map(c => {
                const branch = branches.find(b => b.id === c.branchId);
                const clientLoans = loans.filter(l => l.clientId === c.id);
                const activeLoan = clientLoans.find(l => l.status === 'active');

                return (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={c.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                            alt={c.fullName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 shadow-xs"
                          />
                          <div>
                            <h2 className="font-extrabold text-slate-900 text-sm leading-snug">{c.fullName}</h2>
                            <span className="text-[11px] font-mono text-blue-600 font-semibold">{c.clientNumber}</span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-md uppercase">
                          {branch?.code || 'HQ'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 border-t border-b border-slate-100 py-3 my-3">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Phone:</span>
                          <span className="font-semibold text-slate-800">{c.phone}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">National ID:</span>
                          <span className="font-mono text-slate-700">{c.nationalId}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Location:</span>
                          <span className="text-slate-700">{c.location}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Credit Score:</span>
                          <span className={`font-bold ${c.creditScore >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {c.creditScore}/100
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Active Loan:</span>
                          {activeLoan ? (
                            <span className="font-bold text-red-600">TZS {activeLoan.balance.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => setSelectedClientForProfile(c)}
                        className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Profile</span>
                      </button>

                      {/* GRANT LOAN Button in Client Card / Profile view */}
                      <button
                        onClick={() => {
                          setGrantLoanTargetClient(c);
                          setGrantLoanModalOpen(true);
                        }}
                        className={`flex-1 px-3 py-2 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs ${
                          currentUser.role === 'company_admin'
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{currentUser.role === 'company_admin' ? 'GRANT LOAN' : 'Apply Loan'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: LOANS LIST                                        */}
        {/* ======================================================== */}
        {activeTab === 'loans' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Loans Portfolio in {activeBranchLabel}</span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Showing all loans filtered by the active branch context ({activeBranchLabel}).
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search loans..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden transition"
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Loan #</th>
                      <th className="py-3 px-4">Client Name</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Disbursed</th>
                      <th className="py-3 px-4">Payable</th>
                      <th className="py-3 px-4">Paid</th>
                      <th className="py-3 px-4">Balance</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLoans.map(l => {
                      const client = clients.find(c => c.id === l.clientId);
                      const branch = branches.find(b => b.id === l.branchId);

                      return (
                        <tr key={l.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{l.loanNumber}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{client?.fullName || 'Client'}</td>
                          <td className="py-3.5 px-4 text-slate-500">{branch?.name || 'HQ'}</td>
                          <td className="py-3.5 px-4 capitalize">{l.loanType}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">TZS {l.amount.toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">TZS {l.totalPayable.toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-bold text-emerald-600">TZS {l.amountPaid.toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-bold text-red-600">TZS {l.balance.toLocaleString()}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              l.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              l.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              l.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {l.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {l.status === 'pending' && currentUser.role === 'company_admin' ? (
                              <button
                                onClick={() => setReviewLoanModalTarget(l)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition"
                              >
                                Review HO
                              </button>
                            ) : (
                              <button
                                onClick={() => client && setSelectedClientForProfile(client)}
                                className="text-blue-600 hover:underline font-semibold text-xs"
                              >
                                Profile
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: HEAD OFFICE APPROVALS QUEUE (LOANS & EXPENSES)   */}
        {/* ======================================================== */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900">Head Office Approval Control Queue</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Enforces enterprise security rule: <strong>Branches cannot independently approve their own loans or expenses.</strong> Final approval must be executed by authorized Head Office users.
                  </p>
                </div>
              </div>
            </div>

            {/* Pending Loans Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Pending Loan Applications ({pendingLoansList.length})</span>
                </h2>
                <span className="text-xs text-slate-500">Requires Head Office Review</span>
              </div>

              {pendingLoansList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                  No pending loan applications for the selected context.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingLoansList.map(pl => {
                    const client = clients.find(c => c.id === pl.clientId);
                    const branch = branches.find(b => b.id === pl.branchId);

                    return (
                      <div key={pl.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-600">{pl.loanNumber}</span>
                            <span className="font-bold text-slate-900">{client?.fullName}</span>
                            <span className="text-slate-400">({branch?.name})</span>
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            Amount: <strong className="text-slate-800">TZS {pl.amount.toLocaleString()}</strong> | Duration: {pl.durationMonths} mos | Purpose: {pl.purpose}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {currentUser.role === 'company_admin' ? (
                            <>
                              <button
                                onClick={() => setReviewLoanModalTarget(pl)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                              >
                                Review & Approve
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-amber-600 italic font-semibold">
                              Head Office Authorized Only
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pending Expenses Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span>Pending Branch Expenses ({pendingExpensesList.length})</span>
                </h2>
                <span className="text-xs text-slate-500">Requires Head Office Review</span>
              </div>

              {pendingExpensesList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                  No pending expenses for the selected context.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingExpensesList.map(pe => {
                    const branch = branches.find(b => b.id === pe.branchId);

                    return (
                      <div key={pe.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{pe.category}</span>
                            <span className="text-slate-400">({branch?.name})</span>
                            <span className="font-bold text-red-600">TZS {pe.amount.toLocaleString()}</span>
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            {pe.description} | Recorded by: {pe.recordedBy}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {currentUser.role === 'company_admin' ? (
                            <button
                              onClick={() => setReviewExpenseModalTarget(pe)}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition"
                            >
                              Review & Approve
                            </button>
                          ) : (
                            <span className="text-xs text-amber-600 italic font-semibold">
                              Head Office Authorized Only
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: EXPENSES                                          */}
        {/* ======================================================== */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  <span>Branch Expenses ({activeBranchLabel})</span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Expenses submitted by branches must be reviewed and approved by Head Office.
                </p>
              </div>

              <button
                onClick={() => setNewExpenseModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Expense</span>
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map(exp => {
                      const branch = branches.find(b => b.id === exp.branchId);
                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-mono text-slate-600">{exp.expenseDate}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">{branch?.code || 'HQ'}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{exp.category}</td>
                          <td className="py-3.5 px-4 text-slate-600">{exp.description}</td>
                          <td className="py-3.5 px-4 font-bold text-red-600">TZS {exp.amount.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-slate-500">{exp.paymentMethod}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              exp.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              exp.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {exp.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: BULK SMS MODULE VIEW                              */}
        {/* ======================================================== */}
        {activeTab === 'sms' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <span>Bulk SMS Dispatcher (Branch-Aware)</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Send notifications and payment reminders to clients belonging to {activeBranchLabel}.
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg font-mono">
                  BEEM AFRICA GATEWAY
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h2 className="font-bold text-slate-900 text-sm">Compose Message</h2>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Message Body</label>
                  <textarea
                    rows={4}
                    defaultValue="Dear {name}, this is a reminder from SOKOLO TECH regarding your account at {branch}. Thank you!"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden transition"
                  ></textarea>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>Available placeholders: <code className="text-blue-600">{'{name}'}</code>, <code className="text-blue-600">{'{branch}'}</code>, <code className="text-blue-600">{'{phone}'}</code></span>
                    <span>1 SMS (88 chars)</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    simulateFileUpload('SMS Gateway Payload Batch', () => {
                      addAuditLog('SEND_BULK_SMS', `Dispatched SMS broadcast to ${filteredClients.length} clients in ${activeBranchLabel}`);
                      alert(`Successfully sent SMS broadcast to ${filteredClients.length} recipients in ${activeBranchLabel}!`);
                    });
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Broadcast to {filteredClients.length} Clients</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h2 className="font-bold text-slate-900 text-sm mb-3">Recipients in Scope</h2>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                  {filteredClients.map(c => (
                    <div key={c.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{c.fullName}</div>
                        <div className="text-[10px] text-slate-400">{c.phone}</div>
                      </div>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: ID CARDS MODULE VIEW                              */}
        {/* ======================================================== */}
        {activeTab === 'idcards' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Official Member ID Cards ({activeBranchLabel})</span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Batch printable client cards carrying client photo, National ID, and branch identification.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Cards</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map(c => {
                const branch = branches.find(b => b.id === c.branchId);
                return (
                  <div key={c.id} className="w-full max-w-sm mx-auto bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-5 shadow-xl border border-slate-700 relative overflow-hidden flex flex-col justify-between h-[360px]">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">S</div>
                        <div>
                          <div className="font-black text-xs tracking-wider">SOKOLO TECH</div>
                          <div className="text-[9px] text-slate-400">OFFICIAL MEMBER CARD</div>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {branch?.code || 'HQ'}
                      </span>
                    </div>

                    {/* Photo & Details */}
                    <div className="my-auto flex flex-col items-center text-center">
                      <img
                        src={c.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={c.fullName}
                        className="w-20 h-20 rounded-full object-cover border-2 border-blue-400 shadow-md mb-2"
                      />
                      <h2 className="font-extrabold text-sm">{c.fullName}</h2>
                      <div className="font-mono text-xs text-blue-400 font-bold">{c.clientNumber}</div>
                      <div className="text-[11px] text-slate-300 mt-1">{c.occupation} · {c.location}</div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-700/80 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <div>
                        <div>BRANCH: <span className="text-white font-semibold">{branch?.name}</span></div>
                        <div>PHONE: <span className="text-white">{c.phone}</span></div>
                      </div>
                      <div className="text-right">
                        <div>NAT ID: <span className="text-white font-mono">{c.nationalId.substring(0, 10)}...</span></div>
                        <div className="text-emerald-400 font-bold">STATUS: ACTIVE</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 8: AUDIT TRAIL                                       */}
        {/* ======================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>Enterprise Security Audit Trail</span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Tracks all grant loan actions, branch switches, loan approvals, and expense approvals with user, branch, and timestamp.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Branch Context</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{log.user}</td>
                        <td className="py-3 px-4 text-slate-600">{log.role}</td>
                        <td className="py-3 px-4 font-medium text-blue-600">{log.branchName}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: CLIENT FULL PROFILE (WITH GRANT LOAN BUTTON)    */}
      {/* ======================================================== */}
      {selectedClientForProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedClientForProfile.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover border-2 border-blue-400"
                />
                <div>
                  <h3 className="font-black text-base">{selectedClientForProfile.fullName}</h3>
                  <div className="text-xs text-blue-400 font-mono">{selectedClientForProfile.clientNumber}</div>
                  <div className="text-[11px] text-slate-300">
                    Branch: {branches.find(b => b.id === selectedClientForProfile.branchId)?.name}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedClientForProfile(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Highlighted GRANT LOAN banner */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-500/40 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-emerald-900 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Loan Disbursement & Granting
                  </h4>
                  <p className="text-emerald-700 text-xs mt-0.5">
                    {currentUser.role === 'company_admin'
                      ? 'Authorized: You have Head Office privileges to directly approve and grant a loan to this client.'
                      : 'Notice: As a branch staff member, submitted applications will be routed for Head Office review.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGrantLoanTargetClient(selectedClientForProfile);
                    setGrantLoanModalOpen(true);
                    setSelectedClientForProfile(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-md transition ${
                    currentUser.role === 'company_admin'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{currentUser.role === 'company_admin' ? 'GRANT LOAN' : 'Apply Loan'}</span>
                </button>
              </div>

              {/* Client Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">National ID</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedClientForProfile.nationalId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone Number</span>
                  <span className="font-semibold text-slate-800">{selectedClientForProfile.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Credit Score</span>
                  <span className="font-bold text-emerald-600">{selectedClientForProfile.creditScore} / 100</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                  <span className="text-slate-800">{selectedClientForProfile.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Occupation</span>
                  <span className="text-slate-800">{selectedClientForProfile.occupation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Member Since</span>
                  <span className="text-slate-800">{selectedClientForProfile.createdAt}</span>
                </div>
              </div>

              {/* Loans History for Client */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">Loan History for this Client</h4>
                {loans.filter(l => l.clientId === selectedClientForProfile.id).length === 0 ? (
                  <div className="text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">No loans recorded yet for this client.</div>
                ) : (
                  <div className="space-y-2">
                    {loans.filter(l => l.clientId === selectedClientForProfile.id).map(l => (
                      <div key={l.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-mono font-bold text-blue-600">{l.loanNumber}</div>
                          <div className="text-slate-500 font-medium">TZS {l.amount.toLocaleString()} · {l.durationMonths} mos · {l.purpose}</div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            l.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            l.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            l.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {l.status.toUpperCase()}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1">Bal: TZS {l.balance.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: "GRANT LOAN" MODAL (HEAD OFFICE WORKFLOW AWARE) */}
      {/* ======================================================== */}
      {grantLoanModalOpen && grantLoanTargetClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className={`p-5 text-white flex items-center justify-between ${
              currentUser.role === 'company_admin' ? 'bg-emerald-700' : 'bg-blue-700'
            }`}>
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5" />
                <div>
                  <h3 className="font-black text-sm">
                    {currentUser.role === 'company_admin' ? 'GRANT LOAN (Head Office Authorization)' : 'Submit Loan Application'}
                  </h3>
                  <div className="text-[11px] text-emerald-200 font-mono">
                    Client: {grantLoanTargetClient.fullName} ({grantLoanTargetClient.clientNumber})
                  </div>
                </div>
              </div>
              <button onClick={() => setGrantLoanModalOpen(false)} className="w-7 h-7 rounded-full bg-black/20 text-white flex items-center justify-center">
                ✕
              </button>
            </div>

            <form onSubmit={handleGrantOrApplyLoanSubmit} className="p-6 space-y-4 text-xs">
              <input type="hidden" name="action_type" value={currentUser.role === 'company_admin' ? 'direct_grant' : 'branch_application'} />

              {/* Pre-filled Client Info Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-800">Branch Assignment:</span>
                  <span className="text-blue-600 font-bold">{branches.find(b => b.id === grantLoanTargetClient.branchId)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Client National ID:</span>
                  <span className="font-mono text-slate-800">{grantLoanTargetClient.nationalId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Client Credit Score:</span>
                  <span className="font-bold text-emerald-600">{grantLoanTargetClient.creditScore}/100</span>
                </div>
              </div>

              {/* Workflow Notice */}
              {currentUser.role === 'company_admin' ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-[11px]">
                  <strong>Head Office Direct Grant:</strong> This loan will be confirmed and activated directly under your authority with user ID, branch ID, and audit trail saved.
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-[11px]">
                  <strong>Head Office Review Required:</strong> Because you are logged in as branch personnel, this action cannot directly grant the loan. It will be sent to the Head Office Review Queue.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Loan Amount (TZS) *</label>
                  <input
                    type="number"
                    name="amount"
                    defaultValue={3000000}
                    step={100000}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Duration (Months) *</label>
                  <input
                    type="number"
                    name="duration"
                    defaultValue={12}
                    min={1}
                    max={60}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    name="interest_rate"
                    defaultValue={12}
                    step={0.5}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Loan Product Type</label>
                  <select
                    name="loan_type"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="business">Business Working Capital</option>
                    <option value="personal">Personal / Salary</option>
                    <option value="agriculture">Agriculture & Livestock</option>
                    <option value="emergency">Emergency Micro-loan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Loan Purpose & Collateral Notes</label>
                <textarea
                  name="purpose"
                  rows={2}
                  defaultValue="Business stock replenishment and point of sale setup."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGrantLoanModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-bold rounded-xl transition shadow-md ${
                    currentUser.role === 'company_admin'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
                  }`}
                >
                  {currentUser.role === 'company_admin' ? 'Confirm & GRANT LOAN' : 'Submit for HO Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: REGISTER NEW CLIENT (BRANCH-AWARE + UPLOAD)     */}
      {/* ======================================================== */}
      {newClientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Register New Branch Client</span>
              </h3>
              <button onClick={() => setNewClientModalOpen(false)} className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center">
                ✕
              </button>
            </div>

            <form onSubmit={handleClientRegister} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800">
                <strong>Automatic Branch Association:</strong> This client will automatically belong to{' '}
                <strong>{activeBranchLabel}</strong> with unique client ID generation and duplicate phone/ID validation.
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  name="full_name"
                  placeholder="e.g. Mwajuma Said Omari"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone Number (Tanzania) *</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="+255 712 000 111"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">National ID (NIDA) *</label>
                  <input
                    type="text"
                    name="national_id"
                    placeholder="19900101-11101-00009"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Region & District *</label>
                  <input
                    type="text"
                    name="location"
                    defaultValue={activeBranchId ? branches.find(b => b.id === activeBranchId)?.location : 'Dar es Salaam'}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Primary Occupation</label>
                  <input
                    type="text"
                    name="occupation"
                    placeholder="e.g. Retail Trader"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Photo & ID Document Upload Simulation */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-slate-700 font-bold">Client Documents (With Real Progress Tracking)</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg p-2 text-center text-slate-500 text-[11px]">
                    <Upload className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                    Passport Photo (JPG/PNG)
                  </div>
                  <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg p-2 text-center text-slate-500 text-[11px]">
                    <Upload className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                    NIDA Card / Gov ID (PDF)
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewClientModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md shadow-blue-500/20"
                >
                  Upload & Register Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: SUBMIT BRANCH EXPENSE                           */}
      {/* ======================================================== */}
      {newExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>Submit Branch Operational Expense</span>
              </h3>
              <button onClick={() => setNewExpenseModalOpen(false)} className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center">
                ✕
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[11px]">
                <strong>Rule Enforced:</strong> Branches must submit expenses with receipts. Final approval is restricted to authorized Head Office users.
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Expense Category *</label>
                <select name="category" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-blue-500">
                  <option value="Utilities & Electricity">Utilities & Electricity Tokens</option>
                  <option value="Office Stationery & Printing">Office Stationery & Printing</option>
                  <option value="Branch Travel & Fuel">Branch Field Travel & Fuel</option>
                  <option value="Premises Maintenance">Premises Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Amount (TZS) *</label>
                <input
                  type="number"
                  name="amount"
                  defaultValue={180000}
                  step={5000}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description & Justification</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue="Power purchase for office workstations and router."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-blue-500"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition"
                >
                  Upload Receipt & Submit for HO Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: HEAD OFFICE REVIEW LOAN MODAL                   */}
      {/* ======================================================== */}
      {reviewLoanModalTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 text-xs">
            <div className="bg-amber-600 text-white p-4 font-bold flex items-center justify-between">
              <span>Head Office Loan Application Review</span>
              <button onClick={() => setReviewLoanModalTarget(null)}>✕</button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl border space-y-1">
                <div className="flex justify-between font-mono font-bold text-blue-600">
                  <span>Loan Number:</span> <span>{reviewLoanModalTarget.loanNumber}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Applicant:</span> <span>{clients.find(c => c.id === reviewLoanModalTarget.clientId)?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Branch:</span> <span>{branches.find(b => b.id === reviewLoanModalTarget.branchId)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Requested:</span> <span className="font-bold text-slate-900">TZS {reviewLoanModalTarget.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span> <span>{reviewLoanModalTarget.durationMonths} Months</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Approval or Rejection Comments</label>
                <textarea
                  id="loanReviewNotes"
                  rows={2}
                  defaultValue="Approved following credit score verification and branch KYC check."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <button
                  onClick={() => {
                    const notes = (document.getElementById('loanReviewNotes') as HTMLTextAreaElement).value;
                    handleReviewLoanDecision('rejected', notes);
                  }}
                  className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition"
                >
                  Reject Application
                </button>
                <button
                  onClick={() => {
                    const notes = (document.getElementById('loanReviewNotes') as HTMLTextAreaElement).value;
                    handleReviewLoanDecision('approved', notes);
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs"
                >
                  Approve & Disburse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: HEAD OFFICE REVIEW EXPENSE MODAL                */}
      {/* ======================================================== */}
      {reviewExpenseModalTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 text-xs">
            <div className="bg-amber-600 text-white p-4 font-bold flex items-center justify-between">
              <span>Head Office Expense Review</span>
              <button onClick={() => setReviewExpenseModalTarget(null)}>✕</button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl border space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Category:</span> <span>{reviewExpenseModalTarget.category}</span>
                </div>
                <div className="flex justify-between">
                  <span>Branch:</span> <span>{branches.find(b => b.id === reviewExpenseModalTarget.branchId)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span> <span className="font-bold text-red-600">TZS {reviewExpenseModalTarget.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Description:</span> <span>{reviewExpenseModalTarget.description}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Submitted by:</span> <span>{reviewExpenseModalTarget.recordedBy}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Head Office Review Comments</label>
                <textarea
                  id="expReviewNotes"
                  rows={2}
                  defaultValue="Expense approved. Payment verified against branch petty cash allowance."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <button
                  onClick={() => {
                    const notes = (document.getElementById('expReviewNotes') as HTMLTextAreaElement).value;
                    handleReviewExpenseDecision('rejected', notes);
                  }}
                  className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition"
                >
                  Reject Expense
                </button>
                <button
                  onClick={() => {
                    const notes = (document.getElementById('expReviewNotes') as HTMLTextAreaElement).value;
                    handleReviewExpenseDecision('approved', notes);
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs"
                >
                  Approve Expense
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FOOTER                                                   */}
      {/* ======================================================== */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            &copy; 2026 <strong>{APP_NAME}</strong> · Enterprise Branch Management & Microfinance Architecture
          </div>
          <div className="flex items-center gap-4">
            <span>Branch Data Isolation: <strong className="text-emerald-600">ENFORCED</strong></span>
            <span>Head Office Approval: <strong className="text-emerald-600">ACTIVE</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
