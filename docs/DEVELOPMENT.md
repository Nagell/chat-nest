<a id="development-top"></a>

# Development Guide

<!-- TABLE OF CONTENTS -->
- [Development Guide](#development-guide)
  - [Documentation](#documentation)
  - [Development Commands](#development-commands)
    - [Running the Application](#running-the-application)
    - [Code Quality](#code-quality)
    - [Testing](#testing)
    - [Database Types](#database-types)
  - [Database Development](#database-development)
    - [Local Supabase Setup](#local-supabase-setup)
    - [Database Migrations](#database-migrations)
    - [Production Database Management](#production-database-management)
  - [Testing Guide](#testing-guide)
    - [Test Setup](#test-setup)
    - [Running Tests](#running-tests)
    - [Test Structure](#test-structure)

## Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/start)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Nodemailer Documentation](https://nodemailer.com/about/)

<p align="right">(<a href="#development-top">back to top</a>)</p>

## Development Commands

### Running the Application

```sh
# Install dependencies
pnpm install

# Start development server with auto-reload
pnpm run start:dev

# Start production server
pnpm run start:prod

# Build for production
pnpm run build
```

### Code Quality

```sh
# Lint and fix code
pnpm run lint

# Format code with Prettier
pnpm run format
```

### Testing

```sh
# Run unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:cov

# Run e2e tests
pnpm run test:e2e

# Debug tests
pnpm run test:debug
```

### Database Types

```sh
# Generate TypeScript types from Supabase schema
pnpm run types:generate

# Generate types from local Supabase instance
pnpm run types:local
```

<p align="right">(<a href="#development-top">back to top</a>)</p>

## Database Development

### Local Supabase Setup

This project uses the Supabase CLI for local development with proper migrations.

```sh
# Install dependencies
pnpm supabase install

# Start local Supabase instance
pnpm supabase start

# The local dashboard will be available at http://localhost:54323
```

### Database Migrations

The project uses proper Supabase migrations located in `supabase/migrations/`:

```sh
# Apply all migrations to local database
pnpm supabase db reset

# Create a new migration
pnpm supabase migration new <migration_name>

# Apply specific migration
pnpm supabase migration up
```

### Production Database Management

1. **Connect to Production:**

   ```sh
   # Login to Supabase CLI
   pnpm supabase login

   # Link to your production project
   pnpm supabase link --project-ref <your-project-id>
   ```

2. **Deploy Migrations:**

   ```sh
   # Push the migration to the remote database
   pnpm supabase db push
   ```

3. **Pull Production Changes:**

    ```sh
    # Pull the database schema first public
    yarn supabase db pull
    # Update remote migration history table? [Y/n] 
    Y

    # Pull the database schema for auth, storage
    yarn supabase db pull --schema auth,storage
    # Update remote migration history table? [Y/n]
    Y

    # Apply changes locally (including seeding the buckets)
    yarn supabase db reset

    # To seed buckets manually run
    yarn supabase seed buckets
    ```

4. **Generate Types:**

   ```sh
   # Generate TypeScript types from production schema
   pnpm run types:generate

   # Generate types from local database
   pnpm run types:local
   ```

<p align="right">(<a href="#development-top">back to top</a>)</p>

## Testing Guide

This project uses Jest for unit testing and e2e testing with NestJS testing utilities.

### Test Setup

1. **Environment Configuration:**

   ```sh
   # Copy your .env file for testing
   cp .env .env.test
   ```

2. **Test Database:**
   For testing, you may want to use a separate Supabase project or test database to avoid affecting your development data.

### Running Tests

```sh
# Run all unit tests
pnpm run test

# Run tests in watch mode during development
pnpm run test:watch

# Run tests with coverage report
pnpm run test:cov

# Run e2e tests
pnpm run test:e2e

# Debug failing tests
pnpm run test:debug
```

### Test Structure

- **Unit Tests:** `src/**/*.spec.ts` - Test individual services and controllers
- **E2E Tests:** `test/**/*.e2e-spec.ts` - Test complete API endpoints
- **Coverage:** Generated in `coverage/` directory when running `pnpm run test:cov`

<p align="right">(<a href="#development-top">back to top</a>)</p>
