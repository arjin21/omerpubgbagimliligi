# Instagram Clone - Full Stack Web Application

A complete Instagram-like web application built with modern web technologies, featuring all the core Instagram functionality including posts, stories, direct messaging, notifications, and more.

## 🚀 Features

### Core Features
- **User Authentication & Authorization**
  - User registration and login
  - JWT-based authentication
  - Password reset functionality
  - Email verification
  - Account deletion

- **Post Management**
  - Create, edit, and delete posts
  - Multiple image support with carousel
  - Add captions and locations
  - Like and unlike posts
  - Save posts to collections
  - Report inappropriate content
  - Share posts

- **Story Features**
  - Create and share stories
  - Text overlays with customizable colors and positions
  - Story viewer with progress bars
  - Story highlights
  - Story replies and reactions

- **Direct Messaging**
  - Real-time messaging with Socket.io
  - Message history
  - Typing indicators
  - Message reactions (likes)
  - Edit and delete messages
  - Conversation management

- **User Profiles**
  - Profile customization
  - Bio and website links
  - Profile picture upload
  - Follow/unfollow functionality
  - Block/unblock users
  - Privacy settings

- **Social Features**
  - Follow/unfollow users
  - Like and comment on posts
  - User search and suggestions
  - Activity feed
  - User recommendations

- **Notifications**
  - Real-time notifications
  - Like, comment, and follow notifications
  - Notification settings
  - Mark as read functionality

- **Explore & Search**
  - Discover trending posts
  - Hashtag search
  - Location-based search
  - User search
  - Explore feed

- **Privacy & Security**
  - Account privacy settings
  - Content visibility controls
  - Blocked users management
  - Report system

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **Socket.io** - Real-time communication
- **Multer** - File upload handling
- **bcryptjs** - Password hashing
- **Cloudinary** - Image storage (optional)

### Frontend
- **React** - UI library
- **Material-UI** - Component library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Socket.io Client** - Real-time communication
- **React Dropzone** - File upload
- **Moment.js** - Date handling

## 📁 Project Structure

```
instagram-clone/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Post.js
│   │   ├── Comment.js
│   │   ├── Story.js
│   │   ├── Message.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── posts.js
│   │   ├── comments.js
│   │   ├── stories.js
│   │   ├── messages.js
│   │   ├── notifications.js
│   │   └── explore.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── upload.js
│   ├── uploads/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   ├── PostCard.js
│   │   │   ├── StoriesBar.js
│   │   │   ├── CommentSection.js
│   │   │   ├── SuggestedUsers.js
│   │   │   ├── StoryViewer.js
│   │   │   ├── CreateStory.js
│   │   │   └── DirectMessage.js
│   │   ├── pages/
│   │   │   ├── Home.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Profile.js
│   │   │   ├── Explore.js
│   │   │   ├── Messages.js
│   │   │   ├── Notifications.js
│   │   │   ├── CreatePost.js
│   │   │   ├── PostDetail.js
│   │   │   └── Settings.js
│   │   ├── context/
│   │   │   ├── AuthContext.js
│   │   │   └── SocketContext.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd instagram-clone
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Setup**
   
   Create a `.env` file in the backend directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/instagram-clone
   JWT_SECRET=your_jwt_secret_here
   PORT=5000
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   ```

5. **Start MongoDB**
   ```bash
   mongod
   ```

6. **Run the backend server**
   ```bash
   cd backend
   npm run dev
   ```

7. **Run the frontend application**
   ```bash
   cd frontend
   npm start
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📱 Key Features in Detail

### User Authentication
- Secure registration with email validation
- JWT-based authentication with refresh tokens
- Password reset via email
- Account privacy controls

### Post Creation & Management
- Drag-and-drop image upload
- Multiple image support with carousel navigation
- Image cropping and filters
- Caption and location tagging
- Privacy settings (public/private)

### Story System
- 24-hour story lifespan
- Text overlays with customization
- Story highlights for permanent stories
- Story viewer with progress indicators
- Story reactions and replies

### Real-time Messaging
- Instant message delivery
- Typing indicators
- Message reactions
- Message editing and deletion
- Conversation management

### Social Features
- Follow/unfollow system
- Activity feed
- User recommendations
- Content discovery
- Hashtag and location search

### Notifications
- Real-time notification delivery
- Different notification types
- Notification preferences
- Mark as read functionality

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/follow/:id` - Follow user
- `DELETE /api/users/follow/:id` - Unfollow user
- `GET /api/users/suggested` - Get suggested users
- `GET /api/users/search` - Search users

### Posts
- `GET /api/posts/feed` - Get feed posts
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get post details
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like post
- `DELETE /api/posts/:id/like` - Unlike post
- `POST /api/posts/:id/save` - Save post

### Stories
- `GET /api/stories/feed` - Get stories feed
- `POST /api/stories` - Create story
- `GET /api/stories/:id` - Get story details
- `DELETE /api/stories/:id` - Delete story

### Messages
- `GET /api/messages/conversations` - Get conversations
- `GET /api/messages/:conversationId` - Get messages
- `POST /api/messages/:conversationId` - Send message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/settings` - Update settings

## 🎨 UI/UX Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Material Design** - Modern, clean interface
- **Dark/Light Mode** - Theme customization
- **Smooth Animations** - Enhanced user experience
- **Loading States** - Better user feedback
- **Error Handling** - Comprehensive error messages

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt encryption
- **Input Validation** - Server-side validation
- **Rate Limiting** - API protection
- **CORS Configuration** - Cross-origin security
- **File Upload Security** - Type and size validation

## 🚀 Deployment

### Backend Deployment (Heroku)
1. Create a Heroku account
2. Install Heroku CLI
3. Create a new Heroku app
4. Set environment variables
5. Deploy using Git

### Frontend Deployment (Netlify/Vercel)
1. Build the React app: `npm run build`
2. Deploy to Netlify or Vercel
3. Configure environment variables
4. Set up custom domain (optional)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Instagram for inspiration
- Material-UI for the component library
- MongoDB for the database
- Socket.io for real-time features

## 📞 Support

For support and questions, please open an issue in the GitHub repository or contact the development team.

---

**Note**: This is a demonstration project and should not be used for production without proper security audits and additional features like rate limiting, monitoring, and backup systems.