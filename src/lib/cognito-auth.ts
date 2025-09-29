import { cognitoConfig, cognitoEndpoints, createCognitoHeaders, authParams, cognitoHostedUI } from './cognito-config'

export interface CognitoUser {
  id: string
  email: string
  name?: string
  emailVerified: boolean
  accessToken: string
  refreshToken: string
  idToken: string
}

export interface SignUpData {
  email: string
  password: string
  name: string
  userType: 'videographer' | 'couple'
}

export interface SignInData {
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  user?: CognitoUser
  error?: string
  requiresConfirmation?: boolean
}

class CognitoAuthService {
  private baseUrl = cognitoEndpoints.signIn

  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const params = {
        ClientId: cognitoConfig.userPoolWebClientId,
        Username: data.email,
        Password: data.password,
        UserAttributes: [
          { Name: 'email', Value: data.email },
          { Name: 'name', Value: data.name },
          { Name: 'custom:user_type', Value: data.userType },
        ],
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp',
        },
        body: JSON.stringify(params),
      })

      const result = await response.json()

      if (response.ok) {
        return {
          success: true,
          requiresConfirmation: true,
        }
      } else {
        return {
          success: false,
          error: result.message || 'Sign up failed',
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error during sign up',
      }
    }
  }

  async signIn(data: SignInData): Promise<AuthResponse> {
    try {
      const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: cognitoConfig.userPoolWebClientId,
        AuthParameters: {
          USERNAME: data.email,
          PASSWORD: data.password,
        },
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify(params),
      })

      const result = await response.json()

      if (response.ok && result.AuthenticationResult) {
        const user: CognitoUser = {
          id: result.AuthenticationResult.AccessToken,
          email: data.email,
          accessToken: result.AuthenticationResult.AccessToken,
          refreshToken: result.AuthenticationResult.RefreshToken,
          idToken: result.AuthenticationResult.IdToken,
          emailVerified: true, // Cognito handles this
        }

        // Store tokens in localStorage for persistence
        localStorage.setItem('cognito_access_token', user.accessToken)
        localStorage.setItem('cognito_refresh_token', user.refreshToken)
        localStorage.setItem('cognito_id_token', user.idToken)

        return {
          success: true,
          user,
        }
      } else {
        return {
          success: false,
          error: result.message || 'Sign in failed',
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error during sign in',
      }
    }
  }

  async signOut(): Promise<void> {
    try {
      // Clear stored tokens
      localStorage.removeItem('cognito_access_token')
      localStorage.removeItem('cognito_refresh_token')
      localStorage.removeItem('cognito_id_token')

      // Redirect to home page
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      // Construct Google Sign-In URL for Cognito Hosted UI
      const googleSignInUrl = `${cognitoHostedUI.domain}/oauth2/authorize?` +
        `client_id=${cognitoHostedUI.clientId}&` +
        `response_type=${cognitoHostedUI.responseType}&` +
        `scope=${cognitoHostedUI.scope}&` +
        `redirect_uri=${encodeURIComponent(cognitoHostedUI.redirectUri)}&` +
        `state=${cognitoHostedUI.state}`

      // Redirect to Google Sign-In
      window.location.href = googleSignInUrl
    } catch (error) {
      console.error('Google Sign-In error:', error)
      throw new Error('Failed to initiate Google Sign-In')
    }
  }

  async handleOAuthCallback(): Promise<AuthResponse> {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')

      if (!code || state !== cognitoHostedUI.state) {
        return {
          success: false,
          error: 'Invalid OAuth callback'
        }
      }

      // Exchange authorization code for tokens
      const tokenResponse = await fetch(`${cognitoHostedUI.domain}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: cognitoHostedUI.clientId,
          code: code,
          redirect_uri: cognitoHostedUI.redirectUri,
        }),
      })

      const tokens = await tokenResponse.json()

      if (tokenResponse.ok && tokens.access_token) {
        const user: CognitoUser = {
          id: tokens.id_token ? JSON.parse(atob(tokens.id_token.split('.')[1])).sub : '',
          email: tokens.id_token ? JSON.parse(atob(tokens.id_token.split('.')[1])).email : '',
          name: tokens.id_token ? JSON.parse(atob(tokens.id_token.split('.')[1])).name : '',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          idToken: tokens.id_token,
          emailVerified: true,
        }

        // Store tokens
        localStorage.setItem('cognito_access_token', user.accessToken)
        localStorage.setItem('cognito_refresh_token', user.refreshToken)
        localStorage.setItem('cognito_id_token', user.idToken)

        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname)

        return {
          success: true,
          user,
        }
      } else {
        return {
          success: false,
          error: tokens.error_description || 'Failed to exchange authorization code'
        }
      }
    } catch (error) {
      console.error('OAuth callback error:', error)
      return {
        success: false,
        error: 'Failed to process OAuth callback'
      }
    }
  }

  async getCurrentUser(): Promise<CognitoUser | null> {
    try {
      const accessToken = localStorage.getItem('cognito_access_token')
      const refreshToken = localStorage.getItem('cognito_refresh_token')
      const idToken = localStorage.getItem('cognito_id_token')

      if (!accessToken || !refreshToken || !idToken) {
        return null
      }

      // Decode ID token to get user info
      const payload = JSON.parse(atob(idToken.split('.')[1]))
      
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        emailVerified: payload.email_verified,
        accessToken,
        refreshToken,
        idToken,
      }
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = localStorage.getItem('cognito_refresh_token')
      if (!refreshToken) return null

      const params = {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: cognitoConfig.userPoolWebClientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify(params),
      })

      const result = await response.json()

      if (response.ok && result.AuthenticationResult) {
        const newAccessToken = result.AuthenticationResult.AccessToken
        localStorage.setItem('cognito_access_token', newAccessToken)
        return newAccessToken
      }

      return null
    } catch (error) {
      console.error('Refresh token error:', error)
      return null
    }
  }

  async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      const params = {
        ClientId: cognitoConfig.userPoolWebClientId,
        Username: email,
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          ...params,
          Target: 'AWSCognitoIdentityProviderService.ForgotPassword',
        }),
      })

      const result = await response.json()

      if (response.ok) {
        return {
          success: true,
        }
      } else {
        return {
          success: false,
          error: result.message || 'Password reset failed',
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error during password reset',
      }
    }
  }
}

export const cognitoAuth = new CognitoAuthService()
