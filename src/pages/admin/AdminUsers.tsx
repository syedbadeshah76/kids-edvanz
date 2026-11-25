import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Eye, Pencil, Trash2, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  adminUsersService,
  type AdminUser,
  type AdminUserRole,
  type AdminUserStatus,
} from "@/services/admin-users.service";

const ROLE_BADGE: Record<AdminUserRole, string> = {
  instructor: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  student: "bg-sky-100 text-sky-700 hover:bg-sky-100",
  admin: "bg-rose-100 text-rose-700 hover:bg-rose-100",
};
const getStatusBadgeStyle = (status: string) => {
  const s = (status || "").toUpperCase();
  if (s === "ACTIVE") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
  if (s === "PENDING_APPROVAL" || s === "PENDING") return "bg-amber-100 text-amber-700 hover:bg-amber-100";
  if (s === "INACTIVE") return "bg-slate-100 text-slate-700 hover:bg-slate-100";
  if (s === "REJECTED" || s === "BANNED" || s === "BLOCKED") return "bg-rose-100 text-rose-700 hover:bg-rose-100";
  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
};

const avatarColors = ["bg-blue-500", "bg-purple-500", "bg-rose-500", "bg-emerald-500", "bg-amber-500", "bg-sky-500"];
const colorFor = (id: string) =>
  avatarColors[(id ? id.charCodeAt(id.length - 1) : 0) % avatarColors.length];

const errMessage = (e: unknown, fallback: string) => {
  const data = (e as any)?.response?.data;
  if (data?.fieldErrors && Array.isArray(data.fieldErrors) && data.fieldErrors.length > 0) {
    return data.fieldErrors.map((f: any) => f.message || `${f.field} is invalid`).join(", ");
  }
  if (data?.message) return data.message;
  if ((e as { message?: string })?.message) return (e as { message: string }).message;
  return fallback;
};

interface UserFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: AdminUserRole | "";
  status: AdminUserStatus | "";
  learningSector: string;
  sendInvitation: boolean;
}

const emptyForm: UserFormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "",
  status: "ACTIVE",
  learningSector: "IT",
  sendInvitation: false,
};

