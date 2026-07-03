const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_DIR = process.env.DB_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, "digi237.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    unlimited INTEGER NOT NULL DEFAULT 1,
    stock INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    file_url TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    phone TEXT PRIMARY KEY,
    name TEXT,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    ref TEXT NOT NULL,
    customer_name TEXT,
    phone TEXT,
    email TEXT,
    operator TEXT,
    tx_ref TEXT,
    items TEXT NOT NULL,
    total INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'en_attente',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS counters (
    name TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  );
`);

const seedCount = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
if (seedCount === 0) {
  const insert = db.prepare(`
    INSERT INTO products (id, name, category, price, unlimited, stock, description, file_url)
    VALUES (@id, @name, @category, @price, @unlimited, @stock, @description, @file_url)
  `);
  const seed = [
    {
      id: "p1",
      name: "Vendre en ligne au Cameroun",
      category: "Ebook",
      price: 3500,
      unlimited: 1,
      stock: 0,
      description:
        "Guide pratique pour lancer une boutique en ligne : fournisseurs locaux, livraison, paiement Mobile Money et premières ventes.",
      file_url: "https://example.com/fichiers/vendre-en-ligne-cameroun.pdf",
    },
    {
      id: "p2",
      name: "Freelance à l'international",
      category: "Cours",
      price: 15000,
      unlimited: 0,
      stock: 25,
      description:
        "6 modules vidéo pour décrocher des clients sur Upwork et Fiverr depuis le Cameroun, se faire payer et gérer ses factures.",
      file_url: "https://example.com/fichiers/freelance-international.zip",
    },
    {
      id: "p3",
      name: "Facturier Excel automatique",
      category: "Logiciel",
      price: 5000,
      unlimited: 0,
      stock: 40,
      description:
        "Modèle Excel prêt à l'emploi : factures numérotées automatiquement, calcul TVA et export PDF en un clic.",
      file_url: "https://example.com/fichiers/facturier-excel.xlsx",
    },
  ];
  const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(r)));
  insertMany(seed);
}

const counterRow = db.prepare("SELECT value FROM counters WHERE name = 'order_seq'").get();
if (!counterRow) {
  db.prepare("INSERT INTO counters (name, value) VALUES ('order_seq', 1)").run();
}

module.exports = db;
