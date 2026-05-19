const STORAGE_KEY = "budget_perso_v6";
const LEGACY_KEY = "budget_perso_v5";

const installBtn = document.getElementById("installBtn");
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
const monthSelect = document.getElementById("monthSelect");
const monthsPreview = document.getElementById("monthsPreview");

const salaryInput = document.getElementById("salaryInput");
const incomeInput = document.getElementById("incomeInput");

const subsNameInput = document.getElementById("subsNameInput");
const subsValueInput = document.getElementById("subsValueInput");
const addSubsBtn = document.getElementById("addSubsBtn");
const subsList = document.getElementById("subsList");

const personalNameInput = document.getElementById("personalNameInput");
const personalValueInput = document.getElementById("personalValueInput");
const addPersonalBtn = document.getElementById("addPersonalBtn");
const personalList = document.getElementById("personalList");
const personalBudgetInput = document.getElementById("personalBudgetInput");
const personalAllocated = document.getElementById("personalAllocated");
const personalUnallocated = document.getElementById("personalUnallocated");
const personalAlert = document.getElementById("personalAlert");
const personalDetailSection = document.getElementById("personalDetail");
const detailName = document.getElementById("detailName");
const detailDescriptionInput = document.getElementById("detailDescriptionInput");
const detailAmountInput = document.getElementById("detailAmountInput");
const addDetailBtn = document.getElementById("addDetailBtn");
const detailLogList = document.getElementById("detailLogList");
const closePersonalDetail = document.getElementById("closePersonalDetail");
let selectedPersonalNeedId = null;

const chargesNameInput = document.getElementById("chargesNameInput");
const chargesValueInput = document.getElementById("chargesValueInput");
const addChargesBtn = document.getElementById("addChargesBtn");
const chargesList = document.getElementById("chargesList");

const goalNameInput = document.getElementById("goalNameInput");
const goalTargetInput = document.getElementById("goalTargetInput");
const addGoalBtn = document.getElementById("addGoalBtn");
const goalsList = document.getElementById("goalsList");

const salaryTotal = document.getElementById("salaryTotal");
const subsSummary = document.getElementById("subsSummary");
const personalSummary = document.getElementById("personalSummary");
const chargesSummary = document.getElementById("chargesSummary");
const goalsSummary = document.getElementById("goalsSummary");
const incomeTotal = document.getElementById("incomeTotal");
const remaining = document.getElementById("remaining");
const yearSelect = document.getElementById("yearSelect");
const yearTable = document.getElementById("yearTable");
const yearSalaryTotal = document.getElementById("yearSalaryTotal");
const yearIncomeTotal = document.getElementById("yearIncomeTotal");
const yearSubsTotal = document.getElementById("yearSubsTotal");
const yearPersonalTotal = document.getElementById("yearPersonalTotal");
const yearChargesTotal = document.getElementById("yearChargesTotal");
const yearRemaining = document.getElementById("yearRemaining");

const MONTH_LABELS = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"
];

const DEFAULT_PERSONAL_NEEDS = [
  "Coffee",
  "Fun",
  "Food",
  "Marjane",
  "Clothes",
  "Transport",
  "Urgence"
];

function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createDefaultPersonalItems() {
  return DEFAULT_PERSONAL_NEEDS.map((name) => ({
    id: generateId("need"),
    name,
    budget: 0,
    spent: 0,
    logs: []
  }));
}

function normalizeItemsWithId(items, prefix) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id || generateId(prefix),
        name: (item.name || "").trim(),
        amount: toNumber(item.amount),
      })).filter((item) => item.name)
    : [];
}

function mergePersonalItems(items) {
  const normalized = Array.isArray(items)
    ? items.map((item) => ({
        id: item.id || generateId("need"),
        name: (item.name || "").trim(),
        budget: toNumber(item.budget ?? item.amount),
        spent: Math.min(toNumber(item.spent), toNumber(item.budget ?? item.amount)),
        logs: Array.isArray(item.logs) ? item.logs : []
      })).filter((item) => item.name)
    : [];

  const existingNames = new Set(normalized.map((item) => item.name));
  createDefaultPersonalItems().forEach((defaultItem) => {
    if (!existingNames.has(defaultItem.name)) {
      normalized.unshift(defaultItem);
    }
  });

  return normalized;
}

