import type {Metadata} from "next";
import {PAGE_TITLES} from "@/lib/constants";
import {SETTINGS_LABELS} from "@/lib/settings-constants";

export {MetadataOnlyLayout as default} from "@/components/layout/MetadataOnlyLayout";

export const metadata: Metadata = {title: `${SETTINGS_LABELS.GENERAL} · ${PAGE_TITLES.SETTINGS}`};
