// Aplikasi Manajemen Keuangan Perusahaan
// Versi 2.0 - Lebih Stabil dan Handal

/**
 * =============================================
 * KONFIGURASI AWAL DAN VARIABEL GLOBAL
 * =============================================
 */
const STORAGE_KEY = "financeTrackData";
let transactions = loadTransactions();
let chartInstance = null;

// DOM Elements
const transactionForm = document.getElementById("form-keuangan");
const dateInput = document.getElementById("tanggal");
const descriptionInput = document.getElementById("keterangan");
const amountInput = document.getElementById("jumlah");
const typeSelect = document.getElementById("tipe");
const transactionTable = document.getElementById("tabel-data").querySelector("tbody");
const totalIncomeElement = document.getElementById("total-masuk");
const totalExpenseElement = document.getElementById("total-keluar");
const balanceElement = document.getElementById("saldo");
const restoreFileInput = document.getElementById("restoreFile");

/**
 * =============================================
 * EVENT LISTENERS
 * =============================================
 */
document.addEventListener("DOMContentLoaded", initApp);
transactionForm.addEventListener("submit", handleSubmit);
restoreFileInput.addEventListener("change", handleFileSelect);

/**
 * =============================================
 * FUNGSI INISIALISASI APLIKASI
 * =============================================
 */
function initApp() {
  // Set default date to today
  setDefaultDate();
  
  // Load and display transactions
  renderTransactions();
  
  // Initialize chart
  updateChart();
  
  console.log("Aplikasi berhasil diinisialisasi");
}

function setDefaultDate() {
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];
  dateInput.value = formattedDate;
}

/**
 * =============================================
 * FUNGSI HANDLER FORM
 * =============================================
 */
function handleSubmit(e) {
  e.preventDefault();
  
  try {
    // Validate form
    if (!validateForm()) return;
    
    // Create new transaction
    const newTransaction = createTransaction();
    
    // Add to transactions array
    addTransaction(newTransaction);
    
    // Save and update UI
    saveTransactions();
    renderTransactions();
    updateChart();
    
    // Reset form
    resetForm();
    
    // Show success message
    showAlert("Transaksi berhasil disimpan!", "success");
  } catch (error) {
    console.error("Error saat menyimpan transaksi:", error);
    showAlert("Gagal menyimpan transaksi!", "error");
  }
}

function validateForm() {
  if (!dateInput.value) {
    showAlert("Harap isi tanggal transaksi!", "error");
    dateInput.focus();
    return false;
  }
  
  if (!descriptionInput.value.trim()) {
    showAlert("Harap isi keterangan transaksi!", "error");
    descriptionInput.focus();
    return false;
  }
  
  if (!amountInput.value || parseFloat(amountInput.value) <= 0) {
    showAlert("Jumlah transaksi harus lebih dari 0!", "error");
    amountInput.focus();
    return false;
  }
  
  return true;
}

function createTransaction() {
  return {
    id: Date.now(), // Unique ID
    date: dateInput.value,
    description: descriptionInput.value.trim(),
    amount: parseFloat(amountInput.value),
    type: typeSelect.value,
    createdAt: new Date().toISOString()
  };
}

function addTransaction(transaction) {
  transactions.unshift(transaction); // Add to beginning of array
}

function resetForm() {
  transactionForm.reset();
  setDefaultDate();
  descriptionInput.focus();
}

/**
 * =============================================
 * FUNGSI RENDER DATA
 * =============================================
 */
function renderTransactions() {
  // Clear table first
  transactionTable.innerHTML = "";
  
  if (transactions.length === 0) {
    showEmptyState();
    return;
  }
  
  let totalIncome = 0;
  let totalExpense = 0;
  
  transactions.forEach(transaction => {
    const row = createTransactionRow(transaction);
    transactionTable.appendChild(row);
    
    // Calculate totals
    if (transaction.type === "pemasukan") {
      totalIncome += transaction.amount;
    } else {
      totalExpense += transaction.amount;
    }
  });
  
  updateSummary(totalIncome, totalExpense);
}

function createTransactionRow(transaction) {
  const row = document.createElement("tr");
  
  row.innerHTML = `
    <td>${formatDate(transaction.date)}</td>
    <td>${transaction.description}</td>
    <td>
      <span class="badge ${transaction.type === 'pemasukan' ? 'income-badge' : 'expense-badge'}">
        ${transaction.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
      </span>
    </td>
    <td class="${transaction.type === 'pemasukan' ? 'income-text' : 'expense-text'}">
      ${transaction.type === 'pemasukan' ? '+' : '-'} ${formatCurrency(transaction.amount)}
    </td>
    <td>
      <button class="delete-btn" onclick="deleteTransaction(${transaction.id})" tooltip="Hapus transaksi">
        <i class="fas fa-trash-alt"></i>
      </button>
    </td>
  `;
  
  return row;
}

