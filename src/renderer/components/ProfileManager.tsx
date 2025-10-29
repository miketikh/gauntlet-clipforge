/**
 * ProfileManager Component
 *
 * Form for creating and editing user profiles with target audience and content guidelines.
 * Part of the AI Consultant feature - helps define context for AI content analysis.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAIAssistantStore } from '../store/aiAssistantStore';

const ProfileManager: React.FC = () => {
  const profiles = useAIAssistantStore((state) => state.profiles);
  const selectedProfileId = useAIAssistantStore((state) => state.selectedProfileId);
  const editingProfile = useAIAssistantStore((state) => state.editingProfile);
  const setEditingProfile = useAIAssistantStore((state) => state.setEditingProfile);
  const loadProfiles = useAIAssistantStore((state) => state.loadProfiles);
  const addProfile = useAIAssistantStore((state) => state.addProfile);
  const updateProfile = useAIAssistantStore((state) => state.updateProfile);
  const deleteProfile = useAIAssistantStore((state) => state.deleteProfile);
  const loadProfile = useAIAssistantStore((state) => state.loadProfile);
  const clearEditingProfile = useAIAssistantStore((state) => state.clearEditingProfile);

  // Local state for feedback messages
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Validate profile fields - defined early so it can be used in handleSave
  const validateProfile = useCallback((): string | null => {
    if (!editingProfile?.name?.trim()) {
      return 'Profile name is required';
    }
    if (!editingProfile?.targetAudience?.trim()) {
      return 'Target audience is required';
    }
    if (!editingProfile?.contentGuidelines?.trim()) {
      return 'Content guidelines are required';
    }
    return null;
  }, [editingProfile]);

  // Handle save - defined early so it can be used in useEffect
  const handleSave = useCallback(async () => {
    // Clear previous messages
    setErrorMessage('');
    setSuccessMessage('');

    // Validate all fields
    const validationError = validateProfile();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      if (selectedProfileId && editingProfile?.id) {
        // Update existing profile
        await updateProfile(editingProfile.id, {
          name: editingProfile.name!.trim(),
          targetAudience: editingProfile.targetAudience?.trim() || '',
          contentGuidelines: editingProfile.contentGuidelines?.trim() || '',
        });
        setSuccessMessage(`Profile "${editingProfile.name!.trim()}" updated successfully!`);
      } else {
        // Create new profile
        const profileName = editingProfile!.name!.trim();
        await addProfile({
          name: profileName,
          targetAudience: editingProfile?.targetAudience?.trim() || '',
          contentGuidelines: editingProfile?.contentGuidelines?.trim() || '',
        });
        setSuccessMessage(`Profile "${profileName}" created successfully!`);
      }
    } catch (error) {
      console.error('[ProfileManager] Failed to save profile:', error);
      setErrorMessage('Failed to save profile. Please try again.');
    }
  }, [editingProfile, selectedProfileId, validateProfile, addProfile, updateProfile]);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles().catch((error) => {
      console.error('[ProfileManager] Failed to load profiles on mount:', error);
      setErrorMessage('Failed to load profiles. Please refresh the page.');
    });
  }, [loadProfiles]);

  // Clear messages after timeout
  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
        setSuccessMessage('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, successMessage]);

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]); // handleSave is memoized with useCallback

  // Handle profile selection
  const handleProfileSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setErrorMessage('');
    setSuccessMessage('');
    if (value === 'new') {
      clearEditingProfile();
    } else {
      loadProfile(value);
    }
  };

  // Handle input changes - clear messages when user starts typing
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    setSuccessMessage('');
    setEditingProfile({
      ...editingProfile,
      name: e.target.value,
    });
  };

  const handleTargetAudienceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setErrorMessage('');
    setSuccessMessage('');
    setEditingProfile({
      ...editingProfile,
      targetAudience: e.target.value,
    });
  };

  const handleContentGuidelinesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setErrorMessage('');
    setSuccessMessage('');
    setEditingProfile({
      ...editingProfile,
      contentGuidelines: e.target.value,
    });
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedProfileId || !editingProfile?.id) {
      return;
    }

    // Edge case: Can't delete the last profile
    if (profiles.length <= 1) {
      setErrorMessage('Cannot delete the last profile. At least one profile must exist.');
      return;
    }

    if (window.confirm(`Delete profile "${editingProfile.name}"?`)) {
      try {
        const profileName = editingProfile.name;
        await deleteProfile(editingProfile.id);
        setSuccessMessage(`Profile "${profileName}" deleted successfully!`);
      } catch (error) {
        console.error('[ProfileManager] Failed to delete profile:', error);
        setErrorMessage('Failed to delete profile. Please try again.');
      }
    }
  };

  // Check if save button should be disabled (need name at minimum for basic UX)
  const isSaveDisabled = !editingProfile?.name?.trim();

  // Determine if we're editing an existing profile
  const isEditingExisting = selectedProfileId && editingProfile?.id;

  // Button text changes based on mode
  const saveButtonText = isEditingExisting ? 'Update Profile' : 'Save Profile';

  // Character counts for textareas
  const audienceCount = editingProfile?.targetAudience?.length || 0;
  const guidelinesCount = editingProfile?.contentGuidelines?.length || 0;

  // Sort profiles alphabetically for dropdown
  const sortedProfiles = [...profiles].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        paddingBottom: '20px',
        paddingRight: '12px',
      }}
    >
      {/* Profile Selector Dropdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label
          htmlFor="profile-selector"
          style={{
            fontSize: '0.8rem',
            color: '#a0aec0',
            fontWeight: 500,
            letterSpacing: '0.3px',
          }}
        >
          Select Profile
        </label>
        <select
          id="profile-selector"
          value={selectedProfileId || 'new'}
          onChange={handleProfileSelect}
          style={{
            background: '#2a2a2a',
            border: '1px solid #404040',
            color: '#e0e0e0',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '0.875rem',
            outline: 'none',
            cursor: 'pointer',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3498db';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#404040';
          }}
        >
          <option value="new">New Profile</option>
          {sortedProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        <div
          style={{
            fontSize: '0.7rem',
            color: '#718096',
            textAlign: 'right',
          }}
        >
          {profiles.length} {profiles.length === 1 ? 'profile' : 'profiles'} saved
        </div>
      </div>

      {/* Visual Separator */}
      <div
        style={{
          borderTop: '1px solid #404040',
          margin: '8px 0',
        }}
      />

      {/* Error Message */}
      {errorMessage && (
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '4px',
            color: '#F87171',
            fontSize: '0.8rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '1rem' }}>⚠</span>
          {errorMessage}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '4px',
            color: '#4ADE80',
            fontSize: '0.8rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '1rem' }}>✓</span>
          {successMessage}
        </div>
      )}

      {/* Profile Name Input - Always show when "New Profile", read-only when existing profile selected */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label
          htmlFor="profile-name"
          style={{
            fontSize: '0.8rem',
            color: '#a0aec0',
            fontWeight: 500,
            letterSpacing: '0.3px',
          }}
        >
          Profile Name
        </label>
        <input
          id="profile-name"
          type="text"
          value={editingProfile?.name || ''}
          onChange={handleNameChange}
          placeholder="e.g., Tech Tutorial, Marketing Video"
          disabled={isEditingExisting ? true : false}
          style={{
            background: isEditingExisting ? '#1a1a1a' : '#2a2a2a',
            border: '1px solid #404040',
            color: isEditingExisting ? '#909090' : '#e0e0e0',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '0.875rem',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            cursor: isEditingExisting ? 'not-allowed' : 'text',
          }}
          onFocus={(e) => {
            if (!isEditingExisting) {
              e.currentTarget.style.borderColor = '#3498db';
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#404040';
          }}
        />
      </div>

      {/* Target Audience Textarea - Only show when creating new profile */}
      {!isEditingExisting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            htmlFor="target-audience"
            style={{
              fontSize: '0.8rem',
              color: '#a0aec0',
              fontWeight: 500,
              letterSpacing: '0.3px',
            }}
          >
            Target Audience
          </label>
          <textarea
            id="target-audience"
            rows={4}
            value={editingProfile?.targetAudience || ''}
            onChange={handleTargetAudienceChange}
            placeholder="e.g., Beginner developers learning React..."
            style={{
              background: '#2a2a2a',
              border: '1px solid #404040',
              color: '#e0e0e0',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '0.875rem',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3498db';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#404040';
            }}
          />
          <div
            style={{
              fontSize: '0.7rem',
              color: '#718096',
              textAlign: 'right',
            }}
          >
            {audienceCount} characters
          </div>
        </div>
      )}

      {/* Content Guidelines Textarea - Only show when creating new profile */}
      {!isEditingExisting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            htmlFor="content-guidelines"
            style={{
              fontSize: '0.8rem',
              color: '#a0aec0',
              fontWeight: 500,
              letterSpacing: '0.3px',
            }}
          >
            Content Guidelines
          </label>
          <textarea
            id="content-guidelines"
            rows={4}
            value={editingProfile?.contentGuidelines || ''}
            onChange={handleContentGuidelinesChange}
            placeholder="e.g., Use simple analogies, avoid jargon..."
            style={{
              background: '#2a2a2a',
              border: '1px solid #404040',
              color: '#e0e0e0',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '0.875rem',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3498db';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#404040';
            }}
          />
          <div
            style={{
              fontSize: '0.7rem',
              color: '#718096',
              textAlign: 'right',
            }}
          >
            {guidelinesCount} characters
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginTop: '8px',
        }}
      >
        {/* Save/Update Profile Button */}
        <button
          onClick={handleSave}
          disabled={isSaveDisabled}
          style={{
            flex: 1,
            padding: '10px 18px',
            background: isSaveDisabled
              ? '#4B5563'
              : 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: isSaveDisabled
              ? 'none'
              : '0 2px 4px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s ease',
            opacity: isSaveDisabled ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isSaveDisabled) {
              e.currentTarget.style.background = 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSaveDisabled) {
              e.currentTarget.style.background = 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
            }
          }}
        >
          {saveButtonText}
        </button>

        {/* Delete Profile Button - Only shown when editing existing profile */}
        {isEditingExisting && (
          <button
            onClick={handleDelete}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(180deg, #F87171 0%, #EF4444 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.3)';
            }}
          >
            Delete Profile
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileManager;
