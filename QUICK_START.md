# 🚀 Quick Start Guide - Instagram Clone

Get your Instagram clone up and running in minutes!

## Prerequisites

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/)

## 🎯 One-Command Setup

```bash
# Clone and setup everything automatically
git clone <your-repo-url>
cd instagram-clone
npm run setup
```

## 📋 Manual Setup (Step by Step)

### 1. Install Dependencies
```bash
# Install all dependencies for backend and frontend
npm run install-all
```

### 2. Environment Configuration
```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit the .env file with your settings
nano backend/.env
```

### 3. Start MongoDB
```bash
# Start MongoDB service
mongod
```

### 4. Run the Application
```bash
# Start both backend and frontend
npm start
```

## 🌐 Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 👤 First User Setup

1. Open http://localhost:3000
2. Click "Register" to create your first account
3. Upload a profile picture
4. Start posting and exploring!

## 🔧 Available Scripts

```bash
npm start          # Start both backend and frontend
npm run backend    # Start only backend
npm run frontend   # Start only frontend
npm run build      # Build frontend for production
npm run clean      # Clean all node_modules
npm run setup      # Full setup (install + env)
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB if not running
mongod
```

### Port Already in Use
```bash
# Kill processes on ports 3000 and 5000
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
```

### Permission Issues
```bash
# Make startup script executable
chmod +x start.sh
```

## 📱 Features to Try

1. **Create Posts**: Upload images with captions
2. **Stories**: Share 24-hour stories with text overlays
3. **Direct Messages**: Real-time messaging with typing indicators
4. **Follow Users**: Build your social network
5. **Explore**: Discover trending content
6. **Notifications**: Get real-time updates

## 🔒 Security Notes

- Change the `JWT_SECRET` in your `.env` file
- Use strong passwords
- Enable HTTPS in production
- Set up proper MongoDB authentication

## 📞 Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Open an issue on GitHub
- Check the console for error messages

---

**Happy Instagramming! 📸✨**