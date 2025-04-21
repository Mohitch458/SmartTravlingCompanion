import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const schema = yup.object({
  fullName: yup.string()
    .required('Full name is required')
    .min(2, 'Name must be at least 2 characters'),
}).required();

const ProfileForm = () => {
  const { user, updateProfile, uploadProfilePicture } = useAuth();
  const [uploading, setUploading] = useState(false);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      fullName: user?.fullName || ''
    }
  });

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validImageTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    try {
      setUploading(true);
      await uploadProfilePicture(file);
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      await updateProfile(data);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
      
      <div className="mb-6">
        <div className="flex items-center space-x-6">
          <div className="shrink-0">
            <img
              className="h-16 w-16 object-cover rounded-full"
              src={user?.profilePictureUrl || 'https://via.placeholder.com/150'}
              alt="Profile"
            />
          </div>
          <label className="block">
            <span className="sr-only">Choose profile photo</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
            />
          </label>
        </div>
        {uploading && (
          <p className="mt-2 text-sm text-indigo-600">Uploading...</p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            {...register('fullName')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.fullName && (
            <p className="mt-2 text-sm text-red-600">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileForm;
