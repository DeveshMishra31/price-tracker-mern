import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Otp from '../models/Otp.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pricehunter_jwt_secret_key_123';

// Email Transporter Config
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// --- 1. SEND OTP ROUTE ---
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Pehle ka koi purana OTP ho to delete karein
    await Otp.deleteMany({ email });

    // Save new OTP
    await Otp.create({ email, otp });

    // Send Mail
    await transporter.sendMail({
      from: `"PriceHunter" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'PriceHunter - Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px;">
          <h2 style="color: #2563eb; margin-bottom: 8px;">PriceHunter</h2>
          <p style="color: #475569; font-size: 14px;">Your verification code for registration is:</p>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1e293b; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #94a3b8; font-size: 12px;">This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({ message: 'OTP sent successfully to your email' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP email. Please verify email credentials.' });
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