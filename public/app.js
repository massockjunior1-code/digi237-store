const CATEGORIES = ["Tous", "Ebook", "Cours", "Logiciel"];

const state = {
  view: "store",
  category: "Tous",
  products: [],
  cart: JSON.parse(localStorage.getItem("digi237_cart") || "[]"),
  customerPhone: localStorage.getItem("digi237_phone") || null,
  customerOrders: [],
  adminToken: localStorage.getItem("digi237_admin_token") || null,
  adminOrders: [],
  adminProducts: [],
  lastOrder: null,
  modalProduct: null,
  editingProduct: null,
};

const app = document.getElementById("app");

function fmtXAF(n) {
  return Number(n).toLocaleString("fr-FR") + " FCFA";
}

function saveCart() {
  localStorage.setItem("digi237_cart", JSON.stringify(state.cart));
}

function cartCount() {
  return state.cart.reduce((s, i) => s + i.qty, 0);
}
function cartTotal() {
  return state.cart.reduce((s, i) => s + i.price * i.qty, 0);
}

async function api(path, opts = {}) {
  const res = await fetch("/api" + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return data;
}

async function loadProducts() {
  state.products = await api("/products");
}

// ---------- RENDER ----------
function render() {
  document.getElementById("cart-count").textContent = cartCount() > 0 ? cartCount() : "";
  document.querySelectorAll(".bottom-nav button, .nav-btn").forEach((b) => {
    if (b.dataset.nav) b.classList.toggle("active", b.dataset.nav === state.view);
  });

  let html = "";
  if (state.view === "store") html = renderStore();
  else if (state.view === "cart") html = renderCart();
  else if (state.view === "checkout") html = renderCheckout();
  else if (state.view === "confirm") html = renderConfirm();
  else if (state.view === "account") html = renderAccount();
  else if (state.view === "admin-login") html = renderAdminLogin();
  else if (state.view === "admin") html = renderAdmin();

  app.innerHTML = html;
  attachHandlers();

  if (state.modalProduct) renderModal();
  if (state.editingProduct) renderProductEditor();
}

function renderStore() {
  const filtered = state.category === "Tous" ? state.products : state.products.filter((p) => p.category === state.category);
  return `
    <section class="hero">
      <div class="eyebrow">PRODUITS NUMÉRIQUES · PAIEMENT MOBILE MONEY</div>
      <h1 class="font-display">Des ebooks, cours et outils faits pour le marché camerounais.</h1>
      <p>Paie avec Orange Money ou MTN MoMo, reçois ton lien de téléchargement dès que ta commande est validée.</p>
    </section>
    <div class="categories">
      ${CATEGORIES.map((c) => `<button class="cat-btn ${c === state.category ? "active" : ""}" data-cat="${c}">${c}</button>`).join("")}
    </div>
    <div class="grid">
      ${filtered.map((p) => `
        <div class="product-card">
          <div data-open-product="${p.id}" style="cursor:pointer;">
            <div class="product-cat">${p.category.toUpperCase()}</div>
            <h3 class="product-name">${p.name}</h3>
            <p class="product-desc">${p.description || ""}</p>
          </div>
          <div class="product-footer">
            <span class="price">${fmtXAF(p.price)}</span>
            <button class="btn-accent" data-add="${p.id}">Ajouter</button>
          </div>
          ${!p.unlimited ? `<div class="stock-note ${p.stock === 0 ? "out" : ""}">${p.stock > 0 ? p.stock + " licences disponibles" : "Rupture de stock"}</div>` : ""}
        </div>
      `).join("") || `<div class="empty-state">Aucun produit dans cette catégorie pour l'instant.</div>`}
    </div>
  `;
}

function renderModal() {
  const p = state.products.find((x) => x.id === state.modalProduct);
  if (!p) return;
  const div = document.createElement("div");
  div.className = "modal-overlay";
  div.id = "modal-overlay";
  div.innerHTML = `
    <div class="modal">
      <button class="modal-close" id="modal-close">✕</button>
      <div class="product-cat">${p.category.toUpperCase()}</div>
      <h2 class="font-display" style="font-size:22px;">${p.name}</h2>
      <p class="muted" style="font-size:14px;">${p.description || ""}</p>
      <div class="product-footer">
        <span class="price" style="font-size:17px;">${fmtXAF(p.price)}</span>
        <button class="btn-accent" id="modal-add">Ajouter au panier</button>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  div.addEventListener("click", (e) => { if (e.target === div) closeModal(); });
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-add").addEventListener("click", () => { addToCart(p); closeModal(); });
}
function closeModal() {
  state.modalProduct = null;
  const el = document.getElementById("modal-overlay");
  if (el) el.remove();
}

function renderCart() {
  if (state.cart.length === 0) {
    return `<div class="empty-state">
      🛒<br/>Ton panier est vide.
      <div style="margin-top:16px;"><button class="btn-accent" data-nav="store">Voir la boutique</button></div>
    </div>`;
  }
  return `
    <h2 class="font-display" style="margin-top:32px;">Ton panier</h2>
    <div style="margin-top:16px;">
      ${state.cart.map((i) => `
        <div class="cart-item">
          <div><div style="font-weight:600;">${i.name}</div><div class="price muted" style="font-size:13px;">${fmtXAF(i.price)}</div></div>
          <div class="qty-controls">
            <button data-qty-minus="${i.id}">−</button>
            <span class="font-mono">${i.qty}</span>
            <button data-qty-plus="${i.id}">+</button>
            <button data-remove="${i.id}" style="color:var(--danger); margin-left:8px;">🗑</button>
          </div>
        </div>
      `).join("")}
    </div>
    <div style="display:flex; justify-content:space-between; padding-top:16px; margin-top:8px; border-top:1px solid var(--card-border);">
      <span class="font-display" style="font-size:20px; font-weight:700;">Total</span>
      <span class="font-mono" style="font-size:20px; font-weight:700;">${fmtXAF(cartTotal())}</span>
    </div>
    <div style="display:flex; gap:12px; margin-top:20px;">
      <button class="btn-outline" data-nav="store">Continuer mes achats</button>
      <button class="btn-accent" style="flex:1;" data-nav="checkout">Passer commande</button>
    </div>
  `;
}

function renderCheckout() {
  const f = state.checkoutForm || (state.checkoutForm = { name: "", phone: "", email: "", operator: "orange", txRef: "" });
  const opLabel = f.operator === "orange" ? "Orange Money" : "MTN MoMo";
  const opNumber = f.operator === "orange" ? "6 55 00 00 00" : "6 77 00 00 00";
  const opCode = f.operator === "orange" ? "#150#" : "*126#";
  return `
    <button class="btn-outline" data-nav="cart" style="margin-top:24px; margin-bottom:16px;">← Retour au panier</button>
    <h2 class="font-display">Finaliser la commande</h2>
    <form id="checkout-form" class="center-col" style="margin-top:16px;">
      <div class="form-group"><label class="form-label">NOM COMPLET</label><input required class="form-input" name="name" value="${f.name}"/></div>
      <div class="form-group"><label class="form-label">NUMÉRO DE TÉLÉPHONE</label><input required class="form-input" name="phone" placeholder="6XX XX XX XX" value="${f.phone}"/></div>
      <div class="form-group"><label class="form-label">EMAIL (optionnel)</label><input type="email" class="form-input" name="email" value="${f.email}"/></div>
      <div class="form-group">
        <label class="form-label">OPÉRATEUR</label>
        <div class="operator-row">
          <button type="button" class="operator-btn ${f.operator === "orange" ? "active-orange" : ""}" data-op="orange">Orange Money</button>
          <button type="button" class="operator-btn ${f.operator === "mtn" ? "active-mtn" : ""}" data-op="mtn">MTN MoMo</button>
        </div>
      </div>
      <div class="instructions-box" style="border:1px solid ${f.operator === "orange" ? "var(--orange)" : "var(--mtn)"};">
        <strong>Instructions ${opLabel}</strong>
        <ol>
          <li>Compose <span class="font-mono">${opCode}</span> sur ton téléphone</li>
          <li>Envoie <span class="font-mono">${fmtXAF(cartTotal())}</span> au <span class="font-mono">${opNumber}</span></li>
          <li>Copie l'ID de transaction reçu par SMS et colle-le ci-dessous</li>
        </ol>
      </div>
      <div class="form-group"><label class="form-label">ID DE TRANSACTION</label><input required class="form-input font-mono" name="txRef" placeholder="Ex : MP240703.1145.A12345" value="${f.txRef}"/></div>
      <div style="display:flex; justify-content:space-between; margin-bottom:16px;"><span class="muted">Total à payer</span><span class="font-mono" style="font-weight:700;">${fmtXAF(cartTotal())}</span></div>
      <button class="btn-accent" style="width:100%; padding:12px;" type="submit">Confirmer la commande</button>
      <p class="muted" style="font-size:12px; text-align:center; margin-top:8px;">Ta commande sera vérifiée manuellement puis validée sous peu.</p>
    </form>
  `;
}

function renderConfirm() {
  const o = state.lastOrder;
  if (!o) return "";
  return `
    <div class="receipt">
      <div class="receipt-body">
        <div style="font-size:32px;">✅</div>
        <h2 class="font-display">Commande enregistrée</h2>
        <p class="muted" style="font-size:14px;">Validation sous peu — tu recevras ton lien de téléchargement dans "Mon compte".</p>
        <div class="receipt-details">
          <div class="row"><span class="muted">Référence</span><span>${o.ref}</span></div>
          <div class="row"><span class="muted">Total</span><span>${fmtXAF(o.total)}</span></div>
          <div class="row"><span class="muted">Statut</span><span style="color:var(--accent);">En attente</span></div>
        </div>
      </div>
      <div class="receipt-edge"></div>
    </div>
    <button class="btn-accent" style="width:100%; max-width:380px; display:block; margin:20px auto 0; padding:12px;" data-nav="account">Voir mon historique</button>
  `;
}

function renderAccount() {
  if (!state.customerPhone) {
    return `
      <div class="center-col" style="margin-top:40px;">
        <h2 class="font-display">Mon compte</h2>
        <p class="muted" style="font-size:14px;">Connecte-toi avec le numéro utilisé lors de ta commande.</p>
        <form id="login-form" style="margin-top:16px;">
          <div class="form-group"><input class="form-input" name="phone" placeholder="6XX XX XX XX" required/></div>
          <button class="btn-accent" style="width:100%; padding:10px;" type="submit">Se connecter</button>
        </form>
      </div>
    `;
  }
  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:32px;">
      <div>
        <h2 class="font-display" style="margin:0;">Mon compte</h2>
        <p class="muted" style="margin:4px 0;">${state.customerPhone}</p>
      </div>
      <button class="btn-outline" id="logout-btn">Déconnexion</button>
    </div>
    <div class="eyebrow" style="margin-top:20px;">HISTORIQUE DES COMMANDES</div>
    <div style="margin-top:12px;">
      ${state.customerOrders.length === 0 ? `<p class="muted">Aucune commande pour l'instant.</p>` : state.customerOrders.map(orderCardHtml).join("")}
    </div>
  `;
}

function statusBadge(status) {
  if (status === "en_attente") return `<span class="badge badge-pending">⏱ En attente</span>`;
  if (status === "valide") return `<span class="badge badge-valid">✓ Validée</span>`;
  return `<span class="badge badge-rejected">✕ Rejetée</span>`;
}

function orderCardHtml(o) {
  return `
    <div class="order-card" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span class="font-mono" style="font-size:13px;">${o.ref}</span>
        ${statusBadge(o.status)}
      </div>
      <div class="muted" style="font-size:14px;">${o.items.map((i) => i.name).join(", ")}</div>
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:10px;">
        <span class="price">${fmtXAF(o.total)}</span>
        ${o.status === "valide" ? `<div style="text-align:right;">${o.items.map((i) => i.fileUrl ? `<a href="${i.fileUrl}" target="_blank" style="display:block; font-size:12px; color:var(--accent);">⬇ ${i.name}</a>` : "").join("")}</div>` : ""}
      </div>
    </div>
  `;
}

function renderAdminLogin() {
  return `
    <div class="center-col" style="margin-top:40px;">
      <h2 class="font-display">Espace admin</h2>
      <p class="muted" style="font-size:14px;">Accès réservé à la gestion de la boutique.</p>
      <form id="admin-login-form" style="margin-top:16px;">
        <div class="form-group"><input class="form-input" type="password" name="password" placeholder="Mot de passe"/></div>
        <button class="btn-accent" style="width:100%; padding:10px;" type="submit">Entrer</button>
      </form>
      <p id="admin-login-error" style="color:var(--danger); font-size:13px; margin-top:8px;"></p>
    </div>
  `;
}

function renderAdmin() {
  const tab = state.adminTab || "produits";
  const pending = state.adminOrders.filter((o) => o.status === "en_attente").length;
  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:32px;">
      <h2 class="font-display" style="margin:0;">Back-office</h2>
      <button class="btn-outline" id="admin-logout">Quitter</button>
    </div>
    <div style="display:flex; gap:8px; margin:20px 0;">
      <button class="cat-btn ${tab === "produits" ? "active" : ""}" data-admintab="produits">Produits</button>
      <button class="cat-btn ${tab === "commandes" ? "active" : ""}" data-admintab="commandes">Commandes ${pending > 0 ? `(${pending})` : ""}</button>
    </div>
    ${tab === "produits" ? renderAdminProducts() : renderAdminOrders()}
  `;
}

function renderAdminProducts() {
  return `
    <button class="btn-accent" id="new-product-btn" style="margin-bottom:16px;">+ Nouveau produit</button>
    ${state.adminProducts.map((p) => `
      <div class="admin-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div>
          <div style="font-weight:600;">${p.name}</div>
          <div class="muted font-mono" style="font-size:12px;">${p.category} · ${fmtXAF(p.price)} · ${p.unlimited ? "Stock illimité" : p.stock + " en stock"}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-outline" data-edit-product="${p.id}" style="font-size:12px;">Modifier</button>
          <button data-delete-product="${p.id}" style="color:var(--danger); background:none;">🗑</button>
        </div>
      </div>
    `).join("") || `<p class="muted">Aucun produit.</p>`}
  `;
}

function renderAdminOrders() {
  return state.adminOrders.map((o) => `
    <div class="admin-row" style="margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span class="font-mono" style="font-size:13px;">${o.ref}</span>
        ${statusBadge(o.status)}
      </div>
      <div style="font-size:14px;">${o.customerName} · ${o.phone}</div>
      <div class="muted font-mono" style="font-size:12px; margin:4px 0;">${o.operator === "orange" ? "Orange Money" : "MTN MoMo"} · ID : ${o.txRef}</div>
      <div class="muted" style="font-size:14px;">${o.items.map((i) => `${i.name} x${i.qty}`).join(", ")}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
        <span class="price">${fmtXAF(o.total)}</span>
        ${o.status === "en_attente" ? `
          <div style="display:flex; gap:8px;">
            <button data-reject="${o.id}" style="border:1px solid var(--danger); color:var(--danger); background:none; padding:6px 12px; border-radius:999px; font-size:12px;">Rejeter</button>
            <button data-validate="${o.id}" style="background:var(--success); color:#0C1F14; padding:6px 12px; border-radius:999px; font-size:12px; font-weight:600;">Valider</button>
          </div>` : ""}
      </div>
    </div>
  `).join("") || `<p class="muted">Aucune commande.</p>`;
}

function renderProductEditor() {
  const p = state.editingProduct;
  const div = document.createElement("div");
  div.className = "modal-overlay";
  div.id = "editor-overlay";
  div.innerHTML = `
    <div class="modal">
      <h3 class="font-display">${p.id ? "Modifier le produit" : "Nouveau produit"}</h3>
      <form id="product-form" style="margin-top:12px;">
        <div class="form-group"><input required class="form-input" name="name" placeholder="Nom" value="${p.name || ""}"/></div>
        <div class="form-group">
          <select class="form-select" name="category">
            ${CATEGORIES.filter((c) => c !== "Tous").map((c) => `<option ${p.category === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </div>
        <div class="form-group"><textarea required class="form-textarea" name="description" rows="3" placeholder="Description">${p.description || ""}</textarea></div>
        <div class="form-group"><input required type="number" class="form-input" name="price" placeholder="Prix (FCFA)" value="${p.price || ""}"/></div>
        <div class="form-group"><input class="form-input" name="fileUrl" placeholder="Lien de téléchargement" value="${p.fileUrl || ""}"/></div>
        <label class="muted" style="display:flex; align-items:center; gap:8px; font-size:14px; margin-bottom:10px;">
          <input type="checkbox" name="unlimited" ${p.unlimited ? "checked" : ""}/> Stock illimité
        </label>
        <div class="form-group" id="stock-field" style="${p.unlimited ? "display:none;" : ""}">
          <input type="number" class="form-input" name="stock" placeholder="Quantité en stock" value="${p.stock || 0}"/>
        </div>
        <div style="display:flex; gap:12px; margin-top:8px;">
          <button type="button" class="btn-outline" style="flex:1;" id="editor-cancel">Annuler</button>
          <button type="submit" class="btn-accent" style="flex:1;">Enregistrer</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(div);
  div.addEventListener("click", (e) => { if (e.target === div) closeEditor(); });
  document.getElementById("editor-cancel").addEventListener("click", closeEditor);
  div.querySelector('input[name="unlimited"]').addEventListener("change", (e) => {
    document.getElementById("stock-field").style.display = e.target.checked ? "none" : "block";
  });
  document.getElementById("product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      name: fd.get("name"),
      category: fd.get("category"),
      description: fd.get("description"),
      price: Number(fd.get("price")),
      fileUrl: fd.get("fileUrl"),
      unlimited: fd.get("unlimited") === "on",
      stock: Number(fd.get("stock") || 0),
    };
    try {
      if (p.id) await api(`/products/${p.id}`, { method: "PUT", headers: authHeader(), body: JSON.stringify(payload) });
      else await api("/products", { method: "POST", headers: authHeader(), body: JSON.stringify(payload) });
      closeEditor();
      await refreshAdminProducts();
      await loadProducts();
      render();
    } catch (err) { alert(err.message); }
  });
}
function closeEditor() {
  state.editingProduct = null;
  const el = document.getElementById("editor-overlay");
  if (el) el.remove();
}

