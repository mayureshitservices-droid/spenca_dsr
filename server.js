require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const connectDB = require('./config/database');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        touchAfter: 24 * 3600 // Lazy session update (24 hours)
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' // HTTPS only in production
    }
}));

// Routes
const authRoutes = require('./routes/auth');
const sysadminRoutes = require('./routes/sysadmin');
const salespersonRoutes = require('./routes/salesperson');

const ownerRoutes = require('./routes/owner');
const headofficeRoutes = require('./routes/headoffice');
const apiRoutes = require('./routes/api');
const telecrmRoutes = require('./routes/telecrm');

// Mount routes
app.use('/', authRoutes);
app.use('/sysadmin', sysadminRoutes);
app.use('/salesperson', salespersonRoutes);

app.use('/owner', ownerRoutes);
app.use('/headoffice', headofficeRoutes);
app.use('/api/telecrm', telecrmRoutes);
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).send('Something went wrong!');
});

// Start server
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 Sales Management Application                    ║
║                                                       ║
║   Server running on: http://localhost:${PORT}        ║
║   Environment: ${process.env.NODE_ENV || 'development'}                      ║
║                                                       ║
║   📝 To seed admin user, run: npm run seed           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
