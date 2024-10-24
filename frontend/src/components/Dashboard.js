import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { Calendar, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const COLORS = ['#2ecc71', '#e74c3c', '#3498db', '#f1c40f', '#9b59b6'];
const CATEGORY_COLORS = {
  work: '#1abc9c',
  personal: '#3498db',
  shopping: '#e67e22',
  general: '#f39c12'
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
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

  // Prepare completion status data for pie chart
  const prepareCompletionData = () => {
    const completed = tasks.filter(task => task.completed).length;
    const total = tasks.length;
    
    return [
      { name: 'Completed', value: completed },
      { name: 'Pending', value: total - completed }
    ];
  };

  // Prepare category distribution data
  const prepareCategoryData = () => {
    const categoryCount = tasks.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categoryCount).map(([category, count]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: count
    }));
  };

  // Prepare daily completion data
  const prepareDailyCompletionData = () => {
    // Create a map of the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    // Count completions per day
    const completionsPerDay = tasks.reduce((acc, task) => {
      if (task.completed && task.updatedAt) {
        const date = new Date(task.updatedAt).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {});

    // Create final dataset with all days
    return last7Days.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      completed: completionsPerDay[date] || 0
    }));
  };

  // Prepare data for pie chart of completed tasks by category
  const prepareCompletedTasksByCategoryData = () => {
    const categoryCompletion = tasks.reduce((acc, task) => {
      if (task.completed) {
        acc[task.category] = (acc[task.category] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(categoryCompletion).map(([category, count]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: count
    }));
  };

  // Group tasks by category for display
  const groupTasksByCategory = () => {
    return tasks.reduce((acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    }, {});
  };

  if (!stats || !tasks.length) {
    return <div>Loading...</div>;
  }

  const groupedTasks = groupTasksByCategory();

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>
      
      <div className="chart-container">
        {/* Pie chart for task completion */}
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={prepareCompletionData()}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label
            >
              {prepareCompletionData().map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>

        {/* Bar chart for task category distribution */}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={prepareCategoryData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8">
              {prepareCategoryData().map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name.toLowerCase()]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Task List by Category */}
      <div className="tasks-category-container">
        <h3>Tasks by Category</h3>
        {Object.entries(groupedTasks).map(([category, tasks]) => (
          <div key={category}>
            <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
            <ul>
              {tasks.map((task) => (
                <li key={task.id}>
                  {task.title} - {task.completed ? (
                    <CheckCircle color="green" /> 
                  ) : (
                    <AlertTriangle color="red" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Pie chart for completed tasks by category */}
      <div className="completed-category-chart">
        <h3>Completed Tasks by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={prepareCompletedTasksByCategoryData()}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label
            >
              {prepareCompletedTasksByCategoryData().map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name.toLowerCase()]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Daily completion trend */}
      <div className="completion-trend">
        <h3>Daily Completion Trend (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={prepareDailyCompletionData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="completed" fill="#2ecc71" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
