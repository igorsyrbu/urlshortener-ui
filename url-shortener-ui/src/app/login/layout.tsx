import type {Metadata} from "next";
import {PAGE_TITLES} from "@/lib/constants";

export {MetadataOnlyLayout as default} from "@/components/layout/MetadataOnlyLayout";

export const metadata: Metadata = {title: PAGE_TITLES.LOGIN};
