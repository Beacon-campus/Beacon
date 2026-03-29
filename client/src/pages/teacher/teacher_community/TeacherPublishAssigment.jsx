import React, { useEffect, useRef, useState } from "react";
import ExcelJS from "exceljs";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../../../components/todocomps/datepicker-custom.css";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import Modal from "../../../components/ui/Modal";
import ImagePreviewModal from "../../../components/ui/ImagePreviewModal";
import DocViewer from "../../../components/doccomps/docviewer";
import { useAuth } from "../../../context/AuthContext";
import apiClient from "../../../services/apiClient";
import { getOrFetchPageCache } from "../../../services/pageCache.service";
import socket from "../../../services/socket.service";
import { exportRowsToXlsx } from "../../../utils/excelExport";
import { resolveAttachmentUrl } from "../../../utils/cloudinaryUrl";
import LoadingState from "../../../components/ui/LoadingState";

const EMPTY_FORM = {
  title: "",
  instructions: "",
  deadline: "",
  totalMarks: "",
};

function PublishAssignmentForm({ classroomId, onClose, onPublished }) {
  const [assignmentType, setAssignmentType] = useState("offline");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deadlineDate, setDeadlineDate] = useState(null);
  const [deadlineHour, setDeadlineHour] = useState(9);
  const [deadlineMinute, setDeadlineMinute] = useState(0);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [clockMode, setClockMode] = useState("hour"); // hour | minute
  const clockRef = useRef(null);
  const [quizMode, setQuizMode] = useState("manual");
  const [questions, setQuestions] = useState([
    { id: 1, question: "", options: ["", "", "", ""], answer: "" },
  ]);
  const [excelFile, setExcelFile] = useState(null);
  const [excelErrors, setExcelErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuestionChange = (id, field, value, optionIndex = null) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        if (field === "options" && optionIndex !== null) {
          const nextOptions = [...q.options];
          nextOptions[optionIndex] = value;
          return { ...q, options: nextOptions };
        }
        return { ...q, [field]: value };
      })
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { id: Date.now(), question: "", options: ["", "", "", ""], answer: "" },
    ]);
  };

  const removeQuestion = (id) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const parseCorrectOption = (rawValue, options) => {
    if (!rawValue) return "";
    const value = String(rawValue).trim();
    if (!value) return "";

    const upper = value.toUpperCase();
    const letters = ["A", "B", "C", "D"];
    if (letters.includes(upper)) {
      return options[letters.indexOf(upper)] || "";
    }

    const numeric = Number(value);
    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 4) {
      return options[numeric - 1] || "";
    }

    const normalizedValue = value.toLowerCase();
    const matched = options.find((opt) => String(opt || "").trim().toLowerCase() === normalizedValue);
    return matched || value;
  };

  const buildDeadlineISO = (dateValue, hourValue, minuteValue) => {
    if (!dateValue && dateValue !== 0) return "";
    if (hourValue === null || minuteValue === null) return "";
    const combined = new Date(dateValue);
    combined.setHours(hourValue, minuteValue, 0, 0);
    return combined.toISOString();
  };

  useEffect(() => {
    const nextDeadline = buildDeadlineISO(deadlineDate, deadlineHour, deadlineMinute);
    setFormData((prev) => ({ ...prev, deadline: nextDeadline }));
  }, [deadlineDate, deadlineHour, deadlineMinute]);

  const isPm = deadlineHour >= 12;
  const displayHour = ((deadlineHour + 11) % 12) + 1;

  const setHourFrom12 = (hour12, nextIsPm) => {
    const normalized = hour12 % 12;
    const nextHour = (nextIsPm ? 12 : 0) + normalized;
    setDeadlineHour(nextHour);
  };

  const updateClockValue = (event) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const radians = Math.atan2(dy, dx);
    const degrees = (radians * 180) / Math.PI;
    const normalized = (degrees + 90 + 360) % 360;

    if (clockMode === "hour") {
      const step = 30;
      const index = Math.round(normalized / step) % 12;
      const hour12 = index === 0 ? 12 : index;
      setHourFrom12(hour12, isPm);
    } else {
      const step = 6;
      const minute = Math.round(normalized / step) % 60;
      setDeadlineMinute(minute);
    }
  };

  const handleClockPointerDown = (event) => {
    updateClockValue(event);
    const handleMove = (moveEvent) => updateClockValue(moveEvent);
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const formatDeadlineDisplay = () => {
    if (!deadlineDate) return "Select date & time";
    const dateLabel = deadlineDate.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const minuteLabel = String(deadlineMinute).padStart(2, "0");
    return `${dateLabel} • ${displayHour}:${minuteLabel} ${isPm ? "PM" : "AM"}`;
  };

  const isHeaderRow = (cells) => {
    const combined = cells
      .map((cell) => String(cell || "").trim().toLowerCase())
      .join(" ");
    return combined.includes("question") || combined.includes("option") || combined.includes("correct");
  };

  const parseExcelQuestions = async (file) => {
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return { questions: [], errors: ["Excel file has no worksheets."] };
    }

    const rows = sheet.getSheetValues();
    if (!rows || rows.length <= 1) {
      return { questions: [], errors: ["Excel sheet is empty."] };
    }

    const getCell = (row, index) => String(row[index] ?? "").trim();

    const parsed = [];
    const errors = [];
    const startRow = isHeaderRow(rows[1] || []) ? 2 : 1;

    for (let i = startRow; i < rows.length; i += 1) {
      const row = rows[i] || [];
      if (row.length === 0) continue;

      const question = getCell(row, 1);
      const option1 = getCell(row, 2);
      const option2 = getCell(row, 3);
      const option3 = getCell(row, 4);
      const option4 = getCell(row, 5);
      const rawCorrect = getCell(row, 6);
      const options = [option1, option2, option3, option4];
      const answer = parseCorrectOption(rawCorrect, options);

      if (!question && options.every((opt) => !opt) && !rawCorrect) continue;

      if (!question) {
        errors.push(`Row ${i} is missing a question.`);
        continue;
      }
      if (options.some((opt) => !opt)) {
        errors.push(`Row ${i} has empty options.`);
        continue;
      }
      if (!answer) {
        errors.push(`Row ${i} is missing a correct option.`);
        continue;
      }
      if (!options.includes(answer)) {
        errors.push(`Row ${i} correct option does not match any option.`);
        continue;
      }

      parsed.push({
        id: Date.now() + i,
        question,
        options,
        answer,
      });
    }

    if (!parsed.length && !errors.length) {
      errors.push("No valid questions found in the sheet.");
    }

    return { questions: parsed, errors };
  };

  const parseCsvLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      if (char === "\"") {
        if (inQuotes && line[i + 1] === "\"") {
          current += "\"";
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
        i += 1;
        continue;
      }
      if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
        i += 1;
        if (line[i] === " ") i += 1;
        continue;
      }
      current += char;
      i += 1;
    }
    result.push(current.trim());
    return result;
  };

  const parseTextQuestions = (text) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!lines.length) {
      return { questions: [], errors: ["Text file is empty."] };
    }

    const parsed = [];
    const errors = [];
    let startIndex = 0;
    const firstRowCells = parseCsvLine(lines[0]);
    if (isHeaderRow(firstRowCells)) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i]);
      const question = String(cells[0] || "").trim();
      const option1 = String(cells[1] || "").trim();
      const option2 = String(cells[2] || "").trim();
      const option3 = String(cells[3] || "").trim();
      const option4 = String(cells[4] || "").trim();
      const rawCorrect = String(cells[5] || "").trim();
      const options = [option1, option2, option3, option4];
      const answer = parseCorrectOption(rawCorrect, options);

      if (!question && options.every((opt) => !opt) && !rawCorrect) continue;

      if (!question) {
        errors.push(`Line ${i + 1} is missing a question.`);
        continue;
      }
      if (options.some((opt) => !opt)) {
        errors.push(`Line ${i + 1} has empty options.`);
        continue;
      }
      if (!answer) {
        errors.push(`Line ${i + 1} is missing a correct option.`);
        continue;
      }
      if (!options.includes(answer)) {
        errors.push(`Line ${i + 1} correct option does not match any option.`);
        continue;
      }

      parsed.push({
        id: Date.now() + i,
        question,
        options,
        answer,
      });
    }

    if (!parsed.length && !errors.length) {
      errors.push("No valid questions found in the file.");
    }

    return { questions: parsed, errors };
  };

  const loadTextFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
      reader.readAsText(file);
    });

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0] || null;
    setExcelErrors([]);
    setExcelFile(file);
    if (!file) return;

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      let parsedQuestions = [];
      let errors = [];

      if (ext === "xls" || ext === "xlsx") {
        ({ questions: parsedQuestions, errors } = await parseExcelQuestions(file));
      } else if (ext === "csv" || ext === "txt") {
        const text = await loadTextFile(file);
        ({ questions: parsedQuestions, errors } = parseTextQuestions(text));
      } else {
        errors = ["Unsupported file type. Please upload .xls, .xlsx, .csv, or .txt."];
      }

      setExcelErrors(errors);
      if (parsedQuestions.length) {
        setQuestions(parsedQuestions);
        toast.success(`Loaded ${parsedQuestions.length} questions from Excel.`);
      } else if (errors.length) {
        toast.error("Excel format errors. Fix the file and re-upload.");
      }
    } catch (error) {
      console.error("Excel parse failed", error);
      setExcelErrors(["Failed to read Excel file. Please re-check the format."]);
      toast.error("Could not read Excel file.");
    }
  };

  const validateForm = () => {
    if (!classroomId) return "Please select a classroom first.";
    if (!formData.title.trim() || !formData.deadline) {
      return "Please fill Title and Deadline.";
    }
    if (assignmentType !== "offline" && !formData.totalMarks) {
      return "Please fill Total Marks for this assignment.";
    }

    if (assignmentType === "quiz") {
      if (quizMode === "manual") {
        const isValid = questions.every(
          (q) => q.question.trim() && q.options.every((o) => o.trim()) && q.answer
        );
        if (!isValid) return "Please complete all quiz questions and answers.";
      }
      if (quizMode === "excel" && !excelFile) {
        return "Please upload an Excel file for quiz mode.";
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload = {
      classroomId,
      type: assignmentType,
      title: formData.title.trim(),
      instructions: formData.instructions?.trim() || "",
      deadline: formData.deadline,
      totalMarks: formData.totalMarks ? Number(formData.totalMarks) : null,
      content:
        assignmentType === "quiz"
          ? {
            quizMode,
            questions: questions?.length ? questions : undefined,
            fileName: quizMode === "excel" && excelFile ? excelFile.name : undefined,
          }
          : {},
    };

    setIsSubmitting(true);
    try {
      await apiClient.post("/assignments", payload);

      toast.success("Assignment published.");
      onPublished?.();
      onClose();
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        toast.error("Assignments API is not available on backend yet.");
      } else {
        toast.error(error?.response?.data?.error || "Failed to publish.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-6 space-y-8 soft-scrollbar relative z-20">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
            Assignment Type
          </label>
          <div className="flex rounded-xl bg-gray-100 p-1">
            {["offline", "quiz", "qna"].map((type) => (
              <button
                key={type}
                onClick={() => setAssignmentType(type)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold capitalize transition-all duration-200 ${assignmentType === type
                  ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {type === "qna" ? "QnA / Project" : type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              placeholder="e.g. Chapter 1 Review"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">
              {assignmentType === "qna" ? "Question / Prompt" : "Instructions / Description"}
            </label>
            <textarea
              name="instructions"
              rows="3"
              value={formData.instructions}
              onChange={handleInputChange}
              className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowDeadlinePicker(true)}
                className="w-full px-4 py-3 rounded-xl text-left text-sm font-medium outline-none border transition-all cursor-pointer bg-gray-50 text-primary border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm focus:ring-2 focus:ring-primary/10"
              >
                {formatDeadlineDisplay()}
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Total Marks {assignmentType === "offline" ? <span className="text-gray-400">(optional)</span> : <span className="text-red-500">*</span>}
              </label>
              <input
                type="number"
                name="totalMarks"
                value={formData.totalMarks}
                onChange={handleInputChange}
                className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="20"
              />
            </div>
          </div>
        </div>

        {assignmentType === "quiz" && (
          <div className="border-t border-gray-100 pt-6">
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6 w-fit">
              <button
                onClick={() => setQuizMode("manual")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold ${quizMode === "manual" ? "bg-white text-primary" : "text-gray-500"
                  }`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setQuizMode("excel")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold ${quizMode === "excel" ? "bg-green-100 text-green-700" : "text-gray-500"
                  }`}
              >
                Excel Upload
              </button>
            </div>

            {quizMode === "manual" ? (
              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-bold text-gray-400 uppercase">Question {idx + 1}</h5>
                      <button onClick={() => removeQuestion(q.id)} className="text-xs text-red-500">Remove</button>
                    </div>
                    <input
                      placeholder="Type your question..."
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
                      value={q.question}
                      onChange={(e) => handleQuestionChange(q.id, "question", e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {q.options.map((opt, optIdx) => (
                        <input
                          key={optIdx}
                          placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs"
                          value={opt}
                          onChange={(e) => handleQuestionChange(q.id, "options", e.target.value, optIdx)}
                        />
                      ))}
                    </div>
                    <select
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs"
                      value={q.answer}
                      onChange={(e) => handleQuestionChange(q.id, "answer", e.target.value)}
                    >
                      <option value="">Select Correct Answer</option>
                      {q.options.map((opt, i) => (
                        <option key={i} value={opt}>
                          {opt || `Option ${String.fromCharCode(65 + i)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <button
                  onClick={addQuestion}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-bold text-sm"
                >
                  + Add Another Question
                </button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center">
                <h4 className="text-sm font-bold text-green-800 mb-2">Upload Excel File</h4>
                <input
                  type="file"
                  onChange={handleExcelUpload}
                  accept=".xls,.xlsx,.csv,.txt"
                  className="block w-full text-sm text-green-700"
                />
                {excelFile && (
                  <p className="mt-2 text-xs font-bold text-green-700">Selected: {excelFile.name}</p>
                )}
                <div className="mt-4 rounded-lg border border-green-100 bg-white/70 p-3 text-left text-[11px] text-green-800">
                  <div className="font-bold mb-1">Format Guide</div>
                  <div className="text-green-700">
                    Format: [Question], [Option A], [Option B], [Option C], [Option D], [Correct Answer (A/B/C/D, 1/2/3/4, or exact text)]
                  </div>
                  <div className="mt-1 text-green-600">Headers are optional.</div>
                </div>
                {!!excelErrors.length && (
                  <div className="mt-3 text-left text-xs text-red-600 space-y-1">
                    {excelErrors.map((err, idx) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                )}
                {!!questions.length && (
                  <div className="mt-4 text-left">
                    <p className="text-xs font-bold text-green-800">
                      Parsed Questions: {questions.length}
                    </p>
                    <ul className="mt-2 space-y-2 text-xs text-gray-700 max-h-40 overflow-y-auto">
                      {questions.map((q, idx) => (
                        <li key={q.id} className="bg-white/70 border border-green-100 rounded-lg p-2">
                          <div className="font-semibold">{idx + 1}. {q.question}</div>
                          <div className="mt-1 text-[11px] text-gray-500">
                            Options: {q.options.join(" | ")}
                          </div>
                          <div className="mt-1 text-[11px] text-green-700 font-semibold">
                            Correct: {q.answer}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setQuizMode("manual")}
                        className="px-3 py-1.5 rounded-md text-xs font-bold bg-white text-green-700 border border-green-200"
                      >
                        Edit in Manual Entry
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuizMode("manual");
                          addQuestion();
                        }}
                        className="px-3 py-1.5 rounded-md text-xs font-bold bg-white text-gray-700 border border-gray-200"
                      >
                        Add One More Question
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-100 bg-white shrink-0">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded-xl transition-all disabled:opacity-60"
        >
          {isSubmitting ? "Publishing..." : "Assignments"}
        </button>
      </div>

      <Modal
        isOpen={showDeadlinePicker}
        onClose={() => setShowDeadlinePicker(false)}
        className="max-w-xl h-auto flex flex-col p-0"
      >
        <div className="bg-white px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-primary">Set Deadline</h3>
          <button onClick={() => setShowDeadlinePicker(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <div className="custom-datepicker-wrapper">
              <DatePicker
                selected={deadlineDate}
                onChange={(date) => setDeadlineDate(date)}
                inline
              />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-4">
            <div className="w-full">
              <div className="text-xs font-semibold text-gray-400 mb-2">Select time</div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setClockMode("hour")}
                  className={`px-3 py-2 rounded-xl text-2xl font-bold tracking-wide ${clockMode === "hour"
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-gray-100 text-gray-600 border border-gray-100"
                    }`}
                >
                  {String(displayHour).padStart(2, "0")}
                </button>
                <span className="text-2xl font-bold text-gray-400">:</span>
                <button
                  type="button"
                  onClick={() => setClockMode("minute")}
                  className={`px-3 py-2 rounded-xl text-2xl font-bold tracking-wide ${clockMode === "minute"
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-gray-100 text-gray-600 border border-gray-100"
                    }`}
                >
                  {String(deadlineMinute).padStart(2, "0")}
                </button>
                <div className="ml-2 flex flex-col rounded-xl overflow-hidden border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setHourFrom12(displayHour, false)}
                    className={`px-3 py-1 text-xs font-bold ${!isPm ? "bg-primary/20 text-primary" : "bg-gray-50 text-gray-500"}`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setHourFrom12(displayHour, true)}
                    className={`px-3 py-1 text-xs font-bold ${isPm ? "bg-primary/20 text-primary" : "bg-gray-50 text-gray-500"}`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
            <div
              ref={clockRef}
              onPointerDown={handleClockPointerDown}
              className="relative w-44 h-44 rounded-full bg-gray-50 border border-gray-200 shadow-inner cursor-pointer select-none"
            >
              {clockMode === "minute" && (
                <div className="absolute inset-0">
                  {Array.from({ length: 60 }, (_, i) => i).map((minute) => {
                    const angle = (minute * 6) * (Math.PI / 180);
                    const radius = 82;
                    const x = 88 + radius * Math.sin(angle);
                    const y = 88 - radius * Math.cos(angle);
                    const isMajor = minute % 5 === 0;
                    const isActive = minute === deadlineMinute;
                    const sizeClass = isMajor ? "h-1 w-1" : "h-0.5 w-0.5";
                    const colorClass = isActive
                      ? "bg-primary"
                      : isMajor
                        ? "bg-gray-300"
                        : "bg-gray-200";
                    return (
                      <div
                        key={`tick-${minute}`}
                        className={`absolute rounded-full ${sizeClass} ${colorClass} opacity-70`}
                        style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
                      />
                    );
                  })}
                </div>
              )}
              <div className="absolute inset-0">
                {(clockMode === "hour"
                  ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
                  : Array.from({ length: 60 }, (_, i) => i)
                ).map((num, idx, arr) => {
                  const step = 360 / arr.length;
                  const angle = (idx * step) * (Math.PI / 180);
                  const radius = clockMode === "hour" ? 70 : 64;
                  const x = 88 + radius * Math.sin(angle);
                  const y = 88 - radius * Math.cos(angle);
                  const isSelected =
                    clockMode === "hour"
                      ? num === displayHour
                      : num === deadlineMinute;
                  const isMajorMinute = clockMode === "minute" ? num % 5 === 0 : false;
                  if (clockMode === "minute" && !isMajorMinute && !isSelected) {
                    return null;
                  }
                  return (
                    <div
                      key={`${clockMode}-${num}`}
                      className={`absolute ${isSelected
                        ? "bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        : "text-[10px] font-semibold text-gray-500"
                        }`}
                      style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
              <div
                className="absolute left-1/2 top-1/2 h-16 w-0.5 bg-primary origin-bottom"
                style={{
                  transform: `translate(-50%, -100%) rotate(${clockMode === "hour"
                    ? ((displayHour % 12) * 30)
                    : (deadlineMinute * 6)}deg)`,
                }}
              />
              <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
              <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2 ring-primary" />
            </div>
            <p className="text-xs text-gray-500">
              Drag on the clock to set {clockMode}.
            </p>
          </div>
        </div>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowDeadlinePicker(false)}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function TeacherPublishAssignment() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const userCacheKey = currentUser?.uid || "guest";

  const initialOpenAssignmentId = location.state?.openAssignmentId || null;

  const [step, setStep] = useState(0); // 0: classes, 1: assignments, 2: grading
  const [selectedClass, setSelectedClass] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [invalidClassroomId, setInvalidClassroomId] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [classAssignments, setClassAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradeDrafts, setGradeDrafts] = useState({});
  const [savingGradeId, setSavingGradeId] = useState(null);
  const [viewSubmission, setViewSubmission] = useState(null);
  const [submissionImagePreview, setSubmissionImagePreview] = useState(null);
  const [docPreviewFile, setDocPreviewFile] = useState(null);
  const [assignmentDoubts, setAssignmentDoubts] = useState([]);
  const [loadingDoubts, setLoadingDoubts] = useState(false);
  const [selectedDoubtId, setSelectedDoubtId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyMode, setReplyMode] = useState("private");
  const [sendingReply, setSendingReply] = useState(false);

  const formatDeadline = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isImageSubmission = (value) => {
    if (!value || typeof value !== "string") return false;
    const normalized = value.toLowerCase();
    return (
      normalized.startsWith("data:image/") ||
      normalized.includes(".png") ||
      normalized.includes(".jpg") ||
      normalized.includes(".jpeg") ||
      normalized.includes(".webp") ||
      normalized.includes(".gif")
    );
  };

  const normalizeSubmissionFile = (value) => {
    if (!value) return null;
    if (typeof value === "object") {
      const resolvedMime = value.mimeType || (value.type && value.type !== "file" ? value.type : "") || "";
      return {
        ...value,
        mimeType: resolvedMime || value.mimeType || "",
        type: resolvedMime || value.type || "application/octet-stream",
      };
    }
    if (typeof value !== "string") return null;

    if (value.startsWith("data:")) {
      return null;
    }

    const name = decodeURIComponent(value.split("/").pop()?.split("?")[0] || "submission");
    const lower = name.toLowerCase();
    const type = lower.endsWith(".pdf")
      ? "application/pdf"
      : lower.endsWith(".doc")
        ? "application/msword"
        : lower.endsWith(".docx")
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : lower.endsWith(".ppt")
            ? "application/vnd.ms-powerpoint"
            : lower.endsWith(".pptx")
              ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
              : lower.endsWith(".xls")
                ? "application/vnd.ms-excel"
                : lower.endsWith(".xlsx")
                  ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  : lower.endsWith(".png")
                    ? "image/png"
                    : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
                      ? "image/jpeg"
                      : lower.endsWith(".webp")
                        ? "image/webp"
                        : "application/octet-stream";

    return null;
  };

  useEffect(() => {
    if (!currentUser?._id) return;
    let cancelled = false;

    const loadMyClassrooms = async () => {
      try {
        const data = await getOrFetchPageCache(
          "teacher:assignments:my-classrooms",
          userCacheKey,
          async () => {
            const response = await apiClient.get("/assignments/my-classrooms");
            return response.data || [];
          },
          { ttlMs: 120_000 }
        );

        if (cancelled) return;

        const nextClasses = (data || []).map((cls) => {
          const mySubjects = (cls.subjects || []).filter((s) =>
            (s.teacherIds || []).some((t) => String(typeof t === "string" ? t : t?._id) === String(currentUser._id))
          );

          return {
            id: cls._id,
            name: cls.name,
            subject: mySubjects.length ? mySubjects.map((s) => s.name).join(", ") : "No Subjects Assigned",
            color: "bg-gray-100",
          };
        });

        setTeacherClasses(nextClasses);
      } catch (error) {
        console.error("Failed to load teacher classrooms", error);
      }
    };

    loadMyClassrooms();
    return () => {
      cancelled = true;
    };
  }, [currentUser, userCacheKey]);

  useEffect(() => {
    if (!classroomId) {
      setInvalidClassroomId(false);
      setSelectedClass(null);
      setStep(0);
      return;
    }

    const matched = teacherClasses.find((c) => String(c.id) === String(classroomId));
    if (matched) {
      setSelectedClass(matched);
      setInvalidClassroomId(false);
      setStep(1);
      return;
    }

    if (teacherClasses.length > 0) {
      setInvalidClassroomId(true);
      setSelectedClass(null);
      setStep(0);
    }
  }, [classroomId, teacherClasses]);

  const handleClassSelect = (cls) => {
    setSelectedClass(cls);
    setStep(1);
    setInvalidClassroomId(false);
    if (String(cls.id) !== String(classroomId)) {
      navigate(`/teacher/community/publish-assignment/${cls.id}`);
    }
  };

  const fetchAssignmentsForClass = async (classId, force = false) => {
    if (!classId) {
      setClassAssignments([]);
      return;
    }
    try {
      setLoadingAssignments(true);
      const data = await getOrFetchPageCache(
        `teacher:assignments:class:${classId}`,
        userCacheKey,
        async () => (await apiClient.get(`/assignments/class/${classId}`)).data || [],
        { ttlMs: 120_000, force }
      );
      setClassAssignments(data || []);

      setSelectedAssignment((prev) => {
        if (!data?.length) return null;

        // If we came in with an openAssignmentId, try to select it
        if (initialOpenAssignmentId) {
          const found = data.find((a) => String(a._id) === String(initialOpenAssignmentId));
          if (found) {
            // If we found it, also advance the step to the grading view
            setStep(2);
            // Clear the state so it doesn't get stuck if we navigate around
            window.history.replaceState({}, document.title);
            return found;
          }
        }

        if (!prev) return data[0];
        const found = data.find((a) => String(a._id) === String(prev._id));
        return found || data[0];
      });
    } catch (error) {
      console.error("Failed to fetch assignments for class", error);
      toast.error("Could not load assignments for selected class.");
      setClassAssignments([]);
      setSelectedAssignment(null);
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (selectedClass?.id) {
      fetchAssignmentsForClass(selectedClass.id);
    } else {
      setClassAssignments([]);
      setSelectedAssignment(null);
    }
  }, [selectedClass?.id]);

  const fetchSubmissionsForAssignment = async (assignmentId, force = false) => {
    if (!assignmentId) {
      setSubmissions([]);
      setGradeDrafts({});
      return;
    }
    try {
      setLoadingSubmissions(true);
      const data = await getOrFetchPageCache(
        `teacher:assignments:submissions:${assignmentId}`,
        userCacheKey,
        async () => (await apiClient.get(`/assignments/${assignmentId}/submissions`)).data || [],
        { ttlMs: 60_000, force }
      );
      const rows = data || [];
      setSubmissions(rows);
      const drafts = {};
      rows.forEach((row) => {
        drafts[row.studentId] = row.score ?? "";
      });
      setGradeDrafts(drafts);
    } catch (error) {
      console.error("Failed to fetch assignment submissions", error);
      toast.error(error?.response?.data?.error || "Failed to load submissions");
      setSubmissions([]);
      setGradeDrafts({});
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (!selectedAssignment?._id) {
      setSubmissions([]);
      setGradeDrafts({});
      setAssignmentDoubts([]);
      setSelectedDoubtId(null);
      setReplyText("");
      return;
    }
    fetchSubmissionsForAssignment(selectedAssignment._id);
    fetchDoubtsForAssignment(selectedAssignment._id);
  }, [selectedAssignment?._id]);

  const fetchDoubtsForAssignment = async (assignmentId, force = false) => {
    if (!assignmentId) {
      setAssignmentDoubts([]);
      return;
    }
    try {
      setLoadingDoubts(true);
      const data = await getOrFetchPageCache(
        `teacher:assignments:doubts:${assignmentId}`,
        userCacheKey,
        async () => (await apiClient.get(`/assignments/${assignmentId}/doubts/teacher`)).data || [],
        { ttlMs: 60_000, force }
      );
      setAssignmentDoubts(data || []);
    } catch (error) {
      console.error("Failed to fetch assignment doubts", error);
      toast.error(error?.response?.data?.error || "Failed to load doubts");
      setAssignmentDoubts([]);
    } finally {
      setLoadingDoubts(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.uid) return;

    const handleNewDoubt = (payload) => {
      if (!selectedAssignment || String(selectedAssignment._id) !== String(payload.assignmentId)) return;
      setAssignmentDoubts((prev) => {
        if (prev.some((d) => String(d._id) === String(payload._id))) return prev;
        return [payload, ...prev];
      });
    };

    socket.on("new_assignment_doubt", handleNewDoubt);
    return () => socket.off("new_assignment_doubt", handleNewDoubt);
  }, [currentUser, selectedAssignment]);

  const handleReplyDoubt = async () => {
    if (!selectedAssignment?._id) return;

    if (replyMode === "private" && !selectedDoubtId) {
      toast.error("Select a doubt first for private reply.");
      return;
    }

    if (!replyText.trim()) {
      toast.error("Reply text is required.");
      return;
    }

    try {
      setSendingReply(true);
      const targetDoubtId = replyMode === "broadcast" && !selectedDoubtId ? "broadcast" : selectedDoubtId;

      await apiClient.post(
        `/assignments/${selectedAssignment._id}/doubts/${targetDoubtId}/reply`,
        { text: replyText.trim(), mode: replyMode },
      );
      toast.success(replyMode === "broadcast" ? "Broadcast reply sent." : "Private reply sent.");
      setReplyText("");
      setSelectedDoubtId(null);
      fetchDoubtsForAssignment(selectedAssignment._id, true);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleGradeInputChange = (studentId, value) => {
    if (value === "") {
      setGradeDrafts((prev) => ({ ...prev, [studentId]: "" }));
      return;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setGradeDrafts((prev) => ({ ...prev, [studentId]: parsed }));
  };

  const handleSaveGrade = async (studentId) => {
    if (!selectedAssignment?._id) return;
    const score = gradeDrafts[studentId];
    if (score === "" || score === null || score === undefined) {
      toast.error("Enter a valid score first.");
      return;
    }
    try {
      setSavingGradeId(studentId);
      await apiClient.patch(`/assignments/${selectedAssignment._id}/submissions/${studentId}`, {
        score: Number(score),
      });
      toast.success("Grade saved.");
      setSubmissions((prev) =>
        prev.map((row) => (row.studentId === studentId ? { ...row, score: Number(score) } : row))
      );
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to save grade");
    } finally {
      setSavingGradeId(null);
    }
  };

  const handleDownloadSheet = async () => {
    if (!selectedAssignment) return;
    if (!submissions.length) {
      toast.error("No student rows available to export.");
      return;
    }

    const rows = submissions.map((row) => ({
      "Student Name": row.name || "",
      "Reg No": row.regno || "",
      Email: row.email || "",
      Submitted: row.submitted ? "Yes" : "No",
      "Submitted At": row.submittedAt ? new Date(row.submittedAt).toISOString() : "",
      Attempts: row.attempts ?? 0,
      Score: row.score ?? "",
      "Total Marks": selectedAssignment.totalMarks ?? "",
      "Correct Answers":
        selectedAssignment.type === "quiz" && row.correctCount !== null
          ? `${row.correctCount}/${row.totalQuestions ?? 0}`
          : "",
      Cheated: row.isCheated ? "Yes" : "No",
    }));

    await exportRowsToXlsx({
      rows,
      sheetName: "Submissions",
      fileName: `${selectedAssignment.title || "assignment"}-submissions.xlsx`,
      columns: [
        { header: "Student Name", key: "Student Name", width: 28 },
        { header: "Reg No", key: "Reg No", width: 16 },
        { header: "Email", key: "Email", width: 30 },
        { header: "Submitted", key: "Submitted", width: 12 },
        { header: "Submitted At", key: "Submitted At", width: 22 },
        { header: "Attempts", key: "Attempts", width: 12 },
        { header: "Score", key: "Score", width: 12 },
        { header: "Total Marks", key: "Total Marks", width: 14 },
        { header: "Correct Answers", key: "Correct Answers", width: 18 },
        { header: "Cheated", key: "Cheated", width: 10 },
      ],
    });
  };

  const renderSubmissionModal = () => {
    if (!viewSubmission || !selectedAssignment) return null;

    const questions = Array.isArray(selectedAssignment?.content?.questions)
      ? selectedAssignment.content.questions
      : [];
    const answers = viewSubmission.answers || {};

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-3">
                {viewSubmission.name}'s Submission
                {viewSubmission.isCheated && (
                  <span className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-full font-bold border border-red-200">
                    Flagged
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Attempts: <span className="font-bold text-gray-800">{viewSubmission.attempts || 0}</span>
                {" | "}
                Score: <span className="font-bold text-gray-800">{viewSubmission.score ?? "--"}</span> / {selectedAssignment.totalMarks}
                {selectedAssignment.type === "quiz" && viewSubmission.correctCount !== null && (
                  <>
                    {" | "}
                    Correct: <span className="font-bold text-gray-800">{viewSubmission.correctCount}/{viewSubmission.totalQuestions || 0}</span>
                  </>
                )}
              </p>
            </div>
            <button onClick={() => setViewSubmission(null)} className="p-2 hover:bg-gray-200 rounded-full">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {selectedAssignment.type !== "quiz" ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Submission Content</p>
                {(() => {
                  const fileMeta = normalizeSubmissionFile(viewSubmission.file);
                  if (!fileMeta) {
                    return (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap break-words">
                        No submission file/text found.
                      </div>
                    );
                  }

                  const resolvedUrl = resolveAttachmentUrl(fileMeta);
                  const imageUrl = fileMeta.previewUrl || resolvedUrl;
                  const isImage = fileMeta.type?.startsWith("image/");
                  return (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-gray-700 truncate">
                          {fileMeta.name || "Submission"}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDocPreviewFile(fileMeta)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            View
                          </button>
                          <a
                            href={resolvedUrl || ""}
                            download={fileMeta.name || "submission"}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                      {isImage && imageUrl && (
                        <img
                          src={imageUrl}
                          alt={`${viewSubmission.name}'s submission`}
                          className="w-full max-h-[360px] object-contain rounded-lg border border-gray-200 cursor-zoom-in bg-white"
                          onClick={() => setSubmissionImagePreview(imageUrl)}
                        />
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : questions.length === 0 ? (
              <p className="text-gray-500 italic">No quiz questions found for this assignment.</p>
            ) : (
              questions.map((q, idx) => {
                const userAnswerIndex = answers?.[idx];
                const correctVal = q.correctAnswer !== undefined ? q.correctAnswer : q.answer;
                const studentSelectedText = (q.options || [])[userAnswerIndex];
                const isCorrect = studentSelectedText === correctVal;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${isCorrect ? "border-green-200 bg-green-50/40" : "border-red-200 bg-red-50/40"
                      }`}
                  >
                    <p className="font-bold text-gray-800 mb-3">
                      {idx + 1}. {q.question || "Untitled question"}
                    </p>
                    <div className="space-y-2">
                      {(q.options || []).map((opt, optIdx) => {
                        const isSelected = userAnswerIndex === optIdx;
                        const isActualCorrect = opt === correctVal;
                        let style = "bg-white border-gray-200";
                        if (isSelected) style = isCorrect ? "bg-green-100 border-green-400 font-bold" : "bg-red-100 border-red-400 font-bold";
                        if (isActualCorrect) style = "bg-blue-50 border-blue-300 ring-1 ring-blue-200";

                        return (
                          <div key={optIdx} className={`px-4 py-2 rounded-lg border text-sm flex justify-between items-center ${style}`}>
                            <span>{opt}</span>
                            {isSelected && <span>{isCorrect ? "✓" : "✗"}</span>}
                            {isActualCorrect && !isSelected && (
                              <span className="text-[10px] text-blue-600 font-bold">(Correct)</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(0);
      setSelectedClass(null);
      setSelectedAssignment(null);
      setClassAssignments([]);
      navigate("/teacher/community/publish-assignment");
    }
  };

  const handleGoToGrading = () => {
    if (!selectedAssignment) {
      toast.error("Select an assignment first.");
      return;
    }
    setStep(2);
  };

  let stepContent = null;

  if (step === 0) {
    stepContent = (
      <div className="w-full h-full p-6 relative overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-700 mb-6">Select a Class to Manage Assignments</h2>
        {invalidClassroomId && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Selected classroom was not found. Please choose a valid classroom.
          </div>
        )}
        {teacherClasses.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            No official classrooms available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {teacherClasses.map((cls) => (
              <div
                key={cls.id}
                onClick={() => handleClassSelect(cls)}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center justify-center text-center h-40 gap-2"
              >
                <div className="flex items-center gap-2">
                   <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                   </svg>
                   <h3 className="font-bold text-primary text-lg">{cls.name}</h3>
                </div>
                <p className="text-sm text-gray-500">(You teach {cls.subject})</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else if (step === 2) {
    stepContent = (
      <div className="w-full h-full p-6 relative flex flex-col">
        {renderSubmissionModal()}
        <div className="flex items-center gap-4 mb-6 shrink-0">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-[#F3F4F6] text-gray-700 rounded-xl hover:bg-gray-200 transition-all active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-gray-600">
              <path d="M10,22.03c-.77,0-1.51-.3-2.09-.88L1.18,14.82c-1.57-1.57-1.57-4.09-.02-5.64,0,0,.01-.01,.02-.02L7.93,2.81c.84-.85,2.09-1.1,3.22-.63s1.84,1.52,1.85,2.74v2.06h7.03c2.19,0,3.97,1.8,3.97,4.01v1.98c0,2.21-1.78,4.01-3.97,4.01h-7.03v2.06c0,1.23-.71,2.28-1.85,2.75-.38,.16-.77,.23-1.15,.23Z" />
            </svg>
            <span className="font-bold text-sm">Go back</span>
          </button>
          <div>
            <h2 className="text-xl font-bold text-primary">{selectedAssignment?.title}</h2>
            <p className="text-sm text-gray-500">
              Q: {selectedAssignment?.instructions || "No instructions"}
            </p>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden gap-6">
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {loadingSubmissions ? (
              <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <LoadingState size="sm" />
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 font-bold">No students found.</p>
              </div>
            ) : (
              submissions.map((row) => (
                <div key={row.studentId} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <span className="font-bold text-gray-700 w-1/3">
                    <div className="flex items-center gap-2">
                      {row.name}
                      {row.attempts > 1 && (
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200 font-medium">
                          {row.attempts} Attempts
                        </span>
                      )}
                      {row.submitted && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200 font-medium">
                          Submitted
                        </span>
                      )}
                      {row.isCheated && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200 font-medium">
                          Flagged
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mt-1">{row.regno || row.email || ""}</p>
                    {selectedAssignment?.type === "quiz" && row.submitted && row.correctCount !== null && (
                      <p className="text-[11px] text-blue-600 font-semibold mt-1">
                        Correct: {row.correctCount}/{row.totalQuestions || 0}
                      </p>
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewSubmission(row)}
                      disabled={!row.submitted}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${row.submitted ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-gray-50 text-gray-300 cursor-not-allowed"
                        }`}
                    >
                      view
                    </button>
                    <div className="flex items-center gap-1 bg-[#F9FAFB] px-2 py-1 rounded-lg border border-gray-200">
                      <input
                        type="number"
                        min="0"
                        max={selectedAssignment?.totalMarks}
                        placeholder="--"
                        className="w-10 text-center outline-none bg-transparent text-sm font-bold text-gray-800"
                        value={gradeDrafts[row.studentId] ?? ""}
                        onChange={(e) => handleGradeInputChange(row.studentId, e.target.value)}
                        disabled={!row.submitted}
                      />
                      <span className="text-xs text-gray-400">/{selectedAssignment?.totalMarks}</span>
                    </div>
                    <button
                      onClick={() => handleSaveGrade(row.studentId)}
                      disabled={!row.submitted || savingGradeId === row.studentId}
                      className="px-4 py-1.5 bg-[#0F172A] rounded-lg text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {savingGradeId === row.studentId ? "Saving..." : "save"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="w-1/3 bg-[#F9FAFB] rounded-2xl p-4 border border-gray-100 flex flex-col">
            <h3 className="text-sm font-bold text-gray-800 mb-1">Student doubts</h3>
            <p className="text-[10px] text-gray-400 mb-4 leading-tight">
              *Select a doubt to reply specifically, or send a broadcast message to all.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingDoubts ? (
                <div className="py-4 flex items-center justify-center">
                  <LoadingState size="xs" />
                </div>
              ) : replyMode === "broadcast" ? (
                // --- BROADCAST FEED ---
                (() => {
                  const allBroadcasts = [];
                  assignmentDoubts.forEach((d) => {
                    const replies = d.replies || [];
                    replies.forEach((r) => {
                      if (r.mode === "broadcast") {
                        // If it's a generic broadcast thread, the "doubtText" is just the placeholder, so hide it or show "Global Broadcast"
                        const originText = d.text === "GLOBAL_BROADCAST_THREAD" ? "Global Assignment Broadcast" : d.text;
                        const stName = d.text === "GLOBAL_BROADCAST_THREAD" ? "Teacher" : d.studentName;

                        allBroadcasts.push({
                          ...r,
                          doubtId: d._id,
                          studentName: stName,
                          doubtText: originText,
                          assignmentTitle: selectedAssignment?.title
                        });
                      }
                    });
                  });
                  allBroadcasts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                  return allBroadcasts.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-xs text-gray-400 italic">No broadcasts sent yet.</p>
                    </div>
                  ) : (
                    allBroadcasts.map((bcast, idx) => (
                      <div key={idx} className="w-full text-left border border-primary/20 bg-primary/5 rounded-lg p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#0F172A] px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
                            Broadcast Message
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(bcast.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 font-bold">{bcast.text}</p>
                        <div className="mt-1 flex flex-col bg-white/50 p-2 rounded text-xs text-gray-600 border border-gray-100">
                          {bcast.assignmentTitle && (
                            <span className="text-[10px] text-gray-400 italic mb-1">
                              Broadcast for assignment: <span className="font-semibold text-gray-600">{bcast.assignmentTitle}</span>
                            </span>
                          )}
                          {bcast.doubtText !== "Global Assignment Broadcast" && (
                            <>
                              <span className="text-[10px] text-gray-400 italic mb-1">In response to:</span>
                              <div><span className="font-semibold">{bcast.studentName}:</span> {bcast.doubtText}</div>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  );
                })()
              ) : assignmentDoubts.length === 0 ? (
                // --- PRIVATE FEED (EMPTY) ---
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-gray-400 italic">No doubts raised yet.</p>
                </div>
              ) : (
                // --- PRIVATE FEED (LIST) ---
                (assignmentDoubts.filter(d => d.text !== "GLOBAL_BROADCAST_THREAD").length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-xs text-gray-400 italic">No personal doubts raised yet.</p>
                  </div>
                ) : (
                  assignmentDoubts.filter(d => d.text !== "GLOBAL_BROADCAST_THREAD").map((d) => (
                    <button
                      key={d._id}
                      onClick={() => setSelectedDoubtId(d._id)}
                      className={`w-full text-left border rounded-lg p-3 transition-all flex flex-col gap-2 ${selectedDoubtId === d._id ? "border-red-400 bg-white shadow-sm" : "border-red-100 bg-white/60 hover:bg-white"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2 w-full">
                        <p className="text-xs font-bold text-gray-800 truncate">{d.studentName}</p>
                        {(d.replies || []).filter(r => r.mode === 'private').length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-600 whitespace-nowrap">
                            ↩ Replied ({(d.replies || []).filter(r => r.mode === 'private').length})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 bg-gray-50/50 p-2 rounded border border-gray-100">{d.text}</p>

                      {(d.replies || []).filter(r => r.mode === 'private').length > 0 && (
                        <div className="flex flex-col gap-1 w-full pl-2 border-l-2 border-gray-200 mt-1">
                          {d.replies.filter(r => r.mode === 'private').map((reply, idx) => (
                            <div key={idx} className="bg-gray-50/50 rounded p-2 text-[11px] text-gray-600 border border-gray-100">
                              <span className="font-bold text-gray-700 capitalize mr-1">
                                [Private]
                              </span>
                              {reply.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  ))
                ))
              )}
            </div>

            <div className="pt-3 border-t border-gray-200 mt-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-white rounded-full px-3 py-1 border border-gray-200">
                  <input
                    type="text"
                    placeholder={replyMode === "broadcast" ? "Type a broadcast message to all students..." : (selectedDoubtId ? "Type private reply..." : "Select a doubt to reply")}
                    className="flex-1 bg-transparent outline-none text-xs text-gray-700 placeholder-gray-400 h-9"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleReplyDoubt}
                  disabled={sendingReply || (!selectedDoubtId && replyMode === 'private')}
                  className="w-10 h-10 rounded-full bg-[#0F172A] disabled:bg-gray-400 flex items-center justify-center shadow-md active:scale-95 transition-transform"
                >
                  <svg viewBox="0 0 512.308 512.308" className="w-5 h-5 fill-current text-white">
                    <g>
                      <path d="M505.878,36.682L110.763,431.69c8.542,4.163,17.911,6.351,27.413,6.4h67.669c5.661-0.015,11.092,2.236,15.083,6.251l36.672,36.651c19.887,20.024,46.936,31.295,75.157,31.317c11.652-0.011,23.224-1.921,34.261-5.653c38.05-12.475,65.726-45.46,71.403-85.099l72.085-342.4C513.948,64.89,512.311,49.871,505.878,36.682z" />
                      <path d="M433.771,1.652L92.203,73.61C33.841,81.628-6.971,135.44,1.047,193.802c3.167,23.048,13.782,44.43,30.228,60.885l36.651,36.651c4.006,4.005,6.255,9.439,6.251,15.104v67.669c0.049,9.502,2.237,18.872,6.4,27.413L475.627,6.41C462.645,0.03,447.853-1.651,433.771,1.652z" />
                    </g>
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-4 mt-2 px-1">
                <button onClick={() => setReplyMode("private")} className="flex items-center gap-1.5 cursor-pointer">
                  <div className={`w-3 h-3 rounded-full border ${replyMode === "private" ? "border-primary bg-primary" : "border-gray-300 bg-white"} flex items-center justify-center`}>
                    {replyMode === "private" && <div className="w-1 h-1 rounded-full bg-white" />}
                  </div>
                  <span className={`text-[10px] font-bold ${replyMode === "private" ? "text-primary" : "text-gray-400"}`}>Reply Privately (Default)</span>
                </button>

                <button onClick={() => setReplyMode("broadcast")} className="flex items-center gap-1.5 cursor-pointer">
                  <div className={`w-3 h-3 rounded-full border ${replyMode === "broadcast" ? "border-primary bg-primary" : "border-gray-300 bg-white"} flex items-center justify-center`}>
                    {replyMode === "broadcast" && <div className="w-1 h-1 rounded-full bg-white" />}
                  </div>
                  <span className={`text-[10px] font-bold ${replyMode === "broadcast" ? "text-primary" : "text-gray-400"}`}>Broadcast to Assignment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    );
  } else {
    stepContent = (
      <div className="w-full h-full p-6 relative flex flex-col">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 bg-[#F3F4F6] text-gray-700 rounded-xl hover:bg-gray-200 transition-all active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-gray-600">
            <path d="M10,22.03c-.77,0-1.51-.3-2.09-.88L1.18,14.82c-1.57-1.57-1.57-4.09-.02-5.64,0,0,.01-.01,.02-.02L7.93,2.81c.84-.85,2.09-1.1,3.22-.63s1.84,1.52,1.85,2.74v2.06h7.03c2.19,0,3.97,1.8,3.97,4.01v1.98c0,2.21-1.78,4.01-3.97,4.01h-7.03v2.06c0,1.23-.71,2.28-1.85,2.75-.38,.16-.77,.23-1.15,.23Z" />
          </svg>
          <span className="font-bold text-sm">Go back</span>
        </button>
        <h2 className="text-xl font-bold text-gray-800">{selectedClass?.name} / <span className="text-gray-500">Assignments</span></h2>
      </div>

      <div className="flex flex-1 gap-8 overflow-hidden min-h-0">
        <div className="w-1/2 flex flex-col h-full overflow-hidden">
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto p-2 soft-scrollbar pb-4 pr-3 relative">
            {loadingAssignments ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                <LoadingState size="sm" />
              </div>
            ) : classAssignments.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-400 font-medium">No assignments yet. Publish one!</p>
              </div>
            ) : (
              classAssignments.map((assign) => (
                <div
                  key={assign._id}
                  onClick={() => setSelectedAssignment(assign)}
                  className={`p-6 rounded-2xl border cursor-pointer transition-all ${String(selectedAssignment?._id) === String(assign._id)
                    ? "border-slate-300 bg-white shadow-md -translate-y-1"
                    : "border-slate-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-1"
                    }`}
                >
                  <h3 className="font-bold text-primary">{assign.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 truncate max-w-[300px]">
                    {assign.instructions || "No instructions"}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                    <span className="bg-white px-2 py-0.5 rounded border border-gray-200 capitalize">{assign.type}</span>
                    <span>{assign.totalMarks} Marks</span>
                    <span>Due: {formatDeadline(assign.deadline)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="shrink-0 pt-4 px-2">
            <button
              onClick={() => setShowPublishModal(true)}
              className="w-full p-4 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-center shadow-md transition-all flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-white">
                <path d="m12 0a12 12 0 1 0 12 12 12.013 12.013 0 0 0 -12-12zm4 13h-3v3a1 1 0 0 1 -2 0v-3h-3a1 1 0 0 1 0-2h3v-3a1 1 0 0 1 2 0v3h3a1 1 0 0 1 0 2z" />
              </svg>
              Publish an assignment
            </button>
          </div>
        </div>

        <div className="w-1/2 border-l border-gray-100 pl-8 flex flex-col justify-center items-center text-center">
          {selectedAssignment ? (
            <div className="space-y-6 w-full max-w-sm">
              <div>
                <h3 className="text-2xl font-bold text-primary">{selectedAssignment.title}</h3>
                <p className="text-gray-600 mt-2">{selectedAssignment.instructions || "No instructions provided."}</p>
                <p className="text-xs text-blue-500 font-bold mt-2">
                  Due: {formatDeadline(selectedAssignment.deadline)}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleGoToGrading}
                  className="w-full py-3 bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  Grade students
                </button>
                <button
                  onClick={handleDownloadSheet}
                  className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50"
                >
                  Download xlsheet
                </button>
                <p className="text-xs text-gray-400 italic mt-2">
                  *Use Grade students to open detailed student list and doubts workspace
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 italic">Select an assignment to view details</p>
          )}
        </div>
      </div>

      <Modal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        className="max-w-2xl h-[90vh] flex flex-col p-0"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <h3 className="text-xl font-bold text-primary">Publish New Assignment</h3>
          <button onClick={() => setShowPublishModal(false)} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <PublishAssignmentForm
            classroomId={selectedClass?.id || classroomId}
            onClose={() => setShowPublishModal(false)}
            onPublished={() => {
              if (selectedClass?.id) fetchAssignmentsForClass(selectedClass.id, true);
              setShowPublishModal(false);
            }}
          />
        </div>
      </Modal>
    </div>
    );
  }

  return (
    <>
      <ImagePreviewModal
        isOpen={!!submissionImagePreview}
        onClose={() => setSubmissionImagePreview(null)}
        imageUrl={submissionImagePreview}
        imageName="Student submission"
      />
      {docPreviewFile && (
        <DocViewer
          file={docPreviewFile}
          onClose={() => setDocPreviewFile(null)}
        />
      )}
      {stepContent}
    </>
  );
}
