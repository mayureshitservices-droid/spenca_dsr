# Sales Management Web Application

A comprehensive mobile-first sales management system with role-based dashboards, GPS tracking, and real-time analytics.

## Features

- 🔐 **Role-based Authentication** (Sysadmin, Sales Head, Owner, Salesperson)
- 📱 **Mobile-first Design** with FAB navigation
- 📍 **GPS Location Tracking** for orders
- 📊 **Interactive Charts** with Chart.js
- 🔍 **Smart Autocomplete** for customers and products
- ✅ **Order Approval Workflow**
- 🎨 **Modern UI** with Bootstrap 5

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Template Engine**: EJS
- **Authentication**: bcrypt, express-session
- **File Upload**: Multer
- **Charts**: Chart.js
- **Styling**: Bootstrap 5, Custom CSS

## Installation

### 1. Clone the repository
```bash
cd d:/spenca/dsr
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sales_management
SESSION_SECRET=your-secret-key-here-change-this-in-production
PORT=3000
NODE_ENV=development
```

**Important**: Replace the MongoDB URI with your actual MongoDB Atlas connection string.

### 4. Seed the admin user
```bash
npm run seed
```

Default admin credentials:
- **Email**: admin@example.com
- **Password**: Admin@123

⚠️ **Change these credentials immediately after first login!**

### 5. Start the server
```bash
npm start
```

Or for development:
```bash
npm run dev
```

The application will be available at: `http://localhost:3000`

## User Roles & Dashboards

### 1. System Administrator (sysadmin)
- Create and manage users
- Create and manage products
- Toggle user active status
- Upload product photos

### 2. Salesperson
- Create orders with GPS tracking
- Customer autocomplete with auto-fill
- Dynamic product selection
- View order history

### 3. Sales Head
- Review pending orders
- Approve/reject orders
- View all orders
- Monitor salesperson activity

### 4. Owner
- View analytics dashboard
- Total orders visualization
- Salesperson-wise sales
- Date-wise sales trends
- Interactive Chart.js charts

## GPS Requirements

- **Development**: Works on `localhost` without HTTPS
- **Production**: Requires HTTPS for geolocation API
- GPS accuracy is validated before order submission

## Project Structure

```
d:/spenca/dsr/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/             # Route controllers
├── middleware/              # Auth & role check
├── models/                  # Mongoose schemas
├── public/
│   ├── css/                # Styles
│   ├── js/                 # Client-side scripts
│   └── uploads/            # Product photos
├── routes/                  # Express routes
├── utils/                   # Validators & seed script
├── views/                   # EJS templates
├── .env                     # Environment variables
├── .gitignore
├── package.json
└── server.js               # Main application
```

## Security Features

- ✅ Password hashing with bcrypt
- ✅ Session-based authentication
- ✅ Role-based access control
- ✅ GPS validation
- ✅ Input sanitization
- ✅ Duplicate submission prevention

## Mobile-First Features

- 📱 Responsive design for all screen sizes
- 🎯 FAB (Floating Action Button) navigation
- 👆 Touch-optimized controls (48px minimum)
- 🎨 Smooth animations and transitions
- 📊 Responsive charts

## API Endpoints

### Authentication
- `GET /login` - Login page
- `POST /login` - Authenticate user
- `GET /logout` - Logout

### Sysadmin
- `GET /sysadmin/users` - User management
- `POST /sysadmin/users/create` - Create user
- `GET /sysadmin/products` - Product management
- `POST /sysadmin/products/create` - Create product

### Salesperson
- `GET /salesperson/create-order` - Order form
- `POST /salesperson/orders/create` - Submit order
- `GET /api/customers/search` - Customer autocomplete
- `GET /api/products/search` - Product autocomplete

### Sales Head
- `GET /sales-head/dashboard` - Pending orders
- `POST /sales-head/orders/:id/approve` - Approve order
- `POST /sales-head/orders/:id/reject` - Reject order

### Owner
- `GET /owner/dashboard` - Analytics dashboard
- `GET /api/owner/stats/total-orders` - Order stats
- `GET /api/owner/stats/salesperson-sales` - Sales by person
- `GET /api/owner/stats/date-wise-sales` - Sales trends

## Contributing

1. Ensure MongoDB Atlas is properly configured
2. Test all role-based access controls
3. Verify GPS functionality on mobile devices
4. Check responsive design on various screen sizes

## License

ISC

## Support

For issues or questions, contact your system administrator.
