class AuthService {
  getMockAccessToken(): string {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        sub: "mock-user",
        email: "john.doe@mockmail.dev",
        name: "John Doe",
        scope: "business",
        iat: nowInSeconds,
        exp: nowInSeconds + 3600, // Expires in 1 hour
      })
    ).toString("base64url");

    return `${header}.${payload}.mock-signature`;
  }
}

export const authService = new AuthService();
