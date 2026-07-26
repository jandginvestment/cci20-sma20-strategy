export const environment = {
  production: true,
  apiUrl: 'https://PLACEHOLDER.execute-api.ap-south-1.amazonaws.com',
  cognito: {
    region: 'ap-south-1',
    userPoolId: 'ap-south-1_PLACEHOLDER',
    clientId: 'PLACEHOLDER_CLIENT_ID',
    domain: 'https://cci-sma-PLACEHOLDER.auth.ap-south-1.amazoncognito.com',
    redirectUri: 'https://jandginvestment.github.io/cci20-sma20-strategy/auth/callback',
    logoutUri: 'https://jandginvestment.github.io/cci20-sma20-strategy/login',
    scopes: ['openid', 'email', 'profile']
  }
};
