const SUPABASE_URL = 'https://hdgfmncycavoqjfeleem.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ogNczthN8mfe4kIczXC7yA_GMrzwixl';
const ADMIN_PASSWORD = 'adminweblith';
let allLeads = [];
let currentViewMode = window.innerWidth <= 768 ? 'cards' : 'table';
let userChangedViewMode = false;

function togglePass() {
  const inp = document.getElementById('adminPass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* SIDEBAR DRAWER CONTROLS */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const btn = document.getElementById('mobileMenuBtn');
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    closeSidebar();
  } else {
    sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
    if (btn) btn.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const btn = document.getElementById('mobileMenuBtn');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
  if (btn) btn.classList.remove('active');
  document.body.style.overflow = '';
}

/* VIEW MODE (CARDS vs TABLE) */
function setViewMode(mode) {
  currentViewMode = mode;
  userChangedViewMode = true;
  updateViewModeUI();
}

function updateViewModeUI() {
  const btnCards = document.getElementById('viewBtnCards');
  const btnTable = document.getElementById('viewBtnTable');
  const cardsWrap = document.getElementById('leadsCardsWrap');
  const tableWrap = document.getElementById('leadsTableWrap');

  if (btnCards && btnTable) {
    if (currentViewMode === 'cards') {
      btnCards.classList.add('active');
      btnTable.classList.remove('active');
    } else {
      btnTable.classList.add('active');
      btnCards.classList.remove('active');
    }
  }

  // Only toggle visibility if leads are available / not loading
  const loading = document.getElementById('tableLoadingState');
  if (loading && loading.style.display !== 'none') return;

  const empty = document.getElementById('emptyState');
  if (empty && empty.style.display === 'block') {
    if (cardsWrap) cardsWrap.style.display = 'none';
    if (tableWrap) tableWrap.style.display = 'none';
    return;
  }

  if (cardsWrap && tableWrap) {
    if (currentViewMode === 'cards') {
      cardsWrap.style.display = 'grid';
      tableWrap.style.display = 'none';
    } else {
      cardsWrap.style.display = 'none';
      tableWrap.style.display = 'block';
    }
  }
}

window.addEventListener('resize', () => {
  if (!userChangedViewMode) {
    const newMode = window.innerWidth <= 768 ? 'cards' : 'table';
    if (newMode !== currentViewMode) {
      currentViewMode = newMode;
      updateViewModeUI();
    }
  }
  if (window.innerWidth > 900) {
    closeSidebar();
  }
});

async function adminLogin() {
  const pass = document.getElementById('adminPass').value;
  const err = document.getElementById('loginError');
  if (pass !== ADMIN_PASSWORD) {
    err.textContent = 'Incorrect password. Try again.';
    document.getElementById('adminPass').classList.add('error');
    setTimeout(() => { err.textContent = ''; document.getElementById('adminPass').classList.remove('error'); }, 3000);
    return;
  }

  const btn = document.getElementById('loginBtn');
  const txt = document.getElementById('loginBtnText');
  const ldr = document.getElementById('loginLoader');
  btn.disabled = true; txt.style.display = 'none'; ldr.style.display = 'flex';

  sessionStorage.setItem('wl_admin', '1');
  await loadLeads();

  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('adminWrapper').style.display = 'flex';
  renderStats();

  btn.disabled = false; txt.style.display = ''; ldr.style.display = 'none';
}

function adminLogout() {
  sessionStorage.removeItem('wl_admin');
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('adminWrapper').style.display = 'none';
  document.getElementById('adminPass').value = '';
  allLeads = [];
  closeSidebar();
}

window.addEventListener('load', async function() {
  if (sessionStorage.getItem('wl_admin') === '1') {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('adminWrapper').style.display = 'flex';
    await loadLeads();
    renderStats();
  }
});

async function loadLeads() {
  const loading = document.getElementById('tableLoadingState');
  const tableWrap = document.getElementById('leadsTableWrap');
  const cardsWrap = document.getElementById('leadsCardsWrap');
  if (loading) loading.style.display = 'flex';
  if (tableWrap) tableWrap.style.display = 'none';
  if (cardsWrap) cardsWrap.style.display = 'none';

  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/leads?select=*&order=created_at.desc', {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });
    if (!res.ok) throw new Error(await res.text());
    allLeads = await res.json();

    // also merge any local fallback leads
    const fb = JSON.parse(localStorage.getItem('wl_leads_fb') || '[]');
    if (fb.length > 0) {
      const fbMapped = fb.map(l => ({ ...l, _local: true }));
      allLeads = [...fbMapped, ...allLeads];
    }
  } catch(e) {
    console.error('Failed to fetch from Supabase:', e);
    allLeads = JSON.parse(localStorage.getItem('wl_leads_fb') || '[]');
  }

  if (loading) loading.style.display = 'none';
  filterLeads();
}