// ---------- ACTIONS ----------
function addToCart(p) {
  const existing = state.cart.find((i) => i.id === p.id);
  if (existing) existing.qty += 1;
  else state.cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
  saveCart();
  render();
}

function authHeader() {
  return state.adminToken ? { Authorization: "Bearer " + state.adminToken } : {};
}

async function refreshAdminOrders() {
  state.adminOrders = await api("/orders", { headers: authHeader() });
}
async function refreshAdminProducts() {
  state.adminProducts = await api("/products/admin", { headers: authHeader() });
}

async function goTo(view) {
  state.view = view;
  if (view === "admin") {
    if (!state.adminToken) { state.view = "admin-login"; render(); return; }
    try {
      await Promise.all([refreshAdminOrders(), refreshAdminProducts()]);
    } catch {
      state.adminToken = null;
      localStorage.removeItem("digi237_admin_token");
      state.view = "admin-login";
    }
  }
  if (view === "account" && state.customerPhone) {
    state.customerOrders = await api(`/orders/by-phone/${encodeURIComponent(state.customerPhone)}`);
  }
  render();
}

// ---------- EVENTS ----------
function attachHandlers() {
  document.querySelectorAll("[data-nav]").forEach((el) => el.addEventListener("click", () => goTo(el.dataset.nav)));
  document.querySelectorAll("[data-cat]").forEach((el) => el.addEventListener("click", () => { state.category = el.dataset.cat; render(); }));
  document.querySelectorAll("[data-open-product]").forEach((el) => el.addEventListener("click", () => { state.modalProduct = el.dataset.openProduct; render(); }));
  document.querySelectorAll("[data-add]").forEach((el) => el.addEventListener("click", (e) => {
    e.stopPropagation();
    const p = state.products.find((x) => x.id === el.dataset.add);
    if (p) addToCart(p);
  }));
  document.querySelectorAll("[data-qty-plus]").forEach((el) => el.addEventListener("click", () => changeQty(el.dataset.qtyPlus, 1)));
  document.querySelectorAll("[data-qty-minus]").forEach((el) => el.addEventListener("click", () => changeQty(el.dataset.qtyMinus, -1)));
  document.querySelectorAll("[data-remove]").forEach((el) => el.addEventListener("click", () => { state.cart = state.cart.filter((i) => i.id !== el.dataset.remove); saveCart(); render(); }));

  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm) {
    checkoutForm.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", () => { state.checkoutForm[inp.name] = inp.value; }));
    checkoutForm.querySelectorAll("[data-op]").forEach((btn) => btn.addEventListener("click", () => { state.checkoutForm.operator = btn.dataset.op; render(); }));
    checkoutForm.addEventListener("submit", submitOrder);
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = new FormData(e.target).get("phone").trim();
    const orders = await api(`/orders/by-phone/${encodeURIComponent(phone)}`);
    if (orders.length === 0) { alert("Aucune commande trouvée avec ce numéro. Passe une commande pour créer ton compte."); return; }
    state.customerPhone = phone;
    state.customerOrders = orders;
    localStorage.setItem("digi237_phone", phone);
    render();
  });
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => { state.customerPhone = null; localStorage.removeItem("digi237_phone"); render(); });

  const adminLoginForm = document.getElementById("admin-login-form");
  if (adminLoginForm) adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = new FormData(e.target).get("password");
    try {
      const { token } = await api("/admin/login", { method: "POST", body: JSON.stringify({ password }) });
      state.adminToken = token;
      localStorage.setItem("digi237_admin_token", token);
      goTo("admin");
    } catch (err) {
      document.getElementById("admin-login-error").textContent = err.message;
    }
  });
  const adminLogout = document.getElementById("admin-logout");
  if (adminLogout) adminLogout.addEventListener("click", () => { state.adminToken = null; localStorage.removeItem("digi237_admin_token"); state.view = "store"; render(); });

  document.querySelectorAll("[data-admintab]").forEach((el) => el.addEventListener("click", () => { state.adminTab = el.dataset.admintab; render(); }));
  const newProductBtn = document.getElementById("new-product-btn");
  if (newProductBtn) newProductBtn.addEventListener("click", () => { state.editingProduct = { unlimited: true }; render(); });
  document.querySelectorAll("[data-edit-product]").forEach((el) => el.addEventListener("click", () => {
    const p = state.adminProducts.find((x) => x.id === el.dataset.editProduct);
    state.editingProduct = { ...p };
    render();
  }));
  document.querySelectorAll("[data-delete-product]").forEach((el) => el.addEventListener("click", async () => {
    if (!confirm("Supprimer ce produit ?")) return;
    await api(`/products/${el.dataset.deleteProduct}`, { method: "DELETE", headers: authHeader() });
    await refreshAdminProducts();
    await loadProducts();
    render();
  }));
  document.querySelectorAll("[data-validate]").forEach((el) => el.addEventListener("click", async () => {
    await api(`/orders/${el.dataset.validate}/validate`, { method: "POST", headers: authHeader() });
    await Promise.all([refreshAdminOrders(), refreshAdminProducts()]);
    render();
  }));
  document.querySelectorAll("[data-reject]").forEach((el) => el.addEventListener("click", async () => {
    await api(`/orders/${el.dataset.reject}/reject`, { method: "POST", headers: authHeader() });
    await refreshAdminOrders();
    render();
  }));
}

function changeQty(id, delta) {
  const item = state.cart.find((i) => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  render();
}

async function submitOrder(e) {
  e.preventDefault();
  const f = state.checkoutForm;
  try {
    const order = await api("/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: f.name,
        phone: f.phone,
        email: f.email,
        operator: f.operator,
        txRef: f.txRef,
        items: state.cart.map((i) => ({ id: i.id, qty: i.qty })),
      }),
    });
    state.lastOrder = order;
    state.cart = [];
    saveCart();
    state.customerPhone = f.phone;
    localStorage.setItem("digi237_phone", f.phone);
    state.checkoutForm = null;
    state.view = "confirm";
    render();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- INIT ----------
(async function init() {
  await loadProducts();
  render();
})();
