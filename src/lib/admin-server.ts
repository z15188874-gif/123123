/* eslint-disable @typescript-eslint/no-explicit-any */
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

export function parseQuizDescription(rawDesc: string | null) {
  if (!rawDesc)
    return {
      desc: "",
      questions: [],
      maxAttempts: 1,
      durationMinutes: 0,
      startDate: "",
      endDate: "",
    };
  try {
    const parsed = JSON.parse(rawDesc);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.questions)) {
      return {
        desc: parsed.desc || "",
        questions: parsed.questions,
        maxAttempts: typeof parsed.maxAttempts === "number" ? parsed.maxAttempts : 1,
        durationMinutes: typeof parsed.durationMinutes === "number" ? parsed.durationMinutes : 0,
        startDate: parsed.startDate || "",
        endDate: parsed.endDate || "",
      };
    }
  } catch {
    // Plain text description
  }
  return {
    desc: rawDesc,
    questions: [],
    maxAttempts: 1,
    durationMinutes: 0,
    startDate: "",
    endDate: "",
  };
}

// 1. Dashboard Stats
export const getAdminStatsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async () => {
    const supabase = getAdminSupabase();
    const [studentsRes, lessonsRes, quizzesRes, attemptsRes, submissionsRes] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("lessons").select("*", { count: "exact", head: true }),
      supabase
        .from("quizzes")
        .select("*", { count: "exact", head: true })
        .neq("grade", "quiz_submission"),
      supabase
        .from("quiz_attempts")
        .select("*", { count: "exact", head: true })
        .catch(() => ({ count: 0 })),
      supabase
        .from("quizzes")
        .select("*", { count: "exact", head: true })
        .eq("grade", "quiz_submission"),
    ]);

    const totalAttempts = (attemptsRes.count ?? 0) + (submissionsRes.count ?? 0);

    return {
      studentsCount: studentsRes.count ?? 0,
      lessonsCount: lessonsRes.count ?? 0,
      quizzesCount: quizzesRes.count ?? 0,
      attemptsCount: totalAttempts,
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
  .validator(
    (input: {
      id?: string;
      title: string;
      description?: string;
      grade?: string;
      videoUrl?: string;
      published?: boolean;
    }) => {
      if (!input.title) throw new Error("عنوان المحاضرة مطلوب");
      return input;
    },
  )
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
      .neq("grade", "quiz_submission")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((q: any) => {
      const parsed = parseQuizDescription(q.description);
      return {
        ...q,
        parsedDescription: parsed.desc,
        questions: parsed.questions,
        maxAttempts: parsed.maxAttempts,
        durationMinutes: parsed.durationMinutes,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
      };
    });
  });

