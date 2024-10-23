import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import {
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Calendar, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const COLORS = {
  work: '#1abc9c',
  personal: '#3498db',
  shopping: '#e67e22',
  general: '#f39c12',
  completed: '#2ecc71',
  pending: '#f1c40f',
  overdue: '#e74c3c'
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [statsResponse, tasksResponse] = await Promise.all([
        fetch('https://task-monitoring-system.onrender.com/api/stats', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('https://task-monitoring-system.onrender.com/tasks', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const statsData = await statsResponse.json();
      const tasksData = await tasksResponse.json();
      setStats(statsData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const getOverdueTasks = () => {
    const today = new Date();
    return tasks.filter(task => !task.completed && task.deadline && new Date(task.deadline) < today);
  };

  const getCategoryTasks = (category) => tasks.filter(task => task.category === category);

  const renderTaskList = () => {
    let filteredTasks = tasks;
    if (selectedCategory !== 'all') {
      filteredTasks = selectedCategory === 'overdue' ? getOverdueTasks() : getCategoryTasks(selectedCategory);
    }

    return (
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-800">
          {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Tasks
        </h3>
        {filteredTasks.map(task => (
          <div key={task._id} className="p-4 bg-white rounded shadow-md flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              {task.completed ? (
                <CheckCircle size={20} className="text-green-500" />
              ) : (
                <XCircle size={20} className="text-red-500" />
              )}
              <span className={task.completed ? 'line-through text-gray-500' : 'text-gray-800'}>
                {task.name}
              </span>
            </div>
            {task.deadline && (
              <div className="text-sm text-gray-600 flex items-center">
                <Clock size={16} className="mr-2" />
                {new Date(task.deadline).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (!stats || !tasks.length) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  const categoryData = [
    { name: 'Work', value: getCategoryTasks('work').length },
    { name: 'Personal', value: getCategoryTasks('personal').length },
    { name: 'Shopping', value: getCategoryTasks('shopping').length },
    { name: 'General', value: getCategoryTasks('general').length }
  ];

  const overdueTasks = getOverdueTasks();

  return (
    <div className="p-6 space-y-8">
      {/* Dashboard Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-800">Task Dashboard</h1>
        <p className="text-gray-600">Comprehensive overview of your tasks</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: tasks.length, icon: <Calendar className="text-blue-500" size={24} /> },
          { label: 'Completed', value: tasks.filter(t => t.completed).length, icon: <CheckCircle className="text-green-500" size={24} /> },
          { label: 'Pending', value: tasks.filter(t => !t.completed).length, icon: <Clock className="text-yellow-500" size={24} /> },
          { label: 'Overdue', value: overdueTasks.length, icon: <AlertTriangle className="text-red-500" size={24} /> },
          {
            label: 'Completion Rate',
            value: `${((tasks.filter(t => t.completed).length / tasks.length) * 100).toFixed(1)}%`,
            icon: null
          }
        ].map((stat, index) => (
          <div key={index} className="p-4 bg-white rounded shadow-md flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-lg font-bold text-gray-800">{stat.value}</p>
            </div>
            {stat.icon}
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Category Distribution */}
        <div className="p-4 bg-white rounded shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Category Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="p-4 bg-white rounded shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Overdue Tasks Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={overdueTasks.map(task => ({ name: task.name, deadline: new Date(task.deadline).getTime() }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="deadline" stroke="#ff4d4d" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Task List */}
      {renderTaskList()}
    </div>
  );
}
