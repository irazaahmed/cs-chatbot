import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";

interface BrandConfig {
  color: string;
  botName: string;
  greeting: string;
  position: string;
}

function parseBrandConfig(raw: unknown): BrandConfig {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    color: typeof obj.color === "string" ? obj.color : "#1e88e8",
    botName: typeof obj.botName === "string" ? obj.botName : "Assistant",
    greeting: typeof obj.greeting === "string" ? obj.greeting : "Hi! How can I help?",
    position: typeof obj.position === "string" ? obj.position : "bottom-right",
  };
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ur", label: "Urdu (اردو)" },
  { value: "roman_ur", label: "Roman Urdu" },
];

export default async function CustomizePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { tenant } = await getCurrentTenant();
  const brand = parseBrandConfig(tenant.brandConfig);
  const { saved } = await searchParams;

  async function saveSettings(formData: FormData) {
    "use server";
    const brandConfig: BrandConfig = {
      color: String(formData.get("color") ?? "#1e88e8"),
      botName: String(formData.get("botName") ?? "Assistant").slice(0, 50),
      greeting: String(formData.get("greeting") ?? "Hi! How can I help?").slice(0, 200),
      position: formData.get("position") === "bottom-left" ? "bottom-left" : "bottom-right",
    };
    const systemPrompt = String(formData.get("systemPrompt") ?? "").slice(0, 4000);
    const language = String(formData.get("language") ?? "en");

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        brandConfig: brandConfig as unknown as Prisma.InputJsonValue,
        systemPrompt,
        language,
      },
    });
    revalidatePath("/customize");
    redirect("/customize?saved=1");
  }

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]";

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Customize</h1>
      <p className="mt-1 text-sm text-muted">
        Control how your chatbot looks and behaves.
      </p>

      {saved && (
        <p className="mt-4 max-w-xl rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm text-success-text">
          Changes saved.
        </p>
      )}

      <form
        action={saveSettings}
        className="glass mt-6 max-w-xl space-y-5 rounded-3xl p-7"
      >
        <div>
          <label htmlFor="botName" className="block text-sm font-medium">Bot name</label>
          <input id="botName" name="botName" defaultValue={brand.botName} maxLength={50} className={inputClass} />
        </div>

        <div>
          <label htmlFor="greeting" className="block text-sm font-medium">Greeting</label>
          <input id="greeting" name="greeting" defaultValue={brand.greeting} maxLength={200} className={inputClass} />
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="color" className="block text-sm font-medium">Color</label>
            <input
              id="color"
              name="color"
              type="color"
              defaultValue={brand.color}
              className="mt-1.5 h-11 w-16 cursor-pointer rounded-xl border border-border bg-surface/60"
            />
          </div>
          <div>
            <label htmlFor="position" className="block text-sm font-medium">Position</label>
            <select
              id="position"
              name="position"
              defaultValue={brand.position}
              className="mt-1.5 rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground outline-none"
            >
              <option value="bottom-right">Bottom right</option>
              <option value="bottom-left">Bottom left</option>
            </select>
          </div>
          <div>
            <label htmlFor="language" className="block text-sm font-medium">Language</label>
            <select
              id="language"
              name="language"
              defaultValue={tenant.language}
              className="mt-1.5 rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="systemPrompt" className="block text-sm font-medium">System prompt</label>
          <p className="mt-1 text-xs text-muted">
            Instructions for how your bot should behave. It always answers only from your site content.
          </p>
          <textarea
            id="systemPrompt"
            name="systemPrompt"
            defaultValue={tenant.systemPrompt}
            rows={5}
            maxLength={4000}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="btn-sheen rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_30px_-6px_var(--color-accent)]"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
