import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  SUPABASE_URL as DEFAULT_URL,
  SUPABASE_PUBLISHABLE_KEY as DEFAULT_KEY,
} from "@/integrations/supabase/client";
import { requireAdminAuth, requireStudentAuth } from "@/integrations/supabase/auth-middleware";

function getAdminSupabase() {
  const SUPABASE_URL =
    process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || DEFAULT_URL;
  const SUPABASE_SERVICE_ROLE_KEY =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    DEFAULT_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// 1. Dashboard Stats
export const getAdminStatsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async () => {
    const supabase = getAdminSupabase();
    const [studentsRes, lessonsRes, quizzesRes, attemptsRes] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("lessons").select("*", { count: "exact", head: true }),
      supabase.from("quizzes").select("*", { count: "exact", head: true }),
      supabase.from("quiz_attempts").select("*", { count: "exact", head: true }),
    ]);

    return {
      studentsCount: studentsRes.count ?? 0,
      lessonsCount: lessonsRes.count ?? 0,
      quizzesCount: quizzesRes.count ?? 0,
      attemptsCount: attemptsRes.count ?? 0,
    };
  });

// 2. Students Management
export const getStudentsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async () => {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  });

export const createStudentFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator((input: { fullName: string; email: string; password: string; grade?: string }) => {
    if (!input.fullName || !input.email || !input.password) {
      throw new Error("جميع الحقول الأساسية مطلوبة");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    // Create auth user using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email.trim(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, grade: data.grade, role: "student" },
      app_metadata: { role: "student" },
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || "فشل إنشاء حساب الطالب في النظام");
    }

    const userId = authData.user.id;

    // Upsert profile
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: data.fullName.trim(),
      grade: data.grade || null,
      role: "student",
    });

    if (profileError) {
      throw new Error(profileError.message);
    }

    return { success: true, userId };
  });

export const updateStudentFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator((input: { id: string; fullName: string; grade?: string; password?: string }) => {
    if (!input.id || !input.fullName) {
      throw new Error("معرّف الطالب والاسم مطلوبان");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();

    if (data.password && data.password.length >= 6) {
      await supabase.auth.admin.updateUserById(data.id, {
        password: data.password,
      });
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.fullName.trim(),
        grade: data.grade || null,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteStudentFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator((input: { id: string }) => {
    if (!input.id) throw new Error("معرّف الطالب مطلوب");
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    await supabase.auth.admin.deleteUser(data.id);
    await supabase.from("profiles").delete().eq("id", data.id);
    return { success: true };
  });

// 3. Lessons Management
export const getLessonsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async () => {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  });

export const saveLessonFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator((input: { id?: string; title: string; description?: string; grade?: string; videoUrl?: string; published?: boolean }) => {
    if (!input.title) throw new Error("عنوان المحاضرة مطلوب");
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const payload = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      grade: data.grade?.trim() || null,
      video_url: data.videoUrl?.trim() || null,
      published: data.published ?? false,
    };

    if (data.id) {
      const { error } = await supabase.from("lessons").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("lessons").insert(payload);
      if (error) throw new Error(error.message);
    }

    return { success: true };
  });

export const deleteLessonFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator((input: { id: string }) => {
    if (!input.id) throw new Error("معرّف المحاضرة مطلوب");
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("lessons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// 4. Quizzes Management
export const getQuizzesFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async () => {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  });

export const saveQuizFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator((input: { id?: string; title: string; description?: string; grade?: string; published?: boolean }) => {
    if (!input.title) throw new Error("عنوان التدريب مطلوب");
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const payload = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      grade: data.grade?.trim() || null,
      published: data.published ?? false,
    };

    if (data.id) {
      const { error } = await supabase.from("quizzes").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("quizzes").insert(payload);
      if (error) throw new Error(error.message);
    }

    return { success: true };
  });

export const deleteQuizFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator((input: { id: string }) => {
    if (!input.id) throw new Error("معرّف التدريب مطلوب");
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("quizzes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// 5. Results Management
export const getResultsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async () => {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("quiz_attempts")
      .select(`
        id,
        score,
        total_points,
        submitted_at,
        quiz:quizzes(title),
        student:profiles(full_name, grade)
      `)
      .order("submitted_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  });

// 6. Student Side Content Functions
export const getStudentContentFn = createServerFn({ method: "GET" })
  .middleware([requireStudentAuth])
  .handler(async () => {
    const supabase = getAdminSupabase();
    const [lessonsRes, quizzesRes] = await Promise.all([
      supabase.from("lessons").select("*").eq("published", true).order("created_at", { ascending: false }),
      supabase.from("quizzes").select("*").eq("published", true).order("created_at", { ascending: false }),
    ]);

    return {
      lessons: lessonsRes.data || [],
      quizzes: quizzesRes.data || [],
    };
  });

export const submitQuizAttemptFn = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .validator((input: { quizId: string; score: number; totalPoints: number }) => {
    if (!input.quizId) throw new Error("معرّف التدريب مطلوب");
    return input;
  })
  .handler(async ({ data, context }) => {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("quiz_attempts").insert({
      quiz_id: data.quizId,
      student_id: context.userId,
      score: data.score,
      total_points: data.totalPoints,
    });

    if (error) throw new Error(error.message);
    return { success: true };
  });
