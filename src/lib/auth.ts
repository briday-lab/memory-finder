import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

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
        // For demo purposes, accept any credentials
        if (credentials?.email && credentials?.password) {
          const user = {
            id: '1',
            email: credentials.email,
            name: credentials.email.split('@')[0],
            userType: credentials.userType || 'videographer'
          }
          console.log('Authorizing user:', user)
          return user
        }
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userType = (user as { userType?: string }).userType || 'videographer'
        console.log('JWT callback - user:', user, 'token.userType:', token.userType)
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        const user = session.user as ExtendedUser
        user.id = token.sub!
        user.userType = token.userType as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin'
  }
}
