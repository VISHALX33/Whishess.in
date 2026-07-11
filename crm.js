/**
 * Whishess CRM — Advanced customer hub
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'whishess_crm_customers';
  var VIEW_KEY = 'whishess_crm_view';

  var STATUSES = [
    { id: 'new', label: 'New lead' },
    { id: 'quoted', label: 'Quoted' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'completed', label: 'Completed' },
    { id: 'lost', label: 'Lost' }
  ];

  var OCCASIONS = [
    'Wedding', 'Festival / Eid', 'Birthday', 'Anniversary',
    'Baby shower', 'Return gifts', 'Hamper', 'Corporate', 'Other'
  ];

  var ACTIVITY_ICONS = {
    note: '📝', whatsapp: '💬', call: '📞', invoice: '🧾',
    meeting: '🤝', status: '🔄', created: '✨'
  };

  var customers = [];
  var editingId = null;
  var drawerId = null;
  var currentView = 'table';
  var toastTimer;
  var els = {};

  function $(id) { return document.getElementById(id); }

  function cacheEls() {
    els = {
      tbody: $('crm-tbody'),
      kanban: $('crm-kanban'),
      search: $('crm-search'),
      filter: $('crm-filter'),
      quickFilter: $('crm-quick-filter'),
      sort: $('crm-sort'),
      statTotal: $('crm-stat-total'),
      statActive: $('crm-stat-active'),
      statPipeline: $('crm-stat-pipeline'),
      statRevenue: $('crm-stat-revenue'),
      statCompleted: $('crm-stat-completed'),
      statFollowup: $('crm-stat-followup'),
      modal: $('crm-modal'),
      drawer: $('crm-drawer'),
      form: $('crm-form'),
      activityForm: $('crm-activity-form'),
      toast: $('crm-toast'),
      funnel: $('crm-funnel'),
      sources: $('crm-sources'),
      occasions: $('crm-occasions'),
      followList: $('crm-follow-list')
    };
  }

  function uid() {
    return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function normalize(c) {
    c.activities = c.activities || [];
    c.source = c.source || '';
    c.priority = c.priority || 'medium';
    c.tags = c.tags || '';
    return c;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      customers = (raw ? JSON.parse(raw) : []).map(normalize);
    } catch (e) {
      customers = [];
    }
    currentView = localStorage.getItem(VIEW_KEY) || 'table';
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
    } catch (e) {}
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('is-visible'); }, 2600);
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var p = iso.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }

  function formatDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function formatMoney(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function statusLabel(id) {
    var s = STATUSES.find(function (x) { return x.id === id; });
    return s ? s.label : id;
  }

  function priorityLabel(p) {
    return p === 'high' ? 'High' : p === 'low' ? 'Low' : 'Medium';
  }

  function followUpClass(iso) {
    if (!iso) return '';
    if (iso < todayISO()) return 'crm-follow--overdue';
    var soon = new Date();
    soon.setDate(soon.getDate() + 3);
    if (iso <= soon.toISOString().slice(0, 10)) return 'crm-follow--soon';
    return '';
  }

  function phoneDigits(phone) {
    return String(phone || '').replace(/\D/g, '');
  }

  function waLink(phone) {
    var d = phoneDigits(phone);
    if (d.length === 10) d = '91' + d;
    return d ? 'https://wa.me/' + d : '#';
  }

  function invoiceLink(c) {
    var p = new URLSearchParams();
    if (c.name) p.set('name', c.name);
    if (c.phone) p.set('phone', c.phone);
    if (c.address) p.set('address', c.address);
    if (c.orderValue) p.set('value', c.orderValue);
    return 'invoice.html?' + p.toString();
  }

  function findCustomer(id) {
    return customers.find(function (c) { return c.id === id; });
  }

  function addActivity(customerId, type, text) {
    var c = findCustomer(customerId);
    if (!c) return;
    c.activities.unshift({
      id: uid(),
      type: type,
      text: text,
      at: new Date().toISOString()
    });
    c.lastContact = todayISO();
    c.updatedAt = new Date().toISOString();
    save();
  }

  function getFiltered() {
    var q = (els.search.value || '').trim().toLowerCase();
    var status = els.filter.value;
    var quick = els.quickFilter.value;
    var today = todayISO();
    var weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);

    var list = customers.filter(function (c) {
      if (status && c.status !== status) return false;
      if (quick === 'overdue') {
        if (!c.followUp || c.followUp >= today || c.status === 'completed' || c.status === 'lost') return false;
      }
      if (quick === 'week') {
        if (!c.followUp || c.followUp < today || c.followUp > weekEnd.toISOString().slice(0, 10)) return false;
        if (c.status === 'completed' || c.status === 'lost') return false;
      }
      if (quick === 'high' && !(Number(c.orderValue) >= 2000)) return false;
      if (quick === 'priority' && c.priority !== 'high') return false;
      if (!q) return true;
      var hay = [c.name, c.phone, c.email, c.occasion, c.notes, c.address, c.source, c.tags].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    var sort = els.sort.value;
    list.sort(function (a, b) {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'value') return (Number(b.orderValue) || 0) - (Number(a.orderValue) || 0);
      if (sort === 'followup') {
        if (!a.followUp && !b.followUp) return 0;
        if (!a.followUp) return 1;
        if (!b.followUp) return -1;
        return a.followUp.localeCompare(b.followUp);
      }
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
    return list;
  }

  function updateStats() {
    var active = customers.filter(function (c) {
      return c.status === 'new' || c.status === 'quoted' || c.status === 'confirmed';
    });
    var month = todayISO().slice(0, 7);
    var completedMonth = customers.filter(function (c) {
      return c.status === 'completed' && (c.updatedAt || '').slice(0, 7) === month;
    });
    var pipelineValue = active.reduce(function (s, c) { return s + (Number(c.orderValue) || 0); }, 0);
    var revenue = completedMonth.reduce(function (s, c) { return s + (Number(c.orderValue) || 0); }, 0);
    var followups = customers.filter(function (c) {
      return c.followUp && c.followUp <= todayISO() && c.status !== 'completed' && c.status !== 'lost';
    }).length;

    els.statTotal.textContent = customers.length;
    els.statActive.textContent = active.length;
    els.statPipeline.textContent = formatMoney(pipelineValue);
    els.statRevenue.textContent = formatMoney(revenue);
    els.statCompleted.textContent = completedMonth.length;
    els.statFollowup.textContent = followups;
  }

  function renderTags(tags) {
    if (!tags) return '';
    return tags.split(',').map(function (t) {
      t = t.trim();
      return t ? '<span class="crm-tag">' + escapeHtml(t) + '</span>' : '';
    }).join('');
  }

  function bindTableEvents() {
    els.tbody.querySelectorAll('[data-view-customer]').forEach(function (btn) {
      btn.addEventListener('click', function () { openDrawer(btn.getAttribute('data-view-customer')); });
    });
    els.tbody.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); openModal(btn.getAttribute('data-edit')); });
    });
    els.tbody.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); deleteCustomer(btn.getAttribute('data-del')); });
    });
    els.tbody.querySelectorAll('tr[data-id]').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('a, button')) return;
        openDrawer(row.getAttribute('data-id'));
      });
    });
  }

  function renderTable() {
    var list = getFiltered();
    if (!list.length) {
      els.tbody.innerHTML = '<tr><td colspan="8" class="crm-empty">No customers match. Try adjusting filters or add a new lead.</td></tr>';
      return;
    }
    els.tbody.innerHTML = list.map(function (c) {
      return (
        '<tr data-id="' + c.id + '" class="crm-row-clickable">' +
          '<td><div class="crm-name">' + escapeHtml(c.name) + '</div>' +
            (c.phone ? '<div class="crm-sub">' + escapeHtml(c.phone) + '</div>' : '') +
            (c.tags ? '<div class="crm-tags">' + renderTags(c.tags) + '</div>' : '') +
          '</td>' +
          '<td>' + escapeHtml(c.source || '—') + '</td>' +
          '<td>' + escapeHtml(c.occasion || '—') + '</td>' +
          '<td><span class="crm-badge crm-badge--' + escapeHtml(c.status) + '">' + escapeHtml(statusLabel(c.status)) + '</span></td>' +
          '<td><span class="crm-priority crm-priority--' + escapeHtml(c.priority) + '">' + priorityLabel(c.priority) + '</span></td>' +
          '<td class="' + followUpClass(c.followUp) + '">' + formatDate(c.followUp) + '</td>' +
          '<td>' + (c.orderValue ? formatMoney(c.orderValue) : '—') + '</td>' +
          '<td><div class="crm-row-actions">' +
            '<button type="button" class="crm-icon-btn" data-view-customer="' + c.id + '">View</button>' +
            (c.phone ? '<a class="crm-icon-btn" href="' + waLink(c.phone) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">WA</a>' : '') +
            '<a class="crm-icon-btn" href="' + invoiceLink(c) + '" onclick="event.stopPropagation()">Invoice</a>' +
            '<button type="button" class="crm-icon-btn" data-edit="' + c.id + '">Edit</button>' +
          '</div></td>' +
        '</tr>'
      );
    }).join('');
    bindTableEvents();
  }

  function renderKanbanCard(c) {
    return (
      '<article class="crm-kanban-card" draggable="true" data-id="' + c.id + '">' +
        '<div class="crm-kanban-card-top">' +
          '<strong>' + escapeHtml(c.name) + '</strong>' +
          '<span class="crm-priority crm-priority--' + escapeHtml(c.priority) + '">' + priorityLabel(c.priority) + '</span>' +
        '</div>' +
        (c.occasion ? '<div class="crm-sub">' + escapeHtml(c.occasion) + '</div>' : '') +
        (c.orderValue ? '<div class="crm-kanban-value">' + formatMoney(c.orderValue) + '</div>' : '') +
        (c.followUp ? '<div class="crm-sub ' + followUpClass(c.followUp) + '">Follow-up: ' + formatDate(c.followUp) + '</div>' : '') +
        '<div class="crm-kanban-card-actions">' +
          '<button type="button" class="crm-icon-btn" data-view-customer="' + c.id + '">Open</button>' +
        '</div>' +
      '</article>'
    );
  }

  function renderKanban() {
    var list = getFiltered();
    els.kanban.innerHTML = STATUSES.map(function (st) {
      var col = list.filter(function (c) { return c.status === st.id; });
      var colValue = col.reduce(function (s, c) { return s + (Number(c.orderValue) || 0); }, 0);
      return (
        '<div class="crm-kanban-col" data-status="' + st.id + '">' +
          '<header class="crm-kanban-col-head">' +
            '<span>' + st.label + '</span>' +
            '<span class="crm-kanban-count">' + col.length + '</span>' +
          '</header>' +
          '<div class="crm-kanban-col-value">' + formatMoney(colValue) + '</div>' +
          '<div class="crm-kanban-drop" data-drop="' + st.id + '">' +
            col.map(renderKanbanCard).join('') +
          '</div>' +
        '</div>'
      );
    }).join('');

    els.kanban.querySelectorAll('.crm-kanban-card').forEach(function (card) {
      card.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', card.getAttribute('data-id'));
        card.classList.add('is-dragging');
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('is-dragging');
      });
    });

    els.kanban.querySelectorAll('.crm-kanban-drop').forEach(function (zone) {
      zone.addEventListener('dragover', function (e) {
        e.preventDefault();
        zone.classList.add('is-over');
      });
      zone.addEventListener('dragleave', function () { zone.classList.remove('is-over'); });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        zone.classList.remove('is-over');
        var id = e.dataTransfer.getData('text/plain');
        var newStatus = zone.getAttribute('data-drop');
        var c = findCustomer(id);
        if (c && c.status !== newStatus) {
          var old = c.status;
          c.status = newStatus;
          c.updatedAt = new Date().toISOString();
          addActivity(id, 'status', 'Status changed: ' + statusLabel(old) + ' → ' + statusLabel(newStatus));
          save();
          render();
          toast('Moved to ' + statusLabel(newStatus));
        }
      });
    });

    els.kanban.querySelectorAll('[data-view-customer]').forEach(function (btn) {
      btn.addEventListener('click', function () { openDrawer(btn.getAttribute('data-view-customer')); });
    });
  }

  function renderBarChart(container, data, labelKey, valueKey) {
    if (!data.length) {
      container.innerHTML = '<p class="crm-muted">No data yet</p>';
      return;
    }
    var max = Math.max.apply(null, data.map(function (d) { return d[valueKey]; }));
    container.innerHTML = data.map(function (d) {
      var pct = max ? Math.round((d[valueKey] / max) * 100) : 0;
      return (
        '<div class="crm-bar-row">' +
          '<span class="crm-bar-label">' + escapeHtml(d[labelKey]) + '</span>' +
          '<div class="crm-bar-track"><span class="crm-bar-fill" style="width:' + pct + '%"></span></div>' +
          '<span class="crm-bar-val">' + d[valueKey] + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderInsights() {
    var funnel = STATUSES.map(function (st) {
      return { label: st.label, count: customers.filter(function (c) { return c.status === st.id; }).length };
    });
    els.funnel.innerHTML = funnel.map(function (f) {
      var max = customers.length || 1;
      var pct = Math.round((f.count / max) * 100);
      return (
        '<div class="crm-funnel-row">' +
          '<span>' + escapeHtml(f.label) + '</span>' +
          '<div class="crm-funnel-bar"><span style="width:' + pct + '%"></span></div>' +
          '<strong>' + f.count + '</strong>' +
        '</div>'
      );
    }).join('');

    var sourceMap = {};
    customers.forEach(function (c) {
      var s = c.source || 'Unknown';
      sourceMap[s] = (sourceMap[s] || 0) + 1;
    });
    var sources = Object.keys(sourceMap).map(function (k) {
      return { label: k, count: sourceMap[k] };
    }).sort(function (a, b) { return b.count - a.count; });
    renderBarChart(els.sources, sources, 'label', 'count');

    var occMap = {};
    customers.forEach(function (c) {
      if (!c.occasion) return;
      occMap[c.occasion] = (occMap[c.occasion] || 0) + 1;
    });
    var occs = Object.keys(occMap).map(function (k) {
      return { label: k, count: occMap[k] };
    }).sort(function (a, b) { return b.count - a.count; }).slice(0, 6);
    renderBarChart(els.occasions, occs, 'label', 'count');

    var due = customers.filter(function (c) {
      return c.followUp && c.followUp <= todayISO() && c.status !== 'completed' && c.status !== 'lost';
    }).sort(function (a, b) { return (a.followUp || '').localeCompare(b.followUp || ''); }).slice(0, 8);

    els.followList.innerHTML = due.length ? due.map(function (c) {
      return (
        '<li><button type="button" data-view-customer="' + c.id + '">' +
          '<strong>' + escapeHtml(c.name) + '</strong>' +
          '<span class="' + followUpClass(c.followUp) + '">' + formatDate(c.followUp) + '</span>' +
        '</button></li>'
      );
    }).join('') : '<li class="crm-muted">No overdue follow-ups 🎉</li>';

    els.followList.querySelectorAll('[data-view-customer]').forEach(function (btn) {
      btn.addEventListener('click', function () { openDrawer(btn.getAttribute('data-view-customer')); });
    });
  }

  function setView(view) {
    currentView = view;
    localStorage.setItem(VIEW_KEY, view);
    document.querySelectorAll('.crm-view-tab').forEach(function (tab) {
      tab.classList.toggle('is-active', tab.getAttribute('data-view') === view);
    });
    document.querySelectorAll('.crm-view').forEach(function (v) { v.hidden = true; v.classList.remove('is-active'); });
    var panel = $('crm-view-' + view);
    if (panel) { panel.hidden = false; panel.classList.add('is-active'); }
    render();
  }

  function render() {
    updateStats();
    if (currentView === 'table') renderTable();
    else if (currentView === 'pipeline') renderKanban();
    else if (currentView === 'insights') renderInsights();
    if (drawerId && findCustomer(drawerId)) renderDrawer(drawerId);
  }

  function openDrawer(id) {
    drawerId = id;
    els.drawer.classList.add('is-open');
    els.drawer.setAttribute('aria-hidden', 'false');
    renderDrawer(id);
  }

  function closeDrawer() {
    drawerId = null;
    els.drawer.classList.remove('is-open');
    els.drawer.setAttribute('aria-hidden', 'true');
  }

  function renderDrawer(id) {
    var c = findCustomer(id);
    if (!c) return;

    $('crm-drawer-name').textContent = c.name;
    $('crm-drawer-meta').innerHTML =
      '<span class="crm-badge crm-badge--' + escapeHtml(c.status) + '">' + statusLabel(c.status) + '</span>' +
      (c.source ? ' · ' + escapeHtml(c.source) : '');

    $('crm-drawer-actions').innerHTML =
      (c.phone ? '<a class="crm-btn" href="' + waLink(c.phone) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
      '<a class="crm-btn" href="' + invoiceLink(c) + '">Create invoice</a>' +
      '<button type="button" class="crm-btn" id="crm-drawer-edit">Edit</button>' +
      '<button type="button" class="crm-btn" id="crm-drawer-delete">Delete</button>';

    $('crm-drawer-edit').onclick = function () { closeDrawer(); openModal(id); };
    $('crm-drawer-delete').onclick = function () { deleteCustomer(id); closeDrawer(); };

    $('crm-drawer-details').innerHTML =
      '<div><dt>Phone</dt><dd>' + escapeHtml(c.phone || '—') + '</dd></div>' +
      '<div><dt>Email</dt><dd>' + escapeHtml(c.email || '—') + '</dd></div>' +
      '<div><dt>Address</dt><dd>' + escapeHtml(c.address || '—') + '</dd></div>' +
      '<div><dt>Occasion</dt><dd>' + escapeHtml(c.occasion || '—') + '</dd></div>' +
      '<div><dt>Order value</dt><dd>' + (c.orderValue ? formatMoney(c.orderValue) : '—') + '</dd></div>' +
      '<div><dt>Follow-up</dt><dd class="' + followUpClass(c.followUp) + '">' + formatDate(c.followUp) + '</dd></div>' +
      '<div><dt>Priority</dt><dd>' + priorityLabel(c.priority) + '</dd></div>' +
      '<div><dt>Tags</dt><dd>' + (c.tags ? renderTags(c.tags) : '—') + '</dd></div>' +
      '<div class="crm-dl-full"><dt>Notes</dt><dd>' + escapeHtml(c.notes || '—') + '</dd></div>';

    var timeline = $('crm-drawer-timeline');
    if (!c.activities.length) {
      timeline.innerHTML = '<li class="crm-muted">No activity logged yet</li>';
    } else {
      timeline.innerHTML = c.activities.map(function (a) {
        return (
          '<li class="crm-timeline-item">' +
            '<span class="crm-timeline-icon">' + (ACTIVITY_ICONS[a.type] || '•') + '</span>' +
            '<div><div class="crm-timeline-text">' + escapeHtml(a.text) + '</div>' +
            '<div class="crm-timeline-time">' + formatDateTime(a.at) + '</div></div>' +
          '</li>'
        );
      }).join('');
    }
  }

  function openModal(id) {
    editingId = id || null;
    var c = id ? findCustomer(id) : null;
    $('crm-modal-title').textContent = c ? 'Edit customer' : 'Add customer';
    $('crm-name').value = c ? c.name : '';
    $('crm-phone').value = c ? c.phone : '';
    $('crm-email').value = c ? c.email : '';
    $('crm-address').value = c ? c.address : '';
    $('crm-source').value = c ? c.source : '';
    $('crm-priority').value = c ? c.priority : 'medium';
    $('crm-occasion').value = c ? c.occasion : '';
    $('crm-status').value = c ? c.status : 'new';
    $('crm-order-value').value = c && c.orderValue ? c.orderValue : '';
    $('crm-follow-up').value = c ? c.followUp || '' : '';
    $('crm-tags').value = c ? c.tags : '';
    $('crm-notes').value = c ? c.notes : '';
    els.modal.classList.add('is-open');
    $('crm-name').focus();
  }

  function closeModal() {
    els.modal.classList.remove('is-open');
    editingId = null;
    els.form.reset();
  }

  function duplicatePhone(phone, excludeId) {
    var d = phoneDigits(phone);
    if (d.length < 10) return null;
    return customers.find(function (c) {
      return c.id !== excludeId && phoneDigits(c.phone) === d;
    });
  }

  function deleteCustomer(id) {
    var c = findCustomer(id);
    if (!c || !confirm('Delete ' + c.name + ' and all activity history?')) return;
    customers = customers.filter(function (x) { return x.id !== id; });
    save();
    render();
    toast('Customer removed');
  }

  function handleSubmit(e) {
    e.preventDefault();
    var now = new Date().toISOString();
    var phone = $('crm-phone').value.trim();
    var dup = duplicatePhone(phone, editingId);
    if (dup && !confirm('Phone number already exists for "' + dup.name + '". Save anyway?')) return;

    var oldStatus = editingId ? findCustomer(editingId).status : null;
    var data = {
      name: $('crm-name').value.trim(),
      phone: phone,
      email: $('crm-email').value.trim(),
      address: $('crm-address').value.trim(),
      source: $('crm-source').value,
      priority: $('crm-priority').value,
      occasion: $('crm-occasion').value,
      status: $('crm-status').value,
      orderValue: $('crm-order-value').value.trim(),
      followUp: $('crm-follow-up').value,
      tags: $('crm-tags').value.trim(),
      notes: $('crm-notes').value.trim(),
      updatedAt: now,
      lastContact: editingId ? (findCustomer(editingId).lastContact || '') : todayISO()
    };

    if (!data.name) { toast('Please enter customer name'); return; }

    if (editingId) {
      var idx = customers.findIndex(function (x) { return x.id === editingId; });
      if (idx !== -1) {
        data.id = editingId;
        data.createdAt = customers[idx].createdAt;
        data.activities = customers[idx].activities || [];
        if (oldStatus !== data.status) {
          data.activities.unshift({
            id: uid(), type: 'status',
            text: 'Status: ' + statusLabel(oldStatus) + ' → ' + statusLabel(data.status),
            at: now
          });
        }
        customers[idx] = normalize(data);
      }
    } else {
      data.id = uid();
      data.createdAt = now;
      data.activities = [{ id: uid(), type: 'created', text: 'Customer added to CRM', at: now }];
      customers.unshift(normalize(data));
    }

    save();
    closeModal();
    render();
    toast(editingId ? 'Customer updated' : 'Customer added');
  }

  function handleActivity(e) {
    e.preventDefault();
    if (!drawerId) return;
    var type = $('crm-activity-type').value;
    var text = $('crm-activity-text').value.trim();
    if (!text) return;
    addActivity(drawerId, type, text);
    $('crm-activity-text').value = '';
    renderDrawer(drawerId);
    render();
    toast('Activity logged');
  }

  function exportJSON() {
    var blob = new Blob([JSON.stringify(customers, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'whishess-crm-backup-' + todayISO() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('JSON backup downloaded');
  }

  function exportCSV() {
    var headers = ['Name', 'Phone', 'Email', 'Address', 'Source', 'Occasion', 'Status', 'Priority', 'Order Value', 'Follow-up', 'Tags', 'Notes', 'Created'];
    var rows = customers.map(function (c) {
      return [c.name, c.phone, c.email, c.address, c.source, c.occasion, statusLabel(c.status),
        priorityLabel(c.priority), c.orderValue, c.followUp, c.tags, c.notes, formatDate(c.createdAt && c.createdAt.slice(0, 10))]
        .map(function (v) { return '"' + String(v || '').replace(/"/g, '""') + '"'; }).join(',');
    });
    var csv = headers.join(',') + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'whishess-customers-' + todayISO() + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('CSV exported');
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('Invalid');
        if (!confirm('Import ' + data.length + ' records? Merges with existing data.')) return;
        data.forEach(function (item) {
          if (!item.id || !item.name) return;
          var idx = customers.findIndex(function (x) { return x.id === item.id; });
          if (idx !== -1) customers[idx] = normalize(item);
          else customers.push(normalize(item));
        });
        save();
        render();
        toast('Import complete');
      } catch (e) { toast('Invalid backup file'); }
    };
    reader.readAsText(file);
  }

  function buildOccasionOptions() {
    var sel = $('crm-occasion');
    OCCASIONS.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      sel.appendChild(opt);
    });
  }

  function bindEvents() {
    $('crm-add').addEventListener('click', function () { openModal(); });
    $('crm-modal-close').addEventListener('click', closeModal);
    $('crm-cancel').addEventListener('click', closeModal);
    $('crm-drawer-close').addEventListener('click', closeDrawer);
    els.modal.addEventListener('click', function (e) { if (e.target === els.modal) closeModal(); });
    els.drawer.addEventListener('click', function (e) { if (e.target === els.drawer) closeDrawer(); });
    els.form.addEventListener('submit', handleSubmit);
    els.activityForm.addEventListener('submit', handleActivity);

    ['input', 'change'].forEach(function (ev) {
      els.search.addEventListener(ev, render);
      els.filter.addEventListener(ev, render);
      els.quickFilter.addEventListener(ev, render);
      els.sort.addEventListener(ev, render);
    });

    document.querySelectorAll('.crm-view-tab').forEach(function (tab) {
      tab.addEventListener('click', function () { setView(tab.getAttribute('data-view')); });
    });

    $('crm-export').addEventListener('click', exportJSON);
    $('crm-export-csv').addEventListener('click', exportCSV);
    $('crm-import').addEventListener('click', function () { $('crm-import-file').click(); });
    $('crm-import-file').addEventListener('change', function (e) {
      if (e.target.files[0]) importData(e.target.files[0]);
      e.target.value = '';
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (els.modal.classList.contains('is-open')) closeModal();
        else if (els.drawer.classList.contains('is-open')) closeDrawer();
      }
    });
  }

  function init() {
    cacheEls();
    buildOccasionOptions();
    load();
    bindEvents();
    setView(currentView);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
