import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, UserX, RefreshCcw, Users } from "lucide-react";
import { centerUserService, CenterUser, CenterUserStatus } from "../../services/centerUserService";
import { Button } from "../ui/button";
import { useToast } from "@/components/ui/use-toast";
import { DataTable } from "../ui/DataTable";

const statusBadgeClass: Record<CenterUserStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
};

export default function CenterUsersSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<CenterUser[]>([]);
  const [statusFilter, setStatusFilter] = useState<CenterUserStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await centerUserService.getCenterUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to load center users",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    if (statusFilter === "all") return users;
    return users.filter((u) => u.status === statusFilter);
  }, [statusFilter, users]);

  const handleStatusChange = async (user: CenterUser, status: CenterUserStatus) => {
    setUpdatingId(user.id);
    try {
      await centerUserService.updateStatus(user.id, status);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status } : u))
      );
      toast({
        title: "Status updated",
        description: `${user.name} is now ${status}.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const columns = [
    { key: "name", label: "Name", width: "180px" },
    { key: "email", label: "Email", width: "220px" },
    { key: "phone", label: "Phone", width: "140px" },
    { key: "center", label: "Center", width: "160px" },
    {
      key: "status",
      label: "Status",
      width: "120px",
      render: (value: CenterUserStatus) => (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusBadgeClass[value]}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "200px",
      render: (_: unknown, user: CenterUser) => (
        <div className="flex gap-2">
          {user.status !== "approved" && (
            <Button
              size="sm"
              variant="outline"
              disabled={updatingId === user.id}
              onClick={() => handleStatusChange(user, "approved")}
              className="inline-flex items-center gap-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve
            </Button>
          )}
          {user.status !== "inactive" && (
            <Button
              size="sm"
              variant="destructive"
              disabled={updatingId === user.id}
              onClick={() => handleStatusChange(user, "inactive")}
              className="inline-flex items-center gap-1"
            >
              <UserX className="w-4 h-4" />
              Inactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-secondary-900">Center Users</h2>
            <p className="text-sm text-secondary-600">Manage access for center users</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CenterUserStatus | "all")}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="inactive">Inactive</option>
          </select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={loading}
        emptyMessage="No center users found."
      />
    </div>
  );
}

