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
    color: typeof obj.color === "string" ? obj.color : "#4f46e5",
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

export default async function CustomizePage() {
  const { tenant } = await getCurrentTenant();
  const brand = parseBrandConfig(tenant.brandConfig);

  async function saveSettings(formData: FormData) {
    "use server";
    const brandConfig: BrandConfig = {
      color: String(formData.get("color") ?? "#4f46e5"),
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
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Customize</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Control how your chatbot looks and behaves.
      </p>

      <form action={saveSettings} className="mt-6 max-w-xl space-y-5">
        <div>
          <label className="block text-sm font-medium text-black dark:text-zinc-50">Bot name</label>
          <input
            name="botName"
            defaultValue={brand.botName}
            maxLength={50}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black dark:text-zinc-50">Greeting</label>
          <input
            name="greeting"
            defaultValue={brand.greeting}
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-black dark:text-zinc-50">Color</label>
            <input
              name="color"
              type="color"
              defaultValue={brand.color}
              className="mt-1 h-10 w-16 rounded border border-zinc-300 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black dark:text-zinc-50">Position</label>
            <select
              name="position"
              defaultValue={brand.position}
              className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="bottom-right">Bottom right</option>
              <option value="bottom-left">Bottom left</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-black dark:text-zinc-50">Language</label>
            <select
              name="language"
              defaultValue={tenant.language}
              className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
          <label className="block text-sm font-medium text-black dark:text-zinc-50">System prompt</label>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Instructions for how your bot should behave. It always answers only from your site content.
          </p>
          <textarea
            name="systemPrompt"
            defaultValue={tenant.systemPrompt}
            rows={5}
            maxLength={4000}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
