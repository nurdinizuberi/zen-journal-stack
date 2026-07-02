# JOURNAL-APP

A full-stack journaling and productivity application with AI-powered insights, habit tracking, goal management, and reading tracker.

## 🚀 Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Express.js + Prisma ORM + SQLite
- **AI**: Google Gemini API for journal insights
- **Auth**: JWT-based authentication with bcrypt

## ✨ Features

- 📝 **Journal Entries**: Rich text journaling with mood tracking, voice notes, and file attachments
- ✅ **Todo Management**: Task tracking with time spent and completion rates
- 🎯 **Goals Engine**: Set and track daily, weekly, monthly, and yearly goals
- 📚 **Reading Tracker**: Monitor your reading progress with page tracking
- 🔥 **Habit Matrix**: Build and maintain streaks for daily habits
- 📊 **Analytics Dashboard**: Visualize your productivity and mood patterns
- 🤖 **AI Insights**: Get personalized feedback on your journal entries (powered by Gemini)

## 🏃 Quick Start (Local Development)

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Backend Setup

```bash
cd zen-journal-stack/backend
npm install
npm run dev
```

The backend will start at `http://localhost:5000`

### Frontend Setup

```bash
cd zen-journal-stack/frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:3002`

### Environment Variables

Copy the example files and configure:

```bash
# Backend
cp zen-journal-stack/backend/.env.example zen-journal-stack/backend/.env

# Frontend
cp zen-journal-stack/frontend/.env.example zen-journal-stack/frontend/.env.local
```

Edit the `.env` files with your configuration.

## 🌐 Deployment

### Quick Deploy

We provide helper scripts to streamline deployment:

```bash
cd zen-journal-stack

# Check if everything is ready for deployment
./deploy-check.sh

# Interactive deployment helper
./quick-deploy.sh
```

### Manual Deployment

**Backend (Render):**
- Platform: [Render.com](https://render.com)
- Database: SQLite with persistent disk
- See: [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions

**Frontend (Vercel):**
- Platform: [Vercel.com](https://vercel.com)
- Framework: Next.js (auto-detected)
- See: [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions

### Full Deployment Guide

📖 **[Read the complete deployment guide](DEPLOYMENT.md)** for step-by-step instructions, troubleshooting, and best practices.

## 📁 Project Structure

```
JOURNAL-APP/
├── zen-journal-stack/
│   ├── backend/
│   │   ├── prisma/          # Database schema and migrations
│   │   ├── routes/          # API route handlers
│   │   ├── uploads/         # File upload storage
│   │   ├── index.js         # Main server file
│   │   ├── db.js            # Prisma client
│   │   ├── auth.js          # Authentication utilities
│   │   └── package.json
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── app/         # Next.js app directory
│   │   │   ├── components/  # React components
│   │   │   ├── features/    # Feature-based modules
│   │   │   ├── lib/         # API utilities
│   │   │   └── utils/       # Helper functions
│   │   └── package.json
│   ├── render.yaml          # Render deployment config
│   ├── deploy-check.sh      # Pre-deployment checker
│   └── quick-deploy.sh      # Deployment helper
├── DEPLOYMENT.md            # Comprehensive deployment guide
└── README.md
```

## 🔧 Available Scripts

### Backend

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npx prisma migrate dev` - Create and apply database migrations
- `npx prisma studio` - Open Prisma Studio (database GUI)

### Frontend

- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🔐 Environment Variables

### Backend (.env)

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key
CORS_ORIGIN=http://localhost:3002
PUBLIC_BASE_URL=http://localhost:5000
DATABASE_URL=file:./dev.db
GEMINI_API_KEY=your_api_key  # Optional
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 🧪 Testing the Application

1. **Sign Up**: Create a new account at `/`
2. **Create Journal Entry**: Add your first journal entry with mood
3. **Add Todo**: Create a task and track time spent
4. **Set Goals**: Define your daily/weekly/monthly goals
5. **Track Reading**: Add a book and update progress
6. **View Analytics**: Check your productivity dashboard
7. **AI Insights**: Get AI-powered feedback on your entries (requires Gemini API key)

## 🛠️ Database Schema

The app uses Prisma ORM with SQLite. Main models:

- **User**: Authentication and user data
- **JournalEntry**: Journal entries with attachments and voice notes
- **Todo**: Task management with time tracking
- **Goal**: Goal setting with timeframes
- **ReadingBook**: Book tracking with progress
- **Habit**: Habit tracking with streaks
- **HabitLog**: Daily habit completion logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the MIT License.

## 🐛 Troubleshooting

### Common Issues

**CORS Errors:**
- Ensure `CORS_ORIGIN` in backend matches your frontend URL exactly
- No trailing slashes in URLs

**Database Issues:**
- Run `npx prisma generate` after schema changes
- Run `npx prisma migrate dev` to apply migrations

**Build Failures:**
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (18+ required)

For more help, see [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section.

## 📞 Support

- 📖 [Deployment Guide](DEPLOYMENT.md)
- 🐛 Report issues via GitHub Issues
- 💬 Questions? Open a discussion

---

**Built with ❤️ for mindful productivity and self-reflection**
