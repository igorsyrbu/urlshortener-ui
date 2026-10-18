import {createElement} from "react";
import {getIconForDevice, type UserSession} from "@/lib/session-utils";

interface DeviceIconProps {
    session: Pick<UserSession, "device" | "os">;
    className?: string;
}

export function DeviceIcon({session, className}: DeviceIconProps) {
    return createElement(getIconForDevice(session.device, session.os), {className, "aria-hidden": true});
}
