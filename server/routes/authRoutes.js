import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Otp from '../models/Otp.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pricehunter_jwt_secret_key_123';

// Email Transporter Config
// Email Transporter Config (IPv4 forced on Port 587)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // port 587 ke sath false rehta hai
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4, // Force IPv4 (ye ENETUNREACH IPv6 issue ko fix karta hai)
  tls: {
    rejectUnauthorized: false,
  },
});

// --- 1. SEND OTP ROUTE ---
router.post('/send-otp', async (req, res) => {
  console.log('--- Incoming /send-otp request ---');
  console.log('Email received:', req.body.email);
  console.log('EMAIL_USER configured:', process.env.EMAIL_USER ? 'YES' : 'NO');
  console.log('EMAIL_PASS configured:', process.env.EMAIL_PASS ? 'YES' : 'NO');

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email });
    await Otp.create({ email, otp });

    console.log('Attempting to send email via nodemailer...');

    await transporter.sendMail({
      from: `"PriceHunter" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'PriceHunter - Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>PriceHunter Verification Code</h2>
          <p>Your OTP is: <strong>${otp}</strong></p>
          <p>Valid for 5 minutes.</p>
        </div>
      `,
    });

    console.log('Email sent successfully!');
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('--- DETAILED SEND OTP ERROR ---', error);
    res.status(500).json({ message: error.message || 'Failed to send OTP' });
  }
});

// --- 2. VERIFY OTP & COMPLETE REGISTRATION ---
router.post('/verify-otp-register', async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;

    if (!name || !email || !password || !otp) {
      return res.status(400).json({ message: 'All fields including OTP are required' });
    }

    // Check OTP validity
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Password encryption using bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user to database
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Delete used OTP
    await Otp.deleteMany({ email });

    // JWT token generation
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account verified & created successfully',
      token,
      name: newUser.name,
      email: newUser.email,
    });
  } catch (error) {
    console.error('Verify OTP register error:', error);
    res.status(500).json({ message: 'Server error during registration verification' });
  }
});

// --- 3. LOG IN ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

export default router;