require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const adminRouter = require("./routes/admin");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DIGI237 store en écoute sur le port ${PORT}`);
});
