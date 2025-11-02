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
	return `${dd}-${mm}-${yyyy}`;
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

function getCategoryColor(key) {
	const colors = {
		'food': '#9333ea',
		'transport': '#7c3aed',
		'shopping': '#a855f7',
		'entertainment': '#c084fc',
		'health': '#d946ef',
		'bills': '#e879f9',
		'education': '#f0abfc',
		'travel': '#f5d0fe',
		'other': '#faf5ff'
	};
	return colors[key] || colors['other'];
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
		row.className = 'expense-item';
		
		const leftCol = document.createElement('div');
		leftCol.className = 'expense-main';
		
		const desc = document.createElement('div');
		desc.className = 'expense-desc';
		desc.textContent = e.description || '(no description)';
		
		const meta = document.createElement('div');
		meta.className = 'expense-meta';
		
		const cat = document.createElement('span');
		cat.className = 'expense-category';
		cat.textContent = prettyCategory(e.category || 'other');
		
		const date = document.createElement('span');
		date.className = 'expense-date';
		date.textContent = formatDisplayDate(e.date);
		
		meta.appendChild(cat);
		meta.appendChild(date);
		leftCol.appendChild(desc);
		leftCol.appendChild(meta);
		
		const rightCol = document.createElement('div');
		rightCol.className = 'expense-actions';
		
		const amt = document.createElement('div');
		amt.className = 'expense-amount';
		amt.textContent = formatCurrency(e.amount);
		
		const editBtn = document.createElement('button');
		editBtn.className = 'action-btn edit-btn';
		editBtn.innerHTML = '<i class="fas fa-edit"></i>';
		editBtn.onclick = () => openEditModal(e);
		editBtn.title = 'Edit';
		
		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'action-btn delete-btn';
		deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
		deleteBtn.onclick = () => deleteExpense(e.id);
		deleteBtn.title = 'Delete';
		
		rightCol.appendChild(amt);
		rightCol.appendChild(editBtn);
		rightCol.appendChild(deleteBtn);
		
		row.appendChild(leftCol);
		row.appendChild(rightCol);
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

function renderCharts(expenses) {
	renderCategoryChart(expenses);
	renderMonthlyChart(expenses);
}

function renderCategoryChart(expenses) {
	const ctx = document.getElementById('categoryChart');
	if (!ctx) return;
	const stats = calculateStats(expenses);
	const categories = Object.keys(stats.byCategory);
	const amounts = Object.values(stats.byCategory);
	
	// Clear previous chart
	ctx.width = ctx.offsetWidth;
	ctx.height = 220;
	const c = ctx.getContext('2d');
	c.clearRect(0, 0, ctx.width, ctx.height);
	
	if (!categories.length) return;
	
	const centerX = ctx.width / 2;
	const centerY = ctx.height / 2 - 20;
	const radius = 70;
	const innerRadius = 40;
	const total = amounts.reduce((sum, val) => sum + val, 0);
	
	let currentAngle = -Math.PI / 2;
	
	// Draw donut chart
	categories.forEach((cat, i) => {
		const sliceAngle = (amounts[i] / total) * 2 * Math.PI;
		
		// Outer arc
		c.beginPath();
		c.moveTo(centerX, centerY);
		c.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
		c.closePath();
		c.fillStyle = getCategoryColor(cat);
		c.fill();
		
		// Inner circle cutout
		c.beginPath();
		c.moveTo(centerX, centerY);
		c.arc(centerX, centerY, innerRadius, currentAngle, currentAngle + sliceAngle);
		c.closePath();
		c.fillStyle = '#ffffff';
		c.fill();
		
		// Calculate label position
		const labelAngle = currentAngle + sliceAngle / 2;
		const labelRadius = (radius + innerRadius) / 2;
		const labelX = centerX + labelRadius * Math.cos(labelAngle);
		const labelY = centerY + labelRadius * Math.sin(labelAngle);
		
		// Draw label if slice is big enough
		if (sliceAngle > 0.3) {
			c.fillStyle = '#fff';
			c.font = 'bold 11px sans-serif';
			c.textAlign = 'center';
			c.textBaseline = 'middle';
			c.fillText(formatCurrency(amounts[i]), labelX, labelY);
		}
		
		currentAngle += sliceAngle;
	});
	
	// Render legend in HTML
	renderCategoryLegend(categories, amounts, total);
}

function renderCategoryLegend(categories, amounts, total) {
	const legendContainer = document.getElementById('categoryLegend');
	if (!legendContainer) return;
	
	legendContainer.innerHTML = '';
	
	categories.forEach((cat, i) => {
		const legendItem = document.createElement('div');
		legendItem.className = 'legend-item';
		
		const colorBox = document.createElement('div');
		colorBox.className = 'legend-color';
		colorBox.style.backgroundColor = getCategoryColor(cat);
		
		const label = document.createElement('span');
		label.className = 'legend-label';
		const catName = prettyCategory(cat);
		const pct = ((amounts[i] / total) * 100).toFixed(1);
		label.textContent = `${catName}: ${pct}%`;
		
		legendItem.appendChild(colorBox);
		legendItem.appendChild(label);
		legendContainer.appendChild(legendItem);
	});
}

function renderMonthlyChart(expenses) {
	const ctx = document.getElementById('monthlyChart');
	if (!ctx) return;
	
	// Get last 6 months
	const months = [];
	const now = new Date();
	for (let i = 5; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		months.push(new Date(d));
	}
	
	const amounts = months.map(month => {
		return expenses
			.filter(e => isSameMonth(e.date, month))
			.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
	});
	
	ctx.width = ctx.offsetWidth;
	ctx.height = 200;
	const c = ctx.getContext('2d');
	c.clearRect(0, 0, ctx.width, ctx.height);
	
	if (!amounts.some(a => a > 0)) return;
	
	const color = '#9333ea';
	const max = Math.max(...amounts);
	const barWidth = ctx.width / 6;
	const padding = 30;
	const chartHeight = ctx.height - 40;
	
	c.font = '10px sans-serif';
	c.textAlign = 'center';
	
	months.forEach((month, i) => {
		const h = chartHeight * (amounts[i] / (max || 1));
		const x = i * barWidth;
		const y = ctx.height - h - 10;
		
		c.fillStyle = color;
		c.fillRect(x + padding, y, barWidth - padding * 2, h);
		
		const label = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month.getMonth()];
		c.fillStyle = '#1e1b4b';
		c.fillText(label, x + barWidth / 2, ctx.height - 2);
	});
}

