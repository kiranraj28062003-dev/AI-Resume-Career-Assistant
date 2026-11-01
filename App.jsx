
import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function getErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") return detail;
  if (detail != null) return JSON.stringify(detail);

  if (error?.message === "Network Error") {
    return "Cannot connect to the backend. Check that FastAPI is running at http://127.0.0.1:8000.";
  }

  return fallback;
}

function SectionHeading({ step, title, badge }) {
  return (
    <div className="result-heading">
      <div>
        <span className="step-label">{step}</span>
        <h2>{title}</h2>
      </div>
      {badge != null && <span className="score-rating">{badge}</span>}
    </div>
  );
}

function Message({ title, children, error = false }) {
  return (
    <div
      className={`message ${error ? "error-message" : "success-message"}`}
      role={error ? "alert" : "status"}
    >
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

function Chips({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p>No items were detected.</p>;
  }

  return (
    <div className="skill-chips">
      {items.map((item, index) => (
        <span className="skill-chip" key={`${item}-${index}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function SuggestionsList({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p>No recommendations available for this analysis.</p>;
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li key={`${index}-${String(item)}`}>
          {typeof item === "string" ? item : JSON.stringify(item)}
        </li>
      ))}
    </ul>
  );
}

function ScoreCategories({ categories }) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return <p>No category breakdown was returned by the API.</p>;
  }

  return (
    <div className="score-categories">
      {categories.map((category, index) => {
        const score = Number(category.score) || 0;
        const maxScore = Number(category.max_score) || 0;
        const percentage =
          maxScore > 0
            ? Math.max(0, Math.min(100, (score / maxScore) * 100))
            : 0;

        return (
          <div
            className="score-category"
            key={category.key ?? category.name ?? index}
          >
            <div className="score-category-heading">
              <span>{category.name ?? "Category"}</span>
              <strong>{score}/{maxScore}</strong>
            </div>

            <div
              className="score-progress-track"
              role="progressbar"
              aria-label={category.name ?? "Score"}
              aria-valuemin={0}
              aria-valuemax={maxScore}
              aria-valuenow={score}
            >
              <div
                className="score-progress-fill"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {category.suggestion && <p>{category.suggestion}</p>}
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jobDescription, setJobDescription] = useState("");

  const [result, setResult] = useState(null);
  const [skillResult, setSkillResult] = useState(null);
  const [scoreResult, setScoreResult] = useState(null);
  const [atsResult, setAtsResult] = useState(null);
  const [jobMatchResult, setJobMatchResult] = useState(null);
  const [skillGapResult, setSkillGapResult] = useState(null);
  const [improvementResult, setImprovementResult] = useState(null);
  const [learningResult, setLearningResult] = useState(null);
  const [interviewResult, setInterviewResult] = useState(null);

  const [learningLoading, setLearningLoading] = useState(false);
  const [interviewLoading, setInterviewLoading] = useState(false);

  const [error, setError] = useState("");
  const [skillError, setSkillError] = useState("");
  const [scoreError, setScoreError] = useState("");
  const [atsError, setAtsError] = useState("");
  const [jobMatchError, setJobMatchError] = useState("");
  const [skillGapError, setSkillGapError] = useState("");
  const [improvementError, setImprovementError] = useState("");
  const [learningError, setLearningError] = useState("");
  const [interviewError, setInterviewError] = useState("");

  function clearAnalysisResults() {
    setResult(null);
    setSkillResult(null);
    setScoreResult(null);
    setAtsResult(null);
    setJobMatchResult(null);
    setSkillGapResult(null);
    setImprovementResult(null);
    setLearningResult(null);
    setInterviewResult(null);

    setError("");
    setSkillError("");
    setScoreError("");
    setAtsError("");
    setJobMatchError("");
    setSkillGapError("");
    setImprovementError("");
    setLearningError("");
    setInterviewError("");
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];

    setFile(null);
    clearAnalysisResults();

    if (!selectedFile) return;

    const extension = selectedFile.name.split(".").pop()?.toLowerCase();

    if (!["pdf", "docx"].includes(extension)) {
      setError("Please select a PDF or DOCX file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size must be 5 MB or less.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
    setError("");
  }

  // Steps 1–7: Resume analysis workflow
  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setError("Please select your resume first.");
      return;
    }

    setLoading(true);
    clearAnalysisResults();

    try {
      const formData = new FormData();
      formData.append("file", file);

      const resumeResponse = await axios.post(
        `${API_URL}/api/v1/resumes/preview`,
        formData
      );

      const resumeData = resumeResponse.data;
      setResult(resumeData);

      const resumeText = resumeData?.extracted_text;

      if (typeof resumeText !== "string" || !resumeText.trim()) {
        throw new Error("The backend returned no extracted resume text.");
      }

      // Step 2: Skill extraction
      try {
        const response = await axios.post(
          `${API_URL}/api/v1/skills/extract`,
          { text: resumeText }
        );
        setSkillResult(response.data);
      } catch (err) {
        setSkillError(
          getErrorMessage(err, "Resume skill analysis failed.")
        );
      }

      // Step 3: Resume quality score
      try {
        const response = await axios.post(
          `${API_URL}/api/v1/resumes/score`,
          { text: resumeText }
        );
        setScoreResult(response.data);
      } catch (err) {
        setScoreError(getErrorMessage(err, "Resume scoring failed."));
      }

      // Step 4: ATS compatibility
      try {
        const response = await axios.post(
          `${API_URL}/api/v1/resumes/ats-check`,
          { text: resumeText }
        );
        setAtsResult(response.data);
      } catch (err) {
        setAtsError(getErrorMessage(err, "ATS analysis failed."));
      }

      const description = jobDescription.trim();

      // Steps 5–6: Job matching and skill gap analysis
      if (description) {
        try {
          const response = await axios.post(
            `${API_URL}/api/v1/jobs/match`,
            {
              resume_text: resumeText,
              job_description: description,
            }
          );
          setJobMatchResult(response.data);
        } catch (err) {
          setJobMatchError(
            getErrorMessage(err, "Job matching failed.")
          );
        }

        try {
          const response = await axios.post(
            `${API_URL}/api/v1/skills/gap-analysis`,
            {
              resume_text: resumeText,
              job_description: description,
            }
          );
          setSkillGapResult(response.data);
        } catch (err) {
          setSkillGapError(
            getErrorMessage(err, "Skill gap analysis failed.")
          );
        }
      }

      // Step 7: Resume improvement suggestions
      try {
        const response = await axios.post(
          `${API_URL}/api/v1/resumes/improve`,
          { text: resumeText }
        );
        setImprovementResult(response.data);
      } catch (err) {
        setImprovementError(
          getErrorMessage(err, "Resume improvement suggestions failed.")
        );
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to process your resume."));
    } finally {
      setLoading(false);
    }
  }

  // Step 8: Learning recommendations
  async function handleLearningRecommendations() {
    setLearningError("");
    setLearningResult(null);

    const resumeText = result?.extracted_text?.trim();
    const description = jobDescription.trim();

    if (!resumeText) {
      setLearningError("Please upload and analyse your resume first.");
      return;
    }

    if (!description) {
      setLearningError("Please enter a target job description first.");
      return;
    }

    try {
      setLearningLoading(true);

      const response = await axios.post(
        `${API_URL}/api/v1/learning/recommendations`,
        {
          resume_text: resumeText,
          job_description: description,
        }
      );

      setLearningResult(response.data);
    } catch (err) {
      setLearningError(
        getErrorMessage(err, "Unable to generate learning recommendations.")
      );
    } finally {
      setLearningLoading(false);
    }
  }

  // Step 9: Interview preparation
  async function handleInterviewPreparation() {
    setInterviewError("");
    setInterviewResult(null);

    const resumeText = result?.extracted_text?.trim();
    const description = jobDescription.trim();

    if (!resumeText) {
      setInterviewError("Please upload and analyse your resume first.");
      return;
    }

    if (!description) {
      setInterviewError(
        "Please enter a target job description before generating questions."
      );
      return;
    }

    try {
      setInterviewLoading(true);

      const response = await axios.post(
        `${API_URL}/api/v1/interview/preparation`,
        {
          resume_text: resumeText,
          job_description: description,
        }
      );

      setInterviewResult(response.data);
    } catch (err) {
      setInterviewError(
        getErrorMessage(
          err,
          "Interview preparation failed. Check that the Step 9 backend endpoint is available."
        )
      );
    } finally {
      setInterviewLoading(false);
    }
  }

  async function copyExtractedText() {
    if (!result?.extracted_text) return;

    try {
      await navigator.clipboard.writeText(result.extracted_text);
    } catch {
      setError(
        "Clipboard access failed. Please copy the extracted text manually."
      );
    }
  }

  function handleJobDescriptionChange(event) {
    setJobDescription(event.target.value);
    setJobMatchResult(null);
    setJobMatchError("");
    setSkillGapResult(null);
    setSkillGapError("");
    setLearningResult(null);
    setLearningError("");
    setInterviewResult(null);
    setInterviewError("");
  }

  function renderInterviewQuestions(questions, title) {
    if (!Array.isArray(questions) || questions.length === 0) {
      return (
        <div className="score-suggestions">
          <h3>{title}</h3>
          <p>No questions were returned for this category.</p>
        </div>
      );
    }

    return (
      <div className="score-suggestions">
        <h3>{title}</h3>

        <div className="skill-gap-recommendations">
          {questions.map((item, index) => (
            <article
              className="recommendation-item"
              key={`${item.skill ?? title}-${index}`}
            >
              <div className="result-heading">
                <strong>
                  {index + 1}. {item.question}
                </strong>
                {item.skill && (
                  <span className="character-count">{item.skill}</span>
                )}
              </div>

              {item.sample_answer && (
                <div>
                  <h4>Sample answer</h4>
                  <p>{item.sample_answer}</p>
                </div>
              )}

              {item.practice_tip && (
                <div>
                  <h4>Practice tip</h4>
                  <p>{item.practice_tip}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-icon">C</span>
          <span>
            CareerPilot <strong>AI</strong>
          </span>
        </a>

        <span className="status-badge">
          <span className="status-dot" />
          Resume Intelligence
        </span>
      </header>

      <main className="main-content" id="home">
        <section className="hero">
          <span className="eyebrow">YOUR CAREER STARTS HERE</span>
          <h1>
            Turn your resume into
            <span className="gradient-text"> your next opportunity.</span>
          </h1>
          <p>
            Analyse your resume, evaluate ATS compatibility, compare job
            requirements, identify skill gaps, discover learning resources,
            and prepare for interviews.
          </p>
        </section>

        <section className="workspace">
          <div className="upload-card">
            <div className="section-heading">
              <div>
                <span className="step-label">STEP 01</span>
                <h2>Upload your resume</h2>
              </div>
              <span className="file-icon">↥</span>
            </div>

            <form onSubmit={handleUpload}>
              <label className="dropzone" htmlFor="resume-file">
                <span className="upload-icon">↑</span>
                <strong>{file ? file.name : "Choose your resume"}</strong>
                <span>
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB selected`
                    : "Select a PDF or Word document"}
                </span>
                <span className="browse-button">Browse files</span>
                <input
                  id="resume-file"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                />
              </label>

              <p className="file-note">PDF or DOCX · Maximum size 5 MB</p>

              <div className="job-description-input">
                <label htmlFor="jobDescription">
                  <span className="step-label">STEPS 05–06, 08–09</span>
                  <strong>Paste job description</strong>
                </label>
                <textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={handleJobDescriptionChange}
                  placeholder="Paste the target job title, responsibilities, required skills, and qualifications here."
                  rows={8}
                />
                <p className="file-note">
                  Recommended for job matching, learning recommendations,
                  and interview preparation.
                </p>
              </div>

              <button
                className="analyze-button"
                type="submit"
                disabled={!file || loading}
              >
                {loading ? "Analysing resume..." : "Analyse my resume"}
                {!loading && <span>→</span>}
              </button>
            </form>

            {loading && (
              <Message title="Analysis in progress">
                Processing your resume. Please wait.
              </Message>
            )}

            {error && (
              <Message title="Something went wrong" error>
                {error}
              </Message>
            )}

            {result && (
              <Message title="Resume processed successfully!">
                {Number(result.characters_extracted ?? 0).toLocaleString()}{" "}
                characters extracted from {result.filename ?? file?.name}.
              </Message>
            )}
          </div>

          <aside className="info-card">
            <span className="info-icon">✦</span>
            <h3>Your career, made clearer.</h3>
            <p>
              Understand your resume, identify opportunities, and prepare
              for your next job.
            </p>

            <div className="feature-list">
              <div><span>01</span> Resume text extraction</div>
              <div><span>02</span> Technical skill analysis</div>
              <div><span>03</span> Resume quality score</div>
              <div><span>04</span> ATS compatibility analysis</div>
              <div><span>05</span> Job description matching</div>
              <div><span>06</span> Skill gap analysis</div>
              <div><span>07</span> Resume improvement suggestions</div>
              <div><span>08</span> Learning recommendations</div>
              <div><span>09</span> Interview preparation</div>
            </div>
          </aside>
        </section>

        {result && (
          <section className="result-card">
            <SectionHeading
              step="STEP 01"
              title="Extracted resume text"
              badge={`${Number(result.characters_extracted ?? 0).toLocaleString()} characters`}
            />
            <textarea
              className="extracted-text"
              value={result.extracted_text ?? ""}
              readOnly
              aria-label="Extracted resume text"
            />
            <button
              className="copy-button"
              onClick={copyExtractedText}
              type="button"
            >
              Copy extracted text
            </button>
          </section>
        )}

        {skillResult && (
          <section className="result-card skill-result-card">
            <SectionHeading
              step="STEP 02"
              title="Detected resume skills"
              badge={`${skillResult.total_skills ?? skillResult.skills?.length ?? 0} skills found`}
            />
            <Chips items={skillResult.skills} />
            {skillResult.categories &&
              Object.entries(skillResult.categories).map(([category, skills]) => (
                <div className="skill-category" key={category}>
                  <h3>{category}</h3>
                  <Chips items={skills} />
                </div>
              ))}
          </section>
        )}

        {skillError && (
          <Message title="Skill analysis failed" error>
            {skillError}
          </Message>
        )}

        {scoreResult && (
          <section className="result-card score-result-card">
            <SectionHeading
              step="STEP 03"
              title="Resume quality score"
              badge={scoreResult.rating ?? "Analysis complete"}
            />
            <div className="score-overview">
              <div className="score-circle">
                <strong>{scoreResult.score ?? "—"}</strong>
                <span>out of {scoreResult.max_score ?? 100}</span>
              </div>
              <div className="score-summary">
                <h3>Your resume analysis</h3>
                <p>
                  Review the score and recommendations to identify areas
                  where your resume may be improved.
                </p>
                {scoreResult.word_count != null && (
                  <p className="score-word-count">
                    {scoreResult.word_count} words analysed
                  </p>
                )}
              </div>
            </div>
            <h3>Category breakdown</h3>
            <ScoreCategories categories={scoreResult.categories} />
            {scoreResult.suggestions?.length > 0 && (
              <div className="score-suggestions">
                <h3>Recommended improvements</h3>
                <SuggestionsList items={scoreResult.suggestions} />
              </div>
            )}
            {(scoreResult.disclaimer || scoreResult.limitations) && (
              <p className="score-disclaimer">
                {scoreResult.disclaimer || scoreResult.limitations}
              </p>
            )}
          </section>
        )}

        {scoreError && (
          <Message title="Resume scoring failed" error>
            {scoreError}
          </Message>
        )}

        {atsResult && (
          <section className="result-card ats-result-card">
            <SectionHeading
              step="STEP 04"
              title="ATS compatibility analysis"
              badge={atsResult.rating ?? "Analysis complete"}
            />
            <div className="score-overview">
              <div className="score-circle">
                <strong>{atsResult.ats_score ?? "—"}</strong>
                <span>out of {atsResult.max_score ?? 100}</span>
              </div>
              <div className="score-summary">
                <h3>ATS readiness overview</h3>
                <p>
                  This check evaluates extracted text and resume structure.
                  It cannot guarantee how a particular employer's ATS will
                  rank your resume.
                </p>
              </div>
            </div>
            <h3>Compatibility breakdown</h3>
            <ScoreCategories categories={atsResult.categories} />
            {atsResult.detected_headings?.length > 0 && (
              <div className="score-suggestions">
                <h3>Detected resume headings</h3>
                <Chips items={atsResult.detected_headings} />
              </div>
            )}
            {atsResult.suggestions?.length > 0 && (
              <div className="score-suggestions">
                <h3>ATS improvement suggestions</h3>
                <SuggestionsList items={atsResult.suggestions} />
              </div>
            )}
            {atsResult.limitations && (
              <p className="score-disclaimer">{atsResult.limitations}</p>
            )}
          </section>
        )}

        {atsError && (
          <Message title="ATS analysis failed" error>
            {atsError}
          </Message>
        )}

        {jobMatchResult && (
          <section className="result-card job-match-card">
            <SectionHeading
              step="STEP 05"
              title="Job description matching"
              badge={jobMatchResult.rating ?? "Analysis complete"}
            />
            <div className="score-overview">
              <div className="score-circle">
                <strong>{jobMatchResult.match_score ?? "—"}%</strong>
                <span>Job match</span>
              </div>
              <div className="score-summary">
                <h3>Resume and job compatibility</h3>
                <p>
                  This comparison uses skills and keywords detected in
                  your resume and the supplied job description.
                </p>
              </div>
            </div>
            <div className="score-suggestions">
              <h3>Matching skills</h3>
              <Chips items={jobMatchResult.matching_skills} />
            </div>
            <div className="score-suggestions">
              <h3>Skills to review</h3>
              <Chips items={jobMatchResult.missing_skills} />
            </div>
            <div className="score-suggestions">
              <h3>Matching keywords</h3>
              <Chips items={jobMatchResult.matching_keywords} />
            </div>
            {jobMatchResult.missing_keywords?.length > 0 && (
              <div className="score-suggestions">
                <h3>Other keywords to review</h3>
                <Chips items={jobMatchResult.missing_keywords} />
              </div>
            )}
            <div className="score-suggestions">
              <h3>Recommended improvements</h3>
              <SuggestionsList items={jobMatchResult.recommendations} />
            </div>
            {jobMatchResult.limitations && (
              <p className="score-disclaimer">{jobMatchResult.limitations}</p>
            )}
          </section>
        )}

        {jobMatchError && (
          <Message title="Job matching failed" error>
            {jobMatchError}
          </Message>
        )}

        {skillGapResult && (
          <section className="result-card skill-gap-result-card">
            <SectionHeading
              step="STEP 06"
              title="Skill gap analysis"
              badge={
                skillGapResult.skill_coverage_percent != null
                  ? `${skillGapResult.skill_coverage_percent}% coverage`
                  : "Analysis complete"
              }
            />
            <div className="score-overview">
              <div className="score-circle">
                <strong>{skillGapResult.skill_coverage_percent ?? "—"}%</strong>
                <span>Skill coverage</span>
              </div>
              <div className="score-summary">
                <h3>Your target-job skill overview</h3>
                <p>
                  {skillGapResult.total_matching_skills ?? 0} matching skills
                  detected and {skillGapResult.total_missing_skills ?? 0}{" "}
                  skills not detected in your resume.
                </p>
              </div>
            </div>
            <div className="score-suggestions">
              <h3>Matching skills</h3>
              <Chips items={skillGapResult.matching_skills} />
            </div>
            <div className="score-suggestions">
              <h3>Skills to develop</h3>
              <Chips items={skillGapResult.missing_skills} />
            </div>
            <div className="score-suggestions">
              <h3>Learning recommendations</h3>
              {Array.isArray(skillGapResult.recommendations) &&
              skillGapResult.recommendations.length > 0 ? (
                <div className="skill-gap-recommendations">
                  {skillGapResult.recommendations.map((item, index) => (
                    <article
                      className="recommendation-item"
                      key={`${item.skill ?? "skill"}-${index}`}
                    >
                      <strong>{item.skill ?? "Recommended skill"}</strong>
                      {item.priority && (
                        <span>{` — ${item.priority} priority`}</span>
                      )}
                      <p>{item.suggestion ?? item.description ?? ""}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No learning recommendations were returned.</p>
              )}
            </div>
            {skillGapResult.limitations && (
              <p className="score-disclaimer">{skillGapResult.limitations}</p>
            )}
          </section>
        )}

        {skillGapError && (
          <Message title="Skill gap analysis failed" error>
            {skillGapError}
          </Message>
        )}

        {improvementResult && (
          <section className="result-card improvement-result-card">
            <SectionHeading
              step="STEP 07"
              title="Resume improvement suggestions"
              badge={`${improvementResult.suggestion_count ?? improvementResult.suggestions?.length ?? 0} suggestions`}
            />
            {improvementResult.word_count != null && (
              <p className="score-word-count">
                {improvementResult.word_count} words analysed
              </p>
            )}
            <div className="score-suggestions">
              <h3>Resume strengths</h3>
              <SuggestionsList items={improvementResult.strengths} />
            </div>
            <div className="score-suggestions">
              <h3>Suggested improvements</h3>
              {Array.isArray(improvementResult.suggestions) &&
              improvementResult.suggestions.length > 0 ? (
                <div className="skill-gap-recommendations">
                  {improvementResult.suggestions.map((item, index) => (
                    <article
                      className="recommendation-item"
                      key={`${item.category ?? "suggestion"}-${index}`}
                    >
                      <strong>{item.category ?? "Improvement"}</strong>
                      {item.priority && (
                        <span>{` — ${item.priority} priority`}</span>
                      )}
                      {item.issue && <p>{item.issue}</p>}
                      {item.recommendation && <p>{item.recommendation}</p>}
                    </article>
                  ))}
                </div>
              ) : (
                <p>No specific suggestions were returned.</p>
              )}
            </div>
            {improvementResult.note && (
              <p className="score-disclaimer">{improvementResult.note}</p>
            )}
          </section>
        )}

        {improvementError && (
          <Message title="Resume improvement analysis failed" error>
            {improvementError}
          </Message>
        )}

        {/* Step 8: Learning recommendations */}
        <section className="result-card learning-result-card">
          <SectionHeading
            step="STEP 08"
            title="Personalized learning recommendations"
            badge="Build job-ready skills"
          />
          <p>
            Compare your resume with the target job description to find
            skills to develop, learning resources, and practical projects.
          </p>

          <button
            className="analyze-button"
            type="button"
            onClick={handleLearningRecommendations}
            disabled={learningLoading || loading || !result || !jobDescription.trim()}
          >
            {learningLoading
              ? "Generating recommendations..."
              : "Generate learning recommendations"}
            {!learningLoading && <span>→</span>}
          </button>

          {learningError && (
            <Message title="Learning recommendations failed" error>
              {learningError}
            </Message>
          )}

          {learningResult && (
            <div className="learning-results">
              <Message title="Learning analysis complete">
                {learningResult.message}
              </Message>

              <div className="score-suggestions">
                <h3>Matched skills</h3>
                <Chips items={learningResult.matched_skills} />
              </div>

              <div className="score-suggestions">
                <h3>Skills to learn</h3>
                {Array.isArray(learningResult.recommendations) &&
                learningResult.recommendations.length > 0 ? (
                  <div className="skill-gap-recommendations">
                    {learningResult.recommendations.map((item, index) => (
                      <article
                        className="recommendation-item"
                        key={`${item.skill ?? "skill"}-${index}`}
                      >
                        <div className="result-heading">
                          <strong>{item.skill}</strong>
                          <span className="character-count">
                            {item.priority ?? "Recommended"} priority
                          </span>
                        </div>

                        {item.resource && (
                          <p>
                            <strong>Learning resource: </strong>
                            <a
                              href={item.resource}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open learning resource ↗
                            </a>
                          </p>
                        )}

                        {item.practice_project && (
                          <p>
                            <strong>Practice project: </strong>
                            {item.practice_project}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>
                    No missing skills were found in the supported skill list.
                    Review the job requirements manually too.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Step 9: Interview preparation */}
        <section className="result-card interview-result-card">
          <SectionHeading
            step="STEP 09"
            title="Interview preparation"
            badge="Practice for your target role"
          />

          <p>
            Generate technical, resume-based, and HR interview questions
            based on your resume and target job description.
          </p>

          <button
            className="analyze-button"
            type="button"
            onClick={handleInterviewPreparation}
            disabled={
              interviewLoading ||
              loading ||
              !result ||
              !jobDescription.trim()
            }
          >
            {interviewLoading
              ? "Preparing interview questions..."
              : "Generate interview questions"}
            {!interviewLoading && <span>→</span>}
          </button>

          {!result && (
            <p className="file-note">
              Upload and analyse your resume first.
            </p>
          )}

          {result && !jobDescription.trim() && (
            <p className="file-note">
              Enter a target job description to generate relevant questions.
            </p>
          )}

          {interviewError && (
            <Message title="Interview preparation failed" error>
              {interviewError}
            </Message>
          )}

          {interviewResult && (
            <div className="interview-results">
              <Message title="Interview preparation ready">
                {interviewResult.message}
                {interviewResult.total_questions != null &&
                  ` Total questions: ${interviewResult.total_questions}.`}
              </Message>

              <div className="score-suggestions">
                <h3>Skills detected in the job description</h3>
                <Chips items={interviewResult.target_skills_detected} />
              </div>

              {renderInterviewQuestions(
                interviewResult.technical_questions,
                "Technical interview questions"
              )}

              {renderInterviewQuestions(
                interviewResult.resume_questions,
                "Resume and project questions"
              )}

              {renderInterviewQuestions(
                interviewResult.hr_questions,
                "HR interview questions"
              )}

              {interviewResult.note && (
                <p className="score-disclaimer">{interviewResult.note}</p>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        CareerPilot AI <span>·</span> Building better career opportunities
      </footer>
    </div>
  );
}

export default App;
