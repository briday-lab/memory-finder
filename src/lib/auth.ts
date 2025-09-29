import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { query } from '@/lib/database'

interface ExtendedUser {
  id?: string
  userType?: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        userType: { label: 'User Type', type: 'text' }
      },
      async authorize(credentials) {
        if (credentials?.email && credentials?.password) {
          try {
            // Check if user exists in database
            const userResult = await query(
              'SELECT id, email, name, user_type FROM users WHERE email = $1',
              [credentials.email]
            )
            
            if (userResult.rows.length > 0) {
              const dbUser = userResult.rows[0]
              const user = {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                userType: dbUser.user_type
              }
              console.log('Authorizing existing user:', user)
              return user
            } else {
              // Create new user if they don't exist
              const newUserResult = await query(
                `INSERT INTO users (email, name, user_type) 
                 VALUES ($1, $2, $3) 
                 RETURNING id, email, name, user_type`,
                [
                  credentials.email,
                  credentials.email.split('@')[0],
                  credentials.userType || 'videographer'
                ]
              )
              
              const newUser = newUserResult.rows[0]
              const user = {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                userType: newUser.user_type
              }
              console.log('Created new user:', user)
              return user
            }
          } catch (error) {
            console.error('Database error during authorization:', error)
            return null
          }
        }
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // For Google OAuth, we need to determine user type differently
        if (user.email && !token.userType) {
          // Default to videographer for Google OAuth users
          token.userType = 'videographer'
        } else {
          token.userType = (user as { userType?: string }).userType || 'videographer'
        }
        console.log('JWT callback - user:', user, 'token.userType:', token.userType)
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        const user = session.user as ExtendedUser
        user.id = token.sub!
        user.userType = token.userType as string
        
        // For Google OAuth users, ensure they exist in database
        if (user.email && !user.userType) {
          try {
            const userResult = await query(
              'SELECT id, user_type FROM users WHERE email = $1',
              [user.email]
            )
            
            if (userResult.rows.length > 0) {
              user.id = userResult.rows[0].id
              user.userType = userResult.rows[0].user_type
            } else {
              // Create user if they don't exist (default to videographer)
              const newUserResult = await query(
                `INSERT INTO users (email, name, user_type) 
                 VALUES ($1, $2, $3) 
                 RETURNING id`,
                [user.email, user.name || user.email.split('@')[0], 'videographer'] // Default to videographer
              )
              user.id = newUserResult.rows[0].id
              user.userType = 'videographer'
            }
          } catch (error) {
            console.error('Database error in session callback:', error)
          }
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin'
  }
}
