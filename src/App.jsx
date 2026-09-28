import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  addDoc,
} from "firebase/firestore";

import { auth, db } from "./firebase";
import Auth from "./Auth";
import LandingPage from "./LandingPage";

import * as pdfjsLib from "pdfjs-dist";

import "./App.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

/* =========================================================
   CONFIGURATION
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://studymate-wc97.onrender.com";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_MATERIAL_LENGTH = 120000;

const ACTIONS = {
  explain: {
    icon: "📖",
    title: "Explain",
    description:
      "Understand difficult topics in simple language.",
  },

  summarize: {
    icon: "📝",
    title: "Summarize",
    description:
      "Get the most important points from your material.",
  },

  questions: {
    icon: "❓",
    title: "Generate Questions",
    description:
      "Create practice questions from your material.",
  },

  flashcards: {
    icon: "🧠",
    title: "Make Flashcards",
    description:
      "Turn important concepts into revision cards.",
  },

  quiz: {
    icon: "🎯",
    title: "Take Quiz",
    description:
      "Test yourself and see how well you understand.",
  },
};

/* =========================================================
   HELPERS
========================================================= */

function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getUserStorageKey(userId, key) {
  return `studymate_${userId}_${key}`;
}

function safeReadStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);

    if (saved === null) {
      return fallback;
    }

    return JSON.parse(saved);
  } catch {
    return fallback;
  }
}

function safeWriteStorage(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch (error) {
    console.warn(
      "Could not save local StudyMate data:",
      error
    );
  }
}

function normalizeCreatedAt(value) {
  if (!value) {
    return new Date().toISOString();
  }

  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date().toISOString();
}

