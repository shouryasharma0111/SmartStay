import { SmartStayAPI } from './apiService.js';
import { requireRole } from './authClient.js';

(async function(){
  const authenticatedUser = await requireRole('owner');
  if (!authenticatedUser) return;

  const sectionIds = ['personal','contact','address','properties','documents','preferences'];
  const pills = Array.from(document.querySelectorAll('.pill'));
  const sections = sectionIds.map(id => document.getElementById(id));
  const navbar = document.getElementById('navbar');
  const slidebar = document.getElementById('slidebar');
  const panelStage = document.getElementById('panelStage');
  const panelPrev = document.getElementById('panelPrev');
  const panelNext = document.getElementById('panelNext');
  const panelStepLabel = document.getElementById('panelStepLabel');

  let activeIndex = 0;

  /* ---- show logged-in user name ---- */
  if (authenticatedUser.name) {
    const heroName = document.getElementById('heroName');
    if (heroName) {
      heroName.textContent = authenticatedUser.name;
      heroName.classList.remove('placeholder-text');
    }
    const fullNameInput = document.getElementById('fullNameInput');
    if (fullNameInput) fullNameInput.value = authenticatedUser.name;
  }

  /* ---- centre the active pill inside the touch slide bar ---- */
  function centerPill(id){
    const activePill = pills.find(p=>p.dataset.target===id);
    if(!activePill) return;
    const wrapRect = slidebar.getBoundingClientRect();
    const pillRect = activePill.getBoundingClientRect();
    const offset = (pillRect.left - wrapRect.left) - (wrapRect.width/2) + (pillRect.width/2) + slidebar.scrollLeft;
    slidebar.scrollTo({left:offset, behavior:'smooth'});
  }

  /* ---- show exactly one section panel at a time ---- */
  function showSection(id, {silent} = {}){
    const idx = sectionIds.indexOf(id);
    if(idx === -1) return;
    activeIndex = idx;

    sections.forEach(sec=>{
      if(!sec) return;
      if(sec.id === id){
        sec.classList.remove('panel-out');
        sec.classList.add('active-panel');
      } else if(sec.classList.contains('active-panel')){
        sec.classList.remove('active-panel');
      }
    });

    pills.forEach(p=>p.classList.toggle('active', p.dataset.target===id));
    centerPill(id);

    panelPrev.disabled = idx === 0;
    panelNext.textContent = idx === sectionIds.length-1 ? 'Review ↓' : 'Next →';
    panelStepLabel.textContent = `Section ${idx+1} of ${sectionIds.length}`;

    if(!silent) panelStage.scrollIntoView({behavior:'smooth', block:'start'});
  }

  pills.forEach(p=>{
    p.addEventListener('click', ()=> showSection(p.dataset.target));
  });

  panelPrev.addEventListener('click', ()=>{
    if(activeIndex === 0) return;
    showSection(sectionIds[activeIndex-1]);
  });
  panelNext.addEventListener('click', ()=>{
    if(activeIndex === sectionIds.length-1){
      document.querySelector('.final-panel').scrollIntoView({behavior:'smooth', block:'start'});
      return;
    }
    showSection(sectionIds[activeIndex+1]);
  });

  /* ---- touch swipe between panels ---- */
  let touchStartX = 0, touchStartY = 0;
  panelStage.addEventListener('touchstart', (e)=>{
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, {passive:true});
  panelStage.addEventListener('touchend', (e)=>{
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if(Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return; // ignore vertical scrolls / small taps
    if(dx < 0 && activeIndex < sectionIds.length-1) showSection(sectionIds[activeIndex+1]);
    if(dx > 0 && activeIndex > 0) showSection(sectionIds[activeIndex-1]);
  }, {passive:true});

  /* ---- navbar scrolled shadow ---- */
  window.addEventListener('scroll', ()=>{
    navbar.classList.toggle('scrolled', window.scrollY > 8);
  }, {passive:true});

  showSection('personal', {silent:true});
  loadProperties();

  /* ---- verify buttons ---- */
  document.querySelectorAll('[data-verify]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(btn.classList.contains('verified')) return;
      btn.textContent = '...';
      setTimeout(()=>{
        btn.classList.add('verified');
        btn.innerHTML = '✓ Verified';
        recalc();
      }, 550);
    });
  });

  /* ---- chip select ---- */
  document.querySelectorAll('.trk-chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const group = chip.dataset.group;
      document.querySelectorAll(`.trk-chip[data-group="${group}"]`).forEach(c=>c.classList.remove('sel'));
      chip.classList.add('sel');
      recalc();
    });
  });

  /* ---- toggle switches ---- */
  document.querySelectorAll('.trk-switch').forEach(sw=>{
    sw.addEventListener('click', ()=> sw.classList.toggle('on'));
  });

  /* ---- doc upload tiles ---- */
  document.querySelectorAll('.trk-file').forEach(inp=>{
    inp.addEventListener('change', ()=>{
      inp.closest('[data-tile]').classList.toggle('done', inp.files && inp.files.length>0);
      recalc();
    });
  });

  /* ---- properties: add / remove / update price, anytime ---- */
  const propList = document.getElementById('propList');
  const propEmpty = document.getElementById('propEmpty');
  const addPropForm = document.getElementById('addPropForm');
  const addPropBtn = document.getElementById('addPropBtn');
  const cancelAddProp = document.getElementById('cancelAddProp');
  const confirmAddProp = document.getElementById('confirmAddProp');
  const newPropName = document.getElementById('newPropName');
  const newPropType = document.getElementById('newPropType');
  const newPropRent = document.getElementById('newPropRent');
  const verificationPropertySelect = document.getElementById('verificationPropertySelect');
  const verificationDemoOutcome = document.getElementById('verificationDemoOutcome');
  const verifyWithDigiLocker = document.getElementById('verifyWithDigiLocker');
  const digilockerStatus = document.getElementById('digilockerStatus');

  async function loadProperties() {
    try {
      const res = await SmartStayAPI.getOwnerProperties(authenticatedUser);
      const properties = res.data || [];
      propList.innerHTML = '';

      properties.forEach(prop => {
        const card = document.createElement('div');
        card.className = 'prop-card';
        card.setAttribute('data-prop-card', '');
        card.setAttribute('data-prop-id', prop.id);

        const icon = prop.propertyType === 'PG' ? '🏢' : (prop.propertyType === 'Apartment' ? '🏬' : '🏠');
        
        // Backend Verification Status Badge
        let badgeHtml = '';
        if (prop.verification_status === 'VERIFIED') {
          badgeHtml = '<span class="owner-status-badge verified">✓ Listing approved</span>';
        } else if (prop.verification_status === 'REJECTED') {
          badgeHtml = `
            <span class="owner-status-badge rejected">✕ Rejected</span>
            <div class="rejection-reason-box">
              <strong>Reason:</strong> ${escapeHtml(prop.rejection_reason || 'Incomplete property details')}
            </div>
          `;
        } else {
          badgeHtml = '<span class="owner-status-badge pending">⏳ Verification Pending</span>';
        }

        const units = Array.isArray(prop.units) ? prop.units : [];
        const unitRows = units.map(unit => `
          <label class="unit-availability-row">
            <span>${escapeHtml(unit.name)}</span>
            <select data-unit-status data-unit-id="${escapeHtml(String(unit.id))}" data-saved-status="${escapeHtml(unit.availabilityStatus)}" aria-label="Availability for ${escapeHtml(unit.name)}">
              ${[
                ['AVAILABLE', 'Available'],
                ['OCCUPIED', 'Occupied'],
                ['RESERVED', 'Reserved'],
                ['CONFIRMATION_REQUIRED', 'Confirmation required']
              ].map(([value, label]) => `<option value="${value}" ${unit.availabilityStatus === value ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
          </label>
        `).join('');

        card.innerHTML = `
          <div class="prop-icon">${icon}</div>
          <div class="prop-info">
            <h4>${escapeHtml(prop.name)}</h4>
            <p>${escapeHtml(prop.locality || 'Crossing Republik')}, ${escapeHtml(prop.city || 'Ghaziabad')} · ${prop.propertyType}</p>
            ${badgeHtml}
          </div>
          <div class="prop-rent-wrap">
            <div class="prop-rent" data-rent-display data-unit="per month">${formatRupee(prop.rent)}<span>per month</span></div>
            <input class="prop-rent-input" data-rent-input data-saved-value="${prop.rent}" type="number" min="1" value="${prop.rent}" style="display:none;">
          </div>
          <div class="prop-actions">
            <button class="prop-action-btn" data-edit-price title="Update price">✎</button>
            <button class="prop-action-btn danger" data-remove-prop title="Remove property">🗑</button>
          </div>
          <div class="unit-management">
            <strong>Room / unit availability</strong>
            ${unitRows || '<p class="unit-empty">No rooms or units added yet.</p>'}
            <div class="unit-add-row">
              <input type="text" data-new-unit-name maxlength="120" placeholder="e.g. Room 101" aria-label="New room or unit name">
              <button type="button" data-add-unit>Add unit</button>
            </div>
          </div>`;
        propList.appendChild(card);
      });
      renderDigiLockerStatus(properties);
      updatePropEmptyState();
      recalc();
    } catch (err) {
      console.error('Error loading owner properties:', err);
    }
  }

  function renderDigiLockerStatus(properties) {
    const selectedId = verificationPropertySelect.value;
    verificationPropertySelect.innerHTML = properties.map(prop =>
      `<option value="${escapeHtml(String(prop.id))}">${escapeHtml(prop.name)}</option>`
    ).join('');
    if (properties.some(prop => String(prop.id) === selectedId)) {
      verificationPropertySelect.value = selectedId;
    }
    const property = properties.find(prop => String(prop.id) === verificationPropertySelect.value);
    verifyWithDigiLocker.disabled = !property;
    if (!property) {
      digilockerStatus.textContent = 'Add a property to start a demo verification.';
      return;
    }

    const result = property.digilockerVerification;
    if (!result) {
      digilockerStatus.textContent = 'No verification started for this property.';
      return;
    }
    const labels = {
      VERIFIED: 'Demo/Sandbox Verification complete (simulated match).',
      FAILED: 'Demo/Sandbox Verification failed (simulated mismatch).',
      MANUAL_REVIEW: 'Demo/Sandbox Verification requires manual review.'
    };
    const verifiedDate = result.verifiedAt ? ` ${new Date(result.verifiedAt).toLocaleDateString()}.` : '';
    const reason = result.failureReason ? ` ${result.failureReason}` : '';
    digilockerStatus.textContent = `${labels[result.status] || 'Demo/Sandbox Verification pending.'}${verifiedDate}${reason}`;
  }

  verificationPropertySelect.addEventListener('change', loadProperties);
  verifyWithDigiLocker.addEventListener('click', async () => {
    const propertyId = verificationPropertySelect.value;
    if (!propertyId) return;
    const consent = window.confirm('Demo consent: allow SmartStay to simulate a document verification result for this property? No DigiLocker account or document will be accessed.');
    if (!consent) return;

    verifyWithDigiLocker.disabled = true;
    verifyWithDigiLocker.textContent = 'Checking...';
    try {
      await SmartStayAPI.startDemoVerification(propertyId, verificationDemoOutcome.value, authenticatedUser);
      showToast('Demo/Sandbox Verification result saved');
      await loadProperties();
    } catch (err) {
      showToast(err.message || 'Unable to start demo verification.');
    } finally {
      verifyWithDigiLocker.textContent = 'Verify with DigiLocker';
      verifyWithDigiLocker.disabled = !verificationPropertySelect.value;
    }
  });

  function formatRupee(n){ return '₹' + Number(n).toLocaleString('en-IN'); }
  function escapeHtml(str){ const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  function updatePropEmptyState(){
    const count = propList.querySelectorAll('[data-prop-card]').length;
    propEmpty.classList.toggle('show', count === 0);
  }

  function startEditPrice(card){
    if(!card) return;
    const display = card.querySelector('[data-rent-display]');
    const input = card.querySelector('[data-rent-input]');
    display.style.display = 'none';
    input.style.display = 'inline-block';
    input.focus();
    input.select();
  }

  async function commitEditPrice(card){
    if(!card) return;
    const display = card.querySelector('[data-rent-display]');
    const input = card.querySelector('[data-rent-input]');
    if(input.style.display === 'none') return;
    const unit = display.dataset.unit;
    const val = Number(input.value);
    if(!Number.isFinite(val) || val <= 0){
      input.value = input.dataset.savedValue;
      input.style.display = 'none';
      display.style.display = '';
      showToast('Enter a rent greater than zero');
      return;
    }
    input.disabled = true;
    try {
      await SmartStayAPI.updateOwnerProperty(card.dataset.propId, { rent: val });
      input.dataset.savedValue = String(val);
      display.innerHTML = `${formatRupee(val)}<span>${unit}</span>`;
      showToast('Price updated');
    } catch (err) {
      input.value = input.dataset.savedValue;
      showToast(err.message || 'Unable to update rent.');
    } finally {
      input.disabled = false;
      display.style.display = '';
      input.style.display = 'none';
    }
  }

  propList.addEventListener('click', async (e)=>{
    const addUnitBtn = e.target.closest('[data-add-unit]');
    if (addUnitBtn) {
      const card = addUnitBtn.closest('[data-prop-card]');
      const nameInput = card.querySelector('[data-new-unit-name]');
      addUnitBtn.disabled = true;
      try {
        await SmartStayAPI.createOwnerUnit(card.dataset.propId, { name: nameInput.value });
        await loadProperties();
        showToast('Room or unit added');
      } catch (err) {
        addUnitBtn.disabled = false;
        showToast(err.message || 'Unable to add room or unit.');
      }
      return;
    }
    const editBtn = e.target.closest('[data-edit-price]');
    if(editBtn){ startEditPrice(editBtn.closest('[data-prop-card]')); return; }
    const rentDisplay = e.target.closest('[data-rent-display]');
    if(rentDisplay){ startEditPrice(rentDisplay.closest('[data-prop-card]')); return; }
    const removeBtn = e.target.closest('[data-remove-prop]');
    if(removeBtn){
      const card = removeBtn.closest('[data-prop-card]');
      const propId = card.getAttribute('data-prop-id');
      removeBtn.disabled = true;
      try {
        await SmartStayAPI.deleteOwnerProperty(propId);
        card.classList.add('removing');
        setTimeout(()=>{
          card.remove();
          updatePropEmptyState();
          recalc();
        }, 260);
        showToast('Property removed');
      } catch (err) {
        removeBtn.disabled = false;
        showToast(err.message || 'Unable to remove property.');
      }
    }
  });

  propList.addEventListener('change', async (e) => {
    if (!e.target.matches('[data-unit-status]')) return;
    const control = e.target;
    const card = control.closest('[data-prop-card]');
    const previousStatus = control.dataset.savedStatus;
    control.disabled = true;
    try {
      await SmartStayAPI.updateOwnerUnit(card.dataset.propId, control.dataset.unitId, {
        availabilityStatus: control.value
      });
      control.dataset.savedStatus = control.value;
      showToast('Availability updated');
    } catch (err) {
      control.value = previousStatus;
      showToast(err.message || 'Unable to update availability.');
    } finally {
      control.disabled = false;
    }
  });

  propList.addEventListener('keydown', (e)=>{
    if(e.target.matches('[data-rent-input]') && e.key === 'Enter'){
      commitEditPrice(e.target.closest('[data-prop-card]'));
    }
  });
  propList.addEventListener('focusout', (e)=>{
    if(e.target.matches('[data-rent-input]')) commitEditPrice(e.target.closest('[data-prop-card]'));
  });

  function closeAddForm(){
    addPropForm.classList.remove('open');
    addPropBtn.style.display = '';
    newPropName.value = ''; newPropRent.value = ''; newPropType.selectedIndex = 0;
  }
  addPropBtn.addEventListener('click', ()=>{
    addPropForm.classList.add('open');
    addPropBtn.style.display = 'none';
    newPropName.focus();
  });
  cancelAddProp.addEventListener('click', closeAddForm);

  confirmAddProp.addEventListener('click', async ()=>{
    const name = newPropName.value.trim();
    const rent = parseInt(newPropRent.value, 10);
    const icon = newPropType.value;
    const propertyType = icon === '🏢' ? 'PG' : (icon === '🏠' ? 'Apartment' : (icon === '🏬' ? 'Apartment' : 'Room'));
    
    if(!name || isNaN(rent) || rent <= 0){
      showToast('Add a property name and rent to continue');
      return;
    }

    confirmAddProp.disabled = true;
    confirmAddProp.textContent = 'Submitting...';

    try {
      // Backend enforces PENDING status
      const res = await SmartStayAPI.createProperty({
        name,
        rent,
        propertyType,
        city: 'Ghaziabad',
        locality: 'Near ABES Engineering College',
        address: 'Sector 1, Ghaziabad, UP',
        ownerPhone: '+91 98765 11111'
      });

      closeAddForm();
      await loadProperties();
      recalc();
      
      // Expected success message:
      showToast(res.message || 'Property submitted successfully and is awaiting verification.');
    } catch (err) {
      console.error('Error creating property:', err);
      showToast(err.message || 'Unable to submit property.');
    } finally {
      confirmAddProp.disabled = false;
      confirmAddProp.textContent = 'Add';
    }
  });

  updatePropEmptyState();

  /* ---- live input tracking ---- */
  document.querySelectorAll('input.trk, select.trk, textarea.trk').forEach(el=>{
    el.addEventListener('input', recalc);
    el.addEventListener('change', recalc);
  });

  /* ---- hero identity: nothing is shown until the owner actually types it ---- */
  const fullNameInput = document.getElementById('fullNameInput');
  const aboutInput = document.getElementById('aboutInput');
  const heroName = document.getElementById('heroName');
  const heroBio = document.getElementById('heroBio');
  const heroInitials = document.getElementById('heroInitials');
  const navInitials = document.getElementById('navInitials');

  function initialsFrom(name){
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if(parts.length === 0) return '🏠';
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  function syncIdentity(){
    const name = fullNameInput.value.trim();
    if(name){
      heroName.textContent = name;
      heroName.classList.remove('placeholder-text');
    } else {
      heroName.textContent = 'Add your name below';
      heroName.classList.add('placeholder-text');
    }
    const initials = initialsFrom(name);
    heroInitials.textContent = initials;
    navInitials.textContent = initials;

    const bio = aboutInput.value.trim();
    if(bio){
      heroBio.textContent = bio;
      heroBio.classList.remove('placeholder-text');
    } else {
      heroBio.textContent = 'Your bio will appear here once you write it in the Personal section.';
      heroBio.classList.add('placeholder-text');
    }
  }

  /* ---- recalculate everything (0..100) ---- */
  const navRingFill = document.getElementById('navRingFill');
  const heroRingFill = document.getElementById('heroRingFill');
  const railFill = document.getElementById('railFill');
  const heroPct = document.getElementById('heroPct');
  const statusChip = document.getElementById('statusChip');
  const statusText = document.getElementById('statusText');
  const publishBtnTop = document.getElementById('publishBtnTop');
  const finalSubmit = document.getElementById('finalSubmit');
  const finalHint = document.getElementById('finalHint');

  const NAV_CIRC = 2 * Math.PI * 19;
  const HERO_CIRC = 2 * Math.PI * 47;

  function sectionComplete(id){
    if(id === 'personal'){
      const name = fullNameInput.value.trim();
      const dob = document.querySelector('#personal input[type=date]').value;
      const gen = document.querySelector('#personal select').value;
      const bio = aboutInput.value.trim();
      return Boolean(name && dob && gen && bio);
    }
    if(id === 'contact'){
      const verifies = document.querySelectorAll('#contact .verify-btn.verified').length;
      return verifies === 2;
    }
    if(id === 'address'){
      const inps = Array.from(document.querySelectorAll('#address input[required]'));
      return inps.every(i => i.value.trim().length > 0);
    }
    if(id === 'properties'){
      return propList.querySelectorAll('[data-prop-card]').length >= 1;
    }
    if(id === 'documents'){
      const done = document.querySelectorAll('#documents .doc-tile.done').length;
      return done >= 2;
    }
    if(id === 'preferences'){
      return true;
    }
    return false;
  }

  function recalc(){
    syncIdentity();

    let doneCount = 0;
    sectionIds.forEach(id=>{
      const ok = sectionComplete(id);
      if(ok) doneCount++;

      const check = document.querySelector(`.check[data-check="${id}"]`);
      if(check) check.classList.toggle('done', ok);

      const status = document.querySelector(`.section-status[data-status="${id}"]`);
      if(status){
        status.classList.toggle('complete', ok);
        status.querySelector('.stxt').textContent = ok ? 'Complete' : 'In progress';
      }
    });

    const pct = Math.round((doneCount / sectionIds.length) * 100);

    const navOffset = NAV_CIRC - (NAV_CIRC * (pct / 100));
    const heroOffset = HERO_CIRC - (HERO_CIRC * (pct / 100));
    navRingFill.style.strokeDashoffset = navOffset;
    heroRingFill.style.strokeDashoffset = heroOffset;
    railFill.style.width = pct + '%';
    heroPct.textContent = pct + '% complete';

    const is100 = pct === 100;
    publishBtnTop.classList.toggle('show', is100);
    finalSubmit.classList.toggle('ready', is100);
    finalSubmit.disabled = !is100;

    if(is100){
      statusChip.classList.add('live');
      statusText.textContent = 'Profile ready to publish';
      finalHint.textContent = 'All 6 sections complete · Ready to publish';
    } else {
      statusChip.classList.remove('live');
      statusText.textContent = `${pct}% profile progress`;
      finalHint.textContent = `${doneCount} of ${sectionIds.length} sections complete`;
    }
  }

  /* ---- publish flow ---- */
  function publish(){
    if(!publishBtnTop.classList.contains('show') && !finalSubmit.classList.contains('ready')) return;
    showToast('🎉 Profile published! Listings now in review.');
  }
  publishBtnTop.addEventListener('click', publish);
  finalSubmit.addEventListener('click', publish);

  /* ---- toast helper ---- */
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toastText');
  let toastTimer = null;
  function showToast(msg){
    toastText.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toast.classList.remove('show'), 3200);
  }

  recalc();
})();
