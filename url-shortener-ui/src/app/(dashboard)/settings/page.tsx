import {redirect} from "next/navigation";
import {SETTINGS_ROUTES} from "@/lib/settings-constants";

export default function SettingsPage(): never {
    redirect(SETTINGS_ROUTES.GENERAL);
}
