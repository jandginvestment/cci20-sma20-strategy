export const environment = {
  production: true,
  apiUrl: 'https://ukvsgijj26.execute-api.ap-southeast-1.amazonaws.com',
  cognito: {
    region: 'ap-southeast-1',
    userPoolId: 'ap-southeast-1_GcziLMJ0U',
    clientId: '2hesfa4eugka0hm6613en1aas',
    domain: 'https://cci-sma-493822200263.auth.ap-southeast-1.amazoncognito.com',
    redirectUri: 'https://jandginvestment.github.io/cci20-sma20-strategy/auth/callback',
    logoutUri: 'https://jandginvestment.github.io/cci20-sma20-strategy/login',
    scopes: ['openid', 'email', 'profile'],
  }
};
