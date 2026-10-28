/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  SUPABASE_URL as DEFAULT_URL,
  SUPABASE_PUBLISHABLE_KEY as DEFAULT_KEY,
} from "@/integrations/supabase/client";
import {
  requireAdminAuth,
  requireStudentAuth,
  extractTokenFromRequest,
} from "@/integrations/supabase/auth-middleware";
import { GoogleGenAI } from "@google/genai";

function getAdminSupabase() {
  const SUPABASE_URL =
    process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || DEFAULT_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "خطأ أمني: مفتاح الخدمة الإداري السري (SUPABASE_SERVICE_ROLE_KEY) غير معرّف في بيئة الخادم. يرجى إضافته في إعدادات البيئة.",
    );
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
      imageUrl: "",
      images: [] as string[],
      questions: [],
      maxAttempts: 1,
      durationMinutes: 0,
      startDate: "",
      endDate: "",
    };
  try {
    const parsed = JSON.parse(rawDesc);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.questions)) {
      const parsedImages: string[] = Array.isArray(parsed.images)
        ? parsed.images.filter((img: any) => typeof img === "string" && img.trim().length > 0)
        : parsed.imageUrl || parsed.image
          ? [parsed.imageUrl || parsed.image]
          : [];
      const primaryImage = parsedImages[0] || parsed.imageUrl || parsed.image || "";

      return {
        desc: parsed.desc || "",
        imageUrl: primaryImage,
        images: parsedImages,
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
    imageUrl: "",
    images: [] as string[],
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

    let attemptsRes: { data: any[] | null } = { data: [] };
    try {
      attemptsRes = await supabase.from("quiz_attempts").select("id");
    } catch {
      attemptsRes = { data: [] };
    }

    const [profilesRes, lessonsRes, quizzesRes] = await Promise.all([
      supabase.from("profiles").select("id, role, grade"),
      supabase.from("lessons").select("id"),
      supabase.from("quizzes").select("id, grade"),
    ]);

    const studentsCount = (profilesRes.data || []).filter(
      (p: any) =>
        p.role === "student" &&
        !(p.grade && (p.grade.includes('"isAssistant":true') || p.grade.includes('"canAdd'))),
    ).length;
    const lessonsCount = (lessonsRes.data || []).length;

    const allQuizzesRows = quizzesRes.data || [];
    const realQuizzes = allQuizzesRows.filter((q: any) => {
      const g = (q.grade || "").trim();
      return g !== "quiz_submission" && !["announcement", "poll", "rating"].includes(g);
    });
    const quizzesCount = realQuizzes.length;

    const submissionsCount = allQuizzesRows.filter(
      (q: any) => (q.grade || "").trim() === "quiz_submission",
    ).length;
    const attemptsCount = (attemptsRes.data || []).length + submissionsCount;

    return {
      studentsCount,
      lessonsCount,
      quizzesCount,
      attemptsCount,
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
    return (data || []).filter(
      (p: any) =>
        !(p.grade && (p.grade.includes('"isAssistant":true') || p.grade.includes('"canAdd'))),
    );
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
      grade: "عام لجميع الطلاب",
      video_url: data.videoUrl?.trim() || null,
      published: data.published ?? true,
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
    const realQuizzes = (data || []).filter((q: any) => {
      const g = (q.grade || "").trim();
      return g !== "quiz_submission" && !["announcement", "poll", "rating"].includes(g);
    });

    return realQuizzes.map((q: any) => {
      const parsed = parseQuizDescription(q.description);
      return {
        ...q,
        parsedDescription: parsed.desc,
        imageUrl: parsed.imageUrl,
        images: parsed.images,
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
      imageUrl?: string;
      images?: string[];
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

    const imageList: string[] =
      Array.isArray(data.images) && data.images.length > 0
        ? data.images.filter((img) => typeof img === "string" && img.trim().length > 0)
        : data.imageUrl
          ? [data.imageUrl]
          : [];
    const primaryImage = imageList[0] || data.imageUrl || "";

    const quizContent = {
      desc: data.description?.trim() || "",
      imageUrl: primaryImage,
      images: imageList,
      questions: data.questions || [],
      maxAttempts: typeof data.maxAttempts === "number" ? data.maxAttempts : 1,
      durationMinutes: typeof data.durationMinutes === "number" ? data.durationMinutes : 0,
      startDate: data.startDate || "",
      endDate: data.endDate || "",
    };

    const payload = {
      title: data.title.trim(),
      description: JSON.stringify(quizContent),
      grade: "عام لجميع الطلاب",
      published: data.published ?? true,
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

    let rawAttempts: any[] = [];
    try {
      const { data: attData } = await supabase
        .from("quiz_attempts")
        .select(`*, student:profiles(id, full_name, grade), quiz:quizzes(id, title, description)`)
        .order("submitted_at", { ascending: false });
      rawAttempts = attData || [];
    } catch {
      rawAttempts = [];
    }

    const { data: profiles } = await supabase.from("profiles").select("id, full_name, grade");
    const { data: allQuizzes } = await supabase
      .from("quizzes")
      .select("id, title, description")
      .neq("grade", "quiz_submission");

    const profilesMap = new Map((profiles || []).map((p) => [p.id, p]));
    const quizzesMap = new Map((allQuizzes || []).map((q) => [q.id, q]));

    const results: any[] = [];
    const seenAttemptIds = new Set<string>();

    for (const sub of submissions || []) {
      try {
        const parsed = JSON.parse(sub.description || "{}");
        const attemptKey = parsed.attemptId || sub.id;
        seenAttemptIds.add(attemptKey);

        const student = profilesMap.get(parsed.studentId) || {
          id: parsed.studentId,
          full_name: parsed.studentName || "طالب",
          grade: parsed.studentGrade || "الصف الثاني الثانوي",
        };
        const quiz = quizzesMap.get(parsed.quizId) || {
          id: parsed.quizId,
          title: "اختبار",
          description: "",
        };
        const parsedQuiz = parseQuizDescription(quiz.description);

        results.push({
          id: sub.id,
          attemptId: attemptKey,
          quiz_id: parsed.quizId,
          student_id: parsed.studentId,
          score: parsed.score ?? 0,
          total_points: parsed.totalPoints ?? 10,
          graded: parsed.graded ?? true,
          feedback: parsed.feedback || "",
          answers: parsed.answers || {},
          submitted_at: parsed.submitted_at || sub.created_at,
          student,
          quiz,
          quizQuestions: parsedQuiz.questions,
        });
      } catch {
        /* ignore */
      }
    }

    for (const att of rawAttempts || []) {
      if (seenAttemptIds.has(att.id)) continue;
      const parsedQuiz = parseQuizDescription(att.quiz?.description);
      results.push({
        id: att.id,
        attemptId: att.id,
        quiz_id: att.quiz_id,
        student_id: att.student_id,
        score: att.score ?? 0,
        total_points: att.total_points ?? 10,
        graded: (att as any).graded ?? true,
        feedback: (att as any).feedback || "",
        answers: (att as any).answers || {},
        submitted_at: att.submitted_at,
        student: att.student ||
          profilesMap.get(att.student_id) || { full_name: "طالب", grade: "الصف الثاني الثانوي" },
        quiz: att.quiz || quizzesMap.get(att.quiz_id) || { title: "اختبار" },
        quizQuestions: parsedQuiz.questions,
      });
    }

    // Deduplicate by studentId + quizId so each student has only one result row per exam
    const uniqueMap = new Map<string, any>();
    for (const r of results) {
      const studentId = r.student_id || r.student?.id || "unknown";
      const key = `${studentId}_${r.quiz_id}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, r);
      } else {
        const existing = uniqueMap.get(key);
        const existingTime = new Date(existing.submitted_at).getTime() || 0;
        const currentTime = new Date(r.submitted_at).getTime() || 0;
        // Keep the more recent result, or the one with detailed answers
        if (currentTime > existingTime) {
          uniqueMap.set(key, r);
        } else if (currentTime === existingTime) {
          if (Object.keys(r.answers || {}).length > Object.keys(existing.answers || {}).length) {
            uniqueMap.set(key, r);
          }
        }
      }
    }

    return Array.from(uniqueMap.values()).sort(
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
    const currentUserId = context.userId;

    // 1. Fetch all published lessons - available to all students regardless of grade
    const { data: allLessons } = await supabase
      .from("lessons")
      .select("*")
      .order("created_at", { ascending: false });

    const lessons = (allLessons || []).filter((l: any) => l.published !== false);

    // 2. Fetch all quizzes - WITHOUT any SQL grade restriction so that all quizzes appear to ALL students!
    const { data: allQuizzes } = await supabase
      .from("quizzes")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter out system items (quiz attempts, announcements, polls, ratings) and explicitly unpublished drafts
    const quizzesData = (allQuizzes || []).filter((qz: any) => {
      if (qz.published === false) return false;
      const qzGrade = (qz.grade || "").trim();
      return qzGrade !== "quiz_submission" && !["announcement", "poll", "rating"].includes(qzGrade);
    });

    const attemptsMap = new Map<string, number>();
    const studentScoresMap = new Map<
      string,
      { score: number; totalPoints: number; submittedAt: string }
    >();

    if (currentUserId) {
      try {
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("quiz_id, student_id, score, total_points, submitted_at")
          .eq("student_id", currentUserId)
          .order("submitted_at", { ascending: false });

        (attempts || []).forEach((att: any) => {
          const count = attemptsMap.get(att.quiz_id) || 0;
          attemptsMap.set(att.quiz_id, count + 1);

          if (!studentScoresMap.has(att.quiz_id) && typeof att.score === "number") {
            studentScoresMap.set(att.quiz_id, {
              score: att.score,
              totalPoints: att.total_points || 10,
              submittedAt: att.submitted_at,
            });
          }
        });
      } catch {
        /* ignore */
      }

      try {
        const { data: submissions } = await supabase
          .from("quizzes")
          .select("id, description, created_at")
          .eq("grade", "quiz_submission")
          .order("created_at", { ascending: false });

        (submissions || []).forEach((sub: any) => {
          try {
            const parsed = JSON.parse(sub.description || "{}");
            if (parsed.studentId === currentUserId && parsed.quizId) {
              const count = attemptsMap.get(parsed.quizId) || 0;
              attemptsMap.set(parsed.quizId, count + 1);

              if (!studentScoresMap.has(parsed.quizId) && typeof parsed.score === "number") {
                studentScoresMap.set(parsed.quizId, {
                  score: parsed.score,
                  totalPoints: parsed.totalPoints || 10,
                  submittedAt: parsed.submitted_at || sub.created_at,
                });
              }
            }
          } catch {
            /* ignore */
          }
        });
      } catch {
        /* ignore */
      }
    }

    const quizzes = quizzesData.map((q: any) => {
      const parsed = parseQuizDescription(q.description);
      const attemptCount = attemptsMap.get(q.id) || 0;
      const scoreData = studentScoresMap.get(q.id);

      // Strip correctAnswer from questions before sending to client
      const sanitizedQuestions = (parsed.questions || []).map((quest: any, idx: number) => {
        const { correctAnswer: _unused, ...safeQuestion } = quest;
        return {
          ...safeQuestion,
          id: quest.id || String(idx),
        };
      });

      return {
        ...q,
        grade: "عام لجميع الصفوف",
        parsedDescription: parsed.desc,
        imageUrl: parsed.imageUrl,
        images: parsed.images,
        questions: sanitizedQuestions,
        maxAttempts: parsed.maxAttempts,
        durationMinutes: parsed.durationMinutes,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        attemptCount,
        myScore: scoreData ? scoreData.score : null,
        myTotalPoints: scoreData ? scoreData.totalPoints : null,
        mySubmittedAt: scoreData ? scoreData.submittedAt : null,
      };
    });

    return {
      lessons: lessons || [],
      quizzes,
    };
  });

export const submitQuizAttemptFn = createServerFn({ method: "POST" })
  .middleware([requireStudentAuth])
  .validator((input: { quizId: string; answers?: Record<string, string> }) => {
    if (!input || typeof input.quizId !== "string" || !input.quizId.trim()) {
      throw new Error("معرّف التدريب مطلوب");
    }
    const cleanAnswers: Record<string, string> = {};
    if (input.answers && typeof input.answers === "object" && !Array.isArray(input.answers)) {
      for (const [key, val] of Object.entries(input.answers)) {
        if (typeof key === "string" && typeof val === "string") {
          if (key.length > 100) {
            throw new Error("معرّف السؤال طويل جداً");
          }
          if (val.length > 5000) {
            throw new Error("نص الإجابة يتجاوز الحد الأقصى المسموح به (5000 حرف)");
          }
          cleanAnswers[key] = val;
        }
      }
    }
    return {
      quizId: input.quizId.trim(),
      answers: cleanAnswers,
    };
  })
  .handler(async ({ data, context }) => {
    const supabase = getAdminSupabase();
    const userId = context.userId;

    if (!userId || userId === "guest-student") {
      throw new Error("يجب تسجيل الدخول كطالب معتمد لحل وتسليم الامتحان");
    }

    let studentName = (context.user.user_metadata?.full_name as string) || "طالب";
    let studentGrade = (context.user.user_metadata?.grade as string) || "الصف الثاني الثانوي";

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, grade")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.full_name) studentName = profile.full_name;
      if (profile?.grade) studentGrade = profile.grade;
    } catch {
      // ignore
    }

    // 1. Fetch quiz from database and ensure it is valid and published
    const { data: quizRow, error: quizFetchErr } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", data.quizId)
      .maybeSingle();

    if (quizFetchErr || !quizRow) {
      throw new Error("التدريب أو الاختبار المطلوب غير موجود");
    }

    if (quizRow.published === false) {
      throw new Error("هذا الاختبار غير متاح حالياً");
    }

    const qzGrade = (quizRow.grade || "").trim();
    if (qzGrade === "quiz_submission" || ["announcement", "poll", "rating"].includes(qzGrade)) {
      throw new Error("العنصر المحدد ليس اختباراً صالحاً للتسليم");
    }

    // 2. Parse quiz description and check max attempts
    const parsedQuiz = parseQuizDescription(quizRow.description);
    const maxAttempts = parsedQuiz.maxAttempts > 0 ? parsedQuiz.maxAttempts : 1;

    let previousAttemptsCount = 0;
    try {
      const { count } = await supabase
        .from("quiz_attempts")
        .select("id", { count: "exact", head: true })
        .eq("quiz_id", data.quizId)
        .eq("student_id", userId);
      previousAttemptsCount = count || 0;
    } catch {
      previousAttemptsCount = 0;
    }

    try {
      const { data: submissions } = await supabase
        .from("quizzes")
        .select("description")
        .eq("grade", "quiz_submission");

      let subCount = 0;
      (submissions || []).forEach((sub: any) => {
        try {
          const parsed = JSON.parse(sub.description || "{}");
          if (parsed.studentId === userId && parsed.quizId === data.quizId) {
            subCount += 1;
          }
        } catch {
          // ignore
        }
      });
      previousAttemptsCount = Math.max(previousAttemptsCount, subCount);
    } catch {
      // ignore
    }

    if (previousAttemptsCount >= maxAttempts) {
      throw new Error("لقد استنفدت الحد الأقصى لعدد المحاولات المسموح بها لهذا الاختبار");
    }

    // 3. Grade the quiz on the server against stored correct answers
    let serverScore = 0;
    let serverTotalPoints = 0;
    const correctAnswersMap: Record<string, string> = {};

    const questions = parsedQuiz.questions || [];
    questions.forEach((q: any, idx: number) => {
      const qId = q.id || String(idx);
      const qPoints = typeof q.points === "number" && q.points > 0 ? q.points : 1;
      serverTotalPoints += qPoints;

      if (q.correctAnswer) {
        correctAnswersMap[qId] = q.correctAnswer;
        if (q.id && String(idx) !== q.id) {
          correctAnswersMap[String(idx)] = q.correctAnswer;
        }
      }

      // Auto-grade MCQ questions; ignore essay questions in auto-grading
      const isMcq = !q.type || q.type === "mcq";
      if (isMcq && q.correctAnswer) {
        const studentAnswer = data.answers[qId] ?? data.answers[String(idx)];
        if (
          studentAnswer &&
          typeof studentAnswer === "string" &&
          studentAnswer.trim() === q.correctAnswer.trim()
        ) {
          serverScore += qPoints;
        }
      }
    });

    if (serverTotalPoints <= 0) serverTotalPoints = 10;

    const attemptId = crypto.randomUUID();
    const submittedAt = new Date().toISOString();
    const payload = {
      attemptId,
      quizId: data.quizId,
      quizTitle: quizRow.title || "تدريب واختبار تاريخ",
      studentId: userId,
      studentName,
      studentGrade,
      score: serverScore,
      totalPoints: serverTotalPoints,
      answers: data.answers || {},
      graded: true,
      feedback: "تم التصحيح التلقائي على الخادم بنجاح",
      submitted_at: submittedAt,
    };

    const { error: quizSubErr } = await supabase.from("quizzes").insert({
      title: `محاولة اختبار - ${studentName}`,
      grade: "quiz_submission",
      description: JSON.stringify(payload),
      published: false,
    });

    if (quizSubErr) {
      throw new Error(quizSubErr.message);
    }

    try {
      await supabase.from("quiz_attempts").insert({
        id: attemptId,
        quiz_id: data.quizId,
        student_id: userId,
        score: serverScore,
        total_points: serverTotalPoints,
        submitted_at: submittedAt,
      });
    } catch (err) {
      console.error("[submitQuizAttemptFn] quiz_attempts insert notice:", err);
    }

    return {
      success: true,
      score: serverScore,
      totalPoints: serverTotalPoints,
      correctAnswers: correctAnswersMap,
    };
  });

export const getStudentResultsFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getAdminSupabase();
  let currentUserId: string | null = null;
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const token = extractTokenFromRequest(request);
    if (token) {
      const { data: authData } = await supabase.auth.getUser(token);
      if (authData?.user) {
        currentUserId = authData.user.id;
      }
    }
  } catch {
    // ignore
  }

  if (!currentUserId) {
    return [];
  }

  // 1. Fetch current quizzes for fallback titles
  const { data: currentQuizzes } = await supabase
    .from("quizzes")
    .select("id, title")
    .neq("grade", "quiz_submission");
  const quizTitlesMap = new Map((currentQuizzes || []).map((q: any) => [q.id, q.title]));

  // 2. Fetch submissions from quizzes table (grade: quiz_submission)
  const { data: submissions } = await supabase
    .from("quizzes")
    .select("id, title, description, created_at")
    .eq("grade", "quiz_submission")
    .order("created_at", { ascending: false });

  // 3. Fetch from quiz_attempts
  let attempts: any[] = [];
  try {
    const { data: attData } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, student_id, score, total_points, submitted_at")
      .eq("student_id", currentUserId)
      .order("submitted_at", { ascending: false });
    attempts = attData || [];
  } catch {
    attempts = [];
  }

  const resultsList: any[] = [];
  const seenQuizIds = new Set<string>();

  // Process submissions from quizzes table
  (submissions || []).forEach((sub: any) => {
    try {
      const parsed = JSON.parse(sub.description || "{}");
      if (parsed.studentId === currentUserId && parsed.quizId) {
        const qId = parsed.quizId;
        const score = typeof parsed.score === "number" ? parsed.score : 0;
        const totalPoints =
          typeof parsed.totalPoints === "number" && parsed.totalPoints > 0
            ? parsed.totalPoints
            : 10;
        const percentage = Math.round((score / totalPoints) * 100);
        const resolvedTitle =
          parsed.quizTitle ||
          quizTitlesMap.get(qId) ||
          sub.title?.replace("محاولة اختبار - ", "") ||
          "تدريب تاريخ";
        const dateStr = parsed.submitted_at || sub.created_at;

        resultsList.push({
          id: parsed.attemptId || sub.id,
          quizId: qId,
          quizTitle: resolvedTitle,
          score,
          totalPoints,
          percentage,
          submittedAt: dateStr,
          feedback: parsed.feedback || "تم التصحيح والاعتماد بنجاح",
          isExamDeleted: !quizTitlesMap.has(qId),
        });
        seenQuizIds.add(qId);
      }
    } catch {
      // ignore
    }
  });

  // Process quiz_attempts for any missing
  (attempts || []).forEach((att: any) => {
    if (!seenQuizIds.has(att.quiz_id)) {
      const score = typeof att.score === "number" ? att.score : 0;
      const totalPoints =
        typeof att.total_points === "number" && att.total_points > 0 ? att.total_points : 10;
      const percentage = Math.round((score / totalPoints) * 100);
      const resolvedTitle = quizTitlesMap.get(att.quiz_id) || "تدريب تاريخ";

      resultsList.push({
        id: att.id,
        quizId: att.quiz_id,
        quizTitle: resolvedTitle,
        score,
        totalPoints,
        percentage,
        submittedAt: att.submitted_at,
        feedback: "تم التصحيح والاعتماد بنجاح",
        isExamDeleted: !quizTitlesMap.has(att.quiz_id),
      });
      seenQuizIds.add(att.quiz_id);
    }
  });

  // Deduplicate by quizId, keeping the latest / best submission
  const uniqueMap = new Map<string, any>();
  for (const item of resultsList) {
    if (!uniqueMap.has(item.quizId)) {
      uniqueMap.set(item.quizId, item);
    } else {
      const existing = uniqueMap.get(item.quizId);
      const existingTime = new Date(existing.submittedAt).getTime() || 0;
      const currTime = new Date(item.submittedAt).getTime() || 0;
      if (currTime > existingTime) {
        uniqueMap.set(item.quizId, item);
      }
    }
  }

  return Array.from(uniqueMap.values()).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
});

export const getPlatformPostsFn = createServerFn({ method: "GET" })
  .middleware([requireStudentAuth])
  .handler(async ({ context }) => {
    const supabase = getAdminSupabase();
    const isStudent = context.role === "student";

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

      // If user is a student, sanitize ratings: hide student names/comments/IDs and return only count and average stars
      if (isStudent && item.grade === "rating") {
        const ratingsArray = Array.isArray(parsed.ratings) ? parsed.ratings : [];
        const count = ratingsArray.length;
        const totalStars = ratingsArray.reduce(
          (acc: number, r: any) => acc + (Number(r?.stars) || 0),
          0,
        );
        const average = count > 0 ? (totalStars / count).toFixed(1) : "0.0";
        parsed = {
          ...parsed,
          ratingsCount: count,
          averageStars: average,
          ratings: Array.from({ length: count }, () => ({ stars: Number(average) })),
        };
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

    const postPayload: any = {
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
        } catch {
          /* ignore */
        }
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

// 5. Assistants Management
export const getAssistantsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async () => {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data || []).filter(
      (p: any) =>
        p.role === "assistant" ||
        Boolean(p.grade && (p.grade.includes('"isAssistant":true') || p.grade.includes('"canAdd'))),
    );
  });

export const createAssistantFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator((input: { fullName: string; email: string; password: string; permissions?: any }) => {
    if (!input.fullName || !input.email || !input.password) {
      throw new Error("جميع الحقول الأساسية للمساعد مطلوبة");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email.trim(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, role: "assistant" },
      app_metadata: { role: "assistant" },
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || "فشل إنشاء حساب المساعد");
    }

    const userId = authData.user.id;
    const permissionsPayload = {
      isAssistant: true,
      ...(data.permissions || {
        canAddStudents: true,
        canAddQuizzes: true,
        canAddLessons: true,
        canViewResults: true,
      }),
    };

    // First attempt role: "assistant"; if the Supabase Postgres profiles_role_check blocks it, fall back to "admin" with isAssistant in grade
    let profileError = null;
    const primaryRes = await supabase.from("profiles").upsert({
      id: userId,
      full_name: data.fullName.trim(),
      grade: JSON.stringify(permissionsPayload),
      role: "assistant",
    });

    if (primaryRes.error) {
      const fallbackRes = await supabase.from("profiles").upsert({
        id: userId,
        full_name: data.fullName.trim(),
        grade: JSON.stringify(permissionsPayload),
        role: "admin",
      });
      profileError = fallbackRes.error;
    }

    if (profileError) throw new Error(profileError.message);
    return { success: true, userId };
  });

export const updateAssistantFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator((input: { id: string; fullName: string; password?: string; permissions?: any }) => {
    if (!input.id || !input.fullName) throw new Error("معرّف المساعد والاسم مطلوبان");
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    if (data.password && data.password.length >= 6) {
      await supabase.auth.admin.updateUserById(data.id, { password: data.password });
    }
    const updatePayload: any = {
      full_name: data.fullName.trim(),
    };
    if (data.permissions) {
      updatePayload.grade = JSON.stringify({
        isAssistant: true,
        ...data.permissions,
      });
    }
    const { error } = await supabase.from("profiles").update(updatePayload).eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteAssistantFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator((input: { id: string }) => {
    if (!input.id) throw new Error("معرّف المساعد مطلوب");
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    await supabase.auth.admin.deleteUser(data.id);
    await supabase.from("profiles").delete().eq("id", data.id);
    return { success: true };
  });

export const generateQuizFromPdfFn = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator((input: { base64Data: string; mimeType?: string }) => {
    if (!input.base64Data) throw new Error("ملف PDF مطلوب");
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("مفتاح Gemini API غير متاح في الخادم");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              data: data.base64Data,
              mimeType: data.mimeType || "application/pdf",
            },
          },
          {
            text: `قم بتحليل مستند الـ PDF هذا واستخراج أسئلة الامتحان منه بعناية واحترافية.
قم بتوليد أسئلة اختيار من متعدد (mcq) مع 4 خيارات وإجابة صحيحة، وأسئلة مقالية (essay).
يجب أن يكون الناتج بصيغة JSON حصرياً على شكل مصفوفة من الكائنات بالشكل التالي بدون أي نصوص إضافية أو علامات markdown مثل \`\`\`json:
[
  {
    "text": "نص السؤال هنا",
    "type": "mcq",
    "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
    "correctAnswer": "الخيار الأول",
    "points": 5
  },
  {
    "text": "نص السؤال المقالي هنا",
    "type": "essay",
    "points": 10
  }
]`,
          },
        ],
      });

      const textOutput = response.text || "";
      const cleaned = textOutput
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsedQuestions = JSON.parse(cleaned);
      if (!Array.isArray(parsedQuestions)) {
        throw new Error("تنسيق الرد غير صحيح");
      }
      return { success: true, questions: parsedQuestions };
    } catch (err: any) {
      throw new Error("فشل توليد الأسئلة من ملف الـ PDF: " + (err.message || "خطأ غير معروف"));
    }
  });

export const getWeeklyHonorBoardFn = createServerFn({ method: "GET" })
  .middleware([requireStudentAuth])
  .handler(async () => {
    const supabase = getAdminSupabase();
    const [{ data: attempts }, { data: submissions }, { data: profiles }] = await Promise.all([
      supabase.from("quiz_attempts").select("id, student_id, score, total_points, submitted_at"),
      supabase
        .from("quizzes")
        .select("id, grade, description, created_at, title")
        .eq("grade", "quiz_submission"),
      supabase.from("profiles").select("id, full_name, grade"),
    ]);

    const profilesMap = new Map((profiles || []).map((p) => [p.id, p]));

    const studentMap: Record<
      string,
      { name: string; grade: string; totalScore: number; maxPossible: number; count: number }
    > = {};

    (submissions || []).forEach((sub: any) => {
      try {
        const parsed = JSON.parse(sub.description || "{}");
        const sId = parsed.studentId;
        const profile = sId ? profilesMap.get(sId) : null;
        const sName = profile?.full_name || parsed.studentName || "طالب";
        const sGrade = profile?.grade || parsed.studentGrade || "الصف الثاني الثانوي";
        const score = parsed.score || 0;
        const total = parsed.totalPoints || 10;
        if (sId && sId !== "guest-student") {
          if (!studentMap[sId]) {
            studentMap[sId] = {
              name: sName,
              grade: sGrade,
              totalScore: 0,
              maxPossible: 0,
              count: 0,
            };
          }
          studentMap[sId].totalScore += score;
          studentMap[sId].maxPossible += total;
          studentMap[sId].count += 1;
        }
      } catch {
        /* ignore */
      }
    });

    (attempts || []).forEach((att: any) => {
      const sId = att.student_id;
      if (sId && sId !== "guest-student" && !studentMap[sId]) {
        const profile = profilesMap.get(sId);
        const sName = profile?.full_name || "طالب";
        const sGrade = profile?.grade || "الصف الثاني الثانوي";
        studentMap[sId] = {
          name: sName,
          grade: sGrade,
          totalScore: att.score || 0,
          maxPossible: att.total_points || 10,
          count: 1,
        };
      }
    });

    const leaderboard = Object.values(studentMap)
      .map((item) => ({
        name: item.name,
        grade: item.grade,
        totalScore: item.totalScore,
        maxPossible: item.maxPossible > 0 ? item.maxPossible : 1,
        percentage: Math.round(
          (item.totalScore / (item.maxPossible > 0 ? item.maxPossible : 1)) * 100,
        ),
        count: item.count,
      }))
      .sort((a, b) => b.totalScore - a.totalScore || b.percentage - a.percentage)
      .slice(0, 20);

    return leaderboard;
  });

export const getCurrentUserPermissionsFn = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const supabase = getAdminSupabase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile) return { role: "admin", permissions: null };

    const isAssistant =
      context.role === "assistant" ||
      profile.role === "assistant" ||
      Boolean(
        profile.grade &&
        (profile.grade.includes('"isAssistant":true') || profile.grade.includes('"canAdd')),
      );

    if (isAssistant) {
      let perms = {
        canAddStudents: true,
        canAddQuizzes: true,
        canAddLessons: true,
        canViewResults: true,
      };
      try {
        const parsed = JSON.parse(profile.grade || "{}");
        perms = { ...perms, ...parsed };
      } catch {
        /* ignore */
      }
      return { role: "assistant", permissions: perms, fullName: profile.full_name };
    }

    return { role: "admin", permissions: null, fullName: profile.full_name };
  });
