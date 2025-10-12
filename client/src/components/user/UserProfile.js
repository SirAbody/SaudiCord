// User Profile Component
import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { 
  XMarkIcon, 
  CameraIcon, 
  PencilIcon,
  ArrowRightOnRectangleIcon,
  CheckIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function UserProfile({ onClose }) {
  const { user, updateProfile, updateStatus, logout } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [status, setStatus] = useState(user?.status || 'online');
  // const [avatarFile, setAvatarFile] = useState(null); // Reserved for future avatar upload

  const handleSave = async () => {
    const success = await updateProfile({
      displayName,
      bio
    });

    if (success) {
      setIsEditing(false);
      await updateStatus(status);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      // TODO: Implement avatar upload functionality
      // For now, just show a message
      toast.success('Avatar upload feature coming soon!');
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => {
        // Update avatar preview
      };
      reader.readAsDataURL(file);
    }
  };

  const statusOptions = [
    { value: 'online', label: 'Online', color: 'bg-green-500' },
    { value: 'idle', label: 'Idle', color: 'bg-yellow-500' },
    { value: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500' },
    { value: 'offline', label: 'Invisible', color: 'bg-gray-500' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-background-secondary rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-r from-accent to-accent-dark">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-dark-500/50 hover:bg-dark-500 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="px-8 pb-8">
          {/* Avatar */}
          <div className="relative -mt-16 mb-4">
            <div className="relative inline-block">
              <img
                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=FF0000&color=fff`}
                alt={user?.username}
                className="w-32 h-32 rounded-full border-4 border-background-secondary"
              />
              <button className="absolute bottom-0 right-0 p-2 bg-accent hover:bg-accent-dark rounded-full transition-colors">
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <CameraIcon className="w-5 h-5 text-white" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </button>
              {/* Status Indicator */}
              <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-background-secondary ${
                statusOptions.find(s => s.value === status)?.color
              }`}></div>
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-4">
            {/* Username and Tag */}
            <div>
              <h2 className="text-2xl font-bold text-text-primary flex items-center">
                {isEditing ? (
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-dark-400 px-2 py-1 rounded outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Display Name"
                  />
                ) : (
                  <>
                    {user?.displayName || user?.username}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="ml-2 p-1 hover:bg-dark-400 rounded transition-colors"
                    >
                      <PencilIcon className="w-4 h-4 text-text-tertiary" />
                    </button>
                  </>
                )}
              </h2>
              <p className="text-text-secondary">@{user?.username}</p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                About Me
              </label>
              {isEditing ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-dark-400 text-text-primary px-3 py-2 rounded outline-none focus:ring-2 focus:ring-accent resize-none"
                  rows="3"
                  placeholder="Tell us about yourself..."
                  maxLength="200"
                />
              ) : (
                <p className="text-text-primary">
                  {user?.bio || 'No bio yet.'}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setStatus(option.value)}
                    className={`flex items-center px-3 py-2 rounded-lg border transition-colors ${
                      status === option.value
                        ? 'border-accent bg-accent/10'
                        : 'border-dark-400 hover:border-dark-500'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${option.color} mr-2`}></div>
                    <span className="text-sm text-text-primary">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Account Info */}
            <div className="pt-4 border-t border-dark-400">
              <h3 className="text-sm font-medium text-text-secondary mb-2">Account</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-text-tertiary">Email</span>
                  <span className="text-sm text-text-primary">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-tertiary">Member Since</span>
                  <span className="text-sm text-text-primary">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
                Logout
              </button>

              {isEditing && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(user?.displayName || '');
                      setBio(user?.bio || '');
                    }}
                    className="px-4 py-2 bg-dark-400 hover:bg-dark-500 text-text-primary rounded-lg transition-colors"
                  >
                    <XCircleIcon className="w-5 h-5 inline mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors"
                  >
                    <CheckIcon className="w-5 h-5 inline mr-2" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-dark-400 text-center">
            <p className="text-xs text-text-tertiary">
              SaudiCord • Made With Love By SirAbody
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
