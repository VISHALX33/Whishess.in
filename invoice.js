/**
 * Whishess — Invoice Generator (whishess.in/invoice.html)
 */
(function () {
  'use strict';

  var STORAGE_COUNTER = 'whishess_inv_counter';
  var STORAGE_DRAFT = 'whishess_inv_draft';
  var PRESETS = window.WHISHESS_INVOICE_PRESETS || [];

  var STATUS_LABELS = {
    unpaid: 'Unpaid',
    partial: 'Partial payment',
    paid: 'Paid in full'
  };

  var els = {};

  function cacheEls() {
    els = {
      invoiceNo: document.getElementById('inv-no'),
      invoiceDate: document.getElementById('inv-date'),
      dueDate: document.getElementById('inv-due'),
      customerName: document.getElementById('inv-customer-name'),
      customerPhone: document.getElementById('inv-customer-phone'),
      customerAddress: document.getElementById('inv-customer-address'),
      status: document.getElementById('inv-status'),
      amountPaid: document.getElementById('inv-amount-paid'),
      discount: document.getElementById('inv-discount'),
      gst: document.getElementById('inv-gst'),
      notes: document.getElementById('inv-notes'),
      signatureName: document.getElementById('inv-signature-name'),
      itemsEditor: document.getElementById('inv-items-editor'),
      presets: document.getElementById('inv-presets'),
      previewItems: document.getElementById('inv-preview-items'),
      previewSubtotal: document.getElementById('inv-preview-subtotal'),
      previewDiscount: document.getElementById('inv-preview-discount'),
      previewGst: document.getElementById('inv-preview-gst'),
      previewGstRow: document.getElementById('inv-preview-gst-row'),
      previewTotal: document.getElementById('inv-preview-total'),
      previewPaid: document.getElementById('inv-preview-paid'),
      previewBalance: document.getElementById('inv-preview-balance'),
      previewPayBar: document.getElementById('inv-preview-pay-bar'),
      previewPaymentNote: document.getElementById('inv-preview-payment-note'),
      previewCustomer: document.getElementById('inv-preview-customer'),
      previewNo: document.getElementById('inv-preview-no'),
      previewDate: document.getElementById('inv-preview-date'),
      previewDue: document.getElementById('inv-preview-due'),
      previewStatus: document.getElementById('inv-preview-status'),
      previewNotes: document.getElementById('inv-preview-notes'),
      previewNotesBlock: document.getElementById('inv-preview-notes-block'),
      previewSignature: document.getElementById('inv-preview-signature'),
      editorSubtotal: document.getElementById('inv-editor-subtotal'),
      editorTotal: document.getElementById('inv-editor-total'),
      editorPaid: document.getElementById('inv-editor-paid'),
      editorBalance: document.getElementById('inv-editor-balance'),
      editorPayBar: document.getElementById('inv-editor-pay-bar')
    };
  }

  function formatMoney(n) {
    return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function addDaysISO(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function formatDisplayDate(iso) {
    if (!iso) return '—';
    var p = iso.split('-');
    if (p.length !== 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function nextInvoiceNo() {
    var n = parseInt(localStorage.getItem(STORAGE_COUNTER) || '0', 10) + 1;
    localStorage.setItem(STORAGE_COUNTER, String(n));
    return 'WH-' + String(n).padStart(4, '0');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getItemsFromEditor() {
    var rows = els.itemsEditor.querySelectorAll('.inv-item-row');
    var items = [];
    rows.forEach(function (row) {
      var desc = row.querySelector('[data-field="desc"]').value.trim();
      var qty = parseFloat(row.querySelector('[data-field="qty"]').value) || 0;
      var rate = parseFloat(row.querySelector('[data-field="rate"]').value) || 0;
      if (desc || qty || rate) {
        items.push({ desc: desc || 'Gift wrapping service', qty: qty || 1, rate: rate });
      }
    });
    return items;
  }

  function calcTotals(items) {
    var subtotal = items.reduce(function (sum, it) {
      return sum + it.qty * it.rate;
    }, 0);
    var discountPct = parseFloat(els.discount.value) || 0;
    var discountAmt = subtotal * (discountPct / 100);
    var afterDiscount = subtotal - discountAmt;
    var gstPct = els.gst.checked ? 18 : 0;
    var gstAmt = afterDiscount * (gstPct / 100);
    var total = afterDiscount + gstAmt;
    return {
      subtotal: subtotal,
      discountAmt: discountAmt,
      discountPct: discountPct,
      gstAmt: gstAmt,
      gstPct: gstPct,
      total: total
    };
  }

  function getPaymentInfo(total) {
    var paid = Math.min(Math.max(parseFloat(els.amountPaid.value) || 0, 0), total);
    var balance = Math.max(total - paid, 0);
    var pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
    return { paid: paid, balance: balance, pct: pct };
  }

  function syncStatusFromPayment(total, payment) {
    if (payment.balance <= 0 && total > 0) {
      els.status.value = 'paid';
    } else if (payment.paid > 0 && payment.balance > 0) {
      els.status.value = 'partial';
    } else if (els.status.value === 'paid' && payment.balance > 0) {
      els.status.value = 'partial';
    }
  }

  function statusClass(status) {
    if (status === 'paid') return 'inv-status--paid';
    if (status === 'partial') return 'inv-status--partial';
    return 'inv-status--pending';
  }

  function paymentNote(total, payment) {
    if (total <= 0) return '';
    if (payment.balance <= 0) return 'Thank you — payment received in full.';
    if (payment.paid <= 0) return 'Full amount payable by due date.';
    var pct = Math.round(payment.pct);
    return pct + '% received · ' + formatMoney(payment.balance) + ' remaining';
  }

  function setPayBar(el, pct) {
    if (!el) return;
    el.style.width = pct + '%';
  }

  function renderPreview() {
    var items = getItemsFromEditor();
    var totals = calcTotals(items);
    var payment = getPaymentInfo(totals.total);

    if (document.activeElement !== els.amountPaid) {
      syncStatusFromPayment(totals.total, payment);
    }

    els.previewItems.innerHTML = '';
    if (!items.length) {
      els.previewItems.innerHTML = '<tr><td colspan="4" class="inv-table-empty">Add at least one line item</td></tr>';
    } else {
      items.forEach(function (it) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + escapeHtml(it.desc) + '</td>' +
          '<td>' + it.qty + '</td>' +
          '<td>' + formatMoney(it.rate) + '</td>' +
          '<td>' + formatMoney(it.qty * it.rate) + '</td>';
        els.previewItems.appendChild(tr);
      });
    }

    els.previewSubtotal.textContent = formatMoney(totals.subtotal);
    els.previewDiscount.textContent = totals.discountPct > 0
      ? '-' + formatMoney(totals.discountAmt) + ' (' + totals.discountPct + '%)'
      : formatMoney(0);
    els.previewGstRow.hidden = !(totals.gstPct > 0);
    els.previewGst.textContent = formatMoney(totals.gstAmt);
    els.previewTotal.textContent = formatMoney(totals.total);

    els.previewPaid.textContent = formatMoney(payment.paid);
    els.previewBalance.textContent = formatMoney(payment.balance);
    setPayBar(els.previewPayBar, payment.pct);
    els.previewPaymentNote.textContent = paymentNote(totals.total, payment);

    els.editorSubtotal.textContent = formatMoney(totals.subtotal);
    els.editorTotal.textContent = formatMoney(totals.total);
    els.editorPaid.textContent = formatMoney(payment.paid);
    els.editorBalance.textContent = formatMoney(payment.balance);
    setPayBar(els.editorPayBar, payment.pct);

    if (document.activeElement !== els.amountPaid) {
      els.amountPaid.value = payment.paid ? String(Math.round(payment.paid)) : '0';
    }

    els.previewNo.textContent = els.invoiceNo.value || '—';
    els.previewDate.textContent = formatDisplayDate(els.invoiceDate.value);
    els.previewDue.textContent = formatDisplayDate(els.dueDate.value);

    var customerLines = [];
    if (els.customerName.value.trim()) customerLines.push(escapeHtml(els.customerName.value.trim()));
    if (els.customerPhone.value.trim()) customerLines.push(escapeHtml(els.customerPhone.value.trim()));
    if (els.customerAddress.value.trim()) {
      customerLines.push(escapeHtml(els.customerAddress.value.trim()).replace(/\n/g, '<br>'));
    }
    els.previewCustomer.innerHTML = customerLines.length
      ? customerLines.join('<br>')
      : '<span class="inv-muted">Customer details</span>';

    var status = els.status.value;
    els.previewStatus.textContent = STATUS_LABELS[status] || status;
    els.previewStatus.className = 'inv-status ' + statusClass(status);

    if (els.notes.value.trim()) {
      els.previewNotes.textContent = els.notes.value.trim();
      els.previewNotesBlock.hidden = false;
    } else {
      els.previewNotesBlock.hidden = true;
    }

    els.previewSignature.textContent = els.signatureName.value.trim() || 'Whishess';

    saveDraftQuiet();
  }

  function createItemRow(data) {
    data = data || { desc: '', qty: 1, rate: '' };
    var row = document.createElement('div');
    row.className = 'inv-item-row';
    row.innerHTML =
      '<input type="text" data-field="desc" placeholder="Service description" value="' + escapeHtml(data.desc || '') + '" />' +
      '<input type="number" data-field="qty" min="0" step="1" placeholder="Qty" value="' + (data.qty != null ? data.qty : 1) + '" />' +
      '<input type="number" data-field="rate" min="0" step="1" placeholder="₹" value="' + (data.rate !== '' && data.rate != null ? data.rate : '') + '" />' +
      '<button type="button" class="inv-item-remove" aria-label="Remove item">&times;</button>';

    row.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('input', renderPreview);
    });
    row.querySelector('.inv-item-remove').addEventListener('click', function () {
      if (els.itemsEditor.querySelectorAll('.inv-item-row').length > 1) {
        row.remove();
        renderPreview();
      }
    });
    return row;
  }

  function addPresetItem(preset) {
    els.itemsEditor.appendChild(createItemRow({
      desc: preset.desc,
      qty: 1,
      rate: preset.rate
    }));
    renderPreview();
  }

  function buildPresets() {
    if (!els.presets) return;
    els.presets.innerHTML = '';
    PRESETS.forEach(function (preset) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inv-chip';
      btn.textContent = preset.desc;
      btn.title = preset.rate ? 'Add at ₹' + preset.rate : 'Add item';
      btn.addEventListener('click', function () {
        addPresetItem(preset);
      });
      els.presets.appendChild(btn);
    });
  }

  function getFormData() {
    return {
      invoiceNo: els.invoiceNo.value,
      invoiceDate: els.invoiceDate.value,
      dueDate: els.dueDate.value,
      customerName: els.customerName.value,
      customerPhone: els.customerPhone.value,
      customerAddress: els.customerAddress.value,
      status: els.status.value,
      amountPaid: els.amountPaid.value,
      discount: els.discount.value,
      gst: els.gst.checked,
      notes: els.notes.value,
      signatureName: els.signatureName.value,
      items: getItemsFromEditor()
    };
  }

  function setFormData(data) {
    els.invoiceNo.value = data.invoiceNo || nextInvoiceNo();
    els.invoiceDate.value = data.invoiceDate || todayISO();
    els.dueDate.value = data.dueDate || addDaysISO(7);
    els.customerName.value = data.customerName || '';
    els.customerPhone.value = data.customerPhone || '';
    els.customerAddress.value = data.customerAddress || '';
    els.status.value = data.status || 'unpaid';
    els.amountPaid.value = data.amountPaid != null ? data.amountPaid : 0;
    els.discount.value = data.discount != null ? data.discount : 0;
    els.gst.checked = !!data.gst;
    els.notes.value = data.notes || '';
    els.signatureName.value = data.signatureName || 'Whishess';

    els.itemsEditor.innerHTML = '';
    var items = data.items && data.items.length ? data.items : [{ desc: 'Gift wrapping service', qty: 1, rate: '' }];
    items.forEach(function (it) {
      els.itemsEditor.appendChild(createItemRow(it));
    });
    renderPreview();
  }

  var saveTimer;
  function saveDraftQuiet() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_DRAFT, JSON.stringify(getFormData()));
      } catch (e) {}
    }, 400);
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_DRAFT, JSON.stringify(getFormData()));
    } catch (e) {}
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(STORAGE_DRAFT);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function applyPayPercent(pct) {
    var items = getItemsFromEditor();
    var totals = calcTotals(items);
    var paid = Math.round(totals.total * (pct / 100));
    els.amountPaid.value = String(paid);
    if (pct >= 100) els.status.value = 'paid';
    else if (pct > 0) els.status.value = 'partial';
    else els.status.value = 'unpaid';
    renderPreview();
  }

  function onStatusChange() {
    var items = getItemsFromEditor();
    var totals = calcTotals(items);
    if (els.status.value === 'paid') {
      els.amountPaid.value = String(Math.round(totals.total));
    } else if (els.status.value === 'unpaid') {
      els.amountPaid.value = '0';
    }
    renderPreview();
  }

  function bindEvents() {
    ['input', 'change'].forEach(function (ev) {
      els.invoiceDate.addEventListener(ev, renderPreview);
      els.dueDate.addEventListener(ev, renderPreview);
      els.customerName.addEventListener(ev, renderPreview);
      els.customerPhone.addEventListener(ev, renderPreview);
      els.customerAddress.addEventListener(ev, renderPreview);
      els.discount.addEventListener(ev, renderPreview);
      els.notes.addEventListener(ev, renderPreview);
      els.signatureName.addEventListener(ev, renderPreview);
    });

    els.amountPaid.addEventListener('input', renderPreview);
    els.status.addEventListener('change', onStatusChange);
    els.gst.addEventListener('change', renderPreview);

    document.querySelectorAll('[data-pay-pct]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyPayPercent(parseFloat(btn.getAttribute('data-pay-pct')));
      });
    });

    document.getElementById('inv-add-item').addEventListener('click', function () {
      els.itemsEditor.appendChild(createItemRow());
      renderPreview();
    });

    document.getElementById('inv-save-draft').addEventListener('click', function () {
      saveDraft();
      alert('Draft saved on this device.');
    });

    document.getElementById('inv-new').addEventListener('click', function () {
      if (!confirm('Start a new invoice? Unsaved changes will be lost.')) return;
      localStorage.removeItem(STORAGE_DRAFT);
      setFormData({
        invoiceNo: nextInvoiceNo(),
        invoiceDate: todayISO(),
        dueDate: addDaysISO(7),
        status: 'unpaid',
        amountPaid: 0,
        items: [{ desc: 'Gift wrapping service', qty: 1, rate: '' }]
      });
    });

    document.getElementById('inv-print').addEventListener('click', function () {
      renderPreview();
      window.setTimeout(function () {
        window.print();
      }, 150);
    });

    document.getElementById('inv-clear').addEventListener('click', function () {
      if (!confirm('Clear all fields?')) return;
      setFormData({
        invoiceNo: els.invoiceNo.value,
        invoiceDate: todayISO(),
        dueDate: addDaysISO(7),
        status: 'unpaid',
        amountPaid: 0,
        items: [{ desc: '', qty: 1, rate: '' }]
      });
      saveDraft();
    });
  }

  function applyUrlParams() {
    var params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;

    var name = params.get('name');
    var phone = params.get('phone');
    var address = params.get('address');

    if (name) els.customerName.value = name;
    if (phone) els.customerPhone.value = phone;
    if (address) els.customerAddress.value = address;

    if (name || phone || address) renderPreview();
  }

  function init() {
    cacheEls();
    buildPresets();
    var draft = loadDraft();
    var hasCrmParams = window.location.search.indexOf('name=') !== -1;

    if (draft && !hasCrmParams) {
      if (draft.status === 'Pending') draft.status = 'unpaid';
      if (draft.status === 'Paid') draft.status = 'paid';
      if (draft.status === 'Partial') draft.status = 'partial';
      setFormData(draft);
    } else {
      setFormData({
        invoiceNo: nextInvoiceNo(),
        invoiceDate: todayISO(),
        dueDate: addDaysISO(7),
        status: 'unpaid',
        amountPaid: 0,
        items: [{ desc: 'Gift wrapping service', qty: 1, rate: '' }]
      });
      applyUrlParams();
    }
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
