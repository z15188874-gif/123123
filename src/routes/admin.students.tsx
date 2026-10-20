/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { adminHead } from "@/components/AdminPage";
import {
  getStudentsFn,
  createStudentFn,
  updateStudentFn,
  deleteStudentFn,
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
  head: adminHead("حسابات الطلاب", "إنشاء وإدارة حسابات الطلاب."),
  loader: async () => {
    try {
      return await getStudentsFn();
    } catch {
      return [];
    }
  },
  component: AdminStudents,
});

function AdminStudents() {
  const queryClient = useQueryClient();
  const initialData = Route.useLoaderData();
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: () => getStudentsFn(),
    initialData,
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState("");

  const createMutation = useMutation({
    mutationFn: createStudentFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success("تم إنشاء حساب الطالب بنجاح");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "حدث خطأ أثناء إنشاء الحساب");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateStudentFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success("تم تحديث بيانات الطالب بنجاح");
      setEditingStudent(null);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "حدث خطأ أثناء التحديث");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStudentFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success("تم حذف حساب الطالب بنجاح");
    },
    onError: (err: Error) => {
      toast.error(err.message || "حدث خطأ أثناء الحذف");
    },
  });

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setGrade("");
  };

  const handleOpenEdit = (student: any) => {
    setEditingStudent(student);
    setFullName(student.full_name || "");
    setGrade(student.grade || "");
    setPassword("");
  };

  return (
    <>
      <PageHeader
        title="حسابات الطلاب"
        desc="أنشئ حسابات الطلاب وامنحهم بيانات الدخول."
        action={
          <Button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="ml-2 size-4" /> إضافة طالب
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <Users className="mx-auto size-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold text-primary">لا يوجد طلاب مسجّلون</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            الإدارة وحدها تنشئ الحسابات. انقر فوق زر إضافة طالب للبدء.
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
                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(st)}>
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذا الطالب؟")) {
                          deleteMutation.mutate({ id: st.id });
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

      {/* Add Student Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
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
              createMutation.mutate({ fullName, email, password, grade });
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
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
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
            <DialogDescription>
              تعديل اسم الطالب، صفه الدراسي، أو كلمة المرور الجديدة.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingStudent) {
                updateMutation.mutate({
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
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