export const saveQuizFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(
    (input: {
      id?: string;
      title: string;
      description?: string;
      grade?: string;
      published?: boolean;
      questions?: any[];
      maxAttempts?: number;
      durationMinutes?: number;
      startDate?: string;
      endDate?: string;
    }) => {
      if (!input.title) throw new Error("عنوان التدريب مطلوب");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const quizContent = {
      desc: data.description?.trim() || "",
      questions: data.questions || [],
      maxAttempts: typeof data.maxAttempts === "number" ? data.maxAttempts : 1,
      durationMinutes: typeof data.durationMinutes === "number" ? data.durationMinutes : 0,
      startDate: data.startDate || "",
      endDate: data.endDate || "",
    };

    const payload = {
      title: data.title.trim(),
      description: JSON.stringify(quizContent),
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

export const getResultsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async () => {
    const supabase = getAdminSupabase();

    const { data: submissions } = await supabase
      .from("quizzes")
      .select("*")
      .eq("grade", "quiz_submission")
      .order("created_at", { ascending: false });

    const { data: rawAttempts } = await supabase
      .from("quiz_attempts")
      .select(`*, student:profiles(id, full_name, grade), quiz:quizzes(id, title, description)`)
      .catch(() => ({ data: [] }));

    const { data: profiles } = await supabase.from("profiles").select("id, full_name, grade");
    const { data: allQuizzes } = await supabase
      .from("quizzes")
      .select("id, title, description")
      .neq("grade", "quiz_submission");

    const profilesMap = new Map((profiles || []).map((p) => [p.id, p]));
    const quizzesMap = new Map((allQuizzes || []).map((q) => [q.id, q]));

    const results: any[] = [];

    for (const sub of submissions || []) {
      try {
        const parsed = JSON.parse(sub.description || "{}");
        const student = profilesMap.get(parsed.studentId) || {
          id: parsed.studentId,
          full_name: "طالب",
          grade: "",
        };
        const quiz = quizzesMap.get(parsed.quizId) || {
          id: parsed.quizId,
          title: "اختبار",
          description: "",
        };
        const parsedQuiz = parseQuizDescription(quiz.description);

        results.push({
          id: sub.id,
          attemptId: parsed.attemptId || sub.id,
          quiz_id: parsed.quizId,
          student_id: parsed.studentId,
          score: parsed.score ?? 0,
          total_points: parsed.totalPoints ?? 10,
          graded: parsed.graded ?? false,
          feedback: parsed.feedback || "",
          answers: parsed.answers || {},
          submitted_at: parsed.submitted_at || sub.created_at,
          student,
          quiz,
          quizQuestions: parsedQuiz.questions,
        });
      } catch {}
    }

    for (const att of rawAttempts || []) {
      const parsedQuiz = parseQuizDescription(att.quiz?.description);
      results.push({
        id: att.id,
        attemptId: att.id,
        quiz_id: att.quiz_id,
        student_id: att.student_id,
        score: att.score ?? 0,
        total_points: att.total_points ?? 10,
        graded: (att as any).graded ?? false,
        feedback: (att as any).feedback || "",
        answers: (att as any).answers || {},
        submitted_at: att.submitted_at,
        student: att.student || profilesMap.get(att.student_id) || { full_name: "طالب" },
        quiz: att.quiz || quizzesMap.get(att.quiz_id) || { title: "اختبار" },
        quizQuestions: parsedQuiz.questions,
      });
    }

    return results.sort(
      (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
    );
  });

export const updateQuizAttemptScoreFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(
    (input: { attemptId: string; newScore: number; feedback?: string; graded?: boolean }) => {
      if (!input.attemptId) throw new Error("معرّف المحاولة مطلوب");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();

    const { data: subRow } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", data.attemptId)
      .eq("grade", "quiz_submission")
      .single();

    if (subRow) {
      try {
        const parsed = JSON.parse(subRow.description || "{}");
        parsed.score = data.newScore;
        parsed.graded = true;
        if (data.feedback !== undefined) parsed.feedback = data.feedback;

        const { error } = await supabase
          .from("quizzes")
          .update({ description: JSON.stringify(parsed) })
          .eq("id", data.attemptId);

        if (error) throw new Error(error.message);
        return { success: true };
      } catch (e: any) {
        throw new Error(e.message || "فشل تحديث درجة الاختبار");
      }
    }

    const updatePayload: any = {
      score: data.newScore,
      graded: true,
    };
    if (data.feedback !== undefined) updatePayload.feedback = data.feedback;

    const { error } = await supabase
      .from("quiz_attempts")
      .update(updatePayload)
      .eq("id", data.attemptId);

    if (error) {
      const { error: err2 } = await supabase
        .from("quiz_attempts")
        .update({ score: data.newScore })
        .eq("id", data.attemptId);
      if (err2) throw new Error(err2.message);
    }
    return { success: true };
  });

export const getStudentContentFn = createServerFn({ method: "GET" })
  .middleware([requireStudentAuth])
  .handler(async ({ context }) => {
    const supabase = getAdminSupabase();
    const user = context.user;

    const { data: profile } = await supabase
      .from("profiles")
      .select("grade")
      .eq("id", user.id)
      .single();

    const studentGrade = profile?.grade;

    let lessonsQuery = supabase
      .from("lessons")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (studentGrade) {
      lessonsQuery = lessonsQuery.or(`grade.is.null,grade.eq.${studentGrade}`);
    }

    const { data: lessons } = await lessonsQuery;

    let quizzesQuery = supabase
      .from("quizzes")
      .select("*")
      .eq("published", true)
      .neq("grade", "quiz_submission")
      .order("created_at", { ascending: false });

    if (studentGrade) {
      quizzesQuery = quizzesQuery.or(`grade.is.null,grade.eq.${studentGrade}`);
    }

    const { data: quizzesData } = await quizzesQuery;

    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("student_id", user.id)
      .catch(() => ({ data: [] }));

    const { data: submissions } = await supabase
      .from("quizzes")
      .select("*")
      .eq("grade", "quiz_submission");

    const attemptsMap = new Map<string, number>();
    (attempts || []).forEach((att) => {
      const count = attemptsMap.get(att.quiz_id) || 0;
      attemptsMap.set(att.quiz_id, count + 1);
    });

    (submissions || []).forEach((sub) => {
      try {
        const parsed = JSON.parse(sub.description || "{}");
        if (parsed.studentId === user.id && parsed.quizId) {
          const count = attemptsMap.get(parsed.quizId) || 0;
          if (!attempts?.some((a: any) => a.id === sub.id)) {
            attemptsMap.set(parsed.quizId, count + 1);
          }
        }
      } catch {}
    });

    const quizzes = (quizzesData || []).map((q: any) => {
      const parsed = parseQuizDescription(q.description);
      const attemptCount = attemptsMap.get(q.id) || 0;
      return {
        ...q,
        parsedDescription: parsed.desc,
        questions: parsed.questions,
        maxAttempts: parsed.maxAttempts,
        durationMinutes: parsed.durationMinutes,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        attemptCount,
      };
    });

    return {
      lessons: lessons || [],
      quizzes,
      studentGrade,
    };
  });

export const submitQuizAttemptFn = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .validator(
    (input: {
      quizId: string;
      score: number;
      totalPoints: number;
      answers?: Record<string, string>;
    }) => {
      if (!input.quizId) throw new Error("معرّف التدريب مطلوب");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const supabase = getAdminSupabase();
    const user = context.user;

    const attemptId = crypto.randomUUID();
    const payload = {
      attemptId,
      quizId: data.quizId,
      studentId: user.id,
      score: data.score,
      totalPoints: data.totalPoints,
      answers: data.answers || {},
      graded: false,
      feedback: "",
      submitted_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("quizzes").insert({
      title: `محاولة اختبار`,
      grade: "quiz_submission",
      description: JSON.stringify(payload),
      published: true,
    });

    if (error) {
      await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: data.quizId,
          student_id: user.id,
          score: data.score,
          total_points: data.totalPoints,
        })
        .catch(() => {});
      throw new Error(error.message);
    }
    return { success: true };
  });

export const getPlatformPostsFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .in("grade", ["announcement", "poll", "rating"])
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data || []).map((item: any) => {
    let parsed: any = {};
    try {
      parsed = JSON.parse(item.description || "{}");
    } catch {
      parsed = { content: item.description };
    }
    return {
      id: item.id,
      title: item.title,
      type: item.grade,
      published: item.published,
      created_at: item.created_at,
      ...parsed,
    };
  });
});

