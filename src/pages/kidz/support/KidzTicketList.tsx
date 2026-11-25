import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/kidz/KidzPageHeader";
import { StatusPill } from "@/components/kidz/KidzStatusPill";
import { Button } from "@/components/ui/button";
import { statusFilters, tickets } from "@/data/kidz/support";
import { useDocumentMeta } from "@/lib/kidz/kidz-meta";

const title = "My support requests - Kidzy Learning Portal";
const description = "Track the status of every support ticket you've raised with the Kidzy help crew.";

export function TicketListPage() {
  useDocumentMeta(title, description);

  const [filter, setFilter] = useState<string>("All");
  const visible = tickets.filter((ticket) => filter === "All" || ticket.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/kidz/support"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" /> Back to support
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          eyebrow="Inbox"
          title="My support requests"
          description="Every question you've sent us, newest first."
        />
        <Button asChild className="rounded-full font-bold">
          <Link to="/kidz/support/new">
            <Plus className="size-4" /> New ticket
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
              filter === status
                ? "bg-primary text-primary-foreground shadow-pop"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visible.map((ticket) => (
          <Link
            key={ticket.id}
            to={`/kidz/support/tickets/${ticket.id}`}
            className="card-surface flex flex-wrap items-center gap-4 p-5 transition-transform hover:-translate-y-0.5"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-muted text-2xl">
              {ticket.agent.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">{ticket.id}</span>
                <StatusPill status={ticket.status} />
              </div>
              <h2 className="mt-1 truncate text-lg font-bold">{ticket.subject}</h2>
              <p className="text-sm text-muted-foreground">
                {ticket.category} Â· {ticket.priority} priority Â· updated {ticket.updated}
              </p>
            </div>
            <span className="text-sm font-bold text-primary">View thread â†’</span>
          </Link>
        ))}
        {visible.length === 0 && (
          <div className="card-surface p-10 text-center">
            <p className="text-3xl">ðŸŽ‰</p>
            <h2 className="mt-2 text-xl font-bold">Nothing here</h2>
            <p className="text-sm text-muted-foreground">No tickets with the status "{filter}".</p>
          </div>
        )}
      </div>
    </div>
  );
}

export const KidzTicketList = TicketListPage;
export default KidzTicketList;
