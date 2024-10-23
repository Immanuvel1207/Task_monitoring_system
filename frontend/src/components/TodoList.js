// components/TodoList.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link} from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './TodoList.css';

const TodoList = () => {
  const [tasks, setTasks] = useState([]);
  const [task, setTask] = useState('');
  const [isEditing, setIsEditing] = useState(null);
  const navigate = useNavigate();
  const username = localStorage.getItem('username');

  const axiosInstance = axios.create({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });

  const fetchTasks = async () => {
    try {
      const response = await axiosInstance.get('http://localhost:5000/tasks');
      setTasks(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const [taskForm, setTaskForm] = useState({
    name: '',
    deadline: '',
    category: 'general'
  });

  const [editingTask, setEditingTask] = useState({
    id: null,
    name: '',
    deadline: '',
    category: 'general'
  });

  const editTask = (task) => {
    setEditingTask({
      id: task._id,
      name: task.name,
      deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
      category: task.category || 'general'
    });
  };

  // Update the addTask function
const addTask = async () => {
    if (taskForm.name.trim() === '') {
      toast.error('Please enter a task name!');
      return;
    }
    try {
      const response = await axiosInstance.post('http://localhost:5000/tasks', taskForm);
      setTasks([...tasks, response.data]);
      toast.success('Task added successfully!');
      setTaskForm({ name: '', deadline: '', category: 'general' });
    } catch (error) {
      toast.error('Failed to add task');
    }
  };
  const updateTask = async () => {
    if (editingTask.name.trim() === '') {
      toast.error('Please enter a task name!');
      return;
    }

    try {
      const response = await axiosInstance.put(
        `http://localhost:5000/tasks/${editingTask.id}`,
        {
          name: editingTask.name,
          deadline: editingTask.deadline || null,
          category: editingTask.category,
          completed: false
        }
      );
      
      setTasks(tasks.map(t => (t._id === editingTask.id ? response.data : t)));
      toast.success('Task updated successfully!');
      setEditingTask({ id: null, name: '', deadline: '', category: 'general' });
    } catch (error) {
      toast.error('Failed to update task');
    }
  };
  const deleteTask = async (id) => {
    try {
      await axiosInstance.delete(`http://localhost:5000/tasks/${id}`);
      setTasks(tasks.filter((t) => t._id !== id));
      toast.success('Task deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const toggleCompletion = async (id) => {
    try {
      const taskToUpdate = tasks.find(t => t._id === id);
      const response = await axiosInstance.put(`http://localhost:5000/tasks/${id}`, {
        ...taskToUpdate,
        completed: !taskToUpdate.completed
      });
      setTasks(tasks.map(t => (t._id === id ? response.data : t)));
      toast.success('Task status updated!');
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  return (
    <div className="todo-container">
      <div className="header">
        <h1>To-Do List</h1>
        <div className="user-info">
          <span>Welcome, {username}!</span><br/>
          <Link to="/dashboard">View Dashboard</Link><br/>
          <button onClick={handleLogout} className=" rounded" style={{borderRadius:'20px',color:"red",marginTop:'20px'}}>Logout</button>
        </div>
      </div>
      <div className="task-input-group">
      <input
        type="text"
        value={taskForm.name}
        onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
        placeholder="Enter a new task"
      />
      <input
        type="datetime-local"
        value={taskForm.deadline}
        onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
      />
      <select
        value={taskForm.category}
        onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
      >
        <option value="general">General</option>
        <option value="work">Work</option>
        <option value="personal">Personal</option>
        <option value="shopping">Shopping</option>
      </select>
      {isEditing ? (
        <button onClick={updateTask}>Update Task</button>
      ) : (
        <button onClick={addTask}>Add Task</button>
      )}
    </div>
      <ul className="task-list">
        {tasks.map((t) => (
          <li key={t._id} className={t.completed ? 'completed' : ''}>
            <span onClick={() => toggleCompletion(t._id)}>{t.name}</span>
            <div className="task-buttons">
              <button onClick={() => editTask(t._id)}>Edit</button>
              <button onClick={() => deleteTask(t._id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoList;