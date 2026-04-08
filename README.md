# SV Satellite - Integrated Management System

This repository contains a full-stack mobile solution for satellite/ISP service management, consisting of a Customer application and an Administrative application.

## 🏗 Project Structure

The project is organized as a monorepo:

- **DishCustomerApp/**: The end-user application for customers to manage their accounts, view plans, and handle subscriptions.
- **DishAdminApp/**: The control center for administrators to approve users, manage billing, and send notifications.
- **scripts/**: Maintenance and utility scripts for database and asset management.

## 🚀 Technologies

- **Frontend**: React Native with Expo (Managed Workflow)
- **Backend**: Firebase (Authentication & Firestore)
- **Push Notifications**: OneSignal
- **Components**: React Navigation, React Native Safe Area Context
- **Theming**: Custom dynamic Theme Engine (Light/Dark mode)

## 🛠 Getting Started

### Prerequisites

- Node.js (LTS)
- npm or yarn
- Expo Go app on your mobile device (for development)

### Installation

1. Clone the repository.
2. Install dependencies for both apps:

```bash
# For Customer App
cd DishCustomerApp
npm install

# For Admin App
cd ../DishAdminApp
npm install
```

### Running Locally

```bash
# Start Customer App
cd DishCustomerApp
npx expo start

# Start Admin App
cd DishAdminApp
npx expo start
```

## 📦 Deployment (EAS)

Both apps are configured with EAS for automated builds.

```bash
# Build for Android (Production)
eas build --platform android --profile production
```

## 🧹 Maintenance

Utility scripts are located in the `/scripts` directory. These include tools for:
- Fixing payment discrepancies
- Updating app assets
- Managing Firestore stamps