export const savePlatformPostFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(
    (input: {
      id?: string;
      title: string;
      type: string;
      content?: string;
      options?: string[];
      published?: boolean;
    }) => {
      if (!input.title || !input.type) throw new Error("العنوان ونوع المنشور مطلوبان");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();

    let postPayload: any = {
      content: data.content || "",
    };
    if (data.type === "poll") {
      postPayload.options = data.options || [];
      postPayload.votes = {};
    } else if (data.type === "rating") {
      postPayload.ratings = [];
    }

    const dbPayload = {
      title: data.title.trim(),
      grade: data.type,
      description: JSON.stringify(postPayload),
      published: data.published ?? true,
    };

    if (data.id) {
      const { data: existing } = await supabase
        .from("quizzes")
        .select("description")
        .eq("id", data.id)
        .single();
      if (existing?.description) {
        try {
          const oldParsed = JSON.parse(existing.description);
          if (data.type === "poll" && oldParsed.votes) postPayload.votes = oldParsed.votes;
          if (data.type === "rating" && oldParsed.ratings) postPayload.ratings = oldParsed.ratings;
          dbPayload.description = JSON.stringify(postPayload);
        } catch {}
      }

      const { error } = await supabase.from("quizzes").update(dbPayload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("quizzes").insert(dbPayload);
      if (error) throw new Error(error.message);
    }

    return { success: true };
  });

export const deletePlatformPostFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator((input: { id: string }) => {
    if (!input.id) throw new Error("معرّف المنشور مطلوب");
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("quizzes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const votePollFn = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .validator((input: { postId: string; option: string }) => {
    if (!input.postId || !input.option) throw new Error("البيانات غير مكتملة للتصويت");
    return input;
  })
  .handler(async ({ data, context }) => {
    const supabase = getAdminSupabase();
    const userId = context.user.id;

    const { data: post, error: fetchErr } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", data.postId)
      .single();

    if (fetchErr || !post) throw new Error("الاستطلاع غير موجود");

    let parsed: any = {};
    try {
      parsed = JSON.parse(post.description || "{}");
    } catch {
      throw new Error("بيانات الاستطلاع غير صالحة");
    }

    if (!parsed.votes) parsed.votes = {};

    Object.keys(parsed.votes).forEach((opt) => {
      if (Array.isArray(parsed.votes[opt])) {
        parsed.votes[opt] = parsed.votes[opt].filter((id: string) => id !== userId);
      }
    });

    if (!parsed.votes[data.option]) parsed.votes[data.option] = [];
    parsed.votes[data.option].push(userId);

    const { error: updateErr } = await supabase
      .from("quizzes")
      .update({ description: JSON.stringify(parsed) })
      .eq("id", data.postId);

    if (updateErr) throw new Error(updateErr.message);
    return { success: true };
  });

export const submitPlatformRatingFn = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .validator((input: { postId: string; stars: number; comment?: string }) => {
    if (!input.postId || !input.stars) throw new Error("التقييم مطلوب");
    return input;
  })
  .handler(async ({ data, context }) => {
    const supabase = getAdminSupabase();
    const userId = context.user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const studentName = profile?.full_name || "طالب";

    const { data: post, error: fetchErr } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", data.postId)
      .single();

    if (fetchErr || !post) throw new Error("عنصر التقييم غير موجود");

    let parsed: any = {};
    try {
      parsed = JSON.parse(post.description || "{}");
    } catch {
      parsed = { ratings: [] };
    }

    if (!parsed.ratings) parsed.ratings = [];

    parsed.ratings = parsed.ratings.filter((r: any) => r.studentId !== userId);
    parsed.ratings.push({
      studentId: userId,
      studentName,
      stars: data.stars,
      comment: data.comment || "",
      date: new Date().toISOString(),
    });

    const { error: updateErr } = await supabase
      .from("quizzes")
      .update({ description: JSON.stringify(parsed) })
      .eq("id", data.postId);

    if (updateErr) throw new Error(updateErr.message);
    return { success: true };
  });
