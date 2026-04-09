const ACCOUNT_OPTIONS = [
  "Debt Account",
  "University Debit Account",
  "Personal Savings Account",
  "Uni Savings Account"
];
const STORAGE_KEY = "budget-command-center-v1";
let saveTimer = null;

const byId = (id) => document.getElementById(id);

function money(value) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function createInputCell(value, type = "text", min = "0", step = "0.01") {
  const td = document.createElement("td");
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  if (type === "number") {
    input.min = min;
    input.step = step;
  }
  td.appendChild(input);
  return { td, input };
}

function createSelectCell(options, selectedValue) {
  const td = document.createElement("td");
  const select = document.createElement("select");
  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    if (opt === selectedValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  td.appendChild(select);
  return { td, select };
}

function createDeleteCell(row) {
  const td = document.createElement("td");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn danger";
  btn.textContent = "Remove";
  btn.addEventListener("click", () => {
    row.remove();
    saveStateDebounced();
  });
  td.appendChild(btn);
  return td;
}

function addIncomeRow(name = "", amount = 0, type = "Fixed", shouldSave = true) {
  const row = document.createElement("tr");
  const nameCell = createInputCell(name, "text");
  const amountCell = createInputCell(amount, "number");
  const typeCell = createSelectCell(["Fixed", "Variable"], type);
  row.append(nameCell.td, amountCell.td, typeCell.td, createDeleteCell(row));
  byId("incomeRows").appendChild(row);
  if (shouldSave) {
    saveStateDebounced();
  }
}

function addExpenseRow(name = "", amount = 0, type = "Fixed", account = ACCOUNT_OPTIONS[0], shouldSave = true) {
  const row = document.createElement("tr");
  const nameCell = createInputCell(name, "text");
  const amountCell = createInputCell(amount, "number");
  const typeCell = createSelectCell(["Fixed", "Variable"], type);
  const accountCell = createSelectCell(ACCOUNT_OPTIONS, account);
  row.append(nameCell.td, amountCell.td, typeCell.td, accountCell.td, createDeleteCell(row));
  byId("expenseRows").appendChild(row);
  if (shouldSave) {
    saveStateDebounced();
  }
}

function addGoalRow(name = "", target = 0, account = ACCOUNT_OPTIONS[0], priority = 5, shouldSave = true) {
  const row = document.createElement("tr");
  const nameCell = createInputCell(name, "text");
  const targetCell = createInputCell(target, "number");
  const accountCell = createSelectCell(ACCOUNT_OPTIONS, account);
  const priorityCell = createInputCell(priority, "number", "1", "1");
  row.append(nameCell.td, targetCell.td, accountCell.td, priorityCell.td, createDeleteCell(row));
  byId("goalRows").appendChild(row);
  if (shouldSave) {
    saveStateDebounced();
  }
}

function collectRows(tbodyId, kind) {
  const rows = [...byId(tbodyId).querySelectorAll("tr")];
  return rows.map((row) => {
    const controls = row.querySelectorAll("input, select");
    if (kind === "income") {
      return {
        name: controls[0].value.trim() || "Income",
        amount: num(controls[1].value),
        type: controls[2].value
      };
    }
    if (kind === "expense") {
      return {
        name: controls[0].value.trim() || "Outcome",
        amount: num(controls[1].value),
        type: controls[2].value,
        account: controls[3].value
      };
    }
    return {
      name: controls[0].value.trim() || "Goal",
      target: num(controls[1].value),
      account: controls[2].value,
      priority: Math.max(1, Math.round(num(controls[3].value || 1)))
    };
  });
}

function getBalances() {
  return {
    "Debt Account": num(byId("balDebt").value),
    "University Debit Account": num(byId("balUniDebit").value),
    "Personal Savings Account": num(byId("balPersonal").value),
    "Uni Savings Account": num(byId("balUniSavings").value)
  };
}

function getState() {
  return {
    balances: getBalances(),
    incomes: collectRows("incomeRows", "income"),
    expenses: collectRows("expenseRows", "expense"),
    goals: collectRows("goalRows", "goal")
  };
}

function updateSaveIndicator(message, mode = "") {
  const el = byId("saveIndicator");
  if (!el) {
    return;
  }
  el.textContent = message;
  el.classList.remove("good", "bad");
  if (mode) {
    el.classList.add(mode);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getState()));
    updateSaveIndicator(`Saved ${new Date().toLocaleTimeString()}`, "good");
  } catch (_error) {
    updateSaveIndicator("Could not save data in this browser", "bad");
  }
}

