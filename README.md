# 🌟 High Range Star - Document Management Platform

> **Streamline Your Business Operations with Intelligent Document Management**

High Range Star is a comprehensive Next.js-based document management platform designed specifically for businesses that handle complex quotation workflows, purchase orders, delivery notes, and invoicing processes. Built with modern web technologies and Firebase integration, it provides a seamless experience for managing business documents and operations.

![Version](https://img.shields.io/badge/version-2.0.2-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.2.3-black.svg)
![Firebase](https://img.shields.io/badge/Firebase-12.3.0-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)

## ✨ Key Features

### 📋 **Comprehensive Document Management**
- **Quotation Management**: Create, edit, and track quotations with version control
- **Purchase Order Processing**: Handle purchase orders with automated workflows
- **Delivery Notes**: Manage delivery documentation with digital signatures
- **Invoice Generation**: Automated invoice creation and tracking
- **Thread-based Organization**: Group related documents for better organization

### 🏢 **Business Operations**
- **Vessel Management**: Complete CRUD operations for vessel information
- **Customer Management**: Track customer data and interactions
- **Template System**: Pre-built quotation templates for quick generation
- **Status Tracking**: Real-time status updates for all business processes

### 📊 **Analytics & Reporting**
- **Interactive Dashboard**: Comprehensive overview of business metrics
- **Sales Analytics**: Monthly sales charts and performance tracking
- **Statistics Visualization**: Advanced charts and graphs using ApexCharts
- **Demographic Insights**: Customer and market analysis tools
- **Recent Orders**: Quick access to latest transactions

### 🔐 **Security & Authentication**
- **Firebase Authentication**: Secure user login and session management
- **Role-based Access**: Admin and user permission systems
- **Data Validation**: Client and server-side validation
- **Secure File Upload**: Protected document storage and retrieval

### 🎨 **Modern User Experience**
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Dark/Light Theme**: Toggle between themes with persistent preferences
- **Intuitive Navigation**: Collapsible sidebar with smooth animations
- **Real-time Updates**: Live data synchronization across the platform
- **Drag & Drop**: Easy file uploads and document management

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15.2.3** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript 5.0** - Type-safe development
- **Tailwind CSS 4.0** - Utility-first styling framework
- **ApexCharts** - Interactive data visualization
- **React DnD** - Drag and drop functionality

### **Backend & Database**
- **Firebase 12.3.0** - Backend-as-a-Service
- **Firestore** - NoSQL document database
- **Firebase Auth** - User authentication
- **Firebase Analytics** - Usage tracking

### **Development Tools**
- **ESLint** - Code linting and quality
- **Prettier** - Code formatting
- **PostCSS** - CSS processing
- **SVGR** - SVG optimization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HighRangeStarApp-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Firebase Setup**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Configure Firebase Auth
   - Update `src/lib/firebase.ts` with your project credentials

4. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Add your Firebase configuration
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (admin)/           # Admin dashboard pages
│   ├── (full-width-pages)/ # Authentication and error pages
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
│   ├── auth/             # Authentication components
│   ├── charts/           # Data visualization
│   ├── ecommerce/        # Dashboard widgets
│   ├── form/             # Form components
│   ├── quotation/        # Quotation-specific components
│   └── ui/               # Base UI components
├── context/              # React Context providers
│   ├── AuthContext.tsx   # Authentication state
│   ├── ThemeContext.tsx  # Theme management
│   ├── QuotationStore.tsx # Business logic
│   └── SidebarContext.tsx # Navigation state
├── hooks/                # Custom React hooks
├── icons/                # SVG icon components
├── layout/               # Layout components
├── lib/                  # Utility libraries
│   ├── firebase.ts       # Firebase configuration
│   └── vesselService.ts  # Vessel operations
└── types/                # TypeScript type definitions
```

## 🔧 Configuration

### Firebase Setup
Detailed Firebase configuration guide available in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

### Security Rules
Production-ready security rules documented in [firestore-security-rules.md](./firestore-security-rules.md)

## 📱 Features Overview

### Dashboard
- **Real-time Metrics**: Customer count, order statistics
- **Sales Analytics**: Monthly sales charts and trends
- **Performance Tracking**: Visual statistics and KPIs
- **Quick Actions**: Fast access to common operations

### Document Management
- **Quotation Workflow**: Create → Review → Accept/Decline → Revise
- **Purchase Orders**: Upload and track purchase documentation
- **Delivery Notes**: Generate and manage delivery documentation
- **Invoice Generation**: Automated invoice creation from quotations

### Vessel Management
- **CRUD Operations**: Complete vessel information management
- **Search & Filter**: Advanced search capabilities
- **Validation**: Data integrity and duplicate prevention
- **Responsive Interface**: Mobile-optimized vessel management

## 🎯 Business Workflow

1. **Create Quotation** → Customer receives quote
2. **Customer Response** → Accept/Decline/Request Changes
3. **Purchase Order** → Upload customer PO documents
4. **Delivery Planning** → Generate delivery notes
5. **Invoice Generation** → Create final invoice
6. **Completion** → Mark thread as completed

## 🔒 Security Features

- **Authentication**: Firebase Auth with email/password
- **Authorization**: Role-based access control
- **Data Validation**: Client and server-side validation
- **Secure Storage**: Firebase Firestore with security rules
- **Session Management**: Persistent and temporary sessions

## 📊 Analytics & Monitoring

- **Firebase Analytics**: User behavior tracking
- **Performance Metrics**: Application performance monitoring
- **Error Tracking**: Automated error reporting
- **Usage Statistics**: Feature utilization analytics

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Toggle between light and dark themes
- **Smooth Animations**: Enhanced user experience
- **Accessibility**: WCAG compliance considerations
- **Modern Components**: Latest UI patterns and interactions

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Firebase Deployment
```bash
firebase deploy
```

### Environment Variables
Configure production environment variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in the `/docs` folder

---

<div align="center">
  <strong>AwwAds Built with ❤️ for modern business operations</strong>
</div>