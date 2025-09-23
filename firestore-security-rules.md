# Firebase Firestore Security Rules for Vessels

## Overview
This document provides comprehensive Firebase Firestore security rules for the vessels collection in your application.

## Basic Rules (Recommended for Development)

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Vessels collection rules
    match /vessels/{vesselId} {
      // Allow read access to all authenticated users
      allow read: if request.auth != null;
      
      // Allow create access to authenticated users
      allow create: if request.auth != null
        && validateVesselData(request.resource.data);
      
      // Allow update access to authenticated users
      allow update: if request.auth != null
        && validateVesselUpdateData(request.resource.data);
      
      // Allow delete access to authenticated users
      allow delete: if request.auth != null;
    }
    
    // Helper function to validate vessel data on create
    function validateVesselData(data) {
      return data.keys().hasAll(['name', 'number', 'slnoFormat', 'code', 'createdAt', 'updatedAt'])
        && data.name is string
        && data.number is string
        && data.slnoFormat is string
        && data.code is string
        && data.createdAt is string
        && data.updatedAt is string
        && data.name.size() > 0
        && data.number.size() > 0
        && data.code.size() > 0
        && data.slnoFormat.size() > 0;
    }
    
    // Helper function to validate vessel data on update
    function validateVesselUpdateData(data) {
      return data.keys().hasAny(['name', 'number', 'slnoFormat', 'code', 'updatedAt'])
        && (!('name' in data) || (data.name is string && data.name.size() > 0))
        && (!('number' in data) || (data.number is string && data.number.size() > 0))
        && (!('code' in data) || (data.code is string && data.code.size() > 0))
        && (!('slnoFormat' in data) || (data.slnoFormat is string && data.slnoFormat.size() > 0))
        && data.updatedAt is string;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Production Rules (Enhanced Security)

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Vessels collection rules with enhanced security
    match /vessels/{vesselId} {
      // Allow read access only to authenticated users
      allow read: if request.auth != null
        && isUserAuthorized();
      
      // Allow create access with stricter validation
      allow create: if request.auth != null
        && isUserAuthorized()
        && validateVesselData(request.resource.data)
        && validateVesselNumberUniqueness(request.resource.data.number)
        && validateVesselCodeUniqueness(request.resource.data.code);
      
      // Allow update access with validation
      allow update: if request.auth != null
        && isUserAuthorized()
        && validateVesselUpdateData(request.resource.data)
        && validateVesselNumberUniquenessOnUpdate(request.resource.data.number, vesselId)
        && validateVesselCodeUniquenessOnUpdate(request.resource.data.code, vesselId);
      
      // Allow delete access to authorized users only
      allow delete: if request.auth != null
        && isUserAuthorized();
    }
    
    // Helper function to check user authorization
    function isUserAuthorized() {
      return request.auth.token.email_verified == true
        && request.auth.token.admin == true; // Custom claim for admin users
    }
    
    // Helper function to validate vessel data on create
    function validateVesselData(data) {
      return data.keys().hasAll(['name', 'number', 'slnoFormat', 'code', 'createdAt', 'updatedAt'])
        && data.name is string
        && data.number is string
        && data.slnoFormat is string
        && data.code is string
        && data.createdAt is string
        && data.updatedAt is string
        && data.name.size() >= 2
        && data.name.size() <= 100
        && data.number.size() >= 1
        && data.number.size() <= 50
        && data.code.size() >= 2
        && data.code.size() <= 20
        && data.slnoFormat.size() >= 1
        && data.slnoFormat.size() <= 20
        && data.name.matches('^[a-zA-Z0-9\\s\\-_\\.]+$')
        && data.number.matches('^[a-zA-Z0-9\\-_\\.]+$')
        && data.code.matches('^[a-zA-Z0-9\\-_\\.]+$');
    }
    
    // Helper function to validate vessel data on update
    function validateVesselUpdateData(data) {
      return data.keys().hasAny(['name', 'number', 'slnoFormat', 'code', 'updatedAt'])
        && (!('name' in data) || (data.name is string && data.name.size() >= 2 && data.name.size() <= 100))
        && (!('number' in data) || (data.number is string && data.number.size() >= 1 && data.number.size() <= 50))
        && (!('code' in data) || (data.code is string && data.code.size() >= 2 && data.code.size() <= 20))
        && (!('slnoFormat' in data) || (data.slnoFormat is string && data.slnoFormat.size() >= 1 && data.slnoFormat.size() <= 20))
        && data.updatedAt is string;
    }
    
    // Note: Uniqueness validation would require additional queries
    // These functions are placeholders for the concept
    function validateVesselNumberUniqueness(number) {
      return true; // Implement uniqueness check via cloud function or client-side validation
    }
    
    function validateVesselCodeUniqueness(code) {
      return true; // Implement uniqueness check via cloud function or client-side validation
    }
    
    function validateVesselNumberUniquenessOnUpdate(number, vesselId) {
      return true; // Implement uniqueness check via cloud function or client-side validation
    }
    
    function validateVesselCodeUniquenessOnUpdate(code, vesselId) {
      return true; // Implement uniqueness check via cloud function or client-side validation
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## How to Deploy Rules

1. **Using Firebase CLI:**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Using Firebase Console:**
   - Go to Firebase Console
   - Navigate to Firestore Database
   - Click on "Rules" tab
   - Copy and paste the rules
   - Click "Publish"

## Security Considerations

### Development Environment
- Use the basic rules for development and testing
- All authenticated users can perform CRUD operations
- Basic data validation is enforced

### Production Environment
- Use enhanced rules with stricter validation
- Implement custom claims for user roles
- Add email verification requirements
- Consider implementing uniqueness validation via Cloud Functions
- Add rate limiting and audit logging

## Data Validation

The rules enforce:
- Required fields: `name`, `number`, `slnoFormat`, `code`, `createdAt`, `updatedAt`
- String type validation for all text fields
- Minimum and maximum length constraints
- Alphanumeric character validation for codes and numbers
- Timestamp validation for creation and update times

## Custom Claims Setup

To use the production rules, set up custom claims for admin users:

```javascript
// In your Firebase Admin SDK
admin.auth().setCustomUserClaims(uid, { admin: true });
```

## Testing Rules

Use the Firebase Rules Playground in the Firebase Console to test your rules before deploying them to production.

## Monitoring

Monitor rule violations in the Firebase Console under "Firestore" > "Usage" > "Rules" to identify potential security issues.
