

## Admin Avatar Upload for Team Members

Add the ability for managers/admins to upload a profile photo for any team member directly from the People detail modal.

### What Changes

**In the Person Detail Modal header** (where the avatar and name are displayed), a camera overlay will appear on hover -- the same pattern used on the Profile Settings page. Clicking it opens a file picker. Only users with manager permissions will see this option.

### Technical Details

**File: `src/components/people/PersonDetailModal.tsx`**

1. Add a `useRef` for a hidden file input and state for `isUploading`.
2. Add a `handleAvatarUpload` function that:
   - Validates the file (image type, max 5MB)
   - Uploads to the `avatars` bucket at `{userId}/avatar.{ext}` (with upsert)
   - Removes the old avatar file if one exists
   - Gets the public URL and updates the `users.avatar_url` column
   - Invalidates relevant queries (`user-detail`, `current-user`, `people-list`)
3. Add a `handleRemoveAvatar` function for clearing the photo.
4. Replace the static `<UserAvatar>` in the dialog header (line ~437) with a wrapper that includes:
   - A hover overlay with a camera icon (visible only for managers)
   - A hidden `<input type="file">` element
   - A small remove button if an avatar exists
5. Gate all upload/remove UI behind the `isManager` prop.

No database or storage changes are needed -- the `avatars` bucket and `users.avatar_url` column already exist and are used by the self-service profile page.

