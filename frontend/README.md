# Compliance Screenshot Archiver - Frontend

## Overview

This directory will contain the frontend application for the Compliance Screenshot Archiver (CSA). The frontend will be built using modern web technologies to provide a user-friendly dashboard for managing compliance screenshot schedules and viewing archived captures.

## Planned Technology Stack

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Components**: ShadCN/UI with Tailwind CSS for modern, accessible design
- **State Management**: React Context and React Query for server state
- **Authentication**: Integration with AWS Cognito JWT tokens
- **Styling**: Tailwind CSS with custom design system
- **Testing**: Vitest for unit tests, Playwright for E2E testing

## Planned Features

### Core Dashboard
- **Schedule Management**: Create, edit, and manage capture schedules
- **Archive Browser**: View and search captured screenshots/PDFs with filters
- **Capture Verification**: Hash verification and integrity checking interface
- **On-demand Captures**: Trigger immediate captures with progress tracking

### Authentication & Authorization
- **Login/Logout**: Secure authentication via AWS Cognito
- **Role-based Access**: Admin, Operator, and Viewer role interfaces
- **Session Management**: Secure token handling and refresh

### User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Updates**: Live status updates for capture operations
- **Export Functions**: Download individual files or compliance reports
- **Help & Documentation**: In-app guidance and tooltips

### Compliance Features
- **Audit Trail View**: Complete history of captures and user actions
- **Compliance Reports**: Generate audit-ready documentation
- **Hash Verification**: Visual integrity checking interface
- **Retention Policies**: Display and manage retention settings

## Directory Structure (Planned)

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # ShadCN/UI components
│   │   ├── forms/         # Form components
│   │   ├── layout/        # Layout components
│   │   └── features/      # Feature-specific components
│   ├── pages/             # Route components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API communication
│   ├── contexts/          # React contexts
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   └── styles/            # Global styles and themes
├── tests/                 # Test files
├── docs/                  # Frontend-specific documentation
└── package.json           # Dependencies and scripts
```

## Getting Started (Future)

When the frontend is implemented, developers will be able to:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## Integration with Backend

The frontend will communicate with the backend API located in the `../backend` directory through:

- RESTful API calls to FastAPI endpoints
- JWT token authentication
- Real-time updates via WebSocket connections (if implemented)
- File downloads via presigned S3 URLs

## Development Guidelines

- **Component-driven Development**: Build reusable, testable components
- **Accessibility First**: Ensure WCAG 2.1 AA compliance
- **Type Safety**: Use TypeScript strictly with proper type definitions
- **Performance**: Optimize for fast loading and smooth interactions
- **Security**: Secure handling of authentication tokens and sensitive data

## Security Considerations

- No hardcoded secrets or API keys
- Secure token storage and management
- HTTPS-only communication in production
- Input validation and sanitization
- CSRF protection and security headers

---

**Status**: Not yet implemented - placeholder directory for future development