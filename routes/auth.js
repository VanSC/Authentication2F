const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const twilio = require('twilio');

const router = express.Router();
const accountSid = 'AC24def47688f9ed8d238cde02f499853c';
const authToken = '946decdbb034ffc2229b16411e318fb1';
const client = new twilio(accountSid, authToken);
const twilioPhoneNumber = '+14155285212';

// Genera un código aleatorio de 6 dígitos
const generateRandomCode = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

// Almacena temporalmente el código en memoria
const userCodes = {};

router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const user = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPassword,
    });

    await user.save();
    res.redirect('/auth/login');
  } catch (error) {
    res.status(500).send('Error al registrar usuario');
  }
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (user) {
    // Genera y almacena el código en memoria
    const code = generateRandomCode();
    userCodes[user._id] = code;

    // Envía el código por SMS
    client.messages.create({
      body: `Tu código de autenticación es: ${code}`,
      from: twilioPhoneNumber,
      to: user.phone,
    });

    res.render('verify', { userId: user._id });
  } else {
    res.redirect('/auth/login');
  }
});

router.post('/verify', async (req, res) => {
  const userId = req.body.userId;
  const user = await User.findById(userId);

  if (user && req.body.code == userCodes[userId]) {
    // Limpia el código almacenado en memoria
    delete userCodes[userId];
    
    // Renderiza la vista success.ejs
    return res.render('success');
  }

  // Si la verificación falla, renderiza la vista login.ejs con un mensaje de error
  res.render('login', { error: 'Código incorrecto. Intenta nuevamente.' });
});

module.exports = router;
