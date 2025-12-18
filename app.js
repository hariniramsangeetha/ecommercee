// ================== IMPORTS ==================
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const { rateLimit } = require("express-rate-limit");

dotenv.config();

// ================== APP SETUP ==================
const app = express();
const port = process.env.PORT || 3000;
const secretkey = process.env.SECRETKEY;

// ================== MIDDLEWARES ==================
app.use(cors());
app.use(express.json());
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
});
app.use(limiter);

// ================== DB CONNECTION ==================
async function connection() {
  try {
    await mongoose.connect(process.env.MONGODBURL);
    console.log("MongoDB connected ✅");
  } catch (error) {
    console.log("MongoDB error ❌", error.message);
  }
}

// ================== SCHEMAS ==================
const productschema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  img: { type: String, required: true },
});

const userschema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
});

// ================== MODELS ==================
const Product = mongoose.model("products", productschema);
const User = mongoose.model("users", userschema);

// ================== NODEMAILER ==================
// ⚠️ Use PERSONAL GMAIL + APP PASSWORD
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD, // app password
  },
});

// ================== ROUTES ==================

// Dummy API
app.get("/dummy", (req, res) => {
  const { name, age, location } = req.query;
  res.send(`My name is ${name}, age is ${age}, from ${location}`);
});

// Get product by ID
app.get("/product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.json(product);
  } catch (error) {
    res.json({ msg: error.message });
  }
});

// Add product
app.post("/products", async (req, res) => {
  try {
    const { title, price, img } = req.body;
    await Product.create({ title, price, img });
    res.json({ msg: "Product added successfully" });
  } catch (error) {
    res.json({ msg: error.message });
  }
});

// Get all products
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.json({ msg: error.message });
  }
});

// Delete product
app.delete("/deleteproduct", async (req, res) => {
  try {
    const { id } = req.body;
    await Product.findByIdAndDelete(id);
    res.json({ msg: "Product deleted successfully" });
  } catch (error) {
    res.json({ msg: error.message });
  }
});

// Update product
app.put("/updateproduct", async (req, res) => {
  try {
    const { id, title, price, img } = req.body;
    await Product.findByIdAndUpdate(id, { title, price, img });
    res.json({ msg: "Product updated successfully" });
  } catch (error) {
    res.json({ msg: error.message });
  }
});

// ================== AUTH ==================

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const isUser = await User.findOne({ username });
    if (isUser) return res.json({ msg: "Username already exists" });

    const hashedpassword = await bcrypt.hash(password, 10);
    await User.create({ username, email, password: hashedpassword });

    // Send welcome email
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Welcome 🎉",
      text: `Hello ${username}, your registration was successful!`,
    });

    res.json({ msg: "Signup successful & email sent" });
  } catch (error) {
    res.json({ msg: error.message });
  }
});

// Signin
app.post("/signin", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.json({ msg: "Incorrect password" });

    const token = jwt.sign({ username }, secretkey, { expiresIn: "1h" });

    res.json({
      msg: "Login successful",
      token,
    });
  } catch (error) {
    res.json({ msg: error.message });
  }
});

// ================== START SERVER ==================
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await connection();
});