function updateUI() {
	const all = loadExpenses();
	const filtered = applyFilters(all);
	const stats = calculateStats(filtered);
	renderDashboard(stats);
	renderCharts(filtered);
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

function openEditModal(expense) {
	document.getElementById('editId').value = expense.id;
	document.getElementById('editDescription').value = expense.description || '';
	document.getElementById('editAmount').value = expense.amount || '';
	document.getElementById('editCategory').value = expense.category || 'other';
	document.getElementById('editDate').value = expense.date || '';
	document.getElementById('editModal').classList.add('show');
}

function deleteExpense(id) {
	if (!confirm('Are you sure you want to delete this expense?')) return;
	const all = loadExpenses();
	const filtered = all.filter(e => e.id !== id);
	saveExpenses(filtered);
	updateUI();
}

function hookModal() {
	const modal = document.getElementById('editModal');
	const closeBtn = document.getElementById('closeModal');
	const cancelBtn = document.getElementById('cancelEdit');
	const editForm = document.getElementById('editForm');
	
	if (closeBtn) closeBtn.onclick = () => modal.classList.remove('show');
	if (cancelBtn) cancelBtn.onclick = () => modal.classList.remove('show');
	if (modal) modal.onclick = (e) => {
		if (e.target === modal) modal.classList.remove('show');
	};
	
	if (editForm) {
		editForm.onsubmit = (e) => {
			e.preventDefault();
			const id = document.getElementById('editId').value;
			const description = document.getElementById('editDescription').value.trim();
			const amount = Number(document.getElementById('editAmount').value || 0);
			const category = document.getElementById('editCategory').value || 'other';
			const date = document.getElementById('editDate').value || '';
			
			if (!description || !amount) return;
			
			const all = loadExpenses();
			const idx = all.findIndex(e => e.id === id);
			if (idx !== -1) {
				all[idx] = { id, description, amount, category, date };
				saveExpenses(all);
				updateUI();
				modal.classList.remove('show');
			}
		};
	}
}

function setDefaultDate() {
	const dateInput = document.getElementById('date');
	if (dateInput && !dateInput.value) {
		dateInput.value = new Date().toISOString().slice(0, 10);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	hookForm();
	hookFilters();
	hookModal();
	setDefaultDate();
	updateUI();
});


