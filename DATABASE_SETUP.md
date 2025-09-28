# Database Setup Guide

## 🚀 **Step 1: Create AWS RDS PostgreSQL Instance**

### Via AWS Console:
1. **Go to AWS Console** → RDS → Create database
2. **Choose**: PostgreSQL
3. **Version**: PostgreSQL 15.4 (or latest)
4. **Templates**: Free tier (if eligible) or Dev/Test
5. **DB Instance Identifier**: `memory-finder-db`
6. **Master Username**: `postgres`
7. **Master Password**: `MemoryFinder2024!` (or your choice)
8. **DB Instance Class**: `db.t3.micro`
9. **Storage**: 20 GB
10. **VPC**: Default VPC
11. **Security Group**: Create new (allow PostgreSQL port 5432 from your IP)
12. **Database Name**: `memoryfinder`

### Security Group Rules:
- **Type**: PostgreSQL
- **Port**: 5432
- **Source**: Your IP address (0.0.0.0/0 for testing, restrict in production)

## 🔧 **Step 2: Connect and Setup Schema**

### Get Connection Details:
1. **Go to RDS Console** → Databases → `memory-finder-db`
2. **Copy the Endpoint** (e.g., `memory-finder-db.xxxxx.us-east-2.rds.amazonaws.com`)

### Connect via psql:
```bash
psql -h memory-finder-db.xxxxx.us-east-2.rds.amazonaws.com -U postgres -d memoryfinder
```

### Run Schema:
```bash
psql -h memory-finder-db.xxxxx.us-east-2.rds.amazonaws.com -U postgres -d memoryfinder -f database-schema.sql
```

## 🔑 **Step 3: Update Environment Variables**

Add to your `.env.local`:
```env
# Database Configuration
DB_HOST=memory-finder-db.xxxxx.us-east-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=memoryfinder
DB_USER=postgres
DB_PASSWORD=MemoryFinder2024!
```

## 🧪 **Step 4: Test Connection**

Run this to test the database connection:
```bash
npm run dev
```

Check the console for: `Database connected successfully`

## 📊 **Step 5: Verify Tables**

Connect to your database and verify tables were created:
```sql
\dt
SELECT * FROM users;
SELECT * FROM projects;
SELECT * FROM files;
```

## 🚨 **Troubleshooting**

### Connection Issues:
- **Check Security Group**: Ensure port 5432 is open
- **Check VPC**: Ensure RDS is in the same VPC as your app
- **Check Credentials**: Verify username/password

### SSL Issues:
- Add `?sslmode=require` to connection string for production
- Use `sslmode=disable` for development

## 🎯 **Next Steps**

Once the database is set up:
1. ✅ Update API routes to use database
2. ✅ Update dashboards to load from database
3. ✅ Add data persistence to all operations
4. ✅ Test user registration and project creation

## 📝 **Database Schema Overview**

- **users**: Store user accounts (videographers and couples)
- **projects**: Store wedding projects with couple details
- **files**: Store file metadata linked to projects
- **video_moments**: Store searchable video segments

The schema includes:
- ✅ UUID primary keys
- ✅ Foreign key relationships
- ✅ Automatic timestamps
- ✅ Status tracking
- ✅ Performance indexes