function formatHistoryDate(value) {
  try {
    return new Date(
      normalizeCreatedAt(value)
    ).toLocaleString();
  } catch {
    return "Recently";
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes < 1024) {
    return `${bytes || 0} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

/* =========================================================
   APP
========================================================= */

function App() {
  /* -------------------------------------------------------
     AUTH / ENTRY
  ------------------------------------------------------- */

  const [user, setUser] = useState(undefined);

  const [entryMode, setEntryMode] =
    useState("landing");

  const [profile, setProfile] = useState(null);

  /* -------------------------------------------------------
     STUDY MATERIAL
  ------------------------------------------------------- */

  const [file, setFile] = useState(null);

  const [mode, setMode] =
    useState("home");

  const [activeAction, setActiveAction] =
    useState(null);

  const [result, setResult] =
    useState(null);

  const [resultSource, setResultSource] =
    useState("workspace");

  /* -------------------------------------------------------
     LOADING / ERROR
  ------------------------------------------------------- */

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /* -------------------------------------------------------
     ASK STUDYMATE
  ------------------------------------------------------- */

  const [chatMessages, setChatMessages] =
    useState([]);

  const [chatInput, setChatInput] =
    useState("");

  const [chatLoading, setChatLoading] =
    useState(false);

  /* -------------------------------------------------------
     HISTORY
  ------------------------------------------------------- */

  const [studyHistory, setStudyHistory] =
    useState([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  /* -------------------------------------------------------
     STUDY GOAL
  ------------------------------------------------------- */

  const [studyGoal, setStudyGoal] =
    useState(30);

  const [todaySeconds, setTodaySeconds] =
    useState(0);

  const [studyStartedAt, setStudyStartedAt] =
    useState(null);

  /* -------------------------------------------------------
     FREE / PREMIUM USAGE
  ------------------------------------------------------- */

  const [usage, setUsage] = useState(null);
  const [usageLoading, setUsageLoading] =
    useState(false);

  /* -------------------------------------------------------
     DERIVED VALUES
  ------------------------------------------------------- */

  const todayMinutes = Math.floor(
    todaySeconds / 60
  );

  const userName = useMemo(() => {
    return (
      profile?.name ||
      user?.displayName ||
      user?.email?.split("@")[0] ||
      "Student"
    );
  }, [profile, user]);

  /* =======================================================
     AUTH OBSERVER
  ======================================================= */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);

          if (!currentUser) {
            setProfile(null);
            setStudyHistory([]);
            setFile(null);
            setResult(null);
            setActiveAction(null);
            setChatMessages([]);
            setChatInput("");
            setEntryMode("landing");
            setMode("home");
          }
        }
      );

    return unsubscribe;
  }, []);

  /* =======================================================
     LOAD FREE / PREMIUM USAGE
  ======================================================= */

  const loadUsage = async () => {
    if (!user?.uid) {
      setUsage(null);
      return;
    }

    setUsageLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/usage?userId=${encodeURIComponent(user.uid)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Could not load StudyMate usage."
        );
      }

      setUsage(data);
    } catch (usageError) {
      console.error(
        "Could not load StudyMate usage:",
        usageError
      );
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setUsage(null);
      return;
    }

    loadUsage();
  }, [user]);

  /* =======================================================
     CREATE / LOAD USER PROFILE
  ======================================================= */

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const loadUserProfile = async () => {
      try {
        const userRef = doc(
          db,
          "users",
          user.uid
        );

        const userSnap =
          await getDoc(userRef);

        if (userSnap.exists()) {
          if (!cancelled) {
            setProfile({
              id: user.uid,
              ...userSnap.data(),
            });
          }

          return;
        }

        const newProfile = {
          name:
            user.displayName ||
            user.email?.split("@")[0] ||
            "Student",

          email: user.email || "",

          createdAt:
            serverTimestamp(),

          lastSeenAt:
            serverTimestamp(),
        };

        await setDoc(
          userRef,
          newProfile
        );

        if (!cancelled) {
          setProfile({
            id: user.uid,
            name: newProfile.name,
            email: newProfile.email,
          });
        }
      } catch (profileError) {
        console.error(
          "Could not load user profile:",
          profileError
        );

        if (!cancelled) {
          setProfile({
            id: user.uid,
            name:
              user.displayName ||
              user.email?.split("@")[0] ||
              "Student",
            email: user.email || "",
          });
        }
      }
    };

    loadUserProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /* =======================================================
     LOAD USER SETTINGS
  ======================================================= */

  useEffect(() => {
    if (!user) {
      return;
    }

    const goalKey =
      getUserStorageKey(
        user.uid,
        "daily_goal"
      );

    const todaySecondsKey =
      getUserStorageKey(
        user.uid,
        "today_seconds"
      );

    const todayDateKey =
      getUserStorageKey(
        user.uid,
        "today_date"
      );

    const savedGoal =
      safeReadStorage(
        goalKey,
        30
      );

    const savedDate =
      safeReadStorage(
        todayDateKey,
        null
      );

    const today = getTodayKey();

    setStudyGoal(
      Number(savedGoal) > 0
        ? Number(savedGoal)
        : 30
    );

    if (savedDate !== today) {
      setTodaySeconds(0);

      safeWriteStorage(
        todaySecondsKey,
        0
      );

      safeWriteStorage(
        todayDateKey,
        today
      );
    } else {
      setTodaySeconds(
        Number(
          safeReadStorage(
            todaySecondsKey,
            0
          )
        ) || 0
      );
    }
  }, [user]);

  /* =======================================================
     SAVE STUDY TIME
  ======================================================= */

  useEffect(() => {
    if (!user) {
      return;
    }

    const todayDateKey =
      getUserStorageKey(
        user.uid,
        "today_date"
      );

    const todaySecondsKey =
      getUserStorageKey(
        user.uid,
        "today_seconds"
      );

    const today = getTodayKey();

    const savedDate =
      safeReadStorage(
        todayDateKey,
        null
      );

    if (savedDate !== today) {
      setTodaySeconds(0);

      safeWriteStorage(
        todayDateKey,
        today
      );

      safeWriteStorage(
        todaySecondsKey,
        0
      );
    }
  }, [user]);

  useEffect(() => {
    if (
      !user ||
      mode !== "workspace" ||
      !file
    ) {
      return;
    }

    const interval = setInterval(() => {
      setTodaySeconds(
        (previous) => {
          const next =
            previous + 1;

          safeWriteStorage(
            getUserStorageKey(
              user.uid,
              "today_seconds"
            ),
            next
          );

          return next;
        }
      );
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [user, mode, file]);

  /* =======================================================
     LOAD FIRESTORE HISTORY
  ======================================================= */

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      setHistoryLoading(true);

      const localKey =
        getUserStorageKey(
          user.uid,
          "history"
        );

      try {
        const historyRef =
          collection(
            db,
            "users",
            user.uid,
            "studyHistory"
          );

        const historyQuery =
          query(
            historyRef,
            orderBy(
              "createdAt",
              "desc"
            ),
            limit(50)
          );

        const snapshot =
          await getDocs(
            historyQuery
          );

        const firestoreHistory =
          snapshot.docs.map(
            (historyDoc) => {
              const data =
                historyDoc.data();

              return {
                id: historyDoc.id,
                ...data,
                createdAt:
                  normalizeCreatedAt(
                    data.createdAt
                  ),
              };
            }
          );

        if (!cancelled) {
          setStudyHistory(
            firestoreHistory
          );

          safeWriteStorage(
            localKey,
            firestoreHistory
          );
        }
      } catch (historyError) {
        console.error(
          "Could not load Firestore history:",
          historyError
        );

        const cachedHistory =
          safeReadStorage(
            localKey,
            []
          );

        if (!cancelled) {
          setStudyHistory(
            Array.isArray(
              cachedHistory
            )
              ? cachedHistory
              : []
          );
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /* =======================================================
     SAVE STUDY HISTORY
  ======================================================= */

  const saveToHistory = async (
    action,
    studyResult,
    fileName
  ) => {
    if (!user) {
      return;
    }

    const createdAt =
      new Date().toISOString();

    const localItem = {
      id: `local-${Date.now()}`,
      action,
      result: studyResult,
      fileName,
      createdAt,
    };

    setStudyHistory(
      (previous) => {
        const updated = [
          localItem,
          ...previous,
        ].slice(0, 50);

        safeWriteStorage(
          getUserStorageKey(
            user.uid,
            "history"
          ),
          updated
        );

        return updated;
      }
    );

    try {
      const historyRef =
        collection(
          db,
          "users",
          user.uid,
          "studyHistory"
        );

      const firestoreItem =
        await addDoc(
          historyRef,
          {
            action,
            result: studyResult,
            fileName:
              fileName || "Study Material",
            createdAt:
              serverTimestamp(),
          }
        );

      setStudyHistory(
        (previous) => {
          const withoutLocal =
            previous.filter(
              (item) =>
                item.id !==
                localItem.id
            );

          const updated = [
            {
              ...localItem,
              id: firestoreItem.id,
            },
            ...withoutLocal,
          ].slice(0, 50);

          safeWriteStorage(
            getUserStorageKey(
              user.uid,
              "history"
            ),
            updated
          );

          return updated;
        }
      );
    } catch (historyError) {
      console.error(
        "Could not save history to Firestore:",
        historyError
      );
    }
  };

  /* =======================================================
     CHANGE DAILY GOAL
  ======================================================= */

  const updateStudyGoal = (value) => {
    const numericValue =
      Number(value);

    if (
      !Number.isFinite(
        numericValue
      ) ||
      numericValue <= 0
    ) {
      return;
    }

    const safeGoal = Math.min(
      600,
      Math.round(
        numericValue
      )
    );

    setStudyGoal(safeGoal);

    if (user) {
      safeWriteStorage(
        getUserStorageKey(
          user.uid,
          "daily_goal"
        ),
        safeGoal
      );
    }
  };

  /* =======================================================
     FILE HANDLING
  ======================================================= */

  const handleFile = async (
    event
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const isPDF =
        selectedFile.type ===
          "application/pdf" ||
        selectedFile.name
          .toLowerCase()
          .endsWith(".pdf");

      const isTXT =
        selectedFile.type ===
          "text/plain" ||
        selectedFile.name
          .toLowerCase()
          .endsWith(".txt");

      if (!isPDF && !isTXT) {
        throw new Error(
          "Please upload a PDF or TXT file."
        );
      }

      if (
        selectedFile.size >
        MAX_FILE_SIZE
      ) {
        throw new Error(
          "This file is too large. Please upload a file smaller than 20 MB."
        );
      }

      let text = "";

      /* ---------------- PDF ---------------- */

      if (isPDF) {
        const arrayBuffer =
          await selectedFile.arrayBuffer();

        const pdf =
          await pdfjsLib.getDocument(
            {
              data: arrayBuffer,
            }
          ).promise;

        const pages = [];

        for (
          let pageNumber = 1;
          pageNumber <=
          pdf.numPages;
          pageNumber++
        ) {
          const page =
            await pdf.getPage(
              pageNumber
            );

          const content =
            await page.getTextContent();

          const pageText =
            content.items
              .map(
                (item) =>
                  item.str || ""
              )
              .join(" ");

          pages.push(
            `\n\n--- Page ${pageNumber} ---\n\n${pageText}`
          );
        }

        text = pages.join("");
      }

      /* ---------------- TXT ---------------- */

      if (isTXT) {
        text =
          await selectedFile.text();
      }

      text = text.trim();

      if (!text) {
        throw new Error(
          "No readable text was found in this file."
        );
      }

      if (
        text.length >
        MAX_MATERIAL_LENGTH
      ) {
        text =
          text.slice(
            0,
            MAX_MATERIAL_LENGTH
          ) +
          "\n\n[Material truncated for AI processing.]";
      }

      setFile({
        file: selectedFile,
        text,
      });

      setResult(null);
      setActiveAction(null);
      setResultSource(
        "workspace"
      );

      setChatMessages([]);
      setChatInput("");

      setStudyStartedAt(
        Date.now()
      );

      setMode("workspace");
    } catch (err) {
      console.error(
        "File reading error:",
        err
      );

      setError(
        err.message ||
          "StudyMate could not read this file. Please try another PDF or TXT file."
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  /* =======================================================
     REMOVE FILE
  ======================================================= */

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setActiveAction(null);
    setResultSource(
      "workspace"
    );
    setError("");
    setChatMessages([]);
    setChatInput("");
    setStudyStartedAt(null);
    setMode("home");
  };

  /* =======================================================
     RUN AI STUDY ACTION
  ======================================================= */

  const runStudyAction = async (
    action
  ) => {
    if (!file?.text || loading) {
      return;
    }

    setActiveAction(action);
    setResult(null);
    setResultSource(
      "workspace"
    );
    setError("");
    setLoading(true);

    try {
      const response =
        await fetch(
          `${API_URL}/api/study`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              userId: user.uid,
              action,
              material:
                file.text,
            }),
          }
        );

      let data;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          "StudyMate received an invalid response from the AI server."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "StudyMate could not complete this task."
        );
      }

      if (!data?.result) {
        throw new Error(
          "The AI returned an empty result."
        );
      }

      setResult(
        data.result
      );

      await saveToHistory(
        action,
        data.result,
        file.file.name
      );

      if (data?.usage) {
        setUsage(data.usage);
      } else {
        await loadUsage();
      }

      setMode("result");
    } catch (err) {
      console.error(
        "Study action error:",
        err
      );

      setError(
        err.message ||
          "Something went wrong. Please check that the StudyMate AI server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     BACK TO WORKSPACE
  ======================================================= */

  const backToWorkspace = () => {
    setMode("workspace");
    setResult(null);
    setResultSource(
      "workspace"
    );
    setError("");
    setActiveAction(null);
  };

  /* =======================================================
     BACK FROM HISTORY RESULT
  ======================================================= */

  const backFromHistoryResult =
    () => {
      setResult(null);
      setActiveAction(null);
      setResultSource(
        "workspace"
      );
      setMode("history");
    };

  /* =======================================================
     ASK STUDYMATE
  ======================================================= */

  const askStudyMate = async () => {
    const question =
      chatInput.trim();

    if (
      !question ||
      !file?.text ||
      chatLoading
    ) {
      return;
    }

    const userMessage = {
      role: "user",
      content: question,
    };

    const updatedHistory = [
      ...chatMessages,
      userMessage,
    ];

    setChatMessages(
      updatedHistory
    );

    setChatInput("");
    setChatLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `${API_URL}/api/ask`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              userId: user.uid,
              question,
              material:
                file.text,
              history:
                updatedHistory,
            }),
          }
        );

      let data;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          "StudyMate received an invalid response from the AI server."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "StudyMate could not answer your question."
        );
      }

      setChatMessages(
        (previous) => [
          ...previous,
          {
            role: "assistant",
            content:
              data.answer ||
              "I could not generate an answer.",
          },
        ]
      );

      if (data?.usage) {
        setUsage(data.usage);
      } else {
        await loadUsage();
      }
    } catch (err) {
      console.error(
        "Ask StudyMate error:",
        err
      );

      setError(
        err.message ||
          "StudyMate could not answer your question."
      );
    } finally {
      setChatLoading(false);
    }
  };

  /* =======================================================
     CHAT KEYBOARD
  ======================================================= */

  const handleChatKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      askStudyMate();
    }
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = async () => {
    try {
      await signOut(auth);

      setEntryMode(
        "landing"
      );

      setMode("home");
      setFile(null);
      setResult(null);
      setActiveAction(null);
      setChatMessages([]);
      setChatInput("");
    } catch (logoutError) {
      console.error(
        "Logout error:",
        logoutError
      );

      setError(
        "Could not log out. Please try again."
      );
    }
  };

  /* =======================================================
     AUTH LOADING
  ======================================================= */

  if (user === undefined) {
    return (
      <div className="app-loading">
        <div className="loading-orb">
          🎓
        </div>

        <h2>
          Loading StudyMate...
        </h2>

        <p>
          Preparing your study space.
        </p>
      </div>
    );
  }

  /* =======================================================
     PUBLIC LANDING PAGE
  ======================================================= */

  if (
    entryMode ===
    "landing"
  ) {
    return (
      <LandingPage
        user={user}
        onGetStarted={() => {
          if (user) {
            setEntryMode(
              "app"
            );
          } else {
            setEntryMode(
              "auth"
            );
          }
        }}
        onLogin={() => {
          if (user) {
            setEntryMode(
              "app"
            );
          } else {
            setEntryMode(
              "auth"
            );
          }
        }}
        onDashboard={() => {
          setEntryMode(
            "app"
          );
        }}
      />
    );
  }

  /* =======================================================
     AUTH PAGE
  ======================================================= */

  if (!user) {
    return (
      <Auth
        onSuccess={() => {
          setEntryMode("app");
          setMode("dashboard");
        }}
      />
    );
  }

  /* =======================================================
     PRIVATE STUDY APP
  ======================================================= */

  return (
    <div className="app">

      {/* =================================================
          NAVBAR
      ================================================= */}

      <header className="navbar">

        <div
          className="logo"
          onClick={() => {
            setMode("home");
            setFile(null);
            setResult(null);
          }}
          role="button"
          tabIndex={0}
        >
          <span className="logo-icon">
            🎓
          </span>

          <span>
            StudyMate
          </span>
        </div>

        <div className="navbar-actions">

          {user && (
            <span className="navbar-user">
              👋 {userName}
            </span>
          )}

          {file &&
            mode !== "home" &&
            mode !== "dashboard" &&
            mode !== "history" && (
              <button
                className="back-btn"
                onClick={
                  removeFile
                }
              >
                ← Back
              </button>
            )}

        </div>
      </header>

      {/* =================================================
          GLOBAL ERROR
      ================================================= */}

      {error &&
        mode !== "workspace" && (
          <div className="global-error">
            <span>
              ⚠️
            </span>

            <p>
              {error}
            </p>

            <button
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>
          </div>
        )}

      {/* =================================================
          HOME
      ================================================= */}

      {mode === "home" && (
        <main>

          <section className="hero">

            <div className="hero-badge">
              🎓 BUILT FOR STUDENTS
            </div>

            <h1>
              Study smarter.
              <br />
              <span>
                Understand more.
              </span>
            </h1>

            <p>
              Turn your course materials
              into simple explanations,
              summaries, practice
              questions, quizzes and
              flashcards.
            </p>

            <label className="start-btn">
              Start Studying →

              <input
                type="file"
                accept=".pdf,.txt"
                onChange={
                  handleFile
                }
                hidden
              />
            </label>

          </section>

          <div className="home-actions">

            <button
              className="history-btn"
              onClick={() =>
                setMode(
                  "history"
                )
              }
            >
              🕘 Study History
            </button>

            <button
              className="dashboard-btn"
              onClick={() =>
                setMode(
                  "dashboard"
                )
              }
            >
              📊 Student Dashboard
            </button>

          </div>

          <section className="features">

            <h2>
              Everything you need
              to study
            </h2>

            <p className="section-text">
              Upload your course
              material and choose how
              you want to study it.
            </p>

            <div className="feature-grid">

              <div className="feature-card">
                <div className="feature-icon">
                  📖
                </div>

                <h3>
                  Explain
                </h3>

                <p>
                  Turn difficult topics
                  into simple,
                  easy-to-understand
                  explanations.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  📝
                </div>

                <h3>
                  Summarize
                </h3>

                <p>
                  Get the important
                  points from long
                  lecture notes and
                  textbooks.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  ❓
                </div>

                <h3>
                  Practice Questions
                </h3>

                <p>
                  Create practice
                  questions from your
                  actual study material.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  🧠
                </div>

                <h3>
                  Flashcards
                </h3>

                <p>
                  Memorize important
                  facts and concepts
                  with quick revision
                  cards.
                </p>
              </div>

            </div>
          </section>

          <section className="upload-section">

            <div className="upload-box">

              <div className="upload-icon">
                📄
              </div>

              <h2>
                Start with your
                course material
              </h2>

              <p>
                Upload a PDF or study
                note and choose how
                you want to study it.
              </p>

              <label className="upload-btn">

                Upload Material

                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={
                    handleFile
                  }
                  hidden
                />

              </label>

              <small>
                PDF and TXT files
              </small>

            </div>

          </section>

        </main>
      )}

      {/* =================================================
          WORKSPACE
      ================================================= */}

      {mode === "workspace" &&
        file && (
          <main className="workspace">

            <div className="workspace-header">

              <div>

                <div className="workspace-badge">
                  YOUR STUDY MATERIAL
                </div>

                <h1>
                  {file.file.name}
                </h1>

                <p>
                  Your material is
                  ready. Choose how
                  you want StudyMate to
                  help you study.
                </p>

              </div>

              <div className="file-info">

                <span>
                  📄
                </span>

                <strong>
                  {formatFileSize(
                    file.file.size
                  )}
                </strong>

              </div>

            </div>

            {error && (
              <div className="error-box">

                <span>
                  ⚠️
                </span>

                <p>
                  {error}
                </p>

                <button
                  onClick={() =>
                    setError("")
                  }
                >
                  ×
                </button>

              </div>
            )}

            {/* STUDY ACTIONS */}

            <section className="study-actions">

              {Object.entries(
                ACTIONS
              ).map(
                ([
                  action,
                  info,
                ]) => (
                  <button
                    key={action}
                    className={`action-card ${
                      activeAction ===
                      action
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      runStudyAction(
                        action
                      )
                    }
                    disabled={
                      loading
                    }
                  >

                    <span>
                      {info.icon}
                    </span>

                    <div>

                      <h3>
                        {info.title}
                      </h3>

                      <p>
                        {
                          info.description
                        }
                      </p>

                    </div>

                    <b>
                      →
                    </b>

                  </button>
                )
              )}

            </section>

            {/* AI LOADING */}

            {loading && (
              <div className="ai-loading">

                <div className="loading-orb">
                  ✨
                </div>

                <div>

                  <h3>
                    StudyMate is
                    thinking...
                  </h3>

                  <p>
                    {activeAction
                      ? `${
                          ACTIONS[
                            activeAction
                          ]?.title
                        } your material`
                      : "Preparing your study material"}
                    .
                  </p>

                </div>

              </div>
            )}

            {/* MATERIAL PREVIEW */}

            {file.text &&
              !loading && (
                <div className="material-preview">

                  <div className="preview-header">

                    <h2>
                      Material Preview
                    </h2>

                    <span>
                      {file.text.length.toLocaleString()}{" "}
                      characters
                    </span>

                  </div>

                  <div className="preview-content">
                    {file.text}
                  </div>

                </div>
              )}

            {/* ASK STUDYMATE */}

            <section className="ask-section">

              <div className="ask-header">

                <div>

                  <div className="ask-badge">
                    ✨ AI STUDY
                    ASSISTANT
                  </div>

                  <h2>
                    Ask StudyMate
                  </h2>

                  <p>
                    Ask questions about
                    your uploaded
                    material and get
                    clear explanations.
                  </p>

                </div>

                <div className="ask-icon">
                  💬
                </div>

              </div>

              {chatMessages.length >
                0 && (
                <div className="chat-messages">

                  {chatMessages.map(
                    (
                      message,
                      index
                    ) => (
                      <div
                        className={`chat-message ${
                          message.role ===
                          "user"
                            ? "user-message"
                            : "ai-message"
                        }`}
                        key={index}
                      >

                        <div className="message-avatar">
                          {message.role ===
                          "user"
                            ? "👤"
                            : "🎓"}
                        </div>

                        <div className="message-content">

                          <span>
                            {message.role ===
                            "user"
                              ? "You"
                              : "StudyMate"}
                          </span>

                          <p>
                            {
                              message.content
                            }
                          </p>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

              {chatLoading && (
                <div className="chat-thinking">

                  <span>
                    🎓
                  </span>

                  <div>

                    <strong>
                      StudyMate is
                      thinking...
                    </strong>

                    <p>
                      Checking your
                      study material.
                    </p>

                  </div>

                </div>
              )}

              <div className="ask-input-area">

                <textarea
                  value={
                    chatInput
                  }
                  onChange={(
                    event
                  ) =>
                    setChatInput(
                      event.target
                        .value
                    )
                  }
                  onKeyDown={
                    handleChatKeyDown
                  }
                  placeholder="Ask something about your material..."
                  rows="2"
                  disabled={
                    chatLoading
                  }
                />

                <button
                  className="ask-send-btn"
                  onClick={
                    askStudyMate
                  }
                  disabled={
                    chatLoading ||
                    !chatInput.trim()
                  }
                >
                  {chatLoading
                    ? "..."
                    : "Ask →"}
                </button>

              </div>

              <div className="ask-suggestions">

                <button
                  onClick={() =>
                    setChatInput(
                      "Explain the main topic in simple terms."
                    )
                  }
                >
                  💡 Explain the
                  main topic
                </button>

                <button
                  onClick={() =>
                    setChatInput(
                      "What are the most important things I should remember for an exam?"
                    )
                  }
                >
                  🎯 Exam points
                </button>

                <button
                  onClick={() =>
                    setChatInput(
                      "Give me a simple example to help me understand this material."
                    )
                  }
                >
                  📚 Give me an
                  example
                </button>

              </div>

            </section>

          </main>
        )}

      {/* =================================================
          DASHBOARD
      ================================================= */}

      {mode === "dashboard" && (
        <DashboardView
          history={
            studyHistory
          }
          studyGoal={
            studyGoal
          }
          todayMinutes={
            todayMinutes
          }
          userName={
            userName
          }
          usage={
            usage
          }
          usageLoading={
            usageLoading
          }
          historyLoading={
            historyLoading
          }
          onBack={() =>
            setMode("home")
          }
          onStartStudying={() =>
            setMode("home")
          }
          onOpenHistory={() =>
            setMode("history")
          }
          onUpdateGoal={
            updateStudyGoal
          }
        />
      )}

      {/* =================================================
          HISTORY
      ================================================= */}

      {mode === "history" && (
        <HistoryView
          history={
            studyHistory
          }
          loading={
            historyLoading
          }
          onBack={() =>
            setMode("dashboard")
          }
          onOpen={(item) => {
            setResult(
              item.result
            );

            setActiveAction(
              item.action
            );

            setResultSource(
              "history"
            );

            setMode("result");
          }}
        />
      )}

      {/* =================================================
          RESULT
      ================================================= */}

      {mode === "result" &&
        result && (
          <ResultView
            action={
              activeAction
            }
            result={
              result
            }
            resultSource={
              resultSource
            }
            onBack={
              resultSource ===
              "history"
                ? backFromHistoryResult
                : backToWorkspace
            }
          />
        )}

      {/* =================================================
          LOGOUT
      ================================================= */}

      <button
        className="logout-btn"
        onClick={
          handleLogout
        }
      >
        🚪 Log Out
      </button>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer>
        <p>
          © 2026 StudyMate.
          Study smarter, not
          harder.
        </p>
      </footer>

    </div>
  );
}

/* =========================================================
   HISTORY VIEW
========================================================= */

function HistoryView({
  history,
  loading,
  onBack,
  onOpen,
}) {
  return (
    <main className="history-page">

      <button
        className="back-btn"
        onClick={onBack}
      >
        ← Back
      </button>

      <div className="history-heading">

        <div>

          <span className="history-badge">
            YOUR STUDY JOURNEY
          </span>

          <h1>
            Study History
          </h1>

          <p>
            Revisit your previous
            AI study sessions.
          </p>

        </div>

        <div className="history-icon">
          🕘
        </div>

      </div>

      {loading ? (
        <div className="empty-history">

          <div className="loading-orb">
            📚
          </div>

          <h2>
            Loading your
            study history...
          </h2>

          <p>
            Getting your previous
            sessions.
          </p>

        </div>
      ) : history.length === 0 ? (
        <div className="empty-history">

          <div>
            📚
          </div>

          <h2>
            No study sessions yet
          </h2>

          <p>
            Complete a study
            session and it will
            appear here.
          </p>

        </div>
      ) : (
        <div className="history-list">

          {history.map(
            (item) => (
              <button
                className="history-card"
                key={item.id}
                onClick={() =>
                  onOpen(item)
                }
              >

                <div className="history-card-icon">
                  {
                    ACTIONS[
                      item.action
                    ]?.icon ||
                    "📚"
                  }
                </div>

                <div className="history-card-content">

                  <strong>
                    {
                      ACTIONS[
                        item.action
                      ]?.title ||
                      "Study Session"
                    }
                  </strong>

                  <span>
                    {
                      item.fileName ||
                      "Study Material"
                    }
                  </span>

                  <small>
                    {formatHistoryDate(
                      item.createdAt
                    )}
                  </small>

                </div>

                <span className="history-arrow">
                  →
                </span>

              </button>
            )
          )}

        </div>
      )}

    </main>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function DashboardView({
  history,
  studyGoal,
  todayMinutes,
  userName,
  usage,
  usageLoading,
  historyLoading,
  onBack,
  onStartStudying,
  onOpenHistory,
  onUpdateGoal,
}) {
  const progress =
    studyGoal > 0
      ? Math.min(
          100,
          Math.round(
            (todayMinutes /
              studyGoal) *
              100
          )
        )
      : 0;

  const recentSessions =
    history.slice(0, 4);

  return (
    <main className="dashboard-page">

      <button
        className="back-btn"
        onClick={onBack}
      >
        ← Back
      </button>

      <section className="dashboard-hero">

        <div>

          <span className="dashboard-badge">
            STUDENT DASHBOARD
          </span>

          <h1>
            Welcome back,{" "}
            {userName} 👋
          </h1>

          <p>
            Keep learning, track
            your progress, and stay
            consistent with your
            studies.
          </p>

        </div>

        <div className="dashboard-hero-icon">
          🎓
        </div>

      </section>

      <section className="dashboard-stats">

        <div className="dashboard-stat">

          <span>
            📚
          </span>

          <div>

            <strong>
              {history.length}
            </strong>

            <small>
              Study Sessions
            </small>

          </div>

        </div>

        <div className="dashboard-stat">

          <span>
            ⏱️
          </span>

          <div>

            <strong>
              {todayMinutes}m
            </strong>

            <small>
              Studied Today
            </small>

          </div>

        </div>

        <div className="dashboard-stat">

          <span>
            🎯
          </span>

          <div>

            <strong>
              {progress}%
            </strong>

            <small>
              Daily Goal
            </small>

          </div>

        </div>

      </section>

      <section
        className="daily-goal-card"
        style={{
          marginBottom: "20px",
        }}
      >

        <div className="goal-top">

          <div>

            <span className="section-label">
              YOUR STUDYMATE PLAN
            </span>

            <h2>
              {usageLoading
                ? "Loading..."
                : usage?.isPremium
                  ? "⭐ Premium"
                  : "🆓 Free Plan"}
            </h2>

          </div>

          <div className="goal-icon">
            {usage?.isPremium ? "⭐" : "🆓"}
          </div>

        </div>

        {!usageLoading && usage && (
          <div
            style={{
              display: "grid",
              gap: "10px",
              marginTop: "12px",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <span>
                📚 AI Study Actions
              </span>

              <strong>
                {usage.study.remaining} / {usage.study.limit} left
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <span>
                💬 Ask StudyMate
              </span>

              <strong>
                {usage.ask.remaining} / {usage.ask.limit} left
              </strong>
            </div>

          </div>
        )}

        {!usageLoading &&
          usage &&
          !usage.isPremium && (
            <p style={{ marginTop: "14px" }}>
              Upgrade to Premium for 100 AI study actions
              and 200 Ask StudyMate questions every day.
            </p>
          )}

      </section>

      <section className="daily-goal-card">

        <div className="goal-top">

          <div>

            <span className="section-label">
              TODAY'S GOAL
            </span>

            <h2>
              {todayMinutes} /{" "}
              {studyGoal} minutes
            </h2>

          </div>

          <div className="goal-icon">
            🎯
          </div>

        </div>

        <div className="goal-track">

          <div
            className="goal-progress"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

        <p>
          {progress >=
          100
            ? "🎉 Daily study goal completed!"
            : `${
                studyGoal -
                todayMinutes
              } minutes left to reach your goal.`}
        </p>

        <div className="goal-controls">

          <label>
            Daily goal
          </label>

          <select
            value={
              studyGoal
            }
            onChange={(
              event
            ) =>
              onUpdateGoal(
                event.target
                  .value
              )
            }
          >
            <option value="15">
              15 minutes
            </option>

            <option value="30">
              30 minutes
            </option>

            <option value="45">
              45 minutes
            </option>

            <option value="60">
              60 minutes
            </option>

            <option value="90">
              90 minutes
            </option>

            <option value="120">
              120 minutes
            </option>
          </select>

        </div>

      </section>

      <section className="quick-tools">

        <div className="section-heading">

          <div>

            <span className="section-label">
              QUICK TOOLS
            </span>

            <h2>
              What do you want
              to do?
            </h2>

          </div>

        </div>

        <div className="dashboard-tools-grid">

          <button
            className="dashboard-tool"
            onClick={
              onStartStudying
            }
          >

            <div>
              📖
            </div>

            <strong>
              Study Material
            </strong>

            <span>
              Upload notes and
              start learning.
            </span>

          </button>

          <button
            className="dashboard-tool"
            onClick={
              onOpenHistory
            }
          >

            <div>
              🕘
            </div>

            <strong>
              Study History
            </strong>

            <span>
              Review your previous
              AI sessions.
            </span>

          </button>

          <button
            className="dashboard-tool"
            onClick={
              onStartStudying
            }
          >

            <div>
              🧠
            </div>

            <strong>
              Flashcards
            </strong>

            <span>
              Upload material and
              create revision cards.
            </span>

          </button>

          <button
            className="dashboard-tool"
            onClick={
              onStartStudying
            }
          >

            <div>
              🎯
            </div>

            <strong>
              Quick Quiz
            </strong>

            <span>
              Upload material and
              test yourself.
            </span>

          </button>

        </div>

      </section>

      <section className="recent-section">

        <div className="section-heading">

          <div>

            <span className="section-label">
              RECENT ACTIVITY
            </span>

            <h2>
              Continue your
              learning
            </h2>

          </div>

          {history.length >
            0 && (
            <button
              className="view-history-btn"
              onClick={
                onOpenHistory
              }
            >
              View all →
            </button>
          )}

        </div>

        {historyLoading ? (
          <div className="dashboard-empty">

            <div>
              ⏳
            </div>

            <h3>
              Loading your
              activity...
            </h3>

            <p>
              Getting your recent
              study sessions.
            </p>

          </div>
        ) : recentSessions.length ===
          0 ? (
          <div className="dashboard-empty">

            <div>
              📚
            </div>

            <h3>
              Your study activity
              will appear here
            </h3>

            <p>
              Upload your first
              study material and let
              StudyMate help you
              learn.
            </p>

            <button
              className="primary-dashboard-btn"
              onClick={
                onStartStudying
              }
            >
              Start Studying →
            </button>

          </div>
        ) : (
          <div className="recent-list">

            {recentSessions.map(
              (item) => (
                <div
                  className="recent-item"
                  key={item.id}
                >

                  <div className="recent-icon">
                    {
                      ACTIONS[
                        item.action
                      ]?.icon ||
                      "📚"
                    }
                  </div>

                  <div className="recent-content">

                    <strong>
                      {
                        ACTIONS[
                          item.action
                        ]?.title ||
                        "Study Session"
                      }
                    </strong>

                    <span>
                      {
                        item.fileName ||
                        "Study Material"
                      }
                    </span>

                    <small>
                      {formatHistoryDate(
                        item.createdAt
                      )}
                    </small>

                  </div>

                </div>
              )
            )}

          </div>
        )}

      </section>

    </main>
  );
}

/* =========================================================
   RESULT VIEW
========================================================= */

function ResultView({
  action,
  result,
  onBack,
}) {
  const info =
    ACTIONS[action];

  return (
    <main className="result-page">

      <button
        className="result-back"
        onClick={onBack}
      >
        ← Back
      </button>

      <div className="result-hero">

        <div className="result-icon">
          {info?.icon ||
            "✨"}
        </div>

        <div>

          <span className="result-label">
            STUDYMATE AI
          </span>

          <h1>
            {result.title ||
              info?.title ||
              "Study Result"}
          </h1>

          <p>
            AI-powered study
            assistance based on
            your uploaded material.
          </p>

        </div>

      </div>

      {action ===
        "explain" && (
        <ExplainResult
          result={result}
        />
      )}

      {action ===
        "summarize" && (
        <SummaryResult
          result={result}
        />
      )}

      {action ===
        "questions" && (
        <QuestionsResult
          result={result}
        />
      )}

      {action ===
        "flashcards" && (
        <FlashcardsResult
          result={result}
        />
      )}

      {action ===
        "quiz" && (
        <QuizResult
          result={result}
        />
      )}

    </main>
  );
}

/* =========================================================
   EXPLAIN RESULT
========================================================= */

function ExplainResult({
  result,
}) {
  return (
    <div className="result-content">

      {result.overview && (
        <section className="result-card overview-card">

          <h2>
            💡 In simple terms
          </h2>

          <p>
            {result.overview}
          </p>

        </section>
      )}

      {result.sections?.map(
        (
          section,
          index
        ) => (
          <section
            className="result-card"
            key={index}
          >

            <span className="section-number">
              {String(
                index + 1
              ).padStart(
                2,
                "0"
              )}
            </span>

            <h2>
              {section.heading}
            </h2>

            <p>
              {section.explanation}
            </p>

            {section.keyPoints
              ?.length >
              0 && (
              <div className="key-points">

                <h3>
                  Key points
                </h3>

                <ul>

                  {section.keyPoints.map(
                    (
                      point,
                      pointIndex
                    ) => (
                      <li
                        key={
                          pointIndex
                        }
                      >
                        {point}
                      </li>
                    )
                  )}

                </ul>

              </div>
            )}

          </section>
        )
      )}

      {result.examTips
        ?.length >
        0 && (
        <section className="result-card tips-card">

          <h2>
            🎯 Exam Tips
          </h2>

          <ul>

            {result.examTips.map(
              (
                tip,
                index
              ) => (
                <li
                  key={index}
                >
                  {tip}
                </li>
              )
            )}

          </ul>

        </section>
      )}

    </div>
  );
}

/* =========================================================
   SUMMARY RESULT
========================================================= */

function SummaryResult({
  result,
}) {
  return (
    <div className="result-content">

      {result.summary && (
        <section className="result-card overview-card">

          <h2>
            📝 Summary
          </h2>

          <p>
            {result.summary}
          </p>

        </section>
      )}

      {result.keyPoints
        ?.length >
        0 && (
        <section className="result-card">

          <h2>
            ⭐ Key Points
          </h2>

          <ul className="large-list">

            {result.keyPoints.map(
              (
                point,
                index
              ) => (
                <li
                  key={index}
                >
                  {point}
                </li>
              )
            )}

          </ul>

        </section>
      )}

      {result.importantTerms
        ?.length >
        0 && (
        <section className="result-card">

          <h2>
            📚 Important Terms
          </h2>

          <div className="terms-grid">

            {result.importantTerms.map(
              (
                item,
                index
              ) => (
                <div
                  className="term-item"
                  key={index}
                >

                  <strong>
                    {item.term}
                  </strong>

                  <p>
                    {item.meaning}
                  </p>

                </div>
              )
            )}

          </div>

        </section>
      )}

      {result.examTips
        ?.length >
        0 && (
        <section className="result-card tips-card">

          <h2>
            🎯 Exam Tips
          </h2>

          <ul>

            {result.examTips.map(
              (
                tip,
                index
              ) => (
                <li
                  key={index}
                >
                  {tip}
                </li>
              )
            )}

          </ul>

        </section>
      )}

    </div>
  );
}

/* =========================================================
   QUESTIONS RESULT
========================================================= */

function QuestionsResult({
  result,
}) {
  return (
    <div className="result-content">

      {result.questions?.map(
        (
          question,
          index
        ) => (
          <section
            className="result-card question-card"
            key={index}
          >

            <div className="question-top">

              <span>
                Question{" "}
                {index + 1}
              </span>

              <small>
                {question.type ===
                "mcq"
                  ? "Multiple Choice"
                  : "Short Answer"}
              </small>

            </div>

            <h2>
              {question.question}
            </h2>

            {question.options
              ?.length >
              0 && (
              <div className="options-list">

                {question.options.map(
                  (
                    option,
                    optionIndex
                  ) => (
                    <div
                      className="option-item"
                      key={
                        optionIndex
                      }
                    >

                      <span>
                        {String.fromCharCode(
                          65 +
                            optionIndex
                        )}
                      </span>

                      <p>
                        {option}
                      </p>

                    </div>
                  )
                )}

              </div>
            )}

            <details className="answer-box">

              <summary>
                Show answer
              </summary>

              <strong>
                {question.answer}
              </strong>

              {question.explanation && (
                <p>
                  {
                    question.explanation
                  }
                </p>
              )}

            </details>

          </section>
        )
      )}

    </div>
  );
}

/* =========================================================
   FLASHCARDS RESULT
========================================================= */

function FlashcardsResult({
  result,
}) {
  const [
    flipped,
    setFlipped,
  ] = useState({});

  const toggleCard = (
    index
  ) => {
    setFlipped(
      (previous) => ({
        ...previous,
        [index]:
          !previous[index],
      })
    );
  };

  return (
    <div className="result-content">

      <section className="flashcards-intro">

        <h2>
          🧠 Revision Flashcards
        </h2>

        <p>
          Tap a card to reveal
          the answer.
        </p>

      </section>

      <div className="flashcards-grid">

        {result.cards?.map(
          (
            card,
            index
          ) => (
            <button
              className={`flashcard ${
                flipped[index]
                  ? "flipped"
                  : ""
              }`}
              key={index}
              onClick={() =>
                toggleCard(
                  index
                )
              }
            >

              <span className="flashcard-label">
                {flipped[index]
                  ? "ANSWER"
                  : "QUESTION"}
              </span>

              <strong>
                {flipped[index]
                  ? card.back
                  : card.front}
              </strong>

              <small>
                Tap to{" "}
                {flipped[index]
                  ? "hide"
                  : "reveal"}
              </small>

            </button>
          )
        )}

      </div>

    </div>
  );
}

/* =========================================================
   QUIZ RESULT
========================================================= */

function QuizResult({
  result,
}) {
  const [
    selected,
    setSelected,
  ] = useState({});

  const [
    submitted,
    setSubmitted,
  ] = useState(false);

  const questions =
    result.questions ||
    [];

  const score =
    questions.reduce(
      (
        total,
        question,
        index
      ) => {
        const selectedAnswer =
          selected[index];

        const correctAnswer =
          normalizeQuizAnswer(
            question.answer
          );

        return (
          total +
          (selectedAnswer ===
          correctAnswer
            ? 1
            : 0)
        );
      },
      0
    );

  const chooseAnswer = (
    questionIndex,
    optionIndex
  ) => {
    if (submitted) {
      return;
    }

    setSelected(
      (previous) => ({
        ...previous,
        [questionIndex]:
          optionIndex,
      })
    );
  };

  const resetQuiz = () => {
    setSelected({});
    setSubmitted(false);
  };

  return (
    <div className="result-content">

      {submitted && (
        <section className="score-card">

          <span>
            Your Score
          </span>

          <strong>
            {score}/
            {questions.length}
          </strong>

          <p>
            {score ===
            questions.length
              ? "Excellent! You got everything correct. 🎉"
              : score >=
                questions.length *
                  0.7
              ? "Good work! Review the questions you missed."
              : "Keep studying. Use Explain and Flashcards to revise."}
          </p>

        </section>
      )}

      {questions.map(
        (
          question,
          questionIndex
        ) => (
          <section
            className="result-card quiz-question"
            key={
              questionIndex
            }
          >

            <div className="question-top">

              <span>
                Question{" "}
                {questionIndex +
                  1}
              </span>

            </div>

            <h2>
              {question.question}
            </h2>

            <div className="quiz-options">

              {question.options?.map(
                (
                  option,
                  optionIndex
                ) => {
                  const isSelected =
                    selected[
                      questionIndex
                    ] ===
                    optionIndex;

                  const correctAnswer =
                    normalizeQuizAnswer(
                      question.answer
                    );

                  const isCorrect =
                    submitted &&
                    correctAnswer ===
                      optionIndex;

                  const isWrong =
                    submitted &&
                    isSelected &&
                    !isCorrect;

                  return (
                    <button
                      key={
                        optionIndex
                      }
                      className={[
                        "quiz-option",
                        isSelected
                          ? "selected"
                          : "",
                        isCorrect
                          ? "correct"
                          : "",
                        isWrong
                          ? "wrong"
                          : "",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " "
                        )}
                      onClick={() =>
                        chooseAnswer(
                          questionIndex,
                          optionIndex
                        )
                      }
                    >

                      <span>
                        {String.fromCharCode(
                          65 +
                            optionIndex
                        )}
                      </span>

                      {option}

                    </button>
                  );
                }
              )}

            </div>

            {submitted && (
              <div className="quiz-explanation">

                <strong>
                  {normalizeQuizAnswer(
                    question.answer
                  ) ===
                  selected[
                    questionIndex
                  ]
                    ? "✓ Correct"
                    : "✕ Not quite"}
                </strong>

                <p>
                  {
                    question.explanation
                  }
                </p>

              </div>
            )}

          </section>
        )
      )}

      <div className="quiz-actions">

        <button
          className="submit-quiz"
          onClick={() =>
            setSubmitted(
              true
            )
          }
          disabled={
            questions.length ===
              0 ||
            Object.keys(
              selected
            ).length === 0
          }
        >
          {submitted
            ? "Quiz Submitted ✓"
            : "Submit Quiz →"}
        </button>

        {submitted && (
          <button
            className="quiz-retry-btn"
            onClick={
              resetQuiz
            }
          >
            🔄 Try Again
          </button>
        )}

      </div>

    </div>
  );
}

/* =========================================================
   QUIZ ANSWER NORMALIZER
========================================================= */

function normalizeQuizAnswer(
  answer
) {
  if (
    typeof answer ===
    "number"
  ) {
    return answer;
  }

  if (
    typeof answer !==
    "string"
  ) {
    return null;
  }

  const trimmed =
    answer.trim();

  if (
    /^[0-9]+$/.test(
      trimmed
    )
  ) {
    return Number(
      trimmed
    );
  }

  const letter =
    trimmed
      .toUpperCase()
      .charCodeAt(0) -
    65;

  if (
    letter >= 0 &&
    letter <= 25
  ) {
    return letter;
  }

  return null;
}

export default App;