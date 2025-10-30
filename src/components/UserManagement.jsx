import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Calendar, 
  Shield, 
  User as UserIcon,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  UserMinus,
  UserPlus
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filteredDeletedUsers, setFilteredDeletedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    role: 'user',
    password: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, deletedUsers, searchTerm]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const [userList, deletedUserList] = await Promise.all([
        User.list(),
        User.listDeleted()
      ]);
      setUsers(userList);
      setDeletedUsers(deletedUserList);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    const filterFunction = (userList) => {
      if (!searchTerm) {
        return userList;
      } else {
        return userList.filter(user =>
          user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    };

    setFilteredUsers(filterFunction(users));
    setFilteredDeletedUsers(filterFunction(deletedUsers));
  };

  const handleCreateUser = async () => {
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setIsCreating(true);
    try {
      const result = await User.create(newUser);
      if (result.success) {
        setMessage({ type: 'success', text: 'User created successfully!' });
        setNewUser({ full_name: '', email: '', role: 'user', password: '' });
        setIsCreateDialogOpen(false);
        loadUsers(); // Reload users from the database
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to create user' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create user' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser.full_name || !editingUser.email) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    try {
      const result = await User.update(editingUser.id, editingUser);
      if (result.success) {
        setMessage({ type: 'success', text: 'User updated successfully!' });
        setIsEditDialogOpen(false);
        setEditingUser(null);
        loadUsers(); // Reload users from the database
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update user' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update user' });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const result = await User.delete(userId);
        if (result.success) {
          setMessage({ type: 'success', text: 'User deleted successfully!' });
          loadUsers(); // Reload users from the database
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to delete user' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to delete user' });
      }
    }
  };

  const handleRestoreUser = async (userId) => {
    if (window.confirm('Are you sure you want to restore this user?')) {
      try {
        const result = await User.restore(userId);
        if (result.success) {
          setMessage({ type: 'success', text: 'User restored successfully!' });
          loadUsers(); // Reload users from the database
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to restore user' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to restore user' });
      }
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'user':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'manager':
        return <UserIcon className="w-4 h-4" />;
      case 'user':
        return <UserIcon className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="text-slate-700 font-medium">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <style>
        {`
          .clay-shadow {
            box-shadow: 
              8px 8px 16px rgba(163, 177, 198, 0.15),
              -8px -8px 16px rgba(255, 255, 255, 0.7),
              inset 2px 2px 4px rgba(255, 255, 255, 0.2),
              inset -2px -2px 4px rgba(163, 177, 198, 0.1);
          }
          
          .clay-inset {
            box-shadow: 
              inset 6px 6px 12px rgba(163, 177, 198, 0.2),
              inset -6px -6px 12px rgba(255, 255, 255, 0.8);
          }
          
          .clay-button {
            box-shadow: 
              4px 4px 8px rgba(163, 177, 198, 0.2),
              -4px -4px 8px rgba(255, 255, 255, 0.8);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .clay-button:hover {
            box-shadow: 
              2px 2px 4px rgba(163, 177, 198, 0.25),
              -2px -2px 4px rgba(255, 255, 255, 0.9);
            transform: translate(1px, 1px);
          }
          
          .clay-button:active {
            box-shadow: 
              inset 2px 2px 4px rgba(163, 177, 198, 0.3),
              inset -2px -2px 4px rgba(255, 255, 255, 0.7);
            transform: translate(2px, 2px);
          }
        `}
      </style>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center clay-shadow">
            <Users className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-800">User Management</h3>
            <p className="text-slate-600 text-lg">Manage system users and their roles</p>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="clay-button bg-gradient-to-r from-green-200 to-green-300 text-green-800 border-none rounded-2xl px-6 py-3 font-semibold hover:from-green-300 hover:to-green-400 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="clay-shadow border-none rounded-3xl bg-gradient-to-br from-white/90 to-slate-50/70 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-green-700" />
                </div>
                Create New User
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Full Name</Label>
                <Input
                  id="full_name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="Enter full name"
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Enter email address"
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Enter temporary password"
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                />
                <p className="text-xs text-slate-500">User will be required to change this password on first login</p>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger className="clay-inset bg-white/60 border-none rounded-2xl h-12">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="clay-shadow border-none rounded-2xl">
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl px-6 py-3"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateUser}
                  disabled={isCreating}
                  className="clay-button bg-gradient-to-r from-green-200 to-green-300 text-green-800 border-none rounded-2xl px-6 py-3 font-semibold hover:from-green-300 hover:to-green-400 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search users by name, email, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-12 clay-inset bg-white/60 border-none rounded-2xl text-slate-700 placeholder:text-slate-400"
        />
      </div>

      {/* Message */}
      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="clay-shadow border-none rounded-2xl">
          {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription className="font-medium">{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Users Table with Tabs */}
      <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-6 pb-4">
              <TabsList className="clay-inset bg-gradient-to-r from-slate-100 to-slate-200 border-none rounded-2xl p-1">
                <TabsTrigger 
                  value="active" 
                  className="clay-button bg-gradient-to-r from-green-200 to-green-300 text-green-800 border-none rounded-xl px-6 py-2 font-semibold data-[state=active]:from-green-300 data-[state=active]:to-green-400 data-[state=active]:scale-105"
                >
                  Active Users ({filteredUsers.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="deleted" 
                  className="clay-button bg-gradient-to-r from-red-200 to-red-300 text-red-800 border-none rounded-xl px-6 py-2 font-semibold data-[state=active]:from-red-300 data-[state=active]:to-red-400 data-[state=active]:scale-105"
                >
                  Deleted Users ({filteredDeletedUsers.length})
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="active" className="mt-0">
              <Table>
            <TableHeader>
              <TableRow className="border-none">
                <TableHead className="text-slate-700 font-bold text-sm uppercase tracking-wider px-6 py-4">User</TableHead>
                <TableHead className="text-slate-700 font-bold text-sm uppercase tracking-wider px-6 py-4">Email</TableHead>
                <TableHead className="text-slate-700 font-bold text-sm uppercase tracking-wider px-6 py-4">Role</TableHead>
                <TableHead className="text-slate-700 font-bold text-sm uppercase tracking-wider px-6 py-4">Created</TableHead>
                <TableHead className="text-slate-700 font-bold text-sm uppercase tracking-wider px-6 py-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-none hover:bg-white/50 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center clay-shadow">
                        <UserIcon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{user.full_name}</div>
                        <div className="text-sm text-slate-500">ID: {user.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-700">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge className={`${getRoleColor(user.role)} flex items-center gap-2 w-fit px-3 py-1 rounded-xl font-medium`}>
                      {getRoleIcon(user.role)}
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-700">{formatDate(user.created_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        className="h-8 w-8 p-0 clay-button rounded-xl hover:bg-blue-100 hover:text-blue-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        className="h-8 w-8 p-0 clay-button rounded-xl text-red-600 hover:text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </TabsContent>
            
            <TabsContent value="deleted" className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-none">
                    <TableHead className="text-slate-700 font-bold text-sm uppercase tracking-wider px-6 py-4">User</TableHead>
                    <TableHead className="text-slate-700 font-bold text-sm uppercase tracking-wider px-6 py-4">Email</TableHead>
                    <TableHead className="text-slate-700 font-bold text-sm uppercase tracking-wider px-6 py-4">Role</TableHead>
                    <TableHead className="text-slate-700 font-bold text-sm uppercase tracking-wider px-6 py-4">Deleted</TableHead>
                    <TableHead className="text-slate-700 font-bold text-sm uppercase tracking-wider px-6 py-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeletedUsers.map((user) => (
                    <TableRow key={user.id} className="border-none hover:bg-white/50 transition-colors">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center clay-shadow">
                            <UserIcon className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{user.full_name}</div>
                            <div className="text-sm text-slate-500">ID: {user.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-700">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge className={`${getRoleColor(user.role)} border-none rounded-xl px-3 py-1 font-medium flex items-center gap-2 w-fit`}>
                          {getRoleIcon(user.role)}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-700">{formatDate(user.updated_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestoreUser(user.id)}
                            className="h-8 w-8 p-0 clay-button rounded-xl text-green-600 hover:text-green-700 hover:bg-green-100"
                            title="Restore User"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredDeletedUsers.length === 0 && (
                    <TableRow className="border-none">
                      <TableCell colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center clay-shadow">
                            <UserMinus className="w-8 h-8 text-slate-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-700">No deleted users</h3>
                            <p className="text-slate-500">Deleted users will appear here</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="clay-shadow border-none rounded-3xl bg-gradient-to-br from-white/90 to-slate-50/70 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                <Edit className="w-4 h-4 text-blue-700" />
              </div>
              Edit User
            </DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Full Name</Label>
                <Input
                  id="edit_full_name"
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Role</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                >
                  <SelectTrigger className="clay-inset bg-white/60 border-none rounded-2xl h-12">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="clay-shadow border-none rounded-2xl">
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl px-6 py-3"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateUser}
                  className="clay-button bg-gradient-to-r from-blue-200 to-blue-300 text-blue-800 border-none rounded-2xl px-6 py-3 font-semibold hover:from-blue-300 hover:to-blue-400"
                >
                  Update User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
