import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { parseBrandConfig, type BrandConfig } from "@/lib/tenant/brand";
import type { Prisma } from "@prisma/client";
import { Card } from "@/components/dashboard/Card";
import { Surface } from "@/components/dashboard/Surface";
import { Input } from "@/components/dashboard/Input";
import { Textarea } from "@/components/dashboard/Textarea";
import { Select } from "@/components/dashboard/Select";
import { Label } from "@/components/dashboard/Label";
import { Checkbox } from "@/components/dashboard/Checkbox";
import { Button } from "@/components/dashboard/Button";
import { ToastFlash } from "@/components/dashboard/ToastFlash";

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
      // Unchecked checkboxes are simply absent from FormData.
      leadCapture: formData.get("leadCapture") === "on",
      humanContact: String(formData.get("humanContact") ?? "").trim().slice(0, 300),
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

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Customize</h1>
      <p className="mt-1 text-sm text-muted">
        Control how your chatbot looks and behaves.
      </p>

      {saved && <ToastFlash message="Changes saved." tone="success" />}

      <Card radius="3xl" padding="lg" className="mt-6 max-w-xl">
        <form action={saveSettings} className="space-y-5">
          <div>
            <Label htmlFor="botName">Bot name</Label>
            <Input id="botName" name="botName" defaultValue={brand.botName} maxLength={50} />
          </div>

          <div>
            <Label htmlFor="greeting">Greeting</Label>
            <Input id="greeting" name="greeting" defaultValue={brand.greeting} maxLength={200} />
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <Label htmlFor="color">Color</Label>
              <input
                id="color"
                name="color"
                type="color"
                defaultValue={brand.color}
                className="mt-1.5 h-11 w-16 cursor-pointer rounded-xl border border-border bg-surface/60"
              />
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Select id="position" name="position" defaultValue={brand.position}>
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Select id="language" name="language" defaultValue={tenant.language}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="humanContact">Talk to a human link</Label>
            <p className="mt-1 text-xs text-muted">
              Where the widget&apos;s <strong>Talk to a human</strong> button sends visitors. A WhatsApp
              number in international format (e.g. <code>923001234567</code>), a full link
              (<code>https://wa.me/92…</code>, <code>tel:…</code>, <code>mailto:…</code>), or any URL.
              Leave blank and the bot will instead share the contact details from your own website.
            </p>
            <Input
              id="humanContact"
              name="humanContact"
              defaultValue={brand.humanContact}
              maxLength={300}
              placeholder="923001234567"
            />
          </div>

          <div>
            <Label htmlFor="systemPrompt">System prompt</Label>
            <p className="mt-1 text-xs text-muted">
              Instructions for how your bot should behave. It always answers only from your site content.
            </p>
            <Textarea id="systemPrompt" name="systemPrompt" defaultValue={tenant.systemPrompt} rows={5} maxLength={4000} />
          </div>

          <Surface>
            <label htmlFor="leadCapture" className="flex cursor-pointer items-start gap-3">
              <Checkbox id="leadCapture" name="leadCapture" defaultChecked={brand.leadCapture} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium">Lead generation</span>
                <span className="mt-0.5 block text-xs text-muted">
                  When a visitor shows buying intent, the bot politely asks for their name and
                  phone/WhatsApp and saves it to your <strong>Leads</strong> tab.
                </span>
              </span>
            </label>
          </Surface>

          <Button variant="primary">Save changes</Button>
        </form>
      </Card>
    </div>
  );
}
