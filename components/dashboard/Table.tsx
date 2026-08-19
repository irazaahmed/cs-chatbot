import type { ReactNode } from "react";
import { Card } from "./Card";
import { cx } from "./cx";

/** Table shell shared by every dashboard data table (Conversations,
 * Unanswered, Leads, Appointments, Knowledge). `bare` skips the outer Card
 * so a page that already wraps empty+populated states in one Card (e.g.
 * Knowledge) doesn't get double-wrapped. */
function Table({ bare = false, children, className }: { bare?: boolean; children: ReactNode; className?: string }) {
  const inner = (
    <div className="overflow-x-auto">
      <table className={cx("w-full text-sm", className)}>{children}</table>
    </div>
  );
  if (bare) return inner;
  return <Card padding="none">{inner}</Card>;
}

function Head({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-surface/80 text-left text-muted">
      <tr>{children}</tr>
    </thead>
  );
}

function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cx("px-5 py-3 font-medium", className)}>{children}</th>;
}

function Body({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cx("border-t border-border transition-colors hover:bg-accent/5", className)}>{children}</tr>;
}

function Td({
  children,
  muted = true,
  numeric = false,
  className,
}: {
  children: ReactNode;
  muted?: boolean;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <td className={cx("px-5 py-3", muted ? "text-muted" : "text-foreground", numeric && "tabular-nums", className)}>
      {children}
    </td>
  );
}

Table.Head = Head;
Table.Th = Th;
Table.Body = Body;
Table.Row = Row;
Table.Td = Td;

export { Table };
