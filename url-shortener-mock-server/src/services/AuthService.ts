class AuthService {
    getMockAccessToken(uuid: string): string {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const uuid_slice = `${uuid.slice(0, 8)}`;
        const accountId = `acc-${uuid_slice}`;

        const header = Buffer.from(JSON.stringify({alg: "RS256", typ: "JWT"})).toString("base64url");
        const payload = Buffer.from(
            JSON.stringify({
                sub: `mock-user-${uuid}`,
                accountId,
                name: `John Doe`,
                email: `john.doe@${uuid_slice}.dev`,
                scope: "business",
                iat: nowInSeconds,
                exp: nowInSeconds + 3600, // Expires in 1 hour
            })
        ).toString("base64url");

        return `${header}.${payload}.mock-signature`;
    }
}

export const authService = new AuthService();
