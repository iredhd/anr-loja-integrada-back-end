const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const routes = require('./routes');
const authMiddleware = require('./middlewares/AuthMiddleware');

const key = require('../private.json');

admin.initializeApp({
  credential: admin.credential.cert(key),
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
});

const app = express();

app.use(cors());
app.use(authMiddleware);
app.use(express.json());
app.use(routes);

app.listen(80);
