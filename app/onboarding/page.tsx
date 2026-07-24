import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

async function createTenant(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const websiteUrlInput = String(formData.get("websiteUrl") ?? "").trim();
  if (!name || !websiteUrlInput) return;

  let normalizedUrl: URL;
  try {
    normalizedUrl = new URL(websiteUrlInput);
  } catch {
    return;
  }

  await prisma.tenant.create({
    data: {
      ownerId: session.user.id,
      name,
      publicKey: `pk_live_${randomBytes(16).toString("hex")}`,
      websiteUrl: normalizedUrl.toString(),
      allowedDomains: [],
      verifyToken: randomBytes(16).toString("hex"),
      brandConfig: {
        color: "#4f46e5",
        botName: "Assistant",
        greeting: "Hi! How can I help?",
        position: "bottom-right",
      },
      systemPrompt: `You are a helpful support assistant for ${name}.`,
    },
  });

  redirect("/install");
}

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const existing = await prisma.tenant.findFirst({ where: { ownerId: session.user.id } });
  if (existing) redirect("/playground");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <form
        action={createTenant}
        className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Set up your chatbot</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Tell us about your business.</p>

        <label className="mt-6 block text-sm font-medium text-black dark:text-zinc-50">
          Business name
        </label>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />

        <label className="mt-4 block text-sm font-medium text-black dark:text-zinc-50">
          Website URL
        </label>
        <input
          name="websiteUrl"
          type="url"
          required
          placeholder="https://yourbusiness.com"
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />

        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-black px-4 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
