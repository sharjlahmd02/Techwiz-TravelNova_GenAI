import {
  FileText,
  Mail,
  MessageSquare,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { ComplaintChannel } from "../../../types/complaint";

const CHANNELS: {
  channel: ComplaintChannel;
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    channel: "web_form",
    icon: FileText,
    title: "Web Form",
    description: "Fill in a short structured form yourself.",
  },
  {
    channel: "chat",
    icon: MessageSquare,
    title: "Chat",
    description:
      "Tell us what happened conversationally, we'll draft it for you.",
  },
  {
    channel: "email",
    icon: Mail,
    title: "Email",
    description: "Compose it like an email to complaints@travelnova.com.",
  },
  {
    channel: "document",
    icon: Upload,
    title: "Upload a Document",
    description: "Upload a PDF or DOCX describing your complaint.",
  },
];

export function ChannelPicker({
  onSelect,
}: {
  onSelect: (channel: ComplaintChannel) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-7 transition-colors hover:border-zinc-300 sm:p-9">
      <h2 className="mb-1 text-xl text-[#0A0A0A]">
        How would you like to submit this?
      </h2>
      <p className="mb-6 text-sm text-zinc-500">
        Choose whichever is easiest -- they all reach the same team.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CHANNELS.map(({ channel, icon: Icon, title, description }) => (
          <button
            key={channel}
            type="button"
            onClick={() => onSelect(channel)}
            className="flex items-start gap-3 rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:border-zinc-400"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100">
              <Icon className="h-4 w-4 text-zinc-600" strokeWidth={2} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#0A0A0A]">
                {title}
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                {description}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* ADD THIS */}
      <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        <span className="font-semibold text-[#0A0A0A]">
          Prefer to email us directly?{" "}
        </span>
        You can send your complaint straight to{" "}
        <a
          href="mailto:supportnovaltd@gmail.com"
          className="font-medium text-[#0A0A0A] hover:underline"
        >
          supportnovaltd@gmail.com
        </a>
        . It can take 30–35 minutes to appear on your dashboard, and you'll get
        a reply there once it's reviewed.
      </div>
    </div>
  );
}
