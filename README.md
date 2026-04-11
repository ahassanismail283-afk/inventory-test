# Veterinary Inventory Management System

A multi-location, role-based Inventory Management System for clinical use.

## Features
- **Real-time Inventory**: Track items across multiple units.
- **Role-Based Access**: Admin, Manager, and Viewer roles.
- **Clinical Ledger**: Print-optimized transaction history with running balances.
- **Reporting**: Weekly and monthly clinical report generation.

## Technical Stack
- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL)

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone [your-github-url]
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   ```

## Development on Replit
This project is configured for **Replit**. Simply upload the source code and Replit will automatically set up the environment using `replit.nix` and `.replit`.
