import { CHECK_DIALOG_SETTING } from "./rolls/check-configure.ts";

/** World/client settings registered at init. */
export function registerSettings(): void {
  // @ts-expect-error fvtt-types: system settings namespace is not in the core union yet
  game.settings.register("kedom", CHECK_DIALOG_SETTING, {
    name: "KEDOM.Settings.CheckDialog.name",
    hint: "KEDOM.Settings.CheckDialog.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });
}