function showSection(name, el) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  if (el) el.classList.add('active');
  if (name === 'stats') renderStats();
  closeSidebar();
}

function typeBadge(type) {
  const m = { 
    'Business Website': 'badge-purple', 
    'Portfolio': 'badge-cyan', 
    'Dynamic Website': 'badge-pink', 
    'E-commerce': 'badge-green' 
  };
  return '<span class="badge ' + (m[type] || 'badge-purple') + '">' + escapeHtml(type || '-') + '</span>';
}

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) + ' ' + 
         d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
}

function filterLeads() {
  const search = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  const filterType = document.getElementById('filterType').value;
  const filtered = allLeads.filter(l => {
    const text = [l.name, l.phone, l.whatsapp, l.email, l.website_type, l.budget, l.message].join(' ').toLowerCase();
    const matchSearch = !search || text.includes(search);
    const matchType = !filterType || l.website_type === filterType;
    return matchSearch && matchType;
  });

  const countEl = document.getElementById('leadCountText');
  if (countEl) {
    countEl.textContent = filtered.length + ' lead' + (filtered.length !== 1 ? 's' : '') + ' found (Total: ' + allLeads.length + ')';
  }

  renderLeads(filtered);
}

function renderLeads(leads) {
  const tbody = document.getElementById('leadsBody');
  const cardsWrap = document.getElementById('leadsCardsWrap');
  const empty = document.getElementById('emptyState');

  if (leads.length === 0) {
    if (tbody) tbody.innerHTML = '';
    if (cardsWrap) cardsWrap.innerHTML = '';
    if (empty) empty.style.display = 'block';
    updateViewModeUI();
    return;
  }

  if (empty) empty.style.display = 'none';

  // Render Table Rows
  if (tbody) {
    tbody.innerHTML = leads.map((l, i) => {
      const waRaw = (l.whatsapp || '').replace(/\D/g, '');
      const waCell = waRaw ? 
        `<a href="https://wa.me/${waRaw}" target="_blank" rel="noopener" class="wa-table-link">${escapeHtml(l.whatsapp || '-')} &#128172;</a>` : '-';
      const phoneRaw = (l.phone || '').replace(/[^\d+]/g, '');
      const phoneCell = phoneRaw ?
        `<a href="tel:${phoneRaw}" class="phone-table-link">${escapeHtml(l.phone || '-')}</a>` : '-';
      const localBadge = l._local ? '<span class="local-badge">LOCAL</span>' : '';

      return '<tr>' +
        '<td class="lead-idx">' + (i + 1) + '</td>' +
        '<td><strong>' + escapeHtml(l.name || '-') + '</strong>' + localBadge + '</td>' +
        '<td>' + phoneCell + '</td>' +
        '<td>' + waCell + '</td>' +
        '<td class="email-cell">' + (l.email ? `<a href="mailto:${escapeHtml(l.email)}" class="email-table-link">${escapeHtml(l.email)}</a>` : '-') + '</td>' +
        '<td>' + typeBadge(l.website_type) + '</td>' +
        '<td class="budget-cell">' + escapeHtml(l.budget || '-') + '</td>' +
        '<td class="msg-cell" title="' + escapeHtml(l.message || '') + '">' + (escapeHtml(l.message) || '<span style="opacity:0.35">-</span>') + '</td>' +
        '<td class="date-cell">' + fmtDate(l.created_at || l.submittedAt) + '</td>' +
        '<td><button class="btn-del" onclick="deleteLead(\'' + l.id + '\', ' + (l._local ? 'true' : 'false') + ')" title="Delete Lead">&#128465;</button></td>' +
      '</tr>';
    }).join('');
  }

  // Render Mobile / Responsive Cards
  if (cardsWrap) {
    cardsWrap.innerHTML = leads.map((l, i) => {
      const waRaw = (l.whatsapp || '').replace(/\D/g, '');
      const waLink = waRaw ? `https://wa.me/${waRaw}` : '';
      const phoneRaw = (l.phone || '').replace(/[^\d+]/g, '');
      const localBadge = l._local ? '<span class="local-badge">LOCAL</span>' : '';

      return `
        <div class="lead-card">
          <div class="lead-card-header">
            <div class="lead-card-title-group">
              <span class="lead-card-idx">#${i + 1}</span>
              <span class="lead-card-name">${escapeHtml(l.name || 'Unnamed Lead')}</span>
              ${localBadge}
            </div>
            <button class="btn-del" onclick="deleteLead('${l.id}', ${l._local ? 'true' : 'false'})" title="Delete lead">&#128465;</button>
          </div>

          <div class="lead-card-meta">
            ${typeBadge(l.website_type)}
            ${l.budget ? `<span class="card-budget-badge">&#128176; ${escapeHtml(l.budget)}</span>` : ''}
            <span class="card-date-badge">&#128197; ${fmtDate(l.created_at || l.submittedAt)}</span>
          </div>

          <!-- DIRECT TOUCH ACTIONS FOR MOBILE -->
          <div class="lead-card-actions">
            ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" class="card-action-btn wa-btn">&#128172; WhatsApp</a>` : ''}
            ${phoneRaw ? `<a href="tel:${phoneRaw}" class="card-action-btn phone-btn">&#128222; Call</a>` : ''}
            ${l.email ? `<a href="mailto:${escapeHtml(l.email)}" class="card-action-btn email-btn">&#9993; Email</a>` : ''}
          </div>

          ${l.message ? `
            <div class="lead-card-message">
              <span class="message-label">&#128172; Project Details:</span>
              <p class="message-text">${escapeHtml(l.message)}</p>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  updateViewModeUI();
}

async function deleteLead(id, isLocal) {
  if (!confirm('Are you sure you want to delete this lead?')) return;
  if (isLocal) {
    const fb = JSON.parse(localStorage.getItem('wl_leads_fb') || '[]').filter(l => l.id !== id);
    localStorage.setItem('wl_leads_fb', JSON.stringify(fb));
  } else {
    try {
      await fetch(SUPABASE_URL + '/rest/v1/leads?id=eq.' + id, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
    } catch(e) { console.error('Delete error:', e); }
  }
  await loadLeads();
  renderStats();
}

async function clearAllLeads() {
  if (!confirm('Are you sure? This will delete ALL leads from Supabase permanently!')) return;
  try {
    await fetch(SUPABASE_URL + '/rest/v1/leads?id=neq.00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
  } catch(e) { console.error('Clear error:', e); }
  localStorage.removeItem('wl_leads_fb');
  allLeads = [];
  filterLeads();
  renderStats();
}

function exportCSV() {
  if (allLeads.length === 0) { alert('No leads to export!'); return; }
  const headers = ['Name', 'Phone', 'WhatsApp', 'Email', 'Website Type', 'Budget', 'Message', 'Date'];
  const rows = allLeads.map(l => [
    `"${(l.name || '').replace(/"/g, '""')}"`,
    `"${(l.phone || '').replace(/"/g, '""')}"`,
    `"${(l.whatsapp || '').replace(/"/g, '""')}"`,
    `"${(l.email || '').replace(/"/g, '""')}"`,
    `"${(l.website_type || '').replace(/"/g, '""')}"`,
    `"${(l.budget || '').replace(/"/g, '""')}"`,
    `"${(l.message || '').replace(/"/g, '""')}"`,
    `"${fmtDate(l.created_at || l.submittedAt)}"`
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'weblith_leads_' + new Date().toLocaleDateString('en-IN').replace(/\//g, '-') + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function renderStats() {
  const leads = allLeads;
  const total = leads.length;
  const today = leads.filter(l => new Date(l.created_at || l.submittedAt).toDateString() === new Date().toDateString()).length;
  const week = leads.filter(l => { 
    const d = new Date(l.created_at || l.submittedAt); 
    return (Date.now() - d) / (86400000) <= 7; 
  }).length;
  
  const typeCounts = {};
  leads.forEach(l => { 
    if (l.website_type) {
      typeCounts[l.website_type] = (typeCounts[l.website_type] || 0) + 1; 
    }
  });
  const top = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  const grid = document.getElementById('statsGrid');
  if (grid) {
    grid.innerHTML =
      statCard('&#128101;', total, 'Total Leads') +
      statCard('&#128197;', today, "Today's Leads") +
      statCard('&#128200;', week, 'This Week') +
      statCard('&#127942;', top ? top[0].split(' ')[0] : 'N/A', 'Top Request');
  }

  const maxT = Math.max(...Object.values(typeCounts), 1);
  const chartBars = document.getElementById('chartBars');
  if (chartBars) {
    const barsHtml = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([lbl, cnt]) =>
      '<div class="chart-row">' +
        '<div class="chart-label-wrap"><span class="chart-label">' + escapeHtml(lbl) + '</span><span class="chart-count-mobile">' + cnt + '</span></div>' +
        '<div class="chart-bar-wrap"><div class="chart-bar" style="width:' + (cnt / maxT * 100).toFixed(0) + '%"></div></div>' +
        '<span class="chart-count-desktop">' + cnt + '</span>' +
      '</div>'
    ).join('');
    chartBars.innerHTML = barsHtml || '<p style="color:#64748b;font-size:0.85rem;">No data yet.</p>';
  }

  // Recent 7 days
  const days = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days[d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' })] = 0;
  }
  leads.forEach(l => {
    const d = new Date(l.created_at || l.submittedAt);
    const key = d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
    if (days[key] !== undefined) days[key]++;
  });
  const maxD = Math.max(...Object.values(days), 1);
  const budgetBars = document.getElementById('budgetBars');
  if (budgetBars) {
    const budgetHtml = Object.entries(days).map(([lbl, cnt]) =>
      '<div class="chart-row">' +
        '<div class="chart-label-wrap"><span class="chart-label">' + escapeHtml(lbl) + '</span><span class="chart-count-mobile">' + cnt + '</span></div>' +
        '<div class="chart-bar-wrap"><div class="chart-bar" style="width:' + (cnt / maxD * 100).toFixed(0) + '%;background:linear-gradient(135deg,#06b6d4,#10b981)"></div></div>' +
        '<span class="chart-count-desktop">' + cnt + '</span>' +
      '</div>'
    ).join('');
    budgetBars.innerHTML = budgetHtml || '<p style="color:#64748b;font-size:0.85rem;">No data yet.</p>';
  }
}

function statCard(icon, val, label) {
  return '<div class="stat-card"><div class="stat-icon">' + icon + '</div><div class="stat-value">' + val + '</div><div class="stat-label">' + label + '</div></div>';
}