const monthDefaults = {
  salary: 0,
  income: 0,
  subsItems: [],
  personalBudget: 0,
  personalItems: createDefaultPersonalItems(),
  chargesItems: []
};

let deferredPrompt = null;
const monthKeys = buildMonthKeys("2026-05", "2030-12");
let store = loadStore();

if (!monthKeys.includes(store.activeMonth)) {
  store.activeMonth = monthKeys[0];
}
ensureMonth(store.activeMonth);
if (!Array.isArray(store.goals)) store.goals = [];

function buildMonthKeys(startKey, endKey) {
  const [startY, startM] = startKey.split("-").map(Number);
  const [endY, endM] = endKey.split("-").map(Number);
  const list = [];
  for (let y = startY; y <= endY; y += 1) {
    const minM = y === startY ? startM : 1;
    const maxM = y === endY ? endM : 12;
    for (let m = minM; m <= maxM; m += 1) list.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return list;
}

function monthLabel(key) {
  const [year, month] = key.split("-");
  return `${MONTH_LABELS[Number(month) - 1]} ${year}`;
}

function copyMonthDefaults() {
  return JSON.parse(JSON.stringify(monthDefaults));
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function toMoney(value) {
  return `${value.toFixed(2)} MAD`;
}

function sumItems(items) {
  return items.reduce((acc, item) => acc + toNumber(item.amount), 0);
}

function sumGoalContrib(goal) {
  const data = goal.contributions || {};
  return Object.values(data).reduce((acc, amount) => acc + toNumber(amount), 0);
}

function getGoalContributionForMonth(goal, monthKey) {
  return toNumber((goal.contributions || {})[monthKey] || 0);
}

function sanitizeMonthData(data) {
  const clean = copyMonthDefaults();
  clean.salary = toNumber(data.salary);
  clean.income = toNumber(data.income);
  clean.subsItems = normalizeItemsWithId(data.subsItems, "subs");
  clean.personalBudget = toNumber(data.personalBudget);
  clean.personalItems = mergePersonalItems(data.personalItems);
  clean.chargesItems = normalizeItemsWithId(data.chargesItems, "charge");
  return clean;
}

function sanitizeGoals(goals) {
  if (!Array.isArray(goals)) return [];
  return goals.map((goal) => ({
    id: goal.id || `goal_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: (goal.name || "").trim(),
    target: toNumber(goal.target),
    contributions: goal.contributions && typeof goal.contributions === "object" ? goal.contributions : {},
    closed: Boolean(goal.closed)
  })).filter((goal) => goal.name && goal.target > 0);
}

function loadStore() {
  const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  if (current && current.monthsData) return current;

  const old = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
  if (old && old.monthsData) {
    const migrated = {};
    Object.keys(old.monthsData).forEach((key) => { migrated[key] = sanitizeMonthData(old.monthsData[key]); });
    return { activeMonth: old.activeMonth || monthKeys[0], monthsData: migrated, goals: sanitizeGoals(old.goals) };
  }

  return { activeMonth: monthKeys[0], monthsData: { [monthKeys[0]]: copyMonthDefaults() }, goals: [] };
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function ensureMonth(monthKey) {
  if (!store.monthsData[monthKey]) {
    store.monthsData[monthKey] = copyMonthDefaults();
    syncChargesToMonth(monthKey);
  }
}

function getCurrentMonthData() {
  return store.monthsData[store.activeMonth];
}

function createItemElement(item, onRemove, groupKey) {
  const li = document.createElement("li");

  if (groupKey === "chargesItems") {
    li.className = "goal-item";
    const top = document.createElement("div");
    top.className = "goal-top";
    const title = document.createElement("strong");
    title.textContent = item.name;
    const status = document.createElement("span");
    status.className = "goal-meta";
    status.textContent = toMoney(item.amount);
    top.appendChild(title);
    top.appendChild(status);

    const actions = document.createElement("div");
    actions.className = "goal-actions";

    const editInput = document.createElement("input");
    editInput.type = "number";
    editInput.min = "0";
    editInput.step = "0.01";
    editInput.value = item.amount;
    editInput.className = "edit-amount-input";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-small";
    saveBtn.textContent = "Modifier";
    saveBtn.addEventListener("click", () => {
      const newVal = toNumber(editInput.value);
      if (newVal <= 0) return;
      item.amount = newVal;
      updateChargeAcrossMonths(item);
      saveStore();
      renderAll();
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "Supprimer";
    removeBtn.addEventListener("click", onRemove);

    actions.appendChild(editInput);
    actions.appendChild(saveBtn);
    actions.appendChild(removeBtn);

    li.appendChild(top);
    li.appendChild(actions);
    return li;
  }

  const name = document.createElement("span");
  const amount = document.createElement("strong");
  const removeBtn = document.createElement("button");

  name.className = "entry-name";
  amount.className = "entry-amount";
  removeBtn.className = "remove-btn";
  name.textContent = item.name;
  amount.textContent = toMoney(item.amount);
  removeBtn.textContent = "Supprimer";
  removeBtn.type = "button";
  removeBtn.addEventListener("click", onRemove);

  li.appendChild(name);
  li.appendChild(amount);
  li.appendChild(removeBtn);
  return li;
}

function renderItems(listEl, items, groupKey) {
  const month = getCurrentMonthData();
  listEl.innerHTML = "";
  items.forEach((item, index) => {
    listEl.appendChild(createItemElement(item, () => {
      if (groupKey === "chargesItems") {
        removeChargeFromAllMonths(item.id, item.name);
      } else {
        month[groupKey].splice(index, 1);
      }
      saveStore();
      renderAll();
    }, groupKey));
  });
}

function renderPersonalItems() {
  const month = getCurrentMonthData();
  personalList.innerHTML = "";

  month.personalItems.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "goal-item";
    li.classList.toggle("selected", item.id === selectedPersonalNeedId);

    const top = document.createElement("div");
    top.className = "goal-top";
    const title = document.createElement("strong");
    title.textContent = item.name;
    const status = document.createElement("span");
    status.className = "goal-meta";
    status.textContent = `${toMoney(item.spent)} / ${toMoney(item.budget)}`;
    top.appendChild(title);
    top.appendChild(status);

    const progressBar = document.createElement("div");
    progressBar.className = "goal-progress";
    const progressValue = document.createElement("span");
    const pct = item.budget > 0 ? Math.min(100, (item.spent / item.budget) * 100) : 0;
    progressValue.style.width = `${pct}%`;
    progressBar.appendChild(progressValue);

    const controls = document.createElement("div");
    controls.className = "goal-actions";

    const detailBtn = document.createElement("button");
    detailBtn.type = "button";
    detailBtn.className = "btn btn-small";
    detailBtn.textContent = "Détails";
    detailBtn.addEventListener("click", () => openPersonalDetail(item.id));

    const consumeInput = document.createElement("input");
    consumeInput.type = "number";
    consumeInput.min = "0";
    consumeInput.step = "0.01";
    consumeInput.placeholder = "Consommation MAD";

    const consumeBtn = document.createElement("button");
    consumeBtn.type = "button";
    consumeBtn.className = "btn btn-small";
    consumeBtn.textContent = "Consommer";
    consumeBtn.disabled = item.spent >= item.budget;
    consumeBtn.addEventListener("click", () => {
      const amount = toNumber(consumeInput.value);
      if (amount <= 0) return;
      if (item.spent + amount > item.budget) {
        alert("Montant depasse le budget de ce sous-besoin.");
        return;
      }
      item.spent += amount;
      item.logs = Array.isArray(item.logs) ? item.logs : [];
      item.logs.push({ month: store.activeMonth, amount });
      saveStore();
      renderAll();
    });

    const editBudgetInput = document.createElement("input");
    editBudgetInput.type = "number";
    editBudgetInput.min = "0";
    editBudgetInput.step = "0.01";
    editBudgetInput.value = item.budget;

    const editBudgetBtn = document.createElement("button");
    editBudgetBtn.type = "button";
    editBudgetBtn.className = "btn btn-small";
    editBudgetBtn.textContent = "Budget";
    editBudgetBtn.addEventListener("click", () => {
      const newBudget = toNumber(editBudgetInput.value);
      if (newBudget < 0) return;
      if (newBudget < item.spent) {
        alert("Le nouveau budget doit etre superieur ou egal au consomme.");
        return;
      }
      item.budget = newBudget;
      saveStore();
      renderAll();
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "Supprimer";
    removeBtn.addEventListener("click", () => {
      month.personalItems.splice(index, 1);
      if (selectedPersonalNeedId === item.id) {
        selectedPersonalNeedId = null;
      }
      saveStore();
      renderAll();
    });

    controls.appendChild(detailBtn);
    controls.appendChild(consumeInput);
    controls.appendChild(consumeBtn);
    controls.appendChild(removeBtn);

    const budgetControls = document.createElement("div");
    budgetControls.className = "goal-actions";
    budgetControls.appendChild(editBudgetInput);
    budgetControls.appendChild(editBudgetBtn);

    li.appendChild(top);
    li.appendChild(progressBar);
    li.appendChild(controls);
    li.appendChild(budgetControls);
    personalList.appendChild(li);
  });
}

function getSelectedPersonalNeed() {
  const month = getCurrentMonthData();
  return month.personalItems.find((item) => item.id === selectedPersonalNeedId) || null;
}

function openPersonalDetail(needId) {
  selectedPersonalNeedId = needId;
  renderPersonalDetail();
}

function renderPersonalDetail() {
  if (!personalDetailSection) return;
  const item = getSelectedPersonalNeed();
  if (!item) {
    personalDetailSection.classList.add("hidden");
    return;
  }

  detailName.textContent = item.name;
  detailLogList.innerHTML = "";
  const logs = Array.isArray(item.logs) ? item.logs : [];

  if (logs.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Aucun détail pour ce besoin.";
    detailLogList.appendChild(empty);
  } else {
    logs.forEach((log, idx) => {
      const row = document.createElement("li");
      row.className = "detail-log-item";
      const description = document.createElement("span");
      description.textContent = log.description || "Détail";
      const amount = document.createElement("strong");
      amount.textContent = toMoney(log.amount || 0);

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "8px";

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "remove-btn";
      delBtn.textContent = "Supprimer";
      delBtn.addEventListener("click", () => {
        item.logs.splice(idx, 1);
        item.spent = Math.max(0, item.spent - toNumber(log.amount));
        saveStore();
        renderAll();
        renderPersonalDetail();
      });

      row.appendChild(description);
      row.appendChild(amount);
      if (log.month) {
        const date = document.createElement("div");
        date.className = "detail-log-date";
        date.textContent = monthLabel(log.month);
        row.appendChild(date);
      }
      actions.appendChild(delBtn);
      row.appendChild(actions);
      detailLogList.appendChild(row);
    });
  }

  personalDetailSection.classList.remove("hidden");
}

function closePersonalDetailView() {
  selectedPersonalNeedId = null;
  personalDetailSection?.classList.add("hidden");
}

function addPersonalDetail() {
  const item = getSelectedPersonalNeed();
  if (!item) return;
  const description = detailDescriptionInput.value.trim();
  const amount = toNumber(detailAmountInput.value);
  if (!description || amount <= 0) return;

  item.logs = Array.isArray(item.logs) ? item.logs : [];
  item.logs.push({ description, amount, month: store.activeMonth });
  item.spent += amount;

  saveStore();
  renderAll();
  detailDescriptionInput.value = "";
  detailAmountInput.value = "";
}

function renderGoal(goal) {
  const li = document.createElement("li");
  li.className = "goal-item";

  const top = document.createElement("div");
  top.className = "goal-top";
  const title = document.createElement("strong");
  title.textContent = goal.name;
  const status = document.createElement("span");
  status.className = "goal-meta";

  const totalSaved = sumGoalContrib(goal);
  const progress = Math.min(100, goal.target > 0 ? (totalSaved / goal.target) * 100 : 0);
  const closed = goal.closed || totalSaved >= goal.target;
  if (closed) goal.closed = true;

  status.textContent = `${toMoney(totalSaved)} / ${toMoney(goal.target)}${closed ? " · Cloture" : ""}`;
  top.appendChild(title);
  top.appendChild(status);

  const progressBar = document.createElement("div");
  progressBar.className = "goal-progress";
  const progressValue = document.createElement("span");
  progressValue.style.width = `${progress}%`;
  progressBar.appendChild(progressValue);

  const actions = document.createElement("div");
  actions.className = "goal-actions";
  const monthInput = document.createElement("input");
  monthInput.type = "number";
  monthInput.min = "0";
  monthInput.step = "0.01";
  monthInput.placeholder = `Contribution ${monthLabel(store.activeMonth)}`;
  monthInput.value = getGoalContributionForMonth(goal, store.activeMonth) || "";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn btn-small";
  saveBtn.textContent = "Maj";
  saveBtn.disabled = closed;
  saveBtn.addEventListener("click", () => {
    if (!goal.contributions) goal.contributions = {};
    goal.contributions[store.activeMonth] = toNumber(monthInput.value);
    saveStore();
    renderAll();
  });

  // allow editing the goal target (total) directly
  const targetInput = document.createElement("input");
  targetInput.type = "number";
  targetInput.min = "0";
  targetInput.step = "0.01";
  targetInput.value = goal.target;
  targetInput.style.width = "120px";

  const targetSaveBtn = document.createElement("button");
  targetSaveBtn.type = "button";
  targetSaveBtn.className = "btn btn-small";
  targetSaveBtn.textContent = "Modifier cible";
  targetSaveBtn.addEventListener("click", () => {
    const newTarget = toNumber(targetInput.value);
    if (newTarget <= 0) return;
    goal.target = newTarget;
    saveStore();
    renderAll();
  });

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-btn";
  removeBtn.textContent = "Supprimer";
  removeBtn.addEventListener("click", () => {
    store.goals = store.goals.filter((g) => g.id !== goal.id);
    saveStore();
    renderAll();
  });

  actions.appendChild(monthInput);
  actions.appendChild(saveBtn);
  actions.appendChild(targetInput);
  actions.appendChild(targetSaveBtn);
  actions.appendChild(removeBtn);

  li.appendChild(top);
  li.appendChild(progressBar);
  li.appendChild(actions);
  return li;
}

function renderGoals() {
  goalsList.innerHTML = "";
  store.goals.forEach((goal) => goalsList.appendChild(renderGoal(goal)));
}

function renderMonthsPreview() {
  monthsPreview.innerHTML = "";
  monthKeys.forEach((key) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `month-badge${key === store.activeMonth ? " is-active" : ""}`;
    btn.textContent = monthLabel(key);
    btn.addEventListener("click", () => setMonth(key));
    monthsPreview.appendChild(btn);
  });
}

function getYearsFromMonthKeys() {
  const years = new Set();
  monthKeys.forEach((k) => {
    const [y] = k.split("-");
    years.add(y);
  });
  return Array.from(years).sort();
}

function populateYearSelect() {
  if (!yearSelect) return;
  const years = getYearsFromMonthKeys();
  yearSelect.innerHTML = "";
  years.forEach((y) => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });
  const currentYear = store.activeMonth.split("-")[0];
  yearSelect.value = currentYear;
  yearSelect.addEventListener("change", () => renderYearOverview(yearSelect.value));
}

function renderYearOverview(year) {
  if (!yearTable) return;
  const tbody = yearTable.querySelector("tbody");
  tbody.innerHTML = "";
  let totals = { salary: 0, income: 0, subs: 0, personal: 0, charges: 0, goals: 0, remaining: 0 };

  monthKeys.filter((k) => k.startsWith(year + "-")).forEach((monthKey) => {
    ensureMonth(monthKey);
    const m = store.monthsData[monthKey];
    const salary = toNumber(m.salary);
    const income = toNumber(m.income);
    const subs = sumItems(m.subsItems);
    const personal = toNumber(m.personalBudget);
    const charges = sumItems(m.chargesItems);
    const goals = store.goals.reduce((acc, g) => acc + getGoalContributionForMonth(g, monthKey), 0);
    const remainingVal = salary + income - (subs + personal + charges + goals);

    const tr = document.createElement("tr");
    const monthNameTd = document.createElement("td");
    monthNameTd.textContent = monthLabel(monthKey);
    tr.appendChild(monthNameTd);
    [salary, income, subs, personal, charges, goals, remainingVal].forEach((v) => {
      const td = document.createElement("td");
      td.textContent = toMoney(v);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);

    totals.salary += salary;
    totals.income += income;
    totals.subs += subs;
    totals.personal += personal;
    totals.charges += charges;
    totals.goals += goals;
    totals.remaining += remainingVal;
  });

  yearSalaryTotal.textContent = toMoney(totals.salary);
  yearIncomeTotal.textContent = toMoney(totals.income);
  yearSubsTotal.textContent = toMoney(totals.subs);
  yearPersonalTotal.textContent = toMoney(totals.personal);
  yearChargesTotal.textContent = toMoney(totals.charges);
  yearRemaining.textContent = toMoney(totals.remaining);
}

function renderAll() {
  const month = getCurrentMonthData();
  const salary = toNumber(month.salary);
  const income = toNumber(month.income);
  const totalSubs = sumItems(month.subsItems);
  const totalPersonalAllocated = month.personalItems.reduce((acc, item) => acc + toNumber(item.budget), 0);
  const totalPersonalBudget = toNumber(month.personalBudget);
  const totalCharges = sumItems(month.chargesItems);
  const totalGoalsForMonth = store.goals.reduce((acc, goal) => acc + getGoalContributionForMonth(goal, store.activeMonth), 0);
  const rest = salary + income - (totalSubs + totalPersonalBudget + totalCharges + totalGoalsForMonth);

  salaryInput.value = month.salary;
  incomeInput.value = month.income;
  personalBudgetInput.value = month.personalBudget;
  monthSelect.value = store.activeMonth;

  salaryTotal.textContent = toMoney(salary);
  subsSummary.textContent = toMoney(totalSubs);
  personalSummary.textContent = toMoney(totalPersonalBudget);
  chargesSummary.textContent = toMoney(totalCharges);
  goalsSummary.textContent = toMoney(totalGoalsForMonth);
  incomeTotal.textContent = toMoney(income);
  remaining.textContent = toMoney(rest);
  personalAllocated.textContent = toMoney(totalPersonalAllocated);
  personalUnallocated.textContent = toMoney(totalPersonalBudget - totalPersonalAllocated);
  personalAlert.hidden = totalPersonalAllocated <= totalPersonalBudget;

  renderItems(subsList, month.subsItems, "subsItems");
  renderPersonalItems();
  renderPersonalDetail();
  renderItems(chargesList, month.chargesItems, "chargesItems");
  renderGoals();
  renderMonthsPreview();
}

function addItem(nameInput, valueInput, groupKey) {
  const month = getCurrentMonthData();
  const name = nameInput.value.trim();
  const amount = toNumber(valueInput.value);
  if (!name || amount <= 0) return;

  const entry = { name, amount };
  if (groupKey === "chargesItems") {
    entry.id = generateId("charge");
    replicateChargesToAllMonths(entry);
  } else {
    month[groupKey].push(entry);
    if (groupKey === "subsItems") {
      replicateSubsToAllMonths(entry);
    }
  }

  saveStore();
  renderAll();
  nameInput.value = "";
  valueInput.value = "";
}

function replicateSubsToAllMonths(subscription) {
  monthKeys.forEach((monthKey) => {
    ensureMonth(monthKey);
    const monthData = store.monthsData[monthKey];
    const exists = monthData.subsItems.some((item) => item.name === subscription.name);
    if (!exists) {
      monthData.subsItems.push({ ...subscription });
    }
  });
}

function getAllChargesFromStore() {
  const chargesMap = new Map();
  Object.values(store.monthsData).forEach((monthData) => {
    (monthData.chargesItems || []).forEach((item) => {
      const key = item.id || item.name;
      if (!chargesMap.has(key)) {
        chargesMap.set(key, {
          id: item.id || generateId("charge"),
          name: item.name,
          amount: toNumber(item.amount),
        });
      }
    });
  });
  return Array.from(chargesMap.values());
}

function syncChargesToMonth(monthKey) {
  const monthData = store.monthsData[monthKey];
  getAllChargesFromStore().forEach((charge) => {
    const exists = monthData.chargesItems.some((item) => item.id === charge.id || item.name === charge.name);
    if (!exists) {
      monthData.chargesItems.push({ ...charge });
    }
  });
}

function updateChargeAcrossMonths(charge) {
  monthKeys.forEach((monthKey) => {
    ensureMonth(monthKey);
    const monthData = store.monthsData[monthKey];
    const existing = monthData.chargesItems.find((item) => item.id === charge.id || item.name === charge.name);
    if (existing) {
      existing.amount = toNumber(charge.amount);
    }
  });
}

function removeChargeFromAllMonths(chargeId, chargeName) {
  monthKeys.forEach((monthKey) => {
    ensureMonth(monthKey);
    const monthData = store.monthsData[monthKey];
    monthData.chargesItems = monthData.chargesItems.filter((item) => item.id !== chargeId && item.name !== chargeName);
  });
}

function replicateChargesToAllMonths(charge) {
  monthKeys.forEach((monthKey) => {
    ensureMonth(monthKey);
    const monthData = store.monthsData[monthKey];
    const existing = monthData.chargesItems.find((item) => item.id === charge.id || item.name === charge.name);
    if (existing) {
      existing.amount = toNumber(charge.amount);
      existing.id = charge.id;
    } else {
      monthData.chargesItems.push({ ...charge });
    }
  });
}

function addPersonalNeed() {
  const month = getCurrentMonthData();
  const name = personalNameInput.value.trim();
  const budget = toNumber(personalValueInput.value);
  if (!name || budget <= 0) return;

  month.personalItems.push({
    id: generateId("need"),
    name,
    budget,
    spent: 0,
    logs: []
  });
  saveStore();
  renderAll();
  personalNameInput.value = "";
  personalValueInput.value = "";
}

function addGoal() {
  const name = goalNameInput.value.trim();
  const target = toNumber(goalTargetInput.value);
  if (!name || target <= 0) return;

  store.goals.push({
    id: `goal_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    target,
    contributions: {},
    closed: false
  });
  saveStore();
  renderAll();
  goalNameInput.value = "";
  goalTargetInput.value = "";
}

const PAGE_LABELS = {
  salaire: "Salaire",
  abonnements: "Abonnements",
  besoins: "Besoins personnels",
  charges: "Charges",
  objectifs: "Objectifs",
  annee: "Année"
};

function setActiveTab(targetTab) {
  tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === targetTab));
  panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === targetTab));

  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) {
    pageTitle.textContent = PAGE_LABELS[targetTab] || "Budget";
  }
  renderAll();
}

