import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Clock, CheckCircle, AlertCircle, 
  UserPlus, ChevronRight, MoreVertical,
  Search, Download, FileSpreadsheet, FileText,
  ChevronLeft, ChevronRight as ChevronRightIcon 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import type { Task } from '../types/task';
import { taskService } from '../services/taskService';
import { useAuth } from '../contexts/AuthContext';
import { formatTasksForCSV, downloadCSV } from '../utils/exportUtils';
import { generateTaskReport } from '../utils/pdfGenerator';
import { userService, User } from '../services/userService';

export default function Tasks() {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'myTasks' | 'allTasks'>('myTasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(15);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [sortField, setSortField] = useState<keyof Task>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [users, setUsers] = useState<User[]>([]);

  // Pagination states for My Tasks view
  const [myTasksPage, setMyTasksPage] = useState({
    pending: 1,
    inProgress: 1,
    completed: 1
  });
  const [myTasksPerPage] = useState(6); // Number of tasks per page in each column
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const searchParams = useSearchParams()[0];

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  // Handle taskId from URL parameters (when navigating from dashboard)
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        // Clear the URL parameter after opening the modal
        window.history.replaceState({}, '', '/app/tasks');
      }
    }
  }, [tasks, searchParams]);

  // Reset pagination when switching tabs
  useEffect(() => {
    setMyTasksPage({
      pending: 1,
      inProgress: 1,
      completed: 1
    });
  }, [activeTab]);

  // Reset pagination when search query changes
  useEffect(() => {
    if (activeTab === 'myTasks') {
      setMyTasksPage({
        pending: 1,
        inProgress: 1,
        completed: 1
      });
    }
  }, [searchQuery, activeTab]);

  const fetchUsers = async () => {
    try {
      const response = await userService.getUsers();
      const activeUsers = response.users?.filter(user => user.status === 'Active') || [];
      setUsers(activeUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const fetchedTasks = await taskService.getTasks();
      setTasks(fetchedTasks);
      setError(null);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'status' | 'createdAt'>) => {
    try {
      console.log('Creating task with data:', taskData);
      setIsCreatingTask(true);
      await taskService.createTask(taskData);
      
      // Invalidate pending tasks query so dashboard updates immediately
      if (userData?.id) {
        queryClient.invalidateQueries({ queryKey: ['pendingTasks', userData.id] });
      }
      
      await fetchTasks();
      setIsNewTaskModalOpen(false);
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      console.log('Updating task with ID:', taskId, 'Updates:', updates);
      // If updating assignedUsers, set the assignedBy field to the current user's ID
      if (updates.assignedUsers && userData) {
        updates.assignedBy = userData.id;
        console.log('Setting assignedBy to current user:', userData.id);
      }
      await taskService.updateTask(taskId, updates);
      
      // Invalidate pending tasks query if status changed or assignedUsers changed
      if (userData?.id && (updates.status || updates.assignedUsers)) {
        queryClient.invalidateQueries({ queryKey: ['pendingTasks', userData.id] });
      }
      
      await fetchTasks();
      setSelectedTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleAcceptTask = async (taskId: string) => {
    try {
      await taskService.updateTask(taskId, { status: 'InProgress' });
      
      // Invalidate pending tasks query so dashboard updates immediately
      if (userData?.id) {
        queryClient.invalidateQueries({ queryKey: ['pendingTasks', userData.id] });
      }
      
      await fetchTasks();
      setSelectedTask(null);
    } catch (error) {
      console.error('Error accepting task:', error);
      setError('Failed to accept task');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      // Include the completer's name when completing the task
      const completedBy = userData?.name || user?.email?.split('@')[0] || 'Unknown User';
      await taskService.updateTask(taskId, { 
        status: 'Completed',
        completedBy 
      });
      
      // Invalidate pending tasks query so dashboard updates immediately
      if (userData?.id) {
        queryClient.invalidateQueries({ queryKey: ['pendingTasks', userData.id] });
      }
      
      await fetchTasks();
      setSelectedTask(null);
      toast.success('Task completed successfully');
    } catch (error) {
      console.error('Error completing task:', error);
      setError('Failed to complete task');
      toast.error('Failed to complete task');
    }
  };

  const handleSort = (field: keyof Task) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortArrow = ({ field }: { field: keyof Task }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const filteredAndSortedTasks = tasks
    .filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    
      const taskDate = new Date(task.dueDate);
      const isInDateRange = (!startDate || taskDate >= new Date(startDate)) &&
                         (!endDate || taskDate <= new Date(endDate));
    
      return matchesSearch && isInDateRange;
    })
    .sort((a, b) => {
      if (sortField === 'dueDate') {
        const dateA = new Date(a[sortField]);
        const dateB = new Date(b[sortField]);
        return sortDirection === 'asc' 
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }
      
      if (sortField === 'createdAt' || sortField === 'updatedAt' || sortField === 'acceptedAt' || sortField === 'completedAt') {
        const timestampA = a[sortField] as Timestamp | undefined;
        const timestampB = b[sortField] as Timestamp | undefined;
        
        // Handle undefined timestamps (for optional fields)
        if (!timestampA && !timestampB) return 0;
        if (!timestampA) return sortDirection === 'asc' ? -1 : 1;
        if (!timestampB) return sortDirection === 'asc' ? 1 : -1;
        
        const timeA = timestampA.toDate().getTime();
        const timeB = timestampB.toDate().getTime();
        
        return sortDirection === 'asc' 
          ? timeA - timeB
          : timeB - timeA;
      }
      
      if (sortField === 'assignedUsers') {
        const nameA = a.assignedUsers[0]?.name || '';
        const nameB = b.assignedUsers[0]?.name || '';
        return sortDirection === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }

      if (sortField === 'assignedBy') {
        const assignerA = users.find(u => u.id === a.assignedBy)?.name || '';
        const assignerB = users.find(u => u.id === b.assignedBy)?.name || '';
        return sortDirection === 'asc'
          ? assignerA.localeCompare(assignerB)
          : assignerB.localeCompare(assignerA);
      }

      const valueA = String(a[sortField]);
      const valueB = String(b[sortField]);
      return sortDirection === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    });

  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = filteredAndSortedTasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(filteredAndSortedTasks.length / tasksPerPage);

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setExportModalOpen(false);
      
      // Get tasks for selected date range or all tasks if no range selected
      const tasks = await taskService.getTasks(startDate, endDate);
      
      if (format === 'excel') {
        // Format and download as CSV
        const csvData = formatTasksForCSV(tasks);
        const filename = `tasks_${startDate || 'all'}_${endDate || ''}.csv`;
        downloadCSV(csvData, filename);
      } else {
        // Generate and download PDF
        const pdfDoc = generateTaskReport(tasks, startDate, endDate);
        pdfDoc.save(`tasks_${startDate || 'all'}_${endDate || ''}.pdf`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    }
  };

  // Get current user from auth context
  const { user, userData } = useAuth();

  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  
  // Debug logging
  console.log('Fetched users:', users);
  console.log('Current user:', user);
  console.log('User data:', userData);
  console.log('All tasks with assignedBy values:', tasks.map(task => ({
    id: task.id,
    title: task.title,
    assignedBy: task.assignedBy,
    matchingUser: users.find(u => u.id === task.assignedBy)
  })));
  
  const myTasks = tasks.filter(task => {
    const isAssigned = task.assignedUsers.some(u => {
      console.log('Task assigned user:', u);
      return u.id === userData?.id; // Use database user ID instead of auth uid
    });
    const isCreator = task.createdBy === userData?.id; // Use database user ID
    console.log(`Task ${task.id}: assigned=${isAssigned}, created=${isCreator}`);
    return isAssigned || isCreator;
  });

  // Apply search filter to myTasks for My Tasks view
  const filteredMyTasks = activeTab === 'myTasks' && searchQuery
    ? myTasks.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : myTasks;
  
  const pendingTasks = activeTab === 'myTasks' 
    ? filteredMyTasks.filter(task => task.status === 'Pending')
    : filteredAndSortedTasks.filter(task => task.status === 'Pending');
    
  const inProgressTasks = activeTab === 'myTasks'
    ? filteredMyTasks.filter(task => task.status === 'InProgress')
    : filteredAndSortedTasks.filter(task => task.status === 'InProgress');
    
  const completedTasks = activeTab === 'myTasks'
    ? filteredMyTasks.filter(task => task.status === 'Completed')
    : filteredAndSortedTasks.filter(task => task.status === 'Completed');

  // Pagination logic for My Tasks view
  const getPaginatedTasks = (tasks: Task[], status: 'pending' | 'inProgress' | 'completed') => {
    if (activeTab !== 'myTasks') return tasks;
    
    const currentPage = myTasksPage[status];
    const startIndex = (currentPage - 1) * myTasksPerPage;
    const endIndex = startIndex + myTasksPerPage;
    return tasks.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalTasks: number) => {
    return Math.ceil(totalTasks / myTasksPerPage);
  };

  const paginatedPendingTasks = getPaginatedTasks(pendingTasks, 'pending');
  const paginatedInProgressTasks = getPaginatedTasks(inProgressTasks, 'inProgress');
  const paginatedCompletedTasks = getPaginatedTasks(completedTasks, 'completed');

  const handlePageChange = (status: 'pending' | 'inProgress' | 'completed', newPage: number) => {
    setMyTasksPage(prev => ({
      ...prev,
      [status]: newPage
    }));
  };

  const stats = [
    { 
      label: 'Total Tasks', 
      value: tasks.length, 
      trend: 'Active tasks',
      icon: ClipboardList,
      color: 'blue'
    },
    { 
      label: 'Pending', 
      value: pendingTasks.length, 
      trend: 'Awaiting action',
      icon: Clock,
      color: 'yellow'
    },
    { 
      label: 'In Progress', 
      value: inProgressTasks.length, 
      trend: 'Being worked on',
      icon: AlertCircle,
      color: 'purple'
    },
    { 
      label: 'Completed', 
      value: completedTasks.length, 
      trend: 'This week',
      icon: CheckCircle,
      color: 'green'
    }
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Tasks</h1>
            <p className="text-secondary-600">Manage and track team tasks</p>
          </div>
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            disabled={isCreatingTask}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
              isCreatingTask
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {isCreatingTask ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Assign Task</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map(({ label, value, trend, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 bg-${color}-50 rounded-lg`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <span className="text-secondary-600">{label}</span>
              </div>
              <p className="text-2xl font-semibold text-secondary-900">{value}</p>
              <p className="text-xs text-secondary-500 mt-1">{trend}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('myTasks')}
              className={`${
                activeTab === 'myTasks'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setActiveTab('allTasks')}
              className={`${
                activeTab === 'allTasks'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              All Tasks
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'myTasks' ? (
          <div className="space-y-6">
            {/* Search for My Tasks */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  placeholder="Search my tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>

            {/* My Tasks View - Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pending Tasks */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-secondary-900">Pending</h2>
                    <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm">
                      {pendingTasks.length}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {paginatedPendingTasks.length > 0 ? (
                    paginatedPendingTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onClick={() => setSelectedTask(task)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No pending tasks</p>
                    </div>
                  )}
                </div>
                {/* Pagination for Pending Tasks */}
                {pendingTasks.length > myTasksPerPage && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between border-t pt-4">
                      <button
                        onClick={() => handlePageChange('pending', myTasksPage.pending - 1)}
                        disabled={myTasksPage.pending === 1}
                        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        {myTasksPage.pending} of {getTotalPages(pendingTasks.length)}
                      </span>
                      <button
                        onClick={() => handlePageChange('pending', myTasksPage.pending + 1)}
                        disabled={myTasksPage.pending >= getTotalPages(pendingTasks.length)}
                        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRightIcon className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* In Progress Tasks */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-secondary-900">In Progress</h2>
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                      {inProgressTasks.length}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {paginatedInProgressTasks.length > 0 ? (
                    paginatedInProgressTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onClick={() => setSelectedTask(task)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No tasks in progress</p>
                    </div>
                  )}
                </div>
                {/* Pagination for In Progress Tasks */}
                {inProgressTasks.length > myTasksPerPage && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between border-t pt-4">
                      <button
                        onClick={() => handlePageChange('inProgress', myTasksPage.inProgress - 1)}
                        disabled={myTasksPage.inProgress === 1}
                        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        {myTasksPage.inProgress} of {getTotalPages(inProgressTasks.length)}
                      </span>
                      <button
                        onClick={() => handlePageChange('inProgress', myTasksPage.inProgress + 1)}
                        disabled={myTasksPage.inProgress >= getTotalPages(inProgressTasks.length)}
                        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRightIcon className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Completed Tasks */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-secondary-900">Completed</h2>
                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                      {completedTasks.length}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {paginatedCompletedTasks.length > 0 ? (
                    paginatedCompletedTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onClick={() => setSelectedTask(task)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No completed tasks</p>
                    </div>
                  )}
                </div>
                {/* Pagination for Completed Tasks */}
                {completedTasks.length > myTasksPerPage && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between border-t pt-4">
                      <button
                        onClick={() => handlePageChange('completed', myTasksPage.completed - 1)}
                        disabled={myTasksPage.completed === 1}
                        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        {myTasksPage.completed} of {getTotalPages(completedTasks.length)}
                      </span>
                      <button
                        onClick={() => handlePageChange('completed', myTasksPage.completed + 1)}
                        disabled={myTasksPage.completed >= getTotalPages(completedTasks.length)}
                        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRightIcon className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // All Tasks View - Table
          <div className="space-y-4">
            {/* Filters and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-lg border border-gray-200">
              {/* Search */}
              <div className="relative w-full sm:w-96">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>

              {/* Date Range */}
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              {/* Export Button */}
              <button
                onClick={() => setExportModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>

            {/* Tasks Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('title')}
                    >
                      Task
                      <SortArrow field="title" />
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('assignedUsers')}
                    >
                      Assigned To
                      <SortArrow field="assignedUsers" />
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('assignedBy')}
                    >
                      Created By
                      <SortArrow field="assignedBy" />
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      <SortArrow field="status" />
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('priority')}
                    >
                      Priority
                      <SortArrow field="priority" />
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('dueDate')}
                    >
                      Due Date
                      <SortArrow field="dueDate" />
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentTasks.map((task) => (
                    <tr 
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {task.title}
                          {task.attachments && task.attachments.length > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              📎 {task.attachments.length}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{task.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        {task.assignedUsers.length > 0 && (
                          <div className="flex items-center">
                            <span className="text-sm text-gray-900">
                              {task.assignedUsers[0].name}
                              {task.assignedUsers.length > 1 && ` +${task.assignedUsers.length - 1}`}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {(() => {
                            // Now we directly display the assignedBy value which should be the user's name
                            const assignedBy = task.assignedBy;
                            console.log(`Rendering assignedBy for task ${task.id}:`, {
                              taskTitle: task.title,
                              assignedBy: assignedBy
                            });
                            
                            // If assignedBy is already a name (string), just display it
                            if (typeof assignedBy === 'string') {
                              return assignedBy;
                            }
                            
                            // If it's still an ID, try to find the user (for backward compatibility)
                            const assigner = users.find(u => u.id === assignedBy);
                            
                            if (assigner) {
                              console.log(`Found matching user: ${assigner.name} (ID: ${assigner.id})`);
                              return assigner.name;
                            } else {
                              console.log(`User with ID ${assignedBy} not found in local cache. Will display ID.`);
                              return assignedBy || 'Unknown';
                            }
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          task.status === 'InProgress' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.priority === 'High' ? 'bg-red-100 text-red-800' :
                          task.priority === 'Normal' ? 'bg-yellow-100 text-yellow-800' :
                          task.priority === 'Urgent' ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button className="text-primary-600 hover:text-primary-900">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstTask + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(indexOfLastTask, filteredAndSortedTasks.length)}
                      </span>{' '}
                      of <span className="font-medium">{filteredAndSortedTasks.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      {/* Page Numbers */}
                      {[...Array(totalPages)].map((_, idx) => (
                        <button
                          key={idx + 1}
                          onClick={() => setCurrentPage(idx + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === idx + 1
                              ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task Detail Modal */}
        {selectedTask && (
          <TaskDetailModal
            isOpen={!!selectedTask}
            onClose={() => setSelectedTask(null)}
            task={selectedTask}
            onAccept={() => handleAcceptTask(selectedTask.id)}
            onComplete={() => handleCompleteTask(selectedTask.id)}
            onUpdate={(updates) => handleUpdateTask(selectedTask.id, updates)}
          />
        )}

        {/* New Task Modal */}
        {isNewTaskModalOpen && (
          <TaskDetailModal
            isOpen={isNewTaskModalOpen}
            onClose={() => setIsNewTaskModalOpen(false)}
            isNewTask
            onSubmit={handleCreateTask}
          />
        )}

        {/* Export Modal */}
        {exportModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Export Tasks</h3>
              <div className="space-y-4">
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export as Excel</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <FileText className="w-4 h-4" />
                  <span>Export as PDF</span>
                </button>
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Toast Notifications */}
      <Toaster position="top-right" />
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const priorityColors = {
    High: 'bg-red-50 text-red-700',
    Normal: 'bg-yellow-50 text-yellow-700',
    Low: 'bg-blue-50 text-blue-700',
    Urgent: 'bg-purple-50 text-purple-700'
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-secondary-900">{task.title}</h3>
            {task.attachments && task.attachments.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                📎 {task.attachments.length}
              </span>
            )}
          </div>
          <p className="text-sm text-secondary-500 mt-1 line-clamp-2">
            {task.description}
          </p>
        </div>
        <button className="p-1 hover:bg-gray-100 rounded">
          <MoreVertical className="w-4 h-4 text-secondary-400" />
        </button>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        {task.assignedUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary-500">
              {task.assignedUsers[0].name}
              {task.assignedUsers.length > 1 && ` +${task.assignedUsers.length - 1}`}
            </span>
          </div>
        )}
        <span className={`px-2 py-1 text-xs rounded-full ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
      </div>
      
      <div className="mt-3 flex items-center justify-between text-xs text-secondary-500">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>Due {task.dueDate}</span>
        </div>
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
}
