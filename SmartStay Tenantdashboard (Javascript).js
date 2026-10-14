/* ---------------------------------------------------------
   Minimal inline icon set (24x24, stroke, currentColor)
--------------------------------------------------------- */
import { requireRole } from './authClient.js';
import { SmartStayAPI } from './apiService.js';

(async function(){
const authenticatedUser = await requireRole('tenant');
if (!authenticatedUser) return;

const ICON = {
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"></path></svg>',
  briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="12" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"></line><circle cx="9" cy="6" r="2"></circle><line x1="4" y1="12" x2="20" y2="12"></line><circle cx="16" cy="12" r="2"></circle><line x1="4" y1="18" x2="20" y2="18"></line><circle cx="11" cy="18" r="2"></circle></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21c9 0 14-5 14-14V5h-2C8 5 3 10 3 19v2Z"></path><path d="M5 21c4-4 7-7 12-12"></path></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"></path><path d="M9 12l2 2 4-4"></path></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2C10 21 3 14 3 6a2 2 0 0 1 2-2Z"></path></svg>',
  notebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3l5 5-9 9-5 1 1-5 8-8Z"></path><path d="M4 21h6"></path></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z"></path><circle cx="12" cy="9" r="2.5"></circle></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="16" y1="3" x2="16" y2="7"></line></svg>',
  badgeCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 2 3.1-.4 1 3 2.8 1.5-.9 3 .9 3-2.8 1.5-1 3-3.1-.4L12 22l-2.4-2-3.1.4-1-3-2.8-1.5.9-3-.9-3 2.8-1.5 1-3 3.1.4L12 2Z"></path><path d="M9 12l2 2 4-4"></path></svg>',
  cigarette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="15" x2="18" y2="15"></line><rect x="2" y="12" width="16" height="6" rx="1"></rect><path d="M20 8c0 1.5-1.5 1.5-1.5 3S20 12.5 20 14"></path></svg>',
  wine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8l-1 6a3 3 0 0 1-6 0L8 3Z"></path><line x1="12" y1="14" x2="12" y2="21"></line><line x1="8" y1="21" x2="16" y2="21"></line></svg>',
  paw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="10" r="2"></circle><circle cx="18" cy="10" r="2"></circle><circle cx="9" cy="6" r="1.8"></circle><circle cx="15" cy="6" r="1.8"></circle><path d="M12 12c-4 0-6 2.4-6 4.8C6 19.5 8.5 20 12 20s6-.5 6-3.2c0-2.4-2-4.8-6-4.8Z"></path></svg>',
  utensils: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a2 2 0 0 0 4 0V3"></path><path d="M8 10v11"></path><path d="M17 3c-1.7 0-3 2-3 5s1.3 5 3 5v8"></path></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="11 6 5 12 11 18"></polyline></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="13 6 19 12 13 18"></polyline></svg>',
  arrowUpRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="8 7 17 7 17 16"></polyline></svg>',
};

/* ---------------------------------------------------------
   Section / field configuration (content lives here)
--------------------------------------------------------- */
const SECTIONS = [
  {
    id: "basic", label: "Basic details", icon: "user",
    title: "Basic details", sub: "Who the host is welcoming in",
    bgImage: "https://images.unsplash.com/photo-1759101292737-24e1c5ed52d9?auto=format&fit=crop&w=1800&q=80",
    fields: [
      { key: "fullName", label: "Full name", type: "text", placeholder: "As per ID proof", req: true, full: true },
      { key: "dob", label: "Date of birth", type: "date", req: true },
      { key: "gender", label: "Gender", type: "select", req: true, options: ["Female", "Male", "Non-binary", "Prefer not to say"] },
      { key: "phone", label: "Phone number", type: "text", placeholder: "+91 98xxxxxxx", req: true },
      { key: "email", label: "Email address", type: "text", placeholder: "you@example.com", req: true },
      { key: "currentCity", label: "Current city", type: "text", placeholder: "e.g. Pune", req: true },
    ],
  },
  {
    id: "occupation", label: "Occupation", icon: "briefcase",
    title: "Occupation", sub: "Helps hosts match you to the right community",
    bgImage: "https://images.unsplash.com/photo-1755436612913-b1e2cfd66e66?auto=format&fit=crop&w=1800&q=80",
    fields: [
      { key: "employmentType", label: "I am a", type: "chips", req: true, full: true, options: ["Student", "Working professional", "Freelancer / self-employed"] },
      { key: "orgName", label: "College / company name", type: "text", placeholder: "e.g. XYZ Institute of Technology", req: true, full: true },
      { key: "designation", label: "Course / designation", type: "text", placeholder: "e.g. Final year, CSE", req: true },
      { key: "workLocation", label: "Work / campus location", type: "text", placeholder: "e.g. Whitefield, Bengaluru", req: true },
    ],
  },
  {
    id: "preferences", label: "Rental preferences", icon: "sliders",
    title: "Rental preferences", sub: "What you're actually looking for",
    bgImage: "https://images.unsplash.com/photo-1648425731270-ebd373a19149?auto=format&fit=crop&w=1800&q=80",
    fields: [
      { key: "preferredCity", label: "Preferred city / locality", type: "text", placeholder: "e.g. Koramangala, Bengaluru", req: true, full: true },
      { key: "budgetMin", label: "Budget — min (₹/mo)", type: "text", placeholder: "8,000", req: true },
      { key: "budgetMax", label: "Budget — max (₹/mo)", type: "text", placeholder: "14,000", req: true },
      { key: "moveInDate", label: "Preferred move-in date", type: "date", req: true },
      { key: "roomType", label: "Room type", type: "chips", req: true, full: true, options: ["Single occupancy", "Shared / double", "Triple sharing", "Studio / 1RK"] },
    ],
  },
  {
    id: "lifestyle", label: "Lifestyle", icon: "leaf",
    title: "Lifestyle", sub: "So your future flatmates know what to expect",
    bgImage: "https://images.unsplash.com/photo-1757387240036-d7eb9b096c40?auto=format&fit=crop&w=1800&q=80",
    fields: [
      { key: "food", label: "Food habit", type: "chips", req: true, full: true, options: ["Vegetarian", "Non-vegetarian", "Eggetarian", "Vegan"], icon: "utensils" },
      { key: "smoking", label: "Smoking", type: "chips", req: true, options: ["Non-smoker", "Occasional", "Regular"], icon: "cigarette" },
      { key: "drinking", label: "Drinking", type: "chips", req: true, options: ["No", "Occasional", "Regular"], icon: "wine" },
      { key: "pets", label: "Pets", type: "chips", req: true, options: ["None", "Have a pet", "Pet-friendly only"], icon: "paw" },
    ],
  },
  {
    id: "emergency", label: "Emergency contact", icon: "phone",
    title: "Emergency contact", sub: "Kept private, shared only in urgent situations",
    bgImage: "https://images.unsplash.com/photo-1724765440530-e3954ac2e61d?auto=format&fit=crop&w=1800&q=80",
    fields: [
      { key: "emName", label: "Contact name", type: "text", placeholder: "Full name", req: true, full: true },
      { key: "emRelation", label: "Relationship", type: "select", req: true, options: ["Parent", "Guardian", "Sibling", "Spouse", "Friend"] },
      { key: "emPhone", label: "Contact phone", type: "text", placeholder: "+91 98xxxxxxx", req: true },
    ],
  },
  {
    id: "verification", label: "Verification", icon: "shield",
    title: "ID verification", sub: "One valid government ID keeps the listing pool trusted",
    bgImage: "https://images.unsplash.com/photo-1759845565036-cbecbcfcb8e2?auto=format&fit=crop&w=1800&q=80",
    fields: [
      { key: "idType", label: "ID type", type: "select", req: true, options: ["Aadhaar", "Passport", "Driving licence", "Voter ID"] },
      { key: "idNumber", label: "ID number", type: "text", placeholder: "As printed on document", req: true },
    ],
  },
  {
    id: "about", label: "About you", icon: "notebook",
    title: "About you", sub: "A short note hosts and flatmates actually read",
    bgImage: "https://images.unsplash.com/photo-1749703821652-c43ccda0874e?auto=format&fit=crop&w=1800&q=80",
    fields: [
      { key: "bio", label: "Tell hosts a bit about yourself", type: "textarea", placeholder: "Tidy, quiet evenings, love cooking on weekends…", req: true, full: true },
    ],
  },
];

const ALL_REQUIRED = SECTIONS.flatMap(s => s.fields.filter(f => f.req).map(f => f.key));

/* ---------------------------------------------------------
   State
--------------------------------------------------------- */
let formData = {
  fullName: authenticatedUser.name || ""
};
let activeIndex = 0;
let dir = "fwd";

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
function isFilled(key){ return (formData[key] || "").toString().trim().length > 0; }
function sectionDone(section){ return section.fields.filter(f => f.req).every(f => isFilled(f.key)); }
function filledCount(){ return ALL_REQUIRED.filter(isFilled).length; }
function percent(){ return Math.round((filledCount() / ALL_REQUIRED.length) * 100); }

/* ---------------------------------------------------------
   Build the touch slide bar (once)
--------------------------------------------------------- */
const slidebar = document.getElementById("slidebar");

function buildSlidebar(){
  SECTIONS.forEach((sec, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tp-pill";
    btn.id = "pill-" + sec.id;
    btn.dataset.index = i;
    btn.innerHTML = '<span class="tp-pill-dot">' + ICON[sec.icon] + '</span>' + sec.label;
    btn.addEventListener("click", () => goTo(i));
    slidebar.appendChild(btn);
  });
}

function updateSlidebar(){
  SECTIONS.forEach((sec, i) => {
    const btn = document.getElementById("pill-" + sec.id);
    const done = sectionDone(sec);
    const active = i === activeIndex;
    btn.dataset.active = active;
    btn.dataset.done = done;
    btn.querySelector(".tp-pill-dot").innerHTML = done ? ICON.check : ICON[sec.icon];
  });

  const activeBtn = document.getElementById("pill-" + SECTIONS[activeIndex].id);
  const indicator = document.getElementById("slideIndicator");
  const barRect = slidebar.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();
  indicator.style.left = (btnRect.left - barRect.left + slidebar.scrollLeft) + "px";
  indicator.style.width = btnRect.width + "px";
  slidebar.scrollTo({ left: activeBtn.offsetLeft - 24, behavior: "smooth" });

  document.getElementById("trackFill").style.width = percent() + "%";
}

/* ---------------------------------------------------------
   Field rendering
--------------------------------------------------------- */
function fieldHtml(field){
  const val = formData[field.key] || "";
  const fullClass = field.full ? " full" : "";
  const reqMark = field.req ? "<small>*</small>" : "";
  let control = "";

  if (field.type === "text"){
    control = `<input class="tp-input" type="text" data-key="${field.key}" placeholder="${field.placeholder||""}" value="${escapeHtml(val)}">`;
  } else if (field.type === "date"){
    control = `<input class="tp-input" type="date" data-key="${field.key}" value="${escapeHtml(val)}">`;
  } else if (field.type === "select"){
    const opts = field.options.map(o => `<option value="${o}" ${val===o?"selected":""}>${o}</option>`).join("");
    control = `<select class="tp-select" data-key="${field.key}"><option value="">Select</option>${opts}</select>`;
  } else if (field.type === "textarea"){
    control = `<textarea class="tp-textarea" data-key="${field.key}" placeholder="${field.placeholder||""}">${escapeHtml(val)}</textarea>`;
  } else if (field.type === "chips"){
    const chips = field.options.map(o => {
      const sel = val === o;
      const ic = field.icon ? ICON[field.icon] : "";
      return `<button type="button" class="tp-chip" data-sel="${sel}" data-key="${field.key}" data-value="${o}">${ic}${o}</button>`;
    }).join("");
    control = `<div class="tp-pillgroup">${chips}</div>`;
  }

  return `<div class="tp-field${fullClass}">
      <label class="tp-label">${field.label}${reqMark}</label>
      ${control}
    </div>`;
}

function escapeHtml(str){
  return str.toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ---------------------------------------------------------
   Panel rendering
--------------------------------------------------------- */
const panelCard = document.getElementById("panelCard");

function renderPanel(){
  const section = SECTIONS[activeIndex];
  const done = sectionDone(section);

  panelCard.className = "tp-card " + (dir === "fwd" ? "enter-fwd" : "enter-back");
  panelCard.innerHTML = `
    <div class="tp-card-content">
      <div class="tp-card-head">
        <div class="tp-card-title-row">
          <div class="tp-icon-badge">${ICON[section.icon]}</div>
          <div>
            <p class="tp-card-title tp-display">${section.title}</p>
            <p class="tp-card-sub">${section.sub}</p>
          </div>
        </div>
        <span class="tp-status" data-done="${done}">${done ? ICON.check : ""}${done ? "Complete" : "Pending"}</span>
      </div>
      <div class="tp-grid">
        ${section.fields.map(fieldHtml).join("")}
      </div>
      <div class="tp-panel-nav">
        <button class="tp-nav-btn" type="button" id="prevBtn" ${activeIndex===0?"disabled":""}>${ICON.arrowLeft} Previous</button>
        <span class="tp-panel-index">Section ${activeIndex+1} of ${SECTIONS.length}</span>
        <button class="tp-nav-btn" type="button" id="nextBtn" ${activeIndex===SECTIONS.length-1?"disabled":""}>Next ${ICON.arrowRight}</button>
      </div>
    </div>
  `;

  // swap the page-level room photo to match this section
  const bgPhoto = document.getElementById("bgPhoto");
  if (bgPhoto) bgPhoto.style.backgroundImage = `url('${section.bgImage}')`;

  // wire up inputs
  panelCard.querySelectorAll("[data-key]").forEach(el => {
    if (el.classList.contains("tp-chip")){
      el.addEventListener("click", () => {
        formData[el.dataset.key] = el.dataset.value;
        panelCard.querySelectorAll(`.tp-chip[data-key="${el.dataset.key}"]`).forEach(c => {
          c.dataset.sel = (c.dataset.value === el.dataset.value);
        });
        onFieldChange();
      });
    } else {
      el.addEventListener("input", () => {
        formData[el.dataset.key] = el.value;
        onFieldChange();
      });
    }
  });

  panelCard.querySelector("#prevBtn").addEventListener("click", () => goTo(activeIndex - 1));
  panelCard.querySelector("#nextBtn").addEventListener("click", () => goTo(activeIndex + 1));
}

/* ---------------------------------------------------------
   Global UI updates (ring, hero, dock, nudge) — no panel rebuild
--------------------------------------------------------- */
function onFieldChange(){
  updateProgressUI();
  const section = SECTIONS[activeIndex];
  const status = panelCard.querySelector(".tp-status");
  const done = sectionDone(section);
  status.dataset.done = done;
  status.innerHTML = (done ? ICON.check : "") + (done ? "Complete" : "Pending");
}

function updateProgressUI(){
  const pct = percent();
  const circumference = 113.1;
  document.getElementById("ringProgress").style.strokeDashoffset = circumference - (pct/100)*circumference;
  document.getElementById("ringPct").textContent = pct + "%";

  const avatarCirc = 150.8;
  document.getElementById("avatarProgress").style.strokeDashoffset = avatarCirc - (pct/100)*avatarCirc;

  const name = formData.fullName || "";
  document.getElementById("avatarInitials").textContent =
    (name.split(" ").filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join("")) || "YN";
  document.getElementById("heroName").textContent = name || "Your tenant profile";
  document.getElementById("heroLocality").innerHTML = ICON.mapPin + " " + (formData.preferredCity || "Locality not added");
  document.getElementById("heroMoveIn").innerHTML = ICON.calendar + " " + (formData.moveInDate || "Move-in date not set");
  document.getElementById("heroFields").innerHTML = ICON.badgeCheck + " " + filledCount() + "/" + ALL_REQUIRED.length + " fields";

  const isComplete = pct === 100;
  document.getElementById("nudge").style.display = isComplete ? "none" : "flex";
  document.getElementById("nudgeFill").style.width = pct + "%";
  document.getElementById("nudgeText").textContent = pct + "% complete — submit unlocks at 100%";
  document.getElementById("submitCard").dataset.show = isComplete;

  updateSlidebar();
}

/* ---------------------------------------------------------
   Navigation
--------------------------------------------------------- */
function goTo(index){
  index = Math.min(Math.max(index, 0), SECTIONS.length - 1);
  dir = index >= activeIndex ? "fwd" : "back";
  activeIndex = index;
  renderPanel();
  updateProgressUI();
}

async function renderTenantVerificationVisibility() {
  const container = document.getElementById('tenantVerificationList');
  if (!container) return;
  const onlyProductionVerified = document.getElementById('tenantVerifiedOnly').checked;
  try {
    const response = await SmartStayAPI.getProperties();
    const properties = response.data || [];
    const visibleProperties = properties.filter(property => {
      const verification = property.digilockerVerification;
      const isProductionVerified = verification?.mode === 'PRODUCTION' && verification.status === 'VERIFIED';
      return !onlyProductionVerified || isProductionVerified;
    });

    if (visibleProperties.length === 0) {
      container.innerHTML = `<p class="tp-verified-empty">${onlyProductionVerified
        ? 'No production-verified properties are available right now.'
        : 'No approved properties are available right now.'}</p>`;
      return;
    }

    container.innerHTML = visibleProperties.map(property => {
      const verification = property.digilockerVerification;
      const isProductionVerified = verification?.mode === 'PRODUCTION' && verification.status === 'VERIFIED';
      const isDemo = verification?.mode === 'DEMO' || verification?.mode === 'SANDBOX';
      const date = verification?.verifiedAt ? new Date(verification.verifiedAt).toLocaleDateString() : '';
      const statusLabel = isProductionVerified
        ? '🛡️ VERIFIED LISTING'
        : (isDemo ? '🧪 DEMO / SANDBOX VERIFICATION' : 'Listing approved');
      const safeDetails = isProductionVerified
        ? `Documents verified through the platform's authorized verification process.${date ? ` Verification date: ${date}.` : ''}`
        : (isDemo ? 'Demo verification — not a production government verification.' : 'No DigiLocker verification record.');
      return `<article class="tp-verified-item">
        <div><h3>${escapeHtml(property.name)}</h3><p>${escapeHtml(property.locality || '')}, ${escapeHtml(property.city || '')}</p></div>
        <span class="tp-verified-badge" data-demo="${isDemo}" data-verified="${isProductionVerified}">${statusLabel}</span>
        <p class="tp-verified-detail">${safeDetails}</p>
      </article>`;
    }).join('');
  } catch {
    container.innerHTML = '<p class="tp-verified-empty">Property verification status is temporarily unavailable.</p>';
  }
}

document.getElementById('tenantVerifiedOnly').addEventListener('change', renderTenantVerificationVisibility);
/* ---------------------------------------------------------
   Submit button (demo behaviour)
--------------------------------------------------------- */
document.getElementById("submitBtn").addEventListener("click", () => {
  alert("Profile submitted! (wire this button up to your backend)");
});

/* ---------------------------------------------------------
   Init
--------------------------------------------------------- */
buildSlidebar();
renderPanel();
updateProgressUI();
renderTenantVerificationVisibility();
window.addEventListener("resize", updateSlidebar);
})();
