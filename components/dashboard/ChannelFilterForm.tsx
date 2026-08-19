import { Select } from "./Select";
import { Button } from "./Button";

/** Zero-JS channel filter — a plain GET form, same searchParams-driven
 * pattern these pages already use for `?error=`/`?saved=`. `basePath` is
 * needed because Unanswered also needs its own fixed `answeredOnly` state,
 * which isn't part of this form (the page itself always scopes that). */
export function ChannelFilterForm({ channel, basePath }: { channel?: string; basePath: string }) {
  return (
    <form method="get" action={basePath} className="flex items-center gap-2">
      <div className="w-44">
        <Select name="channel" defaultValue={channel ?? ""} className="mt-0">
          <option value="">All channels</option>
          <option value="web">Website</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
        </Select>
      </div>
      <Button variant="outline" type="submit">
        Filter
      </Button>
    </form>
  );
}
