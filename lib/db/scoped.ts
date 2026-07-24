import { prisma } from "./client";

// Enforces tenant isolation at the data layer (CLAUDE.md section 5): every
// query against these models gets tenantId injected into where/data, so a
// route can never accidentally leak another tenant's rows by forgetting a
// filter. Route handlers must resolve the tenant first, then use this.

interface AllOperationsParams {
  operation: string;
  args: Record<string, unknown>;
  query: (args: Record<string, unknown>) => Promise<unknown>;
}

function injectTenant(tenantId: string) {
  return async ({ operation, args, query }: AllOperationsParams) => {
    if (operation === "create") {
      args.data = { ...(args.data as Record<string, unknown>), tenantId };
    } else if (operation === "createMany" && Array.isArray(args.data)) {
      args.data = (args.data as Record<string, unknown>[]).map((row) => ({ ...row, tenantId }));
    } else {
      const existingWhere = args.where as Record<string, unknown> | undefined;
      args.where = existingWhere ? { AND: [existingWhere, { tenantId }] } : { tenantId };
      if (operation === "upsert") {
        args.create = { ...(args.create as Record<string, unknown>), tenantId };
      }
    }
    return query(args);
  };
}

export function scopedDb(tenantId: string) {
  return prisma.$extends({
    query: {
      document: { $allOperations: injectTenant(tenantId) },
      conversation: { $allOperations: injectTenant(tenantId) },
      lead: { $allOperations: injectTenant(tenantId) },
    },
  });
}

export type ScopedDb = ReturnType<typeof scopedDb>;
