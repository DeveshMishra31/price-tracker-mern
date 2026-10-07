import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import User from '../models/User.js';
import Otp from '../models/Otp.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pricehunter_jwt_secret_key_123';

// Initialize Resend HTTP client
const resend = new Resend(process.env.RESEND_API_KEY);

// --- 1. SEND OTP ROUTE ---
router.post('/send-otp', async (req, res) => {
  console.log('--- Incoming /send-otp request ---');
  console.log('Email received:', req.body.email);

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

    console.log('Attempting to send email via Resend API...');

    const { data, error } = await resend.emails.send({
      from: 'PriceHunter <onboarding@resend.dev>',
      to: [email],
      subject: 'PriceHunter - Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #2563eb; margin-bottom: 8px;">PriceHunter</h2>
          <p style="color: #475569; font-size: 14px;">Your verification code for registration is:</p>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1e293b; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #94a3b8; font-size: 12px;">This code will expire in 5 minutes.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ message: error.message || 'Failed to send OTP' });
    }

    console.log('Email sent successfully via Resend!', data);
    res.status(200).json({ message: 'OTP sent successfully to your email' });
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

    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    await Otp.deleteMany({ email });

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