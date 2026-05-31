import {usersService} from "./UsersService";
import {shortLinksService} from "./ShortLinksService";
import {tagsService} from "./TagsService";

class CleanupService {
    private static readonly INACTIVITY_DAYS = parseInt(process.env.MOCK_CLEANUP_INACTIVITY_DAYS || "7", 10);
    private static readonly INACTIVITY_MS = CleanupService.INACTIVITY_DAYS * 24 * 60 * 60 * 1000;

    private lastActivity: Map<string, number> = new Map();

    recordActivity(uuid: string): void {
        this.lastActivity.set(uuid, Date.now());
    }

    runCleanup(): void {
        const cutoff = Date.now() - CleanupService.INACTIVITY_MS;
        const inactive: string[] = [];

        for (const [uuid, lastTime] of this.lastActivity) {
            if (lastTime < cutoff) {
                inactive.push(uuid);
            }
        }

        for (const uuid of inactive) {
            usersService.clearUserData(uuid);
            shortLinksService.clearUserData(uuid);
            tagsService.clearUserData(uuid);
            this.lastActivity.delete(uuid);
            console.log(`  Cleaned up data for inactive user ${uuid}`);
        }

        if (inactive.length > 0) {
            console.log(`  Cleanup complete: removed data for ${inactive.length} user(s)`);
        }
    }
}

export const cleanupService = new CleanupService();
