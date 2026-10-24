/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, UserCog, Plus, Trash2, Edit, Loader2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { adminHead } from "@/components/AdminPage";
import {
  getStudentsFn,
  createStudentFn,
  updateStudentFn,
  deleteStudentFn,
  getAssistantsFn,
  createAssistantFn,
  updateAssistantFn,
  deleteAssistantFn,
} from "@/lib/admin-server";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/students")({
  head: adminHead("إدارة الحسابات", "إنشاء وإدارة حسابات الطلاب والمساعدين."),
  loader: async () => {
    try {
      const [students, assistants] = await Promise.all([
        getStudentsFn().catch(() => []),
        getAssistantsFn().catch(() => []),
      ]);
      return { students, assistants };
    } catch {
      return { students: [], assistants: [] };
    }
  },
  component: AdminStudentsManagement,
});

function AdminStudentsManagement() {
  const queryClient = useQueryClient();
  const initialData = Route.useLoaderData();

  const [activeTab, setActiveTab] = useState<"students" | "assistants">("students");

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["admin-students"],
    queryFn: () => getStudentsFn(),
    initialData: initialData.students,
  });

  const { data: assistants = [], isLoading: loadingAssistants } = useQuery({
    queryKey: ["admin-assistants"],
    queryFn: () => getAssistantsFn(),
    initialData: initialData.assistants,
  });

  // Student dialogs
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState("");

  // Assistant dialogs
  const [isAddAssistantOpen, setIsAddAssistantOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<any | null>(null);
  const [assistantName, setAssistantName] = useState("");
  const [assistantEmail, setAssistantEmail] = useState("");
  const [assistantPassword, setAssistantPassword] = useState("");
  const [permissions, setPermissions] = useState({
    canAddStudents: true,
    canAddQuizzes: true,
    canAddLessons: true,
    canViewResults: true,
  });

  // Mutations
  const createStudentMutation = useMutation({
    mutationFn: (vars: any) => createStudentFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success("تم إنشاء حساب الطالب بنجاح");
      setIsAddStudentOpen(false);
      resetStudentForm();
    },
    onError: (err: Error) => toast.error(err.message || "فشل إنشاء حساب الطالب"),
  });

  const updateStudentMutation = useMutation({
    mutationFn: (vars: any) => updateStudentFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success("تم تحديث بيانات الطالب بنجاح");
      setEditingStudent(null);
      resetStudentForm();
    },
    onError: (err: Error) => toast.error(err.message || "فشل التحديث"),
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (vars: any) => deleteStudentFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success("تم حذف حساب الطالب بنجاح");
    },
    onError: (err: Error) => toast.error(err.message || "فشل الحذف"),
  });

  const createAssistantMutation = useMutation({
    mutationFn: (vars: any) => createAssistantFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assistants"] });
      toast.success("تم إنشاء حساب المساعد بنجاح");
      setIsAddAssistantOpen(false);
      resetAssistantForm();
    },
    onError: (err: Error) => toast.error(err.message || "فشل إنشاء حساب المساعد"),
  });

  const updateAssistantMutation = useMutation({
    mutationFn: (vars: any) => updateAssistantFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assistants"] });
      toast.success("تم تحديث بيانات المساعد بنجاح");
      setEditingAssistant(null);
      resetAssistantForm();
    },
    onError: (err: Error) => toast.error(err.message || "فشل التحديث"),
  });

  const deleteAssistantMutation = useMutation({
    mutationFn: (vars: any) => deleteAssistantFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assistants"] });
      toast.success("تم حذف حساب المساعد بنجاح");
    },
    onError: (err: Error) => toast.error(err.message || "فشل الحذف"),
  });

  const resetStudentForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setGrade("");
  };

  const resetAssistantForm = () => {
    setAssistantName("");
    setAssistantEmail("");
    setAssistantPassword("");
    setPermissions({
      canAddStudents: true,
      canAddQuizzes: true,
      canAddLessons: true,
      canViewResults: true,
    });
  };

  const handleOpenEditStudent = (st: any) => {
    setEditingStudent(st);
    setFullName(st.full_name || "");
    setGrade(st.grade || "");
    setPassword("");
  };

  const handleOpenEditAssistant = (ast: any) => {
    setEditingAssistant(ast);
    setAssistantName(ast.full_name || "");
    setAssistantPassword("");
    try {
      const parsed = ast.grade ? JSON.parse(ast.grade) : {};
      setPermissions({
        canAddStudents: parsed.canAddStudents ?? true,
        canAddQuizzes: parsed.canAddQuizzes ?? true,
        canAddLessons: parsed.canAddLessons ?? true,
        canViewResults: parsed.canViewResults ?? true,
      });
    } catch {
      setPermissions({
        canAddStudents: true,
        canAddQuizzes: true,
        canAddLessons: true,
        canViewResults: true,
      });
    }
  };

  return (
    <>
      <PageHeader
        title="إدارة الحسابات (الطلاب والمساعدين)"
        desc="أنشئ حسابات الطلاب وأضف مساعدين ذوي صلاحيات محددة."
        action={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                resetStudentForm();
                setIsAddStudentOpen(true);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="ml-2 size-4" /> إضافة طالب
            </Button>
            <Button
              onClick={() => {
                resetAssistantForm();
                setIsAddAssistantOpen(true);
              }}
              variant="outline"
              className="border-gold/60 text-gold hover:bg-gold/10"
            >
              <UserCog className="ml-2 size-4" /> إضافة مساعد
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab("students")}
          className={`pb-3 px-6 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === "students"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="size-4" /> الطلاب المسجّلون ({students.length})
        </button>
        <button
          onClick={() => setActiveTab("assistants")}
          className={`pb-3 px-6 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === "assistants"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserCog className="size-4" /> المساعدون الإداريون ({assistants.length})
        </button>
      </div>

      {activeTab === "students" && (
        <>
          {loadingStudents ? (
            <div className="flex justify-center p-12">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : students.length === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
              <Users className="mx-auto size-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-bold text-primary">لا يوجد طلاب مسجّلون</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                انقر فوق زر إضافة طالب للبدء في إنشاء حسابات الطلاب.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b bg-secondary/50 text-xs font-semibold text-muted-foreground">
                    <th className="p-4">الاسم الكامل</th>
                    <th className="p-4">الصف الدراسي</th>
                    <th className="p-4">تاريخ الانضمام</th>
                    <th className="p-4 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {students.map((st: any) => (
                    <tr key={st.id} className="hover:bg-secondary/20 transition">
                      <td className="p-4 font-bold text-foreground">{st.full_name}</td>
                      <td className="p-4 text-muted-foreground">{st.grade || "غير محدد"}</td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(st.created_at).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="p-4 text-left space-x-2 space-x-reverse">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditStudent(st)}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف حساب هذا الطالب؟")) {
                              deleteStudentMutation.mutate({ id: st.id });
                            }
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "assistants" && (
        <>
          {loadingAssistants ? (
            <div className="flex justify-center p-12">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : assistants.length === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
              <UserCog className="mx-auto size-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-bold text-primary">لا يوجد مساعدون مضافون بعد</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                يمكنك إضافة مساعدين وصلاحيات مخصصة لكل منهم لمساعدتك في إدارة المنصة.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b bg-secondary/50 text-xs font-semibold text-muted-foreground">
                    <th className="p-4">اسم المساعد</th>
                    <th className="p-4">الصلاحيات المخولة</th>
                    <th className="p-4">تاريخ الإضافة</th>
                    <th className="p-4 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {assistants.map((ast: any) => {
                    let parsedPerms: any = {};
                    try {
                      parsedPerms = ast.grade ? JSON.parse(ast.grade) : {};
                    } catch {}
                    return (
                      <tr key={ast.id} className="hover:bg-secondary/20 transition">
                        <td className="p-4 font-bold text-foreground flex items-center gap-2">
                          <ShieldCheck className="size-4 text-primary" /> {ast.full_name}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5">
                            {parsedPerms.canAddStudents && (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                إضافة طلاب
                              </span>
                            )}
                            {parsedPerms.canAddQuizzes && (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                إضافة تدريبات
                              </span>
                            )}
                            {parsedPerms.canAddLessons && (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                إضافة محاضرات
                              </span>
                            )}
                            {parsedPerms.canViewResults && (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                مراقبة النتائج
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(ast.created_at).toLocaleDateString("ar-EG")}
                        </td>
                        <td className="p-4 text-left space-x-2 space-x-reverse">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditAssistant(ast)}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف حساب هذا المساعد؟")) {
                                deleteAssistantMutation.mutate({ id: ast.id });
                              }
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add Student Dialog */}
      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
        <DialogContent className="text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">إضافة طالب جديد</DialogTitle>
            <DialogDescription>
              أنشئ حساباً جديداً للطالب بالبريد الإلكتروني وكلمة المرور.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createStudentMutation.mutate({ fullName, email, password, grade });
            }}
            className="space-y-4 mt-2"
          >
            <div>
              <Label>الاسم الكامل</Label>
              <Input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: أحمد محمد علي"
              />
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
              />
            </div>
            <div>
              <Label>كلمة المرور (6 أحرف على الأقل)</Label>
              <Input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label>الصف الدراسي</Label>
              <Input
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="مثال: الصف الأول الثانوي"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddStudentOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createStudentMutation.isPending}>
                {createStudentMutation.isPending && (
                  <Loader2 className="ml-2 size-4 animate-spin" />
                )}
                حفظ وإنشاء الحساب
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              تعديل بيانات الطالب
            </DialogTitle>
            <DialogDescription>تعديل اسم الطالب، صفه الدراسي، أو كلمة المرور.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingStudent) {
                updateStudentMutation.mutate({
                  id: editingStudent.id,
                  fullName,
                  grade,
                  password: password || undefined,
                });
              }
            }}
            className="space-y-4 mt-2"
          >
            <div>
              <Label>الاسم الكامل</Label>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>الصف الدراسي</Label>
              <Input value={grade} onChange={(e) => setGrade(e.target.value)} />
            </div>
            <div>
              <Label>كلمة المرور الجديدة (اختياري)</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="اتركها فارغة إذا لم ترد التغيير"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={updateStudentMutation.isPending}>
                {updateStudentMutation.isPending && (
                  <Loader2 className="ml-2 size-4 animate-spin" />
                )}
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Assistant Dialog */}
      <Dialog open={isAddAssistantOpen} onOpenChange={setIsAddAssistantOpen}>
        <DialogContent className="text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              إضافة مساعد إداري جديد
            </DialogTitle>
            <DialogDescription>
              أنشئ حساب مساعد وحدد صلاحيات الوصول الخاصة به في لوحة التحكم.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createAssistantMutation.mutate({
                fullName: assistantName,
                email: assistantEmail,
                password: assistantPassword,
                permissions,
              });
            }}
            className="space-y-4 mt-2"
          >
            <div>
              <Label>اسم المساعد الكامل</Label>
              <Input
                required
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                placeholder="مثال: محمود خالد"
              />
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input
                required
                type="email"
                value={assistantEmail}
                onChange={(e) => setAssistantEmail(e.target.value)}
                placeholder="assistant@example.com"
              />
            </div>
            <div>
              <Label>كلمة المرور (6 أحرف على الأقل)</Label>
              <Input
                required
                type="password"
                value={assistantPassword}
                onChange={(e) => setAssistantPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2 border-t pt-3">
              <Label className="font-bold text-foreground">الصلاحيات المخولة للمساعد:</Label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-secondary/40">
                  <input
                    type="checkbox"
                    checked={permissions.canAddStudents}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canAddStudents: e.target.checked })
                    }
                    className="accent-primary size-4"
                  />
                  إضافة الطلاب
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-secondary/40">
                  <input
                    type="checkbox"
                    checked={permissions.canAddQuizzes}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canAddQuizzes: e.target.checked })
                    }
                    className="accent-primary size-4"
                  />
                  إضافة التدريبات والاختبارات
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-secondary/40">
                  <input
                    type="checkbox"
                    checked={permissions.canAddLessons}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canAddLessons: e.target.checked })
                    }
                    className="accent-primary size-4"
                  />
                  إضافة المحاضرات
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-secondary/40">
                  <input
                    type="checkbox"
                    checked={permissions.canViewResults}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canViewResults: e.target.checked })
                    }
                    className="accent-primary size-4"
                  />
                  مراقبة وتصحيح النتائج
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddAssistantOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createAssistantMutation.isPending}>
                {createAssistantMutation.isPending && (
                  <Loader2 className="ml-2 size-4 animate-spin" />
                )}
                حفظ وإنشاء حساب المساعد
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Assistant Dialog */}
      <Dialog open={!!editingAssistant} onOpenChange={(open) => !open && setEditingAssistant(null)}>
        <DialogContent className="text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              تعديل بيانات وصلاحيات المساعد
            </DialogTitle>
            <DialogDescription>تعديل اسم المساعد، كلمة المرور، أو الصلاحيات.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingAssistant) {
                updateAssistantMutation.mutate({
                  id: editingAssistant.id,
                  fullName: assistantName,
                  password: assistantPassword || undefined,
                  permissions,
                });
              }
            }}
            className="space-y-4 mt-2"
          >
            <div>
              <Label>اسم المساعد الكامل</Label>
              <Input
                required
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
              />
            </div>
            <div>
              <Label>كلمة المرور الجديدة (اختياري)</Label>
              <Input
                type="password"
                value={assistantPassword}
                onChange={(e) => setAssistantPassword(e.target.value)}
                placeholder="اتركها فارغة إذا لم ترد التغيير"
              />
            </div>

            <div className="space-y-2 border-t pt-3">
              <Label className="font-bold text-foreground">الصلاحيات المخولة للمساعد:</Label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-secondary/40">
                  <input
                    type="checkbox"
                    checked={permissions.canAddStudents}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canAddStudents: e.target.checked })
                    }
                    className="accent-primary size-4"
                  />
                  إضافة الطلاب
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-secondary/40">
                  <input
                    type="checkbox"
                    checked={permissions.canAddQuizzes}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canAddQuizzes: e.target.checked })
                    }
                    className="accent-primary size-4"
                  />
                  إضافة التدريبات والاختبارات
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-secondary/40">
                  <input
                    type="checkbox"
                    checked={permissions.canAddLessons}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canAddLessons: e.target.checked })
                    }
                    className="accent-primary size-4"
                  />
                  إضافة المحاضرات
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-secondary/40">
                  <input
                    type="checkbox"
                    checked={permissions.canViewResults}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canViewResults: e.target.checked })
                    }
                    className="accent-primary size-4"
                  />
                  مراقبة وتصحيح النتائج
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingAssistant(null)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={updateAssistantMutation.isPending}>
                {updateAssistantMutation.isPending && (
                  <Loader2 className="ml-2 size-4 animate-spin" />
                )}
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
