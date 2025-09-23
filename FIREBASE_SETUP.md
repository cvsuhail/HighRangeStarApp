# Firebase Firestore Setup Guide for Vessels

## Overview
This guide will help you set up Firebase Firestore for vessel management with CRUD operations.

## Files Created/Modified

### New Files:
- `src/types/vessel.ts` - TypeScript interfaces for vessel data
- `src/lib/vesselService.ts` - Firestore service with CRUD operations
- `firestore.rules` - Basic Firebase security rules
- `firestore-security-rules.md` - Comprehensive security rules documentation

### Modified Files:
- `src/lib/firebase.ts` - Added Firestore configuration
- `src/app/(admin)/vessels/page.tsx` - Updated to use Firestore instead of local state

## Setup Steps

### 1. Firebase Configuration
Your Firebase configuration is already set up in `src/lib/firebase.ts` with the following details:
- Project ID: `hrstar-270fa`
- The configuration includes Firestore support

### 2. Deploy Firestore Rules
Deploy the security rules to your Firebase project:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

### 3. Enable Firestore in Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`hrstar-270fa`)
3. Navigate to "Firestore Database"
4. Click "Create database"
5. Choose "Start in test mode" (for development)
6. Select your preferred location

### 4. Test the Integration
1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the vessels page in your admin panel
3. Try creating, editing, and deleting vessels
4. Check the Firebase Console to see the data being stored

## Features Implemented

### CRUD Operations:
- ✅ **Create**: Add new vessels with validation
- ✅ **Read**: List all vessels with search functionality
- ✅ **Update**: Edit existing vessel information
- ✅ **Delete**: Remove vessels with confirmation

### Additional Features:
- ✅ **Search**: Real-time search through vessel names, numbers, and codes
- ✅ **Validation**: Client-side validation for required fields
- ✅ **Duplicate Prevention**: Checks for duplicate vessel numbers and codes
- ✅ **Loading States**: UI feedback during operations
- ✅ **Error Handling**: User-friendly error messages
- ✅ **Responsive Design**: Works on all screen sizes

### Data Structure:
Each vessel document contains:
```typescript
{
  id: string;           // Auto-generated document ID
  name: string;         // Vessel name
  number: string;       // Vessel number (unique)
  slnoFormat: string;   // Serial number format (e.g., "H##")
  code: string;         // Vessel code (unique)
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
}
```

## Security Rules

The basic rules allow:
- ✅ Authenticated users can read all vessels
- ✅ Authenticated users can create vessels (with validation)
- ✅ Authenticated users can update vessels (with validation)
- ✅ Authenticated users can delete vessels
- ✅ Data validation ensures required fields and proper types

## Production Considerations

For production deployment:

1. **Enhanced Security**: Use the production rules from `firestore-security-rules.md`
2. **Custom Claims**: Implement admin roles using Firebase Auth custom claims
3. **Rate Limiting**: Consider implementing rate limiting for API calls
4. **Backup Strategy**: Set up regular Firestore backups
5. **Monitoring**: Enable Firebase monitoring and alerting

## Troubleshooting

### Common Issues:

1. **"Firestore not initialized" error**:
   - Ensure Firebase is properly configured
   - Check that Firestore is enabled in Firebase Console

2. **Permission denied errors**:
   - Verify the security rules are deployed
   - Ensure user is authenticated
   - Check that the rules match your authentication setup

3. **Data not saving**:
   - Check browser console for errors
   - Verify Firestore rules allow the operation
   - Ensure all required fields are provided

### Getting Help:
- Check the Firebase Console for error logs
- Review the browser console for client-side errors
- Consult the Firebase documentation for Firestore rules

## Next Steps

Consider implementing:
- User authentication and role-based access
- Bulk operations (import/export vessels)
- Advanced search with filters
- Audit logging for vessel changes
- Integration with other modules (quotations, invoices, etc.)
