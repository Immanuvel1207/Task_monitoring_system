const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/Task-Monitor", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Task Schema with user reference
const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  completed: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deadline: { type: Date },
  category: { type: String, default: 'general' }
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Auth routes
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Create token
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET);
    res.json({ token, username: user.username });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Task routes (protected)
app.get('/tasks', authenticateToken, async (req, res) => {
  const tasks = await Task.find({ userId: req.user.id });
  res.json(tasks);
});

app.post('/tasks', authenticateToken, async (req, res) => {
  const newTask = new Task({
    name: req.body.name,
    deadline: req.body.deadline || null,
    category: req.body.category || 'general',
    userId: req.user.id,
    completed: false
  });
  await newTask.save();
  res.status(201).json(newTask);
});

app.put('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id, 
      {
        name: req.body.name,
        deadline: req.body.deadline,
        category: req.body.category,
        completed: req.body.completed
      },
      { new: true }
    );
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Error updating task' });
  }
});

app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  await Task.findByIdAndDelete(req.params.id);
  res.status(204).send();
});





// Utility function to get first day of current month
const getFirstDayOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Stats route
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Basic task counts
    const totalTasks = await Task.countDocuments({ userId });
    const completedTasks = await Task.countDocuments({ userId, completed: true });
    const pendingTasks = await Task.countDocuments({ userId, completed: false });
    
    // Count overdue tasks
    const overdueTasks = await Task.countDocuments({
      userId,
      completed: false,
      deadline: { $lt: now }
    });

    // Get upcoming tasks (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const upcoming = await Task.find({
      userId,
      completed: false,
      deadline: { 
        $gte: now,
        $lte: sevenDaysFromNow
      }
    }).sort({ deadline: 1 }).limit(5);

    // Category distribution
    const categoryDistribution = await Task.aggregate([
      {
        $match: { userId: mongoose.Types.ObjectId(userId) }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$completed', false] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      upcoming,
      categoryDistribution,
      completionRate: totalTasks ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0
    });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});