const express = require("express");
const { nanoid } = require("nanoid");
const db = require("../db");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

function rowToProduct(r) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    price: r.price,
    unlimited: !!r.unlimited,
    stock: r.stock,
    description: r.description,
    fileUrl: r.file_url,
  };
}

// Public: liste des produits (sans le lien de téléchargement)
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM products").all();
  const products = rows.map(rowToProduct).map((p) => ({ ...p, fileUrl: undefined }));
  res.json(products);
});

// Admin: liste complète (avec lien de téléchargement, pour l'édition)
router.get("/admin", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM products").all();
  res.json(rows.map(rowToProduct));
});

// Admin: création
router.post("/", requireAdmin, (req, res) => {
  const { name, category, price, unlimited, stock, description, fileUrl } = req.body;
  if (!name || !category || price == null) {
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  }
  const id = "p_" + nanoid(10);
  db.prepare(
    `INSERT INTO products (id, name, category, price, unlimited, stock, description, file_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, category, price, unlimited ? 1 : 0, stock || 0, description || "", fileUrl || "");
  res.status(201).json(rowToProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(id)));
});

// Admin: mise à jour
router.put("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Produit introuvable" });
  const { name, category, price, unlimited, stock, description, fileUrl } = req.body;
  db.prepare(
    `UPDATE products SET name=?, category=?, price=?, unlimited=?, stock=?, description=?, file_url=? WHERE id=?`
  ).run(
    name ?? existing.name,
    category ?? existing.category,
    price ?? existing.price,
    unlimited != null ? (unlimited ? 1 : 0) : existing.unlimited,
    stock ?? existing.stock,
    description ?? existing.description,
    fileUrl ?? existing.file_url,
    req.params.id
  );
  res.json(rowToProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id)));
});

// Admin: suppression
router.delete("/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

module.exports = router;
