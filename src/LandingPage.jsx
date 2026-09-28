import "./LandingPage.css";

const features = [
  {
    icon: "📄",
    title: "Upload Your Materials",
    text: "Upload lecture notes, PDFs and text materials and keep everything ready for your study session.",
  },
  {
    icon: "✨",
    title: "Understand Difficult Topics",
    text: "Let StudyMate explain difficult academic topics using simple, student-friendly language.",
  },
  {
    icon: "📝",
    title: "Create Revision Notes",
    text: "Turn long study materials into clear summaries and important revision points.",
  },
  {
    icon: "❓",
    title: "Practice Questions",
    text: "Generate questions directly from your study material so you can test your understanding.",
  },
  {
    icon: "🧠",
    title: "Build Flashcards",
    text: "Turn important concepts into quick flashcards for faster revision.",
  },
  {
    icon: "🎯",
    title: "Test Yourself",
    text: "Take AI-generated quizzes and discover what you understand and what needs more revision.",
  },
];

const steps = [
  {
    number: "01",
    title: "Upload",
    text: "Bring your lecture notes, PDFs or study materials into StudyMate.",
    icon: "📚",
  },
  {
    number: "02",
    title: "Understand",
    text: "Ask StudyMate to explain difficult topics in language you can understand.",
    icon: "💡",
  },
  {
    number: "03",
    title: "Practice",
    text: "Generate questions, flashcards and quizzes from your own material.",
    icon: "✍️",
  },
  {
    number: "04",
    title: "Improve",
    text: "Use your dashboard and study history to stay consistent with your learning.",
    icon: "📈",
  },
];