function setMonth(monthKey) {
  ensureMonth(monthKey);
  store.activeMonth = monthKey;
  saveStore();
  renderAll();
}

function populateMonthSelect() {
  monthSelect.innerHTML = "";
  monthKeys.forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = monthLabel(key);
    monthSelect.appendChild(option);
  });
  populateYearSelect();
}

tabs.forEach((tab) => tab.addEventListener("click", () => setActiveTab(tab.dataset.tab)));
monthSelect.addEventListener("change", (event) => setMonth(event.target.value));

salaryInput.addEventListener("input", (event) => {
  const month = getCurrentMonthData();
  month.salary = toNumber(event.target.value);
  saveStore();
  renderAll();
});

incomeInput.addEventListener("input", (event) => {
  const month = getCurrentMonthData();
  month.income = toNumber(event.target.value);
  saveStore();
  renderAll();
});

personalBudgetInput.addEventListener("input", (event) => {
  const month = getCurrentMonthData();
  month.personalBudget = toNumber(event.target.value);
  saveStore();
  renderAll();
});

addSubsBtn.addEventListener("click", () => addItem(subsNameInput, subsValueInput, "subsItems"));
addPersonalBtn.addEventListener("click", addPersonalNeed);
addChargesBtn.addEventListener("click", () => addItem(chargesNameInput, chargesValueInput, "chargesItems"));
addGoalBtn.addEventListener("click", addGoal);
addDetailBtn?.addEventListener("click", addPersonalDetail);
closePersonalDetail?.addEventListener("click", closePersonalDetailView);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

populateMonthSelect();
renderAll();