interface EditFormState {
  firstName: string;
  lastName: string;
  email: string;
  role: AdminUserRole | "";
  status: AdminUserStatus | "";
  learningSector: string;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AdminUserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);

  const [addForm, setAddForm] = useState<UserFormState>(emptyForm);
  const [editForm, setEditForm] = useState<EditFormState>({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    status: "",
    learningSector: "IT",
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch list — GET /api/admin/users?page={page}&size={pageSize}
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      adminUsersService
        .list({ search, role: roleFilter, status: statusFilter, page, size: pageSize })
        .then((res) => {
          if (alive) {
            setUsers(res.data);
            if (res.meta) {
              setTotalElements(res.meta.totalElements);
              setTotalPages(Math.max(1, res.meta.totalPages));
            }
          }
        })
        .catch((e) => {
          if (!alive) return;
          setUsers([]);
          toast({ title: "Failed to load users", description: errMessage(e, "Please try again."), variant: "destructive" });
        })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, statusFilter, page, pageSize]);

  // Reset page when search or filters change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  const handleRoleChange = (val: AdminUserRole | "all") => {
    setRoleFilter(val);
    setPage(0);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(0);
  };

  // Edit user — sync state
  useEffect(() => {
    if (editUser) {
      setEditForm({
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        email: editUser.email,
        role: editUser.role,
        status: editUser.status,
        learningSector: editUser.learningSector || "IT",
      });
    }
  }, [editUser]);

  // POST /api/admin/users
  const handleCreate = async () => {
    if (!addForm.firstName.trim() || !addForm.lastName.trim() || !addForm.email.trim() || !addForm.password || !addForm.role || !addForm.status) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email.trim())) {
      toast({ title: "Invalid email address", variant: "destructive" });
      return;
    }
    if (addForm.password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (addForm.password !== addForm.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminUsersService.create({
        firstName: addForm.firstName,
        lastName: addForm.lastName,
        email: addForm.email,
        password: addForm.password,
        role: addForm.role as AdminUserRole,
        status: addForm.status as AdminUserStatus,
        learningSector: addForm.learningSector.trim() || "IT",
        sendInvitation: addForm.sendInvitation,
      });
      setUsers((prev) => [res.data, ...prev]);
      setTotalElements((prev) => prev + 1);
      setAddOpen(false);
      setAddForm(emptyForm);
      toast({ title: "User created", description: `${res.data.name} was added successfully.` });
    } catch (e) {
      toast({ title: "Failed to create user", description: errMessage(e, "Please try again."), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // PUT /api/admin/users/{id} + PATCH /role when the role changed
  const handleUpdate = async () => {
    if (!editUser) return;
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim() || !editForm.role || !editForm.status) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      let updated = (await adminUsersService.update(editUser.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        role: editForm.role as AdminUserRole,
        status: editForm.status as AdminUserStatus,
        learningSector: editForm.learningSector.trim() || "IT",
      })).data;

      if (editForm.role !== editUser.role) {
        updated = (await adminUsersService.assignRole(editUser.id, editForm.role as AdminUserRole)).data;
      }

      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? updated : u)));
      setEditUser(null);
      toast({ title: "User updated" });
    } catch (e) {
      toast({ title: "Failed to update user", description: errMessage(e, "Please try again."), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE /api/admin/users/{id}
  const handleDelete = async () => {
    if (!deleteUser) return;
    setSubmitting(true);
    try {
      await adminUsersService.delete(deleteUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      setTotalElements((prev) => Math.max(0, prev - 1));
      setDeleteUser(null);
      toast({ title: "User deleted" });
    } catch (e) {
      toast({ title: "Failed to delete user", description: errMessage(e, "Please try again."), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Users</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage platform user and their permissions</p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Users
          </Button>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
            <div className="space-y-2">
              <Label>Search users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={roleFilter} onValueChange={(v) => handleRoleChange(v as AdminUserRole | "all")}>
                <SelectTrigger><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(v) => handleStatusChange(v)}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">PENDING_APPROVAL</SelectItem>
                  <SelectItem value="REJECTED">REJECTED</SelectItem>
                  <SelectItem value="BANNED">BANNED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-muted-foreground">
            <p>
              Showing{" "}
              <span className="font-semibold text-foreground">
                {totalElements === 0 ? 0 : page * pageSize + 1}
              </span>
              –
              <span className="font-semibold text-foreground">
                {Math.min((page + 1) * pageSize, totalElements || users.length)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{totalElements || users.length}</span> user
              {(totalElements || users.length) !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt={u.name} /> : null}
                          <AvatarFallback className={`${colorFor(u.id)} text-xs font-semibold text-white`}>
                            {adminUsersService.initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(u.joinedDate).toLocaleDateString("en-GB")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`capitalize ${ROLE_BADGE[u.role]}`}>{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`font-mono text-xs ${getStatusBadgeStyle(u.status)}`}>{u.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.role === "instructor" ? `${u.coursesCount} courses` : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="View" onClick={() => setViewUser(u)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditUser(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {/* <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleteUser(u)}>
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button> */}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalElements > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border bg-card">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Page <span className="font-semibold text-foreground">{page + 1}</span> of{" "}
                <span className="font-semibold text-foreground">{totalPages}</span>
              </p>

              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="h-8 gap-1 px-2.5 text-xs font-medium"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>

                {(() => {
                  const pages: (number | "…")[] = [];
                  for (let p = 0; p < totalPages; p++) {
                    if (p === 0 || p === totalPages - 1 || Math.abs(p - page) <= 1) {
                      pages.push(p);
                    } else if (pages[pages.length - 1] !== "…") {
                      pages.push("…");
                    }
                  }
                  return pages.map((p, idx) =>
                    p === "…" ? (
                      <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <Button
                        key={p}
                        size="sm"
                        variant={p === page ? "default" : "outline"}
                        className={`h-8 min-w-8 px-2.5 text-xs font-semibold ${
                          p === page
                            ? "bg-[#1D61E7] text-white hover:bg-blue-700 shadow-sm"
                            : "text-foreground hover:bg-accent"
                        }`}
                        onClick={() => setPage(p)}
                        disabled={loading}
                      >
                        {p + 1}
                      </Button>
                    )
                  );
                })()}

                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1 || loading}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="h-8 gap-1 px-2.5 text-xs font-medium"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Add User Modal */}
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddForm(emptyForm); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>Create a new user account on the platform</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  placeholder="First name"
                  value={addForm.firstName}
                  onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  placeholder="Last name"
                  value={addForm.lastName}
                  onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={addForm.confirmPassword}
                  onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={addForm.role || undefined} onValueChange={(v) => setAddForm({ ...addForm, role: v as AdminUserRole })}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={addForm.status || undefined} onValueChange={(v) => setAddForm({ ...addForm, status: v })}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">PENDING_APPROVAL</SelectItem>
                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                    <SelectItem value="BANNED">BANNED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Learning Sector</Label>
                <Input
                  placeholder="e.g. IT"
                  value={addForm.learningSector}
                  onChange={(e) => setAddForm({ ...addForm, learningSector: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="sendInvitation"
                  checked={addForm.sendInvitation}
                  onCheckedChange={(c) => setAddForm({ ...addForm, sendInvitation: !!c })}
                />
                <Label htmlFor="sendInvitation" className="font-normal">Send invitation email to user</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700">
                {submitting ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View User Modal */}
        <Dialog open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>View User</DialogTitle>
              <DialogDescription>User information</DialogDescription>
            </DialogHeader>
            {viewUser && (
              <div className="space-y-3 text-sm">
                <Row label="Name" value={viewUser.name} />
                <Row label="Email" value={viewUser.email} />
                <Row label="Role" value={viewUser.role} />
                <Row label="Learning Sector" value={viewUser.learningSector || "IT"} />
                <Row label="Status" value={viewUser.status} />
                <Row label="Joined" value={new Date(viewUser.joinedDate).toLocaleDateString("en-GB")} />
                {viewUser.role === "instructor" && <Row label="Courses" value={String(viewUser.coursesCount)} />}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewUser(null)}>Close</Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => { if (viewUser) { setEditUser(viewUser); setViewUser(null); } }}
              >
                Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information and assign a role</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editForm.role || undefined} onValueChange={(v) => setEditForm({ ...editForm, role: v as AdminUserRole })}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status || undefined} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">PENDING_APPROVAL</SelectItem>
                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                    <SelectItem value="BANNED">BANNED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Learning Sector</Label>
                <Input
                  placeholder="e.g. IT"
                  value={editForm.learningSector}
                  onChange={(e) => setEditForm({ ...editForm, learningSector: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700">
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {deleteUser?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AdminLayout>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize text-foreground">{value}</span>
    </div>
  );
}

export default AdminUsers;
