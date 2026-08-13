"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { useAuth } from "@/components/auth-provider";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon, UserMultipleIcon } from "@hugeicons/core-free-icons";

interface CmsUser {
  uid: string;
  email?: string;
  role?: string;
  disabled: boolean;
  providers: string[];
  creationTime?: string;
}

const roleTone: Record<string, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-primary/10 text-primary" },
  medical: { label: "Medical", className: "bg-emerald-500/10 text-emerald-600" },
};

function toneFor(role: string | undefined) {
  if (role && roleTone[role]) return roleTone[role];
  return { label: "None", className: "bg-muted text-muted-foreground" };
}

function formatCreation(value: string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function providerLabel(provider: string) {
  const map: Record<string, string> = {
    password: "Email",
    "google.com": "Google",
    "apple.com": "Apple",
    phone: "Phone",
  };
  return map[provider] ?? provider;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<CmsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CmsUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load users");
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err) {
      console.error(err);
      setError("Failed to load users. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { total: users.length, disabled: 0 };
    for (const u of users) {
      if (u.role) out[u.role] = (out[u.role] ?? 0) + 1;
      if (u.disabled) out.disabled += 1;
    }
    return out;
  }, [users]);

  const mutate = async (uid: string, body: unknown) => {
    const res = await fetch(`/api/users/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Update failed");
    }
  };

  const handleRoleChange = async (uid: string, role: string) => {
    if (uid === currentUser?.uid) {
      toast.add({ title: "You can't change your own role", type: "error" });
      return;
    }
    try {
      await mutate(uid, { role: role === "" ? null : role });
      toast.add({ title: "Role updated", type: "success" });
      load();
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to update role", type: "error" });
    }
  };

  const handleToggleDisabled = async (target: CmsUser, disabled: boolean) => {
    if (target.uid === currentUser?.uid) {
      toast.add({ title: "You can't disable your own account", type: "error" });
      return;
    }
    try {
      await mutate(target.uid, { disabled });
      toast.add({
        title: disabled ? "Account disabled" : "Account enabled",
        type: "success",
      });
      load();
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to update account", type: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.uid === currentUser?.uid) {
      toast.add({ title: "You can't delete your own account", type: "error" });
      setDeleteTarget(null);
      return;
    }
    try {
      const res = await fetch(`/api/users/${deleteTarget.uid}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.add({ title: "User deleted", type: "success" });
      setDeleteTarget(null);
      load();
    } catch (err) {
      console.error(err);
      toast.add({ title: "Failed to delete user", type: "error" });
    }
  };

  const columns = useMemo<ColumnDef<CmsUser>[]>(
    () => [
      {
        accessorKey: "email",
        header: "User",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {(u.email ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{u.email ?? "No email"}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{u.uid}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          const u = row.original;
          const tone = toneFor(u.role);
          return (
            <div className="flex items-center gap-2">
              <Badge className={tone.className} variant="outline">
                {tone.label}
              </Badge>
              <NativeSelect
                size="sm"
                value={u.role ?? ""}
                onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                aria-label="Change role"
              >
                <NativeSelectOption value="">No access</NativeSelectOption>
                <NativeSelectOption value="admin">Admin</NativeSelectOption>
                <NativeSelectOption value="medical">Medical</NativeSelectOption>
              </NativeSelect>
            </div>
          );
        },
      },
      {
        accessorKey: "disabled",
        header: "Status",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-2">
              <Switch
                size="sm"
                checked={!u.disabled}
                onCheckedChange={(checked) => handleToggleDisabled(u, !checked)}
              />
              <span className="text-sm text-muted-foreground">
                {u.disabled ? "Disabled" : "Active"}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "providers",
        header: "Provider",
        cell: ({ getValue }) => {
          const providers = String(getValue() ?? "");
          return providers.length > 0 ? providerLabel(providers) : "—";
        },
      },
      {
        accessorKey: "creationTime",
        header: "Created",
        cell: ({ getValue }) => formatCreation(String(getValue() ?? "")),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser?.uid, load],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage CMS staff and app accounts"
        action={
          <Button variant="outline" onClick={load} disabled={loading}>
            <HugeiconsIcon icon={RefreshIcon} />
            Refresh
          </Button>
        }
      />

      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={UserMultipleIcon} />
        </div>
        <div>
          <p className="text-sm font-medium">
            {counts.total} account{counts.total === 1 ? "" : "s"} registered
          </p>
          <p className="text-xs text-muted-foreground">
            {counts.admin ?? 0} admin · {counts.medical ?? 0} medical · {counts.disabled} disabled
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        error={error}
        onRetry={load}
        searchable
        pageSize={15}
        keyExtractor={(item) => item.uid}
        onDelete={(item) => setDeleteTarget(item)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete User"
        description={
          deleteTarget
            ? `Permanently delete ${deleteTarget.email ?? "this account"}? This cannot be undone.`
            : ""
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}
