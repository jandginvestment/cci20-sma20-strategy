export const environment = {
  production: true,
  apiUrl: 'https://PLACEHOLDER.execute-api.ap-southeast-1.amazonaws.com', // fill after sam deploy
  cognito: {
    region: 'ap-southeast-1',
    userPoolId: 'ap-southeast-1_PLACEHOLDER',       // fill after sam deploy
    clientId: 'PLACEHOLDER_CLIENT_ID',              // fill after sam deploy
    domain: 'https://cci-sma-493822200263.auth.ap-southeast-1.amazoncognito.com',
    redirectUri: 'https://jandginvestment.github.io/cci20-sma20-strategy/auth/callback',
    logoutUri: 'https://jandginvestment.github.io/cci20-sma20-strategy/login',
    scopes: ['openid', 'email', 'profile'],
  }
};
