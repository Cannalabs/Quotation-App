
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { CONFIG } from "@/config/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  UserCircle, 
  Save, 
  Upload, 
  Check, 
  AlertCircle, 
  LogOut,
  Lock,
  Mail,
  User as UserIcon,
  Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function MyAccount() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
    profile_picture_url: ""
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      setProfileData({
        full_name: user.full_name || "",
        email: user.email || "",
        profile_picture_url: user.profile_picture_url || ""
      });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to load user data" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      await User.updateMyUserData({
        full_name: profileData.full_name,
        profile_picture_url: profileData.profile_picture_url
      });
      
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      await loadUserData(); // Reload user data
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update profile" });
    } finally {
      setIsSaving(false);
    }
  };


  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setMessage({ type: "error", text: "Please select an image file (PNG, JPG)" });
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "File size must be less than 2MB" });
      return;
    }

    setIsUploading(true);
    setMessage({ type: "", text: "" });

    try {
      // Upload file using the Core integration
      const result = await UploadFile({ file });
      
      if (result && result.file_url) {
        // Update profile data with new image URL
        const newProfilePictureUrl = result.file_url;
        setProfileData(prev => ({ 
          ...prev, 
          profile_picture_url: newProfilePictureUrl
        }));

        // Save to backend immediately
        await User.updateMyUserData({
          profile_picture_url: newProfilePictureUrl
        });

        setMessage({ type: "success", text: "Profile picture uploaded and saved successfully!" });
        
        // Reload user data to ensure consistency
        await loadUserData();
        
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        throw new Error("Upload failed - no file URL returned");
      }
    } catch (error) {
      console.error("Profile picture upload error:", error);
      setMessage({ type: "error", text: "Failed to upload profile picture. Please try again." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      setMessage({ type: "error", text: "Please fill in all password fields" });
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (passwordData.new_password.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters long" });
      return;
    }

    setIsChangingPassword(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/${currentUser.id}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Password updated successfully!" });
        setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
        setShowPasswordForm(false);
      } else {
        const errorData = await response.json();
        setMessage({ type: "error", text: errorData.detail || "Failed to update password" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update password" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      setMessage({ type: "", text: "" });
      await logout();
      setMessage({ type: "success", text: "Logged out successfully!" });
      // The ProtectedRoute will automatically redirect to login when isAuthenticated becomes false
    } catch (error) {
      console.error("Logout error:", error);
      setMessage({ type: "error", text: "Failed to logout. Please try again." });
    }
  };

  const getRoleColor = (role) => {
    return role === 'admin' 
      ? "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700"
      : "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700";
  };

  const getRoleIcon = (role) => {
    return role === 'admin' ? Shield : UserIcon;
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded-2xl w-64"></div>
            <div className="h-96 bg-slate-200 rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const RoleIcon = getRoleIcon(currentUser?.role);

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">My Account</h1>
            <p className="text-slate-600 text-lg">Manage your profile and account settings</p>
          </div>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            className="clay-button bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-none rounded-2xl hover:from-red-200 hover:to-red-300"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>
        </div>

        {/* Messages */}
        {message.text && (
          <Alert variant={message.type === "error" ? "destructive" : "default"} className="clay-shadow border-none rounded-2xl">
            {message.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription className="font-medium">{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Profile Card */}
        <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-purple-700" />
              </div>
              Profile Information
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Profile Picture Section */}
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 clay-shadow rounded-3xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                {profileData.profile_picture_url ? (
                  <img 
                    src={profileData.profile_picture_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-12 h-12 text-slate-400" />
                )}
              </div>
              
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  id="profile-upload"
                />
                <Button
                    asChild
                    variant="outline"
                    className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl cursor-pointer"
                    disabled={isUploading}
                  >
                  <label htmlFor="profile-upload">
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Change Picture"}
                  </label>
                </Button>
                <p className="text-xs text-slate-500">PNG, JPG up to 2MB</p>
              </div>
            </div>

            {/* User Info Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Full Name</Label>
                <Input
                  value={profileData.full_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Email Address</Label>
                <div className="clay-inset bg-slate-100/60 p-3 rounded-2xl flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-700">{currentUser?.email}</span>
                </div>
                <p className="text-xs text-slate-500">Email cannot be changed</p>
              </div>
            </div>

            {/* Role Display */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Role</Label>
              <div className="flex items-center gap-3">
                <Badge className={`${getRoleColor(currentUser?.role)} border-none rounded-full px-4 py-2 clay-shadow flex items-center gap-2`}>
                  <RoleIcon className="w-4 h-4" />
                  {currentUser?.role?.charAt(0).toUpperCase() + currentUser?.role?.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Save Profile Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="clay-button bg-gradient-to-r from-purple-200 to-purple-300 text-purple-800 border-none rounded-2xl px-8 py-3 font-semibold hover:from-purple-300 hover:to-purple-400"
              >
                <Save className="w-5 h-5 mr-2" />
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                <Lock className="w-5 h-5 text-orange-700" />
              </div>
              Password & Security
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {!showPasswordForm ? (
              <div className="flex items-center justify-between p-4 clay-inset bg-orange-50/50 rounded-2xl">
                <div>
                  <h4 className="font-semibold text-slate-800">Change Password</h4>
                  <p className="text-sm text-slate-600">Update your account password</p>
                </div>
                <Button
                  onClick={() => setShowPasswordForm(true)}
                  className="clay-button bg-gradient-to-r from-orange-200 to-orange-300 text-orange-800 border-none rounded-2xl hover:from-orange-300 hover:to-orange-400"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Current Password</Label>
                  <Input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                    className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                    placeholder="Enter current password"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">New Password</Label>
                    <Input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                      className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                      placeholder="Enter new password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Confirm Password</Label>
                    <Input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                      className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({
                        current_password: "",
                        new_password: "",
                        confirm_password: ""
                      });
                    }}
                    variant="outline"
                    className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="clay-button bg-gradient-to-r from-orange-200 to-orange-300 text-orange-800 border-none rounded-2xl px-6 hover:from-orange-300 hover:to-orange-400"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    {isChangingPassword ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