function LandingPage({
  onGetStarted,
  onLogin,
  user,
  onDashboard,
}) {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <button
          className="landing-brand"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
        >
          <span className="brand-mark">🎓</span>

          <span>
            <strong>StudyMate</strong>
            <small>Study smarter.</small>
          </span>
        </button>

        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#why-studymate">Why StudyMate</a>
        </div>

        <div className="landing-nav-actions">
          {user ? (
            <button
              className="nav-login"
              onClick={onDashboard}
            >
              Dashboard
            </button>
          ) : (
            <button
              className="nav-login"
              onClick={onLogin}
            >
              Login
            </button>
          )}

          <button
            className="nav-start"
            onClick={
              user ? onDashboard : onGetStarted
            }
          >
            {user ? "Open Dashboard" : "Get Started"}
          </button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <div className="hero-content">
          <div className="hero-badge">
            <span>✦</span>
            AI-POWERED STUDY ASSISTANT
          </div>

          <h1>
            Stop struggling with
            <span> difficult study material.</span>
          </h1>

          <p>
            StudyMate helps you understand your notes,
            create revision materials, practice questions,
            flashcards and quizzes — all from the material
            you are already studying.
          </p>

          <div className="hero-actions">
            <button
              className="hero-primary"
              onClick={
                user ? onDashboard : onGetStarted
              }
            >
              {user
                ? "Open My Dashboard"
                : "Get Started Free"}
              <span>→</span>
            </button>

            <a
              className="hero-secondary"
              href="#how-it-works"
            >
              See how it works
              <span>↓</span>
            </a>
          </div>

          <div className="hero-trust">
            <span>✓ Built for students</span>
            <span>✓ Learn from your own materials</span>
            <span>✓ Study at your own pace</span>
          </div>
        </div>

        <div className="hero-product">
          <div className="hero-product-window">
            <div className="window-top">
              <div className="window-dots">
                <i />
                <i />
                <i />
              </div>

              <span>StudyMate Dashboard</span>

              <div className="window-avatar">
                🎓
              </div>
            </div>

            <div className="window-body">
              <div className="window-welcome">
                <div>
                  <small>YOUR STUDY SPACE</small>
                  <h3>Study smarter today.</h3>
                  <p>
                    Everything you need to understand,
                    practice and revise.
                  </p>
                </div>

                <div className="window-student">
                  👋
                </div>
              </div>

              <div className="window-upload">
                <div className="upload-icon">
                  📄
                </div>

                <div>
                  <strong>
                    Upload study material
                  </strong>

                  <span>
                    PDF, TXT and more
                  </span>
                </div>

                <button>Upload</button>
              </div>

              <div className="window-tools">
                <div>
                  <span>📖</span>
                  <strong>Explain</strong>
                  <small>Understand</small>
                </div>

                <div>
                  <span>📝</span>
                  <strong>Summarize</strong>
                  <small>Revise</small>
                </div>

                <div>
                  <span>❓</span>
                  <strong>Questions</strong>
                  <small>Practice</small>
                </div>

                <div>
                  <span>🧠</span>
                  <strong>Flashcards</strong>
                  <small>Remember</small>
                </div>
              </div>

              <div className="window-progress">
                <div>
                  <span>Today's study goal</span>
                  <strong>65%</strong>
                </div>

                <div className="mini-progress">
                  <span />
                </div>
              </div>
            </div>
          </div>

          <div className="floating-card floating-card-one">
            <span>🧠</span>
            <div>
              <strong>12 Flashcards</strong>
              <small>Ready to revise</small>
            </div>
          </div>

          <div className="floating-card floating-card-two">
            <span>🎯</span>
            <div>
              <strong>Study Progress</strong>
              <small>Keep going!</small>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-stats">
        <div>
          <strong>One place</strong>
          <span>for your study workflow</span>
        </div>

        <div>
          <strong>6+ tools</strong>
          <span>to understand and revise</span>
        </div>

        <div>
          <strong>AI-powered</strong>
          <span>help when you need it</span>
        </div>

        <div>
          <strong>Your material</strong>
          <span>at the centre of learning</span>
        </div>
      </section>

      <section className="story-section" id="why-studymate">
        <div className="section-intro">
          <span className="section-eyebrow">
            THE PROBLEM
          </span>

          <h2>
            Studying shouldn't feel like
            <span> fighting through a wall of text.</span>
          </h2>

          <p>
            Students often have lecture slides, PDFs,
            notes and textbooks everywhere — but knowing
            what to focus on and how to revise can be
            difficult.
          </p>
        </div>

        <div className="problem-grid">
          <div className="problem-card">
            <span>😵</span>
            <h3>Too much material</h3>
            <p>
              Important information can get buried inside
              long lecture notes and documents.
            </p>
          </div>

          <div className="problem-card">
            <span>🤔</span>
            <h3>Hard topics</h3>
            <p>
              Sometimes you understand the words but not
              what the lecturer is actually explaining.
            </p>
          </div>

          <div className="problem-card">
            <span>⏰</span>
            <h3>Limited study time</h3>
            <p>
              You need to spend your time learning rather
              than manually preparing everything.
            </p>
          </div>
        </div>
      </section>

      <section className="solution-section">
        <div className="solution-visual">
          <div className="solution-card">
            <div className="solution-card-top">
              <span>STUDYMATE AI</span>
              <span>✦</span>
            </div>

            <h3>
              What is the difference between
              endocrine and exocrine glands?
            </h3>

            <div className="ai-answer">
              <div>✦</div>

              <p>
                Endocrine glands release hormones directly
                into the bloodstream, while exocrine glands
                release their substances through ducts...
              </p>
            </div>

            <div className="solution-tags">
              <span>Simple explanation</span>
              <span>Key concept</span>
            </div>
          </div>
        </div>

        <div className="solution-content">
          <span className="section-eyebrow">
            THE SOLUTION
          </span>

          <h2>
            Turn your study material into a
            <span> personal learning system.</span>
          </h2>

          <p>
            StudyMate takes the material you are already
            studying and helps you understand it, break it
            down and practise it.
          </p>

          <div className="solution-points">
            <div>
              <span>✓</span>
              <p>
                <strong>Learn from your material</strong>
                <small>
                  Keep your course content at the centre
                  of your study session.
                </small>
              </p>
            </div>

            <div>
              <span>✓</span>
              <p>
                <strong>Study actively</strong>
                <small>
                  Move beyond reading with questions,
                  flashcards and quizzes.
                </small>
              </p>
            </div>

            <div>
              <span>✓</span>
              <p>
                <strong>Keep your progress organised</strong>
                <small>
                  Your dashboard brings your study tools
                  together in one place.
                </small>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="features-section"
        id="features"
      >
        <div className="section-intro centered">
          <span className="section-eyebrow">
            EVERYTHING IN ONE PLACE
          </span>

          <h2>
            Your study tools,
            <span> all together.</span>
          </h2>

          <p>
            StudyMate is designed to take you from
            "I don't understand this" to "I can answer
            questions about this."
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <article
              className="feature-card"
              key={feature.title}
            >
              <div className="feature-icon">
                {feature.icon}
              </div>

              <h3>{feature.title}</h3>

              <p>{feature.text}</p>

              <span className="feature-arrow">
                Explore →
              </span>
            </article>
          ))}
        </div>
      </section>

      <section
        className="how-section"
        id="how-it-works"
      >
        <div className="section-intro centered">
          <span className="section-eyebrow">
            HOW IT WORKS
          </span>

          <h2>
            Four simple steps to
            <span> study smarter.</span>
          </h2>

          <p>
            No complicated setup. Bring your material and
            let StudyMate help you turn it into useful study
            resources.
          </p>
        </div>

        <div className="steps-grid">
          {steps.map((step) => (
            <div
              className="step-card"
              key={step.number}
            >
              <div className="step-top">
                <span>{step.number}</span>
                <strong>{step.icon}</strong>
              </div>

              <h3>{step.title}</h3>

              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-preview-section">
        <div className="dashboard-preview-copy">
          <span className="section-eyebrow">
            YOUR STUDY COMMAND CENTRE
          </span>

          <h2>
            Everything you need,
            <span> right inside your dashboard.</span>
          </h2>

          <p>
            Once you create your account, StudyMate becomes
            your personal study workspace.
          </p>

          <div className="preview-list">
            <div>
              <span>01</span>
              <p>
                <strong>Upload your material</strong>
                <small>
                  Start a study session from your own notes.
                </small>
              </p>
            </div>

            <div>
              <span>02</span>
              <p>
                <strong>Choose what you need</strong>
                <small>
                  Explain, summarize, practise or revise.
                </small>
              </p>
            </div>

            <div>
              <span>03</span>
              <p>
                <strong>Track your learning</strong>
                <small>
                  Revisit your sessions and keep improving.
                </small>
              </p>
            </div>
          </div>
        </div>

        <div className="big-dashboard-mockup">
          <div className="mockup-header">
            <span>🎓 StudyMate</span>
            <div>
              <i />
              <i />
              <i />
            </div>
          </div>

          <div className="mockup-content">
            <div className="mockup-greeting">
              <small>GOOD MORNING</small>
              <h3>Ready to learn?</h3>
            </div>

            <div className="mockup-upload-box">
              <div>📄</div>
              <strong>Upload study material</strong>
              <span>Drop your PDF or text here</span>
              <button>Choose file</button>
            </div>

            <div className="mockup-tool-row">
              <div>
                <span>📖</span>
                Explain
              </div>

              <div>
                <span>📝</span>
                Summarize
              </div>

              <div>
                <span>🎯</span>
                Quiz
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-glow" />

        <span className="section-eyebrow">
          YOUR NEXT STUDY SESSION
        </span>

        <h2>
          Stop just reading.
          <span> Start understanding.</span>
        </h2>

        <p>
          Create your StudyMate account and build a
          smarter way to study.
        </p>

        <button
          className="cta-button"
          onClick={
            user ? onDashboard : onGetStarted
          }
        >
          {user
            ? "Open My Dashboard"
            : "Get Started Free"}
          <span>→</span>
        </button>
      </section>

      <footer className="landing-footer">
        <div className="footer-brand">
          <div>
            <span className="brand-mark">🎓</span>

            <strong>StudyMate</strong>
          </div>

          <p>
            Your AI-powered study companion.
          </p>
        </div>

        <div className="footer-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#why-studymate">
            Why StudyMate
          </a>
        </div>

        <span className="footer-copy">
          © {new Date().getFullYear()} StudyMate
        </span>
      </footer>
    </main>
  );
}

export default LandingPage;