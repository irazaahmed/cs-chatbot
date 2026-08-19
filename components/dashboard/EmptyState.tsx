import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "./Card";
import { Button } from "./Button";

/** "No X yet" message. `bordered` (default) is a self-contained Card;
 * pass `bordered={false}` when nesting inside a wrapper that already
 * supplies the card chrome (e.g. Knowledge's shared table wrapper).
 * `action` renders an optional outline button/link below the message. */
export function EmptyState({
  children,
  bordered = true,
  action,
}: {
  children: ReactNode;
  bordered?: boolean;
  action?: { href: string; label: string };
}) {
  const body = (
    <>
      <p className="text-sm text-muted">{children}</p>
      {action && (
        <Link href={action.href} className="mt-3 inline-block">
          <Button variant="outline" type="button">
            {action.label}
          </Button>
        </Link>
      )}
    </>
  );
  return bordered ? <Card>{body}</Card> : <div className="p-6">{body}</div>;
}