function saveStateDebounced() {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
  }
  saveTimer = window.setTimeout(saveState, 250);
}

function applyBalances(balances = {}) {
  byId("balDebt").value = balances["Debt Account"] ?? 0;
  byId("balUniDebit").value = balances["University Debit Account"] ?? 0;
  byId("balPersonal").value = balances["Personal Savings Account"] ?? 0;
  byId("balUniSavings").value = balances["Uni Savings Account"] ?? 0;
}

function clearRows() {
  byId("incomeRows").innerHTML = "";
  byId("expenseRows").innerHTML = "";
  byId("goalRows").innerHTML = "";
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return false;
  }

  try {
    const state = JSON.parse(raw);
    applyBalances(state.balances || {});
    clearRows();

    (state.incomes || []).forEach((item) => {
      addIncomeRow(item.name, item.amount, item.type, false);
    });
    (state.expenses || []).forEach((item) => {
      addExpenseRow(item.name, item.amount, item.type, item.account, false);
    });
    (state.goals || []).forEach((item) => {
      addGoalRow(item.name, item.target, item.account, item.priority, false);
    });

    updateSaveIndicator("Loaded saved budget", "good");
    return true;
  } catch (_error) {
    updateSaveIndicator("Saved data was invalid and ignored", "bad");
    return false;
  }
}

function renderSummary(totalIncome, totalExpenses, net, remainder) {
  const summary = byId("summary");
  summary.innerHTML = [
    `<div class="stat"><small>Total Income</small><strong>${money(totalIncome)}</strong></div>`,
    `<div class="stat"><small>Total Outcomes</small><strong>${money(totalExpenses)}</strong></div>`,
    `<div class="stat"><small>Net to Allocate</small><strong>${money(net)}</strong></div>`,
    `<div class="stat"><small>Left Unallocated</small><strong>${money(remainder)}</strong></div>`
  ].join("");
}

