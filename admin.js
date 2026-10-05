
const SUPABASE_URL = 'https://hdgfmncycavoqjfeleem.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ogNczthN8mfe4kIczXC7yA_GMrzwixl';
const ADMIN_PASSWORD = 'adminweblith';
let allLeads = [];

function togglePass() {
  const inp = document.getElementById('adminPass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

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
  const wrap = document.getElementById('leadsTableWrap');
  if (loading) loading.style.display = 'flex';
  if (wrap) wrap.style.display = 'none';

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
  if (wrap) wrap.style.display = 'block';
  filterLeads();
}

function showSection(name, el) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  el.classList.add('active');
  if (name === 'stats') renderStats();
}

function typeBadge(type) {
  const m = { 'Business Website':'badge-purple', 'Portfolio':'badge-cyan', 'Dynamic Website':'badge-pink', 'E-commerce':'badge-green' };
  return '<span class="badge ' + (m[type] || 'badge-purple') + '">' + (type || '-') + '</span>';
}

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) + ' ' + d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
}

function filterLeads() {
  const search = (document.getElementById('searchInput').value || '').toLowerCase();
  const filterType = document.getElementById('filterType').value;
  const filtered = allLeads.filter(l => {
    const text = [l.name,l.phone,l.whatsapp,l.email,l.website_type,l.budget,l.message].join(' ').toLowerCase();
    const matchSearch = !search || text.includes(search);
    const matchType = !filterType || l.website_type === filterType;
    return matchSearch && matchType;
  });
  document.getElementById('leadCountText').textContent = filtered.length + ' lead' + (filtered.length !== 1 ? 's' : '') + ' found (Total: ' + allLeads.length + ')';
  renderLeadsTable(filtered);
}

function renderLeadsTable(leads) {
  const tbody = document.getElementById('leadsBody');
  const empty = document.getElementById('emptyState');
  if (leads.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = leads.map((l, i) => {
    const wa = (l.whatsapp || '').replace(/\D/g,'');
    const waCell = wa ? '<a href="https://wa.me/' + wa + '" target="_blank" style="color:#25d366;text-decoration:none;">' + (l.whatsapp||'-') + ' &#128172;</a>' : '-';
    const localBadge = l._local ? '<span style="font-size:0.65rem;color:#f59e0b;margin-left:4px;">LOCAL</span>' : '';
    return '<tr>' +
      '<td style="color:#64748b;font-size:0.78rem;">' + (i+1) + '</td>' +
      '<td><strong>' + (l.name||'-') + '</strong>' + localBadge + '</td>' +
      '<td>' + (l.phone||'-') + '</td>' +
      '<td>' + waCell + '</td>' +
      '<td style="color:#94a3b8;">' + (l.email||'-') + '</td>' +
      '<td>' + typeBadge(l.website_type) + '</td>' +
      '<td style="color:#06b6d4;font-size:0.82rem;">' + (l.budget||'-') + '</td>' +
      '<td class="msg-cell" title="' + (l.message||'').replace(/"/g,'&quot;') + '">' + (l.message||'<span style="opacity:0.4">-</span>') + '</td>' +
      '<td class="date-cell">' + fmtDate(l.created_at||l.submittedAt) + '</td>' +
      '<td><button class="btn-del" onclick="deleteLead(\'' + l.id + '\', ' + (l._local?'true':'false') + ')">&#128465;</button></td>' +
    '</tr>';
  }).join('');
}

async function deleteLead(id, isLocal) {
  if (!confirm('Delete this lead?')) return;
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
  const headers = ['Name','Phone','WhatsApp','Email','Website Type','Budget','Message','Date'];
  const rows = allLeads.map(l => [
    l.name, l.phone, l.whatsapp, l.email, l.website_type, l.budget,
    (l.message||'').replace(/,/g,';'),
    fmtDate(l.created_at||l.submittedAt)
  ]);
  const csv = [headers,...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'weblith_leads_' + new Date().toLocaleDateString('en-IN').replace(/\//g,'-') + '.csv';
  a.click(); URL.revokeObjectURL(url);
}

function renderStats() {
  const leads = allLeads;
  const total = leads.length;
  const today = leads.filter(l => new Date(l.created_at||l.submittedAt).toDateString() === new Date().toDateString()).length;
  const week = leads.filter(l => { const d = new Date(l.created_at||l.submittedAt); return (Date.now()-d)/(86400000) <= 7; }).length;
  const typeCounts = {};
  leads.forEach(l => { typeCounts[l.website_type] = (typeCounts[l.website_type]||0)+1; });
  const top = Object.entries(typeCounts).sort((a,b)=>b[1]-a[1])[0];

  document.getElementById('statsGrid').innerHTML =
    statCard('&#128101;', total, 'Total Leads') +
    statCard('&#128197;', today, "Today's Leads") +
    statCard('&#128200;', week, 'This Week') +
    statCard('&#127942;', top ? top[0].split(' ')[0] : 'N/A', 'Top Request');

  const maxT = Math.max(...Object.values(typeCounts),1);
  document.getElementById('chartBars').innerHTML = Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]).map(([lbl,cnt]) =>
    '<div class="chart-row"><span class="chart-label">' + lbl + '</span>' +
    '<div class="chart-bar-wrap"><div class="chart-bar" style="width:' + (cnt/maxT*100).toFixed(0) + '%"></div></div>' +
    '<span class="chart-count">' + cnt + '</span></div>'
  ).join('') || '<p style="color:#64748b;font-size:0.85rem;">No data yet.</p>';

  // Recent 7 days
  const days = {};
  for (let i=6;i>=0;i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    days[d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})] = 0;
  }
  leads.forEach(l => {
    const d = new Date(l.created_at||l.submittedAt);
    const key = d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
    if (days[key] !== undefined) days[key]++;
  });
  const maxD = Math.max(...Object.values(days),1);
  document.getElementById('budgetBars').innerHTML = Object.entries(days).map(([lbl,cnt]) =>
    '<div class="chart-row"><span class="chart-label">' + lbl + '</span>' +
    '<div class="chart-bar-wrap"><div class="chart-bar" style="width:' + (cnt/maxD*100).toFixed(0) + '%;background:linear-gradient(135deg,#06b6d4,#10b981)"></div></div>' +
    '<span class="chart-count">' + cnt + '</span></div>'
  ).join('') || '<p style="color:#64748b;font-size:0.85rem;">No data yet.</p>';
}

function statCard(icon, val, label) {
  return '<div class="stat-card"><div class="stat-icon">' + icon + '</div><div class="stat-value">' + val + '</div><div class="stat-label">' + label + '</div></div>';
}
