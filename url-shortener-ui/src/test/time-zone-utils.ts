/**
 * Time zones on both extremes of UTC. A date bug that mixes local and UTC calendar days shows up in at least one of
 * them: Kiritimati (UTC+14) is already on the next day, Los Angeles (UTC-7/-8) is still on the previous one.
 * Use with `vi.stubEnv("TZ", timeZone)`; Node applies a changed TZ immediately and vitest restores it after each test.
 */
export const FAR_FROM_UTC_TIME_ZONES = ["Pacific/Kiritimati", "America/Los_Angeles"] as const;
