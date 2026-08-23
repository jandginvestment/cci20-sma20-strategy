export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  cognito: {
    region: 'ap-southeast-1',
    userPoolId: 'ap-southeast-1_GcziLMJ0U',
    clientId: '2hesfa4eugka0hm6613en1aas',
    domain: 'https://cci-sma-493822200263.auth.ap-southeast-1.amazoncognito.com',
    redirectUri: 'http://localhost:4200/auth/callback',
    logoutUri: 'http://localhost:4200/login',
    scopes: ['openid', 'email', 'profile'],
  }
};
