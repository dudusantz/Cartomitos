"use client";

import Link from "next/link";
import { teamPath } from "@/lib/routes";

type Team = {
  id: number;
  nome?: string | null;
  slug?: string | null;
};

export default function TeamLink({
  team,
  children,
  className = "",
}: {
  team: Team | null | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  if (!team?.id) return <>{children}</>;

  return (
    <Link
      href={teamPath(team)}
      onClick={(event) => event.stopPropagation()}
      className={`rounded-md outline-none transition-colors hover:text-yellow-400 focus-visible:ring-2 focus-visible:ring-yellow-400 ${className}`}
      aria-label={`Ver perfil do ${team.nome || "time"}`}
    >
      {children}
    </Link>
  );
}
