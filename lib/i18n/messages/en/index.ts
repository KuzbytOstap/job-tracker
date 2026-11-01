import { auth } from "./auth";
import { board } from "./board";
import { card } from "./card";
import { common } from "./common";
import { dashboard } from "./dashboard";
import { dialogs } from "./dialogs";
import { extraction } from "./extraction";
import { form } from "./form";
import { labels } from "./labels";
import { nav } from "./nav";
import { review } from "./review";
import { settings } from "./settings";
import { stats } from "./stats";
import { table } from "./table";
import { time } from "./time";
import { validation } from "./validation";

export const en = {
  common,
  labels,
  time,
  settings,
  auth,
  nav,
  stats,
  board,
  dashboard,
  card,
  table,
  review,
  validation,
  form,
  dialogs,
  extraction,
} as const;
