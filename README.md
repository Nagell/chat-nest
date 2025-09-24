<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![CC BY-NC 4.0][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h3 align="center">Chat-Nest API</h3>

  <p align="center">
    NestJS-based chat system backend with real-time messaging and guaranteed email notifications
    <br />
    <a href="./docs/DEVELOPMENT.md"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/Nagell/chat-nest/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    ·
    <a href="https://github.com/Nagell/chat-nest/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#api-endpoints">API Endpoints</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#deployment">Deployment</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

A robust NestJS-based chat system backend with REST API and WebSocket support. Designed to work with any modern frontend framework. Features zero message loss, guaranteed email notifications, and real-time communication capabilities.

### Key Features

- **Zero Message Loss**: All messages saved to database with atomic transactions
- **Guaranteed Email Notifications**: Every visitor message triggers an email to admin
- **Real-time Communication**: WebSocket support for instant messaging
- **Session Management**: Automatic session creation and management
- **Admin Dashboard API**: Complete session and message management

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

- [![NestJS][NestJS]][NestJS-url]
- [![Supabase][Supabase]][Supabase-url]
- [![TypeScript][TypeScript]][TypeScript-url]
- [![Socket.IO][Socket.IO]][Socket.IO-url]
- [![Nodemailer][Nodemailer]][Nodemailer-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/)
- [pnpm](https://pnpm.io/)
- [Supabase account](https://supabase.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Email SMTP credentials (Gmail recommended)

### Installation

1. Clone the repository

   ```sh
   git clone https://github.com/Nagell/dawid-nitka-chat.git
   ```

2. Install packages

   ```sh
   pnpm install
   ```

3. Copy `.env.example` to `.env` and configure your environment variables

   ```sh
   cp .env.example .env
   ```

4. Set up your database using Supabase migrations (see [Development Guide](./docs/DEVELOPMENT.md#database-development) for details)

   ```sh
   # For local development
   pnpm supabase start

   # For production setup
   pnpm supabase login
   pnpm supabase link --project-ref <your-project-id>
   pnpm supabase db push
   ```

5. Start the development server

   ```sh
   pnpm run start:dev
   ```

6. The server will start on `http://localhost:3001`

### Quick Start - Test the API

Once running, test the API with these simple curl commands:

```sh
# Health check
curl http://localhost:3001/api/chat/health

# Create a chat session
curl -X POST http://localhost:3001/api/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"visitor_email":"test@example.com","visitor_name":"Test User"}'

# Send a message (use session_id from previous response)
curl -X POST http://localhost:3001/api/chat/messages \
  -H "Content-Type: application/json" \
  -d '{"session_id":1,"content":"Hello!","sender_type":"visitor"}'
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- API ENDPOINTS -->
## API Endpoints

### Chat Sessions

- `POST /api/chat/sessions` - Create a new chat session
- `GET /api/chat/sessions/{id}` - Get session details
- `GET /api/chat/sessions/{id}/messages` - Get messages for a session
- `POST /api/chat/sessions/{id}/mark-read` - Mark messages as read

### Messages

- `POST /api/chat/messages` - Send a new message

### Admin

- `GET /api/chat/admin/sessions` - Get all sessions with summary
- `GET /api/chat/admin/stats` - Get WebSocket connection statistics

### Health Check

- `GET /api/chat/health` - Health check endpoint

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

### ✅ Completed Features

- [x] **Backend Architecture** - Complete NestJS setup with modular structure
- [x] **Database Schema** - Comprehensive Supabase schema with triggers and RPC functions
- [x] **REST API Endpoints** - Full CRUD operations tested in local and production environments
- [x] **Input Validation** - class-validator DTOs with email, length, and type validation
- [x] **WebSocket Gateway** - Server-side gateway with room management and typing indicators
- [x] **Email Notifications** - HTML email service tested and working with Gmail SMTP
- [x] **Environment Configuration** - Production/development environment separation working
- [x] **HTML Security** - XSS protection with proper input escaping implemented
- [x] **Database Testing** - Both local and production Supabase connections verified
- [x] **Production Environment** - Production server tested with isolated database

### 🔄 In Progress

- [ ] **WebSocket Client Testing** - Need to test real-time functionality from client side
- [ ] **Security Hardening** - Critical authentication guards and session security needed

### ⏳ Upcoming Features

- [ ] **Session Authentication** - Token-based session access control
- [ ] **Admin Authentication** - Cross-Supabase JWT validation for admin endpoints
- [ ] **Rate Limiting** - Protection against spam and abuse
- [ ] **API Documentation** - OpenAPI/Swagger documentation generation
- [ ] **Frontend Integration** - Nuxt.js components for portfolio integration
- [ ] **Admin Dashboard** - Complete session management interface
- [ ] **Performance Optimization** - Caching and query optimization
- [ ] **Deployment Setup** - Production deployment to Vercel/Railway

### 🚨 Security Priorities

- [ ] **Session Access Control** - Prevent unauthorized access to chat sessions
- [ ] **Admin Endpoint Protection** - Secure admin functionality with proper authentication
- [ ] **WebSocket Validation** - Add validation DTOs for WebSocket message events
- [ ] **Security Headers** - Add helmet middleware with security headers

See [TODO.md](./TODO.md) for detailed implementation progress and security audit findings.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- DEPLOYMENT -->
## Deployment

### Vercel Deployment

1. Deploy to Vercel:

   ```bash
   pnpm add -g vercel
   vercel --prod
   ```

2. Set environment variables in Vercel dashboard

### Railway Deployment

1. Connect your repository to Railway
2. Set environment variables
3. Deploy automatically on push

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the CC BY-NC 4.0 License. See `LICENSE` for more information.

[![CC BY-NC 4.0][cc-by-nc-image]][cc-by-nc]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Dawid Nitka - [LinkedIn][linkedin-url]

Project Link: [https://github.com/Nagell/chat-nest](https://github.com/Nagell/chat-nest)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[license-shield]: https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg?style=for-the-badge
[license-url]: ./LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/dawidnitka

[NestJS]: https://img.shields.io/badge/nestjs-E0234E?style=for-the-badge&logo=nestjs&logoColor=white
[NestJS-url]: https://nestjs.com/
[Supabase]: https://img.shields.io/badge/Supabase-000000?style=for-the-badge&logo=supabase&logoColor=white
[Supabase-url]: https://supabase.com/
[TypeScript]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Socket.IO]: https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white
[Socket.IO-url]: https://socket.io/
[Nodemailer]: https://img.shields.io/badge/Nodemailer-0F9DCE?style=for-the-badge&logo=nodemailer&logoColor=white
[Nodemailer-url]: https://nodemailer.com/

[cc-by-nc]: https://creativecommons.org/licenses/by-nc/4.0/
[cc-by-nc-image]: https://licensebuttons.net/l/by-nc/4.0/88x31.png
