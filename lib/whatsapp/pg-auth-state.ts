import { proto } from "@whiskeysockets/baileys";
import type { AuthenticationState, SignalDataTypeMap } from "@whiskeysockets/baileys";
import { initAuthCreds, BufferJSON } from "@whiskeysockets/baileys";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";

// Postgres-backed replacement for Baileys' own useMultiFileAuthState (which
// stores creds + every signal key as separate files on disk). Same shape,
// one JSON blob (WhatsAppAccount.authState) instead of a folder, so the
// connector process can run on any host/redeploy with no mounted volume; the
// session lives in the same database as everything else in this app.
//
// Buffers inside creds/keys are round-tripped through Baileys' own
// BufferJSON replacer/reviver so they survive the JSON <-> Postgres trip
// intact (a plain JSON.stringify would silently mangle them).

interface StoredAuthState {
  creds: unknown;
  keys: Record<string, unknown>;
}

function toJsonSafe(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value, BufferJSON.replacer));
}

function fromJsonSafe<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value), BufferJSON.reviver) as T;
}

export async function usePgAuthState(tenantId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const existing = await prisma.whatsAppAccount.findUnique({ where: { tenantId } });
  const stored = existing?.authState ? fromJsonSafe<StoredAuthState>(existing.authState) : null;

  const creds: AuthenticationState["creds"] = (stored?.creds as AuthenticationState["creds"]) ?? initAuthCreds();
  const keys: Record<string, unknown> = stored?.keys ?? {};

  const persist = async (): Promise<void> => {
    await prisma.whatsAppAccount.update({
      where: { tenantId },
      data: { authState: toJsonSafe({ creds, keys } satisfies StoredAuthState) },
    });
  };

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
          const data: { [id: string]: SignalDataTypeMap[T] } = {};
          for (const id of ids) {
            let value = keys[`${type}-${id}`];
            if (type === "app-state-sync-key" && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value as object);
            }
            if (value !== undefined) data[id] = value as SignalDataTypeMap[T];
          }
          return data;
        },
        set: async (data) => {
          for (const category of Object.keys(data) as (keyof typeof data)[]) {
            const entries = data[category];
            if (!entries) continue;
            for (const id of Object.keys(entries)) {
              const key = `${category}-${id}`;
              const value = entries[id];
              if (value) keys[key] = value;
              else delete keys[key];
            }
          }
          await persist();
        },
      },
    },
    saveCreds: persist,
  };
}
