import {
  ShieldAlert,
  BarChart3,
  Tags,
  GitCompare,
  History,
} from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "SMS Spam Detector", icon: ShieldAlert },
  { to: "/history", label: "Scan History", icon: History },
  { to: "/evaluation", label: "Model Evaluation", icon: BarChart3 },
  { to: "/pos", label: "POS Tagging", icon: Tags },
  { to: "/similarity", label: "Text Similarity", icon: GitCompare },
];
