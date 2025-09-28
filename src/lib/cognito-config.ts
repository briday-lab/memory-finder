// AWS Cognito Configuration
export const cognitoConfig = {
  region: 'us-east-2',
  userPoolId: 'us-east-2_iOQ186eix',
  userPoolWebClientId: '47ngeac5hkg68ui4blceq1thcl',
  clientSecret: '5jlueecvviuh4t48af4064v1l5rk1dp4df74md00u60jbau440e',
  domain: 'https://main.d25s4o2tenvmk9.amplifyapp.com', // Your app domain
  redirectSignIn: 'https://main.d25s4o2tenvmk9.amplifyapp.com/dashboard',
  redirectSignOut: 'https://main.d25s4o2tenvmk9.amplifyapp.com/',
  responseType: 'code' as const,
}

// Cognito Hosted UI Configuration
export const cognitoHostedUI = {
  domain: `https://d1lcia0inyjsq.cloudfront.net`,
  clientId: cognitoConfig.userPoolWebClientId,
  redirectUri: cognitoConfig.redirectSignIn,
  responseType: 'code',
  scope: 'openid email profile',
  state: 'memory-finder-auth'
}

// Cognito API endpoints
export const cognitoEndpoints = {
  signUp: `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`,
  signIn: `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`,
  forgotPassword: `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`,
  confirmSignUp: `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`,
}

// Helper function to create Cognito authentication headers
export const createCognitoHeaders = () => ({
  'Content-Type': 'application/x-amz-json-1.1',
  'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
})

// Cognito authentication parameters
export const authParams = {
  AuthFlow: 'USER_PASSWORD_AUTH',
  ClientId: cognitoConfig.userPoolWebClientId,
  AuthParameters: {
    USERNAME: '',
    PASSWORD: '',
  },
}