function renderAllocationTable(balances, transferByAccount) {
  const tbody = byId("allocationRows");
  tbody.innerHTML = "";

  ACCOUNT_OPTIONS.forEach((account) => {
    const current = balances[account] || 0;
    const move = transferByAccount[account] || 0;
    const projected = current + move;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${account}</td>
      <td>${money(current)}</td>
      <td>${money(move)}</td>
      <td>${money(projected)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderGoalResults(results) {
  const tbody = byId("goalResultRows");
  tbody.innerHTML = "";

  results.forEach((result) => {
    const statusClass =
      result.status === "Funded"
        ? "ok"
        : result.status === "Partially funded"
          ? "partial"
          : "none";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${result.name}</td>
      <td>${result.account}</td>
      <td>${money(result.target)}</td>
      <td>${money(result.allocated)}</td>
      <td><span class="status ${statusClass}">${result.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAccountDashboard(effectiveBalances, goals) {
  const targetByAccount = ACCOUNT_OPTIONS.reduce((map, account) => {
    map[account] = 0;
    return map;
  }, {});

  goals.forEach((goal) => {
    if (goal.target > 0) {
      targetByAccount[goal.account] += goal.target;
    }
  });

  const dashboard = byId("accountDashboard");
  dashboard.innerHTML = "";

  ACCOUNT_OPTIONS.forEach((account) => {
    const projected = effectiveBalances[account] || 0;
    const target = targetByAccount[account] || 0;
    const gap = Math.max(0, target - projected);
    const coverage = target > 0 ? Math.min(100, (projected / target) * 100) : 100;

    const tile = document.createElement("article");
    tile.className = "account-tile";
    tile.innerHTML = `
      <h4>${account}</h4>
      <p>Projected: <strong>${money(projected)}</strong></p>
      <p>Goal target: <strong>${money(target)}</strong></p>
      <div class="track"><div class="fill" style="width:${coverage.toFixed(1)}%"></div></div>
      <p>Coverage: ${coverage.toFixed(1)}% | Gap: ${money(gap)}</p>
    `;
    dashboard.appendChild(tile);
  });
}

function computeBudgetData() {
  const incomes = collectRows("incomeRows", "income");
  const expenses = collectRows("expenseRows", "expense");
  const goals = collectRows("goalRows", "goal");
  const balances = getBalances();

  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const net = totalIncome - totalExpenses;

  const transferByAccount = {
    "Debt Account": 0,
    "University Debit Account": 0,
    "Personal Savings Account": 0,
    "Uni Savings Account": 0
  };

  const effectiveBalances = { ...balances };
  const orderedGoals = goals
    .filter((goal) => goal.target > 0)
    .sort((a, b) => a.priority - b.priority);

  const goalResults = [];
  let remaining = net;

  if (remaining > 0) {
    orderedGoals.forEach((goal) => {
      const currentForAccount = effectiveBalances[goal.account] || 0;
      const deficit = Math.max(0, goal.target - currentForAccount);
      const allocated = Math.min(remaining, deficit);

      transferByAccount[goal.account] += allocated;
      effectiveBalances[goal.account] += allocated;
      remaining -= allocated;

      let status = "Not funded";
      if (deficit === 0) {
        status = "Already funded";
      } else if (allocated >= deficit) {
        status = "Funded";
      } else if (allocated > 0) {
        status = "Partially funded";
      }

      goalResults.push({
        name: goal.name,
        account: goal.account,
        target: goal.target,
        allocated,
        status
      });
    });

    // If there is extra cash after all targets, send it to uni savings by default.
    if (remaining > 0) {
      transferByAccount["Uni Savings Account"] += remaining;
      effectiveBalances["Uni Savings Account"] += remaining;
      remaining = 0;
    }
  } else {
    orderedGoals.forEach((goal) => {
      const currentForAccount = effectiveBalances[goal.account] || 0;
      const deficit = Math.max(0, goal.target - currentForAccount);
      goalResults.push({
        name: goal.name,
        account: goal.account,
        target: goal.target,
        allocated: 0,
        status: deficit === 0 ? "Already funded" : "Not funded"
      });
    });
  }

  return {
    balances,
    effectiveBalances,
    transferByAccount,
    orderedGoals,
    goalResults,
    totalIncome,
    totalExpenses,
    net,
    remaining
  };
}

function renderComputedBudget(data) {
  renderSummary(data.totalIncome, data.totalExpenses, data.net, data.remaining);
  renderAllocationTable(data.balances, data.transferByAccount);
  renderGoalResults(data.goalResults);
  renderAccountDashboard(data.effectiveBalances, data.orderedGoals);
  byId("results").hidden = false;
}

function calculateBudget() {
  const data = computeBudgetData();
  renderComputedBudget(data);
  saveState();
  return data;
}

function drawMetricBox(doc, x, y, w, h, title, value) {
  doc.setDrawColor(220, 228, 236);
  doc.setFillColor(248, 251, 255);
  doc.roundedRect(x, y, w, h, 2.4, 2.4, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(85, 98, 112);
  doc.text(title, x + 3, y + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(25, 32, 40);
  doc.text(value, x + 3, y + 11.2);
}

function seedDefaults() {
  addIncomeRow("Salary", 2500, "Fixed", false);
  addIncomeRow("Scholarship", 650, "Fixed", false);
  addIncomeRow("Side Hustle", 300, "Variable", false);

  addExpenseRow("Food", 400, "Fixed", "Debt Account", false);
  addExpenseRow("Transport", 180, "Fixed", "University Debit Account", false);
  addExpenseRow("Uni Supplies", 220, "Variable", "University Debit Account", false);
  addExpenseRow("Subscriptions", 40, "Fixed", "Personal Savings Account", false);

  addGoalRow("Rent and Accommodation", 5000, "Uni Savings Account", 1, false);
  addGoalRow("Tuition and Uni Fees", 2500, "University Debit Account", 2, false);
  addGoalRow("Food Buffer", 2000, "Debt Account", 3, false);
  addGoalRow("Personal Safety Net", 3000, "Personal Savings Account", 4, false);
}

function exportPdf() {
  const data = calculateBudget();
  if (!window.jspdf || !window.jspdf.jsPDF) {
    updateSaveIndicator("PDF library did not load. Refresh and try again.", "bad");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();

  doc.setFillColor(22, 112, 93);
  doc.rect(0, 0, width, 26, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("Budget Allocation Snapshot", 12, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 12, 18);

  drawMetricBox(doc, 12, 30, 44, 15, "Total Income", money(data.totalIncome));
  drawMetricBox(doc, 59, 30, 44, 15, "Total Outcomes", money(data.totalExpenses));
  drawMetricBox(doc, 106, 30, 44, 15, "Net to Allocate", money(data.net));
  drawMetricBox(doc, 153, 30, 44, 15, "Left Unallocated", money(data.remaining));

  doc.setTextColor(25, 32, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Suggested Account Transfers", 12, 52);

  let y = 58;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Account", 12, y);
  doc.text("Current", 92, y);
  doc.text("Move Now", 126, y);
  doc.text("Projected", 162, y);
  y += 1.6;
  doc.setDrawColor(210, 218, 226);
  doc.line(12, y, 198, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  ACCOUNT_OPTIONS.forEach((account) => {
    doc.text(account, 12, y);
    doc.text(money(data.balances[account] || 0), 92, y);
    doc.text(money(data.transferByAccount[account] || 0), 126, y);
    doc.text(money(data.effectiveBalances[account] || 0), 162, y);
    y += 6.3;
  });

  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Top Priority Goal Funding", 12, y);

  y += 5.8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Goal", 12, y);
  doc.text("Target", 112, y);
  doc.text("Allocated", 145, y);
  doc.text("Status", 175, y);
  y += 1.6;
  doc.line(12, y, 198, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  const goalsToShow = data.goalResults.slice(0, 6);
  goalsToShow.forEach((goal) => {
    const goalName = goal.name.length > 42 ? `${goal.name.slice(0, 39)}...` : goal.name;
    const status = goal.status.length > 14 ? `${goal.status.slice(0, 11)}...` : goal.status;
    doc.text(goalName, 12, y);
    doc.text(money(goal.target), 112, y);
    doc.text(money(goal.allocated), 145, y);
    doc.text(status, 175, y);
    y += 6;
  });

  if (data.goalResults.length > goalsToShow.length) {
    doc.setTextColor(90, 104, 119);
    doc.text(`+${data.goalResults.length - goalsToShow.length} more goals shown in app`, 12, y + 1);
  }

  const universityFocus = (data.effectiveBalances["Uni Savings Account"] || 0) + (data.effectiveBalances["University Debit Account"] || 0);
  const universityTarget = data.orderedGoals
    .filter((goal) => goal.account === "Uni Savings Account" || goal.account === "University Debit Account")
    .reduce((sum, goal) => sum + goal.target, 0);
  const uniCoverage = universityTarget > 0 ? Math.min(100, (universityFocus / universityTarget) * 100) : 100;

  doc.setFillColor(244, 251, 248);
  doc.setDrawColor(184, 220, 204);
  doc.roundedRect(12, 255, 186, 26, 2.5, 2.5, "FD");
  doc.setTextColor(24, 76, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("University Priority Health", 16, 262);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`University projected funds: ${money(universityFocus)}`, 16, 268.5);
  doc.text(`University target total: ${money(universityTarget)}`, 16, 273.5);
  doc.text(`Coverage: ${uniCoverage.toFixed(1)}%`, 16, 278.5);

  doc.save(`budget-snapshot-${new Date().toISOString().slice(0, 10)}.pdf`);
  updateSaveIndicator("Custom PDF exported", "good");
}

byId("addIncomeBtn").addEventListener("click", () => addIncomeRow("", 0, "Variable"));
byId("addExpenseBtn").addEventListener("click", () => addExpenseRow("", 0, "Variable", "Debt Account"));
byId("addGoalBtn").addEventListener("click", () => addGoalRow("", 0, "Uni Savings Account", 5));
byId("calculateBtn").addEventListener("click", calculateBudget);
byId("exportPdfBtn").addEventListener("click", exportPdf);

document.addEventListener("input", (event) => {
  if (event.target.matches("input, select")) {
    saveStateDebounced();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("select")) {
    saveStateDebounced();
  }
});

if (!loadState()) {
  seedDefaults();
  saveState();
}