function showEmptyState() {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td colspan="5" class="empty-state">
      <i class="fas fa-wallet"></i>
      <p>Belum ada transaksi</p>
    </td>
  `;
  transactionTable.appendChild(row);
  
  // Reset summary
  updateSummary(0, 0);
}

function updateSummary(income, expense) {
  const balance = income - expense;
  
  totalIncomeElement.textContent = formatCurrency(income);
  totalExpenseElement.textContent = formatCurrency(expense);
  balanceElement.textContent = formatCurrency(balance);
  
  // Update balance color
  balanceElement.className = balance >= 0 ? "positive" : "negative";
}

/**
 * =============================================
 * FUNGSI CRUD TRANSACTION
 * =============================================
 */
function deleteTransaction(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
  
  try {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    renderTransactions();
    updateChart();
    showAlert("Transaksi berhasil dihapus!", "success");
  } catch (error) {
    console.error("Error deleting transaction:", error);
    showAlert("Gagal menghapus transaksi!", "error");
  }
}

/**
 * =============================================
 * FUNGSI CHART
 * =============================================
 */
function updateChart() {
  // Calculate totals
  const totals = transactions.reduce((acc, transaction) => {
    if (transaction.type === "pemasukan") {
      acc.income += transaction.amount;
    } else {
      acc.expense += transaction.amount;
    }
    return acc;
  }, { income: 0, expense: 0 });
  
  const balance = totals.income - totals.expense;
  
  // Get chart context
  const ctx = document.getElementById("grafikSaldo").getContext("2d");
  
  // Destroy previous chart if exists
  if (chartInstance) {
    chartInstance.destroy();
  }
  
  // Create new chart
  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Pemasukan", "Pengeluaran", "Saldo"],
      datasets: [{
        label: "Jumlah (Rp)",
        data: [totals.income, totals.expense, balance],
        backgroundColor: [
          "rgba(40, 167, 69, 0.7)",
          "rgba(220, 53, 69, 0.7)",
          "rgba(0, 123, 255, 0.7)"
        ],
        borderColor: [
          "rgba(40, 167, 69, 1)",
          "rgba(220, 53, 69, 1)",
          "rgba(0, 123, 255, 1)"
        ],
        borderWidth: 1
      }]
    },
    options: getChartOptions()
  });
}

function getChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false, // Tambahkan ini
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Rp ${context.raw.toLocaleString("id-ID")}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: value => `Rp ${value.toLocaleString("id-ID")}`
        }
      }
    }
  };
}

/**
 * =============================================
 * FUNGSI BACKUP & RESTORE
 * =============================================
 */
function backupData() {
  try {
    if (transactions.length === 0) {
      showAlert("Tidak ada data transaksi untuk dibackup", "warning");
      return;
    }
    
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-keuangan-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showAlert("Backup data berhasil dibuat!", "success");
  } catch (error) {
    console.error("Backup error:", error);
    showAlert("Gagal membuat backup data!", "error");
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  restoreData(file);
}

function restoreData(file) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      
      // Validate imported data
      if (!Array.isArray(importedData)) {
        throw new Error("Format data tidak valid");
      }
      
      if (importedData.some(item => !item.id || !item.date || !item.description || !item.amount || !item.type)) {
        throw new Error("Data tidak lengkap");
      }
      
      if (confirm(`Anda akan mengimpor ${importedData.length} transaksi. Lanjutkan?`)) {
        transactions = importedData;
        saveTransactions();
        renderTransactions();
        updateChart();
        showAlert("Data berhasil dipulihkan!", "success");
        restoreFileInput.value = "";
      }
    } catch (error) {
      console.error("Restore error:", error);
      showAlert("Gagal memulihkan data. Pastikan file backup valid.", "error");
    }
  };
  
  reader.onerror = function() {
    showAlert("Gagal membaca file!", "error");
  };
  
  reader.readAsText(file);
}

/**
 * =============================================
 * FUNGSI EXPORT DATA
 * =============================================
 */
function exportKeExcel() {
  try {
    if (transactions.length === 0) {
      showAlert("Tidak ada data transaksi untuk diexport", "warning");
      return;
    }
    
    // Create CSV content
    let csvContent = "Tanggal,Keterangan,Jenis,Jumlah (Rp)\n";
    
    transactions.forEach(transaction => {
      csvContent += `"${formatDate(transaction.date)}","${transaction.description}",${transaction.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'},${transaction.amount}\n`;
    });
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export-keuangan-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showAlert("Data berhasil diexport ke CSV!", "success");
  } catch (error) {
    console.error("Export error:", error);
    showAlert("Gagal mengexport data!", "error");
  }
}

/**
 * =============================================
 * FUNGSI UTILITAS
 * =============================================
 */
function loadTransactions() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    return savedData ? JSON.parse(savedData) : [];
  } catch (error) {
    console.error("Error loading transactions:", error);
    return [];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error("Error saving transactions:", error);
    showAlert("Gagal menyimpan data ke localStorage!", "error");
  }
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount).replace('Rp', 'Rp ');
}

function showAlert(message, type) {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.classList.add("fade-out");
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

// Add styles for alerts
const style = document.createElement("style");
style.textContent = `
  .alert {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    color: white;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideIn 0.3s ease-out;
  }
  
  .alert-success {
    background-color: #28a745;
  }
  
  .alert-error {
    background-color: #dc3545;
  }
  
  .alert-warning {
    background-color: #ffc107;
    color: #212529;
  }
  
  .fade-out {
    animation: fadeOut 0.3s ease-in;
    opacity: 0;
  }
  
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  .empty-state {
    text-align: center;
    padding: 40px 0;
    color: #6c757d;
  }
  
  .empty-state i {
    font-size: 2rem;
    margin-bottom: 10px;
  }
  
  .positive {
    color: #28a745;
  }
  
  .negative {
    color: #dc3545;
  }
`;
document.head.appendChild(style);

// Make functions available globally
window.deleteTransaction = deleteTransaction;
window.backupData = backupData;
window.exportKeExcel = exportKeExcel;