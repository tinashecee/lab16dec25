import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  Download,
  ChevronUp,
  ChevronDown,
  Activity,
  RefreshCw,
} from "lucide-react";
import { User, userService } from "../../services/userService";
import { format } from "date-fns";
import NewUserModal from "./NewUserModal";
import ConfirmationModal from "../common/ConfirmationModal";
import { downloadCSV } from "../../utils/exportUtils";
import { activityLogService, formatActivityDetails } from "../../services/activityLogService";
import ActivityLogModal from "./ActivityLogModal";
import { db } from "../../config/firebase";
import { DocumentSnapshot } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";

type SortField = "name" | "department" | "role" | "dateJoined" | "status";
type SortDirection = "asc" | "desc";

interface SortableColumnProps {
  field: SortField;
  currentSort: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}

const SortableColumn: React.FC<SortableColumnProps> = ({
  field,
  currentSort,
  direction,
  onSort,
  children,
}) => (
  <th
    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
    onClick={() => onSort(field)}>
    <div className="flex items-center gap-1">
      <span>{children}</span>
      <div className="flex flex-col">
        <ChevronUp
          className={`w-3 h-3 ${
            currentSort === field && direction === "asc"
              ? "text-primary-600"
              : "text-gray-400"
          }`}
        />
        <ChevronDown
          className={`w-3 h-3 -mt-1 ${
            currentSort === field && direction === "desc"
              ? "text-primary-600"
              : "text-gray-400"
          }`}
        />
      </div>
    </div>
  </th>
);

export default function UsersSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(20);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [userForActivityLog, setUserForActivityLog] = useState<User | null>(
    null
  );
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(
    []
  );
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [departmentRolesMap, setDepartmentRolesMap] = useState<
    Record<string, string[]>
  >({});

  // Add debouncing for search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get the actual limit to use for the query
      const queryLimit = itemsPerPage === 'all' ? 1000 : itemsPerPage;
      
      const result = await userService.getUsers(
        currentPage === 1 ? null : lastDoc,
        {
          status:
            statusFilter === "all"
              ? undefined
              : (statusFilter as "Active" | "Inactive"),
          department: departmentFilter === "all" ? undefined : departmentFilter,
          role: roleFilter === "all" ? undefined : roleFilter,
          searchTerm: debouncedSearchTerm || undefined,
          limit: queryLimit,
        }
      );

      if (currentPage === 1) {
        setUsers(result.users);
      } else {
        setUsers((prev) => [...prev, ...result.users]);
      }

      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch users"
      );
      setLoading(false);
    }
  };

  const fetchDepartmentsAndRoles = async () => {
    try {
      const departmentsRef = collection(db, "departments");
      const departmentsSnapshot = await getDocs(departmentsRef);

      const departments: string[] = [];
      const rolesMap: Record<string, string[]> = {};
      const allRoles = new Set<string>();

      departmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        departments.push(data.name);
        rolesMap[data.name] = data.roles || [];
        data.roles?.forEach((role: string) => allRoles.add(role));
      });

      setAvailableDepartments(departments);
      setDepartmentRolesMap(rolesMap);
      setAvailableRoles(Array.from(allRoles));
    } catch (error) {
      console.error("Error fetching departments and roles:", error);
    }
  };

  useEffect(() => {
    fetchDepartmentsAndRoles();
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);

        // Fetch initial users
        await fetchUsers();

        setLoading(false);
      } catch (error) {
        console.error("Error initializing data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to initialize data"
        );
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Fetch users when filters or itemsPerPage change
  useEffect(() => {
    setCurrentPage(1); // Reset to first page
    setLastDoc(null); // Reset last document
    fetchUsers();
  }, [debouncedSearchTerm, departmentFilter, roleFilter, statusFilter, itemsPerPage]);

  // Load more users when scrolling
  const loadMore = async () => {
    if (!hasMore || loading) return;
    setCurrentPage((prev) => prev + 1);
    await fetchUsers();
  };

  const handleEditUser = (user: User) => {
    setEditingUser({
      ...user,
      name: user.name || "",
      department: user.department || "",
      role: user.role || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      dateJoined: user.dateJoined || "",
      status: user.status || "Active",
    });
    setIsNewUserModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete?.id) return;

    try {
      await userService.updateUser(userToDelete.id, { status: "Inactive" });
      await fetchUsers();
      setUserToDelete(null);
    } catch (err) {
      console.error("Failed to deactivate user:", err);
    }
  };

  const handleStatusChange = async (
    userId: string,
    newStatus: "Active" | "Inactive"
  ) => {
    try {
      await userService.updateUser(userId, { status: newStatus });
      const user = users.find((u) => u.id === userId);
      if (user) {
        await activityLogService.logActivity({
          userId: userId || '',
          userName: user.name || '',
          action: newStatus === 'Inactive' ? 'ACCOUNT_DEACTIVATED' : 'STATUS_CHANGE',
          details: formatActivityDetails(newStatus === 'Inactive' ? 'ACCOUNT_DEACTIVATED' : 'STATUS_CHANGE', { status: newStatus }),
          metadata: { status: newStatus },
        });
      }
      await fetchUsers();
    } catch (err) {
      console.error("Failed to update user status:", err);
    }
  };

  const departments = Array.from(new Set(users.map((user) => user.department)));
  const roles = Array.from(new Set(users.map((user) => user.role)));

  const filteredUsers = users.filter((user) => {
    if (!user) return false;

    const matchesSearch =
      (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (user.phoneNumber?.includes(searchTerm) ?? false);

    const matchesDepartment =
      departmentFilter === "all" || user.department === departmentFilter;
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set());
    } else {
      const allUserIds = filteredUsers
        .filter((user) => user.status === "Active")
        .map((user) => user.id!)
        .filter(Boolean);
      setSelectedUsers(new Set(allUserIds));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
    setSelectAll(false);
  };

  const handleBulkDeactivate = async () => {
    try {
      await Promise.all(
        Array.from(selectedUsers).map((userId) =>
          userService.updateUser(userId, { status: "Inactive" })
        )
      );
      await fetchUsers();
      setSelectedUsers(new Set());
      setSelectAll(false);
    } catch (err) {
      console.error("Failed to deactivate users:", err);
    }
  };

  const handleExport = () => {
    const exportData = filteredUsers.map((user) => ({
      Name: user.name,
      Department: user.department,
      Role: user.role,
      Email: user.email,
      "Phone Number": user.phoneNumber,
      "Date Joined": format(new Date(user.dateJoined), "yyyy-MM-dd"),
      Status: user.status,
    }));

    downloadCSV(exportData, `users-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const direction = sortDirection === "asc" ? 1 : -1;

    switch (sortField) {
      case "name":
        return direction * (a.name || "").localeCompare(b.name || "");
      case "department":
        return (
          direction * (a.department || "").localeCompare(b.department || "")
        );
      case "role":
        return direction * (a.role || "").localeCompare(b.role || "");
      case "dateJoined":
        return (
          direction *
          (new Date(a.dateJoined || 0).getTime() -
            new Date(b.dateJoined || 0).getTime())
        );
      case "status":
        return direction * (a.status || "").localeCompare(b.status || "");
      default:
        return 0;
    }
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setItemsPerPage(value === 'all' ? 'all' : parseInt(value));
  };

  const Pagination = () => (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          Showing <span className="font-medium">{users.length}</span> results
        </span>
        <div className="flex items-center gap-2">
          <select
            value={itemsPerPage.toString()}
            onChange={handleItemsPerPageChange}
            className="px-2 py-1 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="20">20 per page</option>
            <option value="40">40 per page</option>
            <option value="60">60 per page</option>
            <option value="80">80 per page</option>
            <option value="100">100 per page</option>
            <option value="all">All</option>
          </select>
        </div>
        {itemsPerPage !== 'all' && hasMore && (
          <button
            onClick={loadMore}
            disabled={!hasMore || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 disabled:opacity-50">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Load More"}
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return <div className="animate-pulse">Loading users...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-secondary-900">Users</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => {
              setEditingUser(null);
              setIsNewUserModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {selectedUsers.size > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-secondary-600">
              {selectedUsers.size} users selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDeactivate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Trash2 className="w-4 h-4" />
              <span>Deactivate Selected</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex gap-4">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="all">All Roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 hover:text-gray-700">
                  {selectAll ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <SortableColumn
                field="name"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}>
                Name
              </SortableColumn>
              <SortableColumn
                field="department"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}>
                Department
              </SortableColumn>
              <SortableColumn
                field="role"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}>
                Role
              </SortableColumn>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Phone
              </th>
              <SortableColumn
                field="dateJoined"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}>
                Joined
              </SortableColumn>
              <SortableColumn
                field="status"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}>
                Status
              </SortableColumn>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  {user.status === "Active" && (
                    <button
                      onClick={() => handleSelectUser(user.id!)}
                      className="flex items-center gap-2">
                      {selectedUsers.has(user.id!) ? (
                        <CheckSquare className="w-4 h-4 text-primary-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-secondary-900">
                  {user.name}
                </td>
                <td className="px-6 py-4 text-sm text-secondary-600">
                  {user.department}
                </td>
                <td className="px-6 py-4 text-sm text-secondary-600">
                  {user.role}
                </td>
                <td className="px-6 py-4 text-sm text-secondary-600">
                  {user.email}
                </td>
                <td className="px-6 py-4 text-sm text-secondary-600">
                  {user.phoneNumber}
                </td>
                <td className="px-6 py-4 text-sm text-secondary-600">
                  {format(new Date(user.dateJoined), "MMM d, yyyy")}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      user.status === "Active"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-50 text-gray-700"
                    }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-1 text-secondary-400 hover:text-secondary-600 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setUserToDelete(user)}
                      className="p-1 text-red-400 hover:text-red-600 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <select
                      value={user.status}
                      onChange={(e) =>
                        handleStatusChange(
                          user.id!,
                          e.target.value as "Active" | "Inactive"
                        )
                      }
                      className="text-sm border-0 bg-transparent focus:ring-0">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    <button
                      onClick={() => setUserForActivityLog(user)}
                      className="p-1 text-secondary-400 hover:text-secondary-600 rounded">
                      <Activity className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination />

      {isNewUserModalOpen && (
        <NewUserModal
          isOpen={isNewUserModalOpen}
          onClose={() => setIsNewUserModalOpen(false)}
          onSuccess={fetchUsers}
          departments={availableDepartments}
          roles={availableRoles}
          departmentRolesMap={departmentRolesMap}
          initialData={editingUser}
        />
      )}

      <ConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${userToDelete?.name}? This will prevent them from accessing the system.`}
        confirmText="Deactivate"
        type="danger"
      />

      {userForActivityLog && (
        <ActivityLogModal
          isOpen={!!userForActivityLog}
          onClose={() => setUserForActivityLog(null)}
          user={{
            id: userForActivityLog.id || '',
            name: userForActivityLog.name || '',
            email: userForActivityLog.email || '',
            phoneNumber: userForActivityLog.phoneNumber || '',
            department: userForActivityLog.department || '',
            role: userForActivityLog.role || '',
            dateJoined: userForActivityLog.dateJoined || '',
            status: userForActivityLog.status || 'Active',
          }}
        />
      )}
    </div>
  );
}
