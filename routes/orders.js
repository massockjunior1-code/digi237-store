const express = require("express");
const { nanoid } = require("nanoid");
const db = require("../db");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

function rowToOrder(r, revealFiles) {
  const items = JSON.parse(r.items);
  return {
    id: r.id,
    ref: r.ref,
    customerName: r.customer_name,
    phone: r.phone,
    email: r.email,
    operator: r.operator,
    txRef: r.tx_ref,
    items,
    total: r.total,
    status: r.status,
    createdAt: r.created_at,
  };
}

function nextOrderRef() {
  const row = db.prepare("SELECT value FROM counters WHERE name = 'order_seq'").get();
  const seq = row.value;
  db.prepare("UPDATE counters SET value = value + 1 WHERE name = 'order_seq'").run();
  return "DIGI237-" + String(seq).padStart(6, "0");
}

// Public: créer une commande
router.post("/", (req, res) => {
  const { customerName, phone, email, operator, txRef, items } = req.body;
  if (!customerName || !phone || !txRef || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Informations de commande incomplètes" });
  }

  // recalcule le total côté serveur à partir des vrais prix produits (ne jamais faire confiance au client)
  const productIds = items.map((i) => i.id);
  const placeholders = productIds.map(() => "?").join(",");
  const dbProducts = db
    .prepare(`SELECT * FROM products WHERE id IN (${placeholders})`)
    .all(...productIds);
  const priceMap = Object.fromEntries(dbProducts.map((p) => [p.id, p]));

  let total = 0;
  const cleanItems = [];
  for (const item of items) {
    const p = priceMap[item.id];
    if (!p) return res.status(400).json({ error: `Produit inconnu : ${item.id}` });
    const qty = Math.max(1, parseInt(item.qty, 10) || 1);
    total += p.price * qty;
    cleanItems.push({ id: p.id, name: p.name, price: p.price, qty });
  }

  const id = "o_" + nanoid(10);
  const ref = nextOrderRef();
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO orders (id, ref, customer_name, phone, email, operator, tx_ref, items, total, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente', ?)`
  ).run(id, ref, customerName, phone, email || "", operator, txRef, JSON.stringify(cleanItems), total, createdAt);

  const existingCustomer = db.prepare("SELECT * FROM customers WHERE phone = ?").get(phone);
  if (!existingCustomer) {
    db.prepare("INSERT INTO customers (phone, name, email) VALUES (?, ?, ?)").run(phone, customerName, email || "");
  }

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  res.status(201).json(rowToOrder(order));
});

// Public: historique d'un client par numéro de téléphone
router.get("/by-phone/:phone", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM orders WHERE phone = ? ORDER BY created_at DESC")
    .all(req.params.phone);
  const orders = rows.map((r) => {
    const order = rowToOrder(r);
    if (order.status !== "valide") {
      order.items = order.items.map((i) => ({ ...i, fileUrl: undefined }));
    } else {
      const files = db
        .prepare(`SELECT id, file_url FROM products WHERE id IN (${order.items.map(() => "?").join(",")})`)
        .all(...order.items.map((i) => i.id));
      const fileMap = Object.fromEntries(files.map((f) => [f.id, f.file_url]));
      order.items = order.items.map((i) => ({ ...i, fileUrl: fileMap[i.id] }));
    }
    return order;
  });
  res.json(orders);
});

// Admin: liste de toutes les commandes
router.get("/", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  res.json(rows.map((r) => rowToOrder(r)));
});

// Admin: valider une commande
router.post("/:id/validate", requireAdmin, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Commande introuvable" });
  db.prepare("UPDATE orders SET status = 'valide' WHERE id = ?").run(order.id);

  const items = JSON.parse(order.items);
  const updateStock = db.prepare(
    "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ? AND unlimited = 0"
  );
  const tx = db.transaction((its) => its.forEach((i) => updateStock.run(i.qty, i.id)));
  tx(items);

  res.json(rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id)));
});

// Admin: rejeter une commande
router.post("/:id/reject", requireAdmin, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Commande introuvable" });
  db.prepare("UPDATE orders SET status = 'rejete' WHERE id = ?").run(order.id);
  res.json(rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id)));
});

module.exports = router;
