import {THEME_PALETTE_STORAGE_KEY} from "@/lib/constants";
import {DEFAULT_PALETTE_ID} from "@/lib/themes/palettes";
import {TOKEN_CSS_VAR_NAMES} from "@/lib/themes/theme-tokens";

const NEXT_THEMES_STORAGE_KEY = "theme";

export function buildPaletteInitScript(): string {
    const storageKey = JSON.stringify(THEME_PALETTE_STORAGE_KEY);
    const modeKey = JSON.stringify(NEXT_THEMES_STORAGE_KEY);
    const defaultPaletteId = JSON.stringify(DEFAULT_PALETTE_ID);
    const tokenVars = JSON.stringify(TOKEN_CSS_VAR_NAMES);

    return "(function(){try{" +
        `var raw=localStorage.getItem(${storageKey});` +
        "if(!raw)return;" +
        "var sel=JSON.parse(raw);" +
        "if(!sel||typeof sel!==\"object\")return;" +
        "var root=document.documentElement;" +
        "if(sel.kind===\"preset\"){" +
        `if(typeof sel.paletteId==="string"&&sel.paletteId!==${defaultPaletteId})root.setAttribute("data-palette",sel.paletteId);` +
        "return;" +
        "}" +
        "if(sel.kind===\"custom\"&&sel.derived){" +
        `var pref=localStorage.getItem(${modeKey});` +
        "var dark=pref===\"dark\"||((!pref||pref===\"system\")&&window.matchMedia(\"(prefers-color-scheme: dark)\").matches);" +
        "var tokens=dark?sel.derived.dark:sel.derived.light;" +
        "if(!tokens)return;" +
        `var vars=${tokenVars};` +
        "for(var key in vars){if(typeof tokens[key]===\"string\")root.style.setProperty(vars[key],tokens[key]);}" +
        "}" +
        "}catch(e){}})();";
}
