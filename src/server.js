require('dotenv').config();
import express from 'express';
import configViewEngine from './config/viewEngine';
import initRoutes from './routes/web';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import flash from 'connect-flash';
import methodOverride from 'method-override';
import passPort from 'passport';
import session from './config/session';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

let app = express();
app.use(methodOverride('_method'));
app.use(cookieParser('secret'));
app.use(flash());
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));

// Config CORS with multiple origins
const allowedOrigins = ['http://localhost:8080', 'http://192.168.1.8:8081'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true); // Allow access
      } else {
        callback(new Error('Not allowed by CORS')); // Deny access
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Handle CORS errors
app.use((err, req, res, next) => {
  if (err instanceof Error && err.message === 'Not allowed by CORS') {
    return res.status(403).json({error: 'CORS not allowed for this origin'});
  }
  next(err);
});

// Config rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 100, // Tối đa 100 yêu cầu mỗi IP trong 1 phút
  message: {
    error: 'Too many requests from this IP, please try again after 1 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Áp dụng rate limiting cho toàn bộ ứng dụng
app.use(limiter);

// Config session
session.configSession(app);

// Config view engine
configViewEngine(app);

// Config Passport.js
app.use(passPort.initialize());
app.use(passPort.session());

// Initialize routes
initRoutes(app);

// Start the server
let port = process.env.PORT || 8080;
app.listen(port, () =>
  console.log(`Doctors care app is running on port ${port}!`)
);
