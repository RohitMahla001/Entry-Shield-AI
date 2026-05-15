# 🛡️ EntryShield AI  
Smart gate security system with **real-time license plate recognition**, **automatic entry logging**, and **role-based access control** for monitoring vehicles and managing alerts.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-v14+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-local-green.svg)](https://www.mongodb.com)


## ✨ Features

- 📹 **Live Webcam Scanning** - Real-time plate recognition every 2 seconds
- 🚗 **Smart Entry Logging** - Auto-logs registered vehicles, alerts for unknown ones
- 👥 **Visitor Management** - Manual visitor entry with complete tracking
- 🚨 **Alert System** - Unknown vehicle detection with resolution tracking
- 🔐 **Role-Based Access** - Guard (full) and Admin (view-only) roles

## 🏗️ Tech Stack

**Frontend**: React 19.2 | **Backend**: Node.js + Express | **Database**: MongoDB (Local)

## 🚀 Quick Start

### Prerequisites
- Node.js v14+ | MongoDB | Webcam | Modern browser

### Windows (Recommended)
```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Double-click START.bat
# App opens at http://localhost:3000
```

### Manual Setup
```bash
# Terminal 1
mongod

# Terminal 2
cd server && npm install && npm run dev

# Terminal 3
npm install && npm start
```

## 🔓 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Guard | `guard@entryshield.com` | `guard123` |
| Admin | `admin@entryshield.com` | `admin123` |

**Guard** - Full access: scanning, visitor logging, alerts  
**Admin** - View-only: logs, alerts, analytics

## 📖 Usage

**For Guards:**
1. Log in with guard credentials
2. Click "Start Scanning" to open webcam
3. System auto-scans plates every 2 seconds
4. Registered vehicles → auto-logged (green)
5. Unknown vehicles → creates alert (red)
6. Resolve alerts or register visitors

**For Admins:**
1. Log in with admin credentials
2. View real-time dashboard and analytics
3. Monitor all alerts (read-only)
4. Access entry and visitor logs

## 🗄️ Database

**Collections**: Users, Vehicles, Entry Logs, Visitors, Alerts

MongoDB connection: `mongodb://127.0.0.1:27017/entryshield_ai`

## 🔌 API Endpoints

- `/api/users/login` - Authentication
- `/api/vehicles` - Register/manage vehicles
- `/api/logs` - Entry logs
- `/api/visitors` - Visitor records
- `/api/alerts` - Create/resolve alerts

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB won't connect | Ensure `mongod` is running |
| Webcam not working | Check browser permissions, try different browser |
| Port 5000 in use | Change port in `server/index.js` |
| Node modules error | Delete `node_modules` and `package-lock.json`, run `npm install` |

## 📚 Documentation

- [SETUP.md](SETUP.md) - Detailed setup instructions
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/name`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/name`)
5. Open a Pull Request

## 🎯 Roadmap

- Email/SMS alerts for critical events
- Machine learning threat detection
- Multi-camera support
- Mobile app (iOS/Android)
- Cloud deployment option
- Advanced analytics dashboard

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 👨‍💼 Support

- [Issues](https://github.com/RohitMahla001/Entry-Shield-AI/issues)
- [SETUP.md](SETUP.md)
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

**EntryShield AI** - Protecting Your Space, Smart. ❤️
