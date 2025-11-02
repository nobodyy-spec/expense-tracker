// Simple expense storage using localStorage
const STORAGE_KEY = 'expenses';

function loadExpenses() {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
	} catch (_) {
		return [];
	}
}

function saveExpenses(expenses) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function formatCurrency(num) {
	const n = Number(num || 0);
	return `$${n.toFixed(2)}`;
}

function pad2(n) { return String(n).padStart(2, '0'); }
function formatDisplayDate(dateInput) {
	const d = new Date(dateInput);
	const dd = pad2(d.getDate());
	const mm = pad2(d.getMonth() + 1);
	const yyyy = d.getFullYear();
	return `${dd},${mm},${yyyy}`;
}

function isSameWeek(dateA, dateB) {
	const a = new Date(dateA);
	const b = new Date(dateB);
	const day = 24 * 60 * 60 * 1000;
	const monday = (d) => {
		const copy = new Date(d);
		const diff = (copy.getDay() + 6) % 7; // Monday=0
		copy.setHours(0,0,0,0);
		return new Date(copy.getTime() - diff * day);
	};
	return monday(a).getTime() === monday(b).getTime();
}

function isSameMonth(dateA, dateB) {
	const a = new Date(dateA);
	const b = new Date(dateB);
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function calculateStats(expenses) {
	const now = new Date();
	let total = 0;
	let count = expenses.length;
	let weekTotal = 0;
	let monthTotal = 0;
	const byCategory = {};

	for (const e of expenses) {
		const amt = Number(e.amount) || 0;
		total += amt;
		if (isSameWeek(e.date, now)) weekTotal += amt;
		if (isSameMonth(e.date, now)) monthTotal += amt;
		const key = e.category || 'other';
		byCategory[key] = (byCategory[key] || 0) + amt;
	}

	return { total, count, weekTotal, monthTotal, byCategory };
}

function renderDashboard(stats) {
	const $ = (id) => document.getElementById(id);
	const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
	set('totalAmount', formatCurrency(stats.total));
	set('weekAmount', formatCurrency(stats.weekTotal));
	set('monthAmount', formatCurrency(stats.monthTotal));
	set('totalCount', String(stats.count));
}

function prettyCategory(key) {
	switch (key) {
		case 'food': return 'Food & Dining';
		case 'transport': return 'Transportation';
		case 'shopping': return 'Shopping';
		case 'entertainment': return 'Entertainment';
		case 'health': return 'Health & Medical';
		case 'bills': return 'Bills & Utilities';
		case 'education': return 'Education';
		case 'travel': return 'Travel';
		default: return 'Other';
	}
}

// Removed monthly chart and category visuals for the simple version

function renderExpensesList(expenses) {
	const wrap = document.getElementById('expensesList');
	const empty = document.getElementById('emptyState');
	if (!wrap) return;
	wrap.innerHTML = '';
	if (!expenses.length) {
		if (empty) empty.style.display = 'block';
		return;
	}
	if (empty) empty.style.display = 'none';
	for (const e of expenses) {
		const row = document.createElement('div');
		row.className = 'expense-row';
		row.style.display = 'grid';
		row.style.gridTemplateColumns = '1fr auto auto auto';
		row.style.gap = '8px';
		row.style.padding = '8px 0';
		row.style.borderBottom = '1px solid #f1f5f9';
		const desc = document.createElement('div');
		desc.textContent = e.description || '(no description)';
		const cat = document.createElement('div');
		cat.style.color = '#6b7280';
		cat.textContent = prettyCategory(e.category || 'other');
		const date = document.createElement('div');
		date.style.color = '#6b7280';
		date.textContent = formatDisplayDate(e.date);
		const amt = document.createElement('div');
		amt.style.textAlign = 'right';
		amt.style.fontWeight = '600';
		amt.textContent = formatCurrency(e.amount);
		row.appendChild(desc);
		row.appendChild(cat);
		row.appendChild(date);
		row.appendChild(amt);
		wrap.appendChild(row);
	}
}

function applyFilters(expenses) {
	const search = document.getElementById('searchInput')?.value?.toLowerCase() || '';
	const category = document.getElementById('categoryFilter')?.value || '';
	const period = document.getElementById('periodFilter')?.value || '';
	return expenses.filter(e => {
		const matchText = !search || (e.description || '').toLowerCase().includes(search);
		const matchCat = !category || e.category === category;
		let matchPeriod = true;
		if (period === 'today') {
			const today = new Date();
			const d = new Date(e.date);
			matchPeriod = d.toDateString() === today.toDateString();
		} else if (period === 'week') {
			matchPeriod = isSameWeek(e.date, new Date());
		} else if (period === 'month') {
			matchPeriod = isSameMonth(e.date, new Date());
		}
		return matchText && matchCat && matchPeriod;
	});
}

function updateUI() {
	const all = loadExpenses();
	const filtered = applyFilters(all);
	const stats = calculateStats(filtered);
	renderDashboard(stats);
	// Simple version: only dashboard totals and list
	renderExpensesList(filtered);
}

function hookForm() {
	const form = document.getElementById('expenseForm');
	if (!form) return;
	form.addEventListener('submit', (e) => {
		e.preventDefault();
		const description = document.getElementById('description')?.value?.trim();
		const amount = Number(document.getElementById('amount')?.value || 0);
		const category = document.getElementById('category')?.value || 'other';
		const date = document.getElementById('date')?.value || new Date().toISOString().slice(0,10);
		if (!description || !amount) return;
		const all = loadExpenses();
		all.push({ id: cryptoRandomId(), description, amount, category, date });
		saveExpenses(all);
		form.reset();
		updateUI();
	});
}

function cryptoRandomId() {
	try {
		return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
			(Number(crypto.getRandomValues(new Uint8Array(1))[0]) & 15 >> (Number(c) / 4)).toString(16)
		);
	} catch (_) {
		return String(Date.now()) + Math.random().toString(16).slice(2);
	}
}

function hookFilters() {
	const ids = ['searchInput','categoryFilter','periodFilter'];
	ids.forEach(id => {
		const el = document.getElementById(id);
		if (el) el.addEventListener('input', updateUI);
	});
	const clear = document.getElementById('clearFilters');
	if (clear) clear.addEventListener('click', (e) => {
		e.preventDefault();
		ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
		updateUI();
	});
}

document.addEventListener('DOMContentLoaded', () => {
	hookForm();
	hookFilters();
	updateUI();
});


