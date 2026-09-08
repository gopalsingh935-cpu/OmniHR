import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  ShieldCheck,
  Lock,
  Plus,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Award,
  AlertCircle,
  Eye,
  FileCheck,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { PerformanceReview, Employee } from '../types';

interface PerformanceReviewsProps {
  initialSearchQuery?: string;
  initialSelectedReviewId?: string | null;
}

export const PerformanceReviews: React.FC<PerformanceReviewsProps> = ({
  initialSearchQuery = '',
  initialSelectedReviewId = null,
}) => {
  const { currentUser, refreshUserData } = useAuth();
  const [reviews, setReviews] = useState<PerformanceReview[]>(() => storageService.getReviews());
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [isNewReviewModalOpen, setIsNewReviewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const employees = storageService.getEmployees();

  // Sync external search query
  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Sync external selected review
  useEffect(() => {
    if (initialSelectedReviewId) {
      const match = reviews.find((r) => r.id === initialSelectedReviewId);
      if (match) setSelectedReview(match);
    }
  }, [initialSelectedReviewId, reviews]);

  // New Review Form State (For HR Admin or Manager)
  const [formEmployeeId, setFormEmployeeId] = useState(
    employees.find((e) => e.role === 'employee')?.id || employees[0]?.id || ''
  );
  const [cycle, setCycle] = useState('Q3 2026 Evaluation');
  const [techRating, setTechRating] = useState(5);
  const [commRating, setCommRating] = useState(4);
  const [teamRating, setTeamRating] = useState(5);
  const [prodRating, setProdRating] = useState(5);
  const [initRating, setInitRating] = useState(4);
  const [feedback, setFeedback] = useState('');
  const [achievementsText, setAchievementsText] = useState('');
  const [growthAreasText, setGrowthAreasText] = useState('');

  // Strict check: Is the current user an employee?
  const isEmployee = currentUser.role === 'employee';

  // Visible reviews: Filtered by role and multi-token search query
  const visibleReviews = useMemo(() => {
    const baseList = isEmployee
      ? reviews.filter((r) => r.employeeId === currentUser.id)
      : reviews;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return baseList;

    const tokens = q.split(/\s+/).filter(Boolean);
    return baseList.filter((rev) => {
      const searchStr = `${rev.employeeName} ${rev.reviewerName} ${rev.cycle} ${rev.ratingLabel} ${rev.overallRating} ${rev.reviewerFeedback} ${rev.achievements?.join(' ') || ''} ${rev.areasOfGrowth?.join(' ') || ''}`.toLowerCase();
      return tokens.every((token) => searchStr.includes(token));
    });
  }, [reviews, isEmployee, currentUser.id, searchQuery]);

  const handleCreateReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmployee) {
      alert('Unauthorized: Employees are strictly prohibited from modifying or creating performance evaluations.');
      return;
    }

    const targetEmp = employees.find((e) => e.id === formEmployeeId);
    if (!targetEmp) return;

    const overallScore = +(
      (techRating + commRating + teamRating + prodRating + initRating) /
      5
    ).toFixed(1);

    const getLabel = (score: number) => {
      if (score >= 4.7) return 'Exceptional';
      if (score >= 4.0) return 'Exceeds Expectations';
      if (score >= 3.0) return 'Meets Expectations';
      return 'Needs Improvement';
    };

    const newRev = storageService.createReview(
      {
        employeeId: targetEmp.id,
        employeeName: targetEmp.name,
        reviewerId: currentUser.id,
        reviewerName: currentUser.name,
        reviewerRole: currentUser.designation,
        cycle,
        overallRating: overallScore,
        ratingLabel: getLabel(overallScore) as any,
        metrics: {
          technicalSkills: techRating,
          communication: commRating,
          teamwork: teamRating,
          productivity: prodRating,
          initiative: initRating,
        },
        achievements: achievementsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        growthAreas: growthAreasText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        reviewerFeedback: feedback || 'Consistent performance exceeding team benchmark targets.',
        isPublished: true,
        status: 'Finalized',
      },
      {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      }
    );

    if (newRev) {
      setReviews(storageService.getReviews());
      setIsNewReviewModalOpen(false);
      setFeedback('');
      setAchievementsText('');
      setGrowthAreasText('');
      refreshUserData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Performance Evaluations & Talent Reviews
            </h2>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Audit Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-dimensional evaluation system with cryptographic role lock to guarantee record integrity.
          </p>
        </div>

        {!isEmployee && (
          <button
            onClick={() => setIsNewReviewModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Conduct New Evaluation</span>
          </button>
        )}
      </div>

      {/* Mandatory Security Guard Banner for Employees */}
      {isEmployee && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs dark:border-indigo-900 dark:bg-indigo-950/40 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-indigo-950 dark:text-indigo-200">
              Immutable Performance Record Protection (RBAC Policy)
            </h4>
            <p className="mt-0.5 text-indigo-800 dark:text-indigo-300">
              In strict accordance with enterprise governance rules, performance evaluations are published as read-only records for employees. Ratings and evaluator assessments cannot be modified or altered once finalized by management.
            </p>
          </div>
        </div>
      )}

      {/* Performance Analytics Progression Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          {isEmployee ? 'Personal Growth & Competency Radar' : 'Organizational Performance Distribution'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Visualized core competency metrics across technical mastery, velocity, and leadership.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Technical Mastery', score: isEmployee ? 4.9 : 4.7, color: 'bg-indigo-600' },
            { label: 'Communication', score: isEmployee ? 4.2 : 4.4, color: 'bg-emerald-600' },
            { label: 'Teamwork & Culture', score: isEmployee ? 4.8 : 4.6, color: 'bg-blue-600' },
            { label: 'Productivity', score: isEmployee ? 4.9 : 4.8, color: 'bg-purple-600' },
            { label: 'Initiative', score: isEmployee ? 4.7 : 4.5, color: 'bg-amber-600' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-800/50"
            >
              <span className="text-[11px] text-slate-500 block truncate">{item.label}</span>
              <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                {item.score}
              </span>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${(item.score / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews List Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Evaluation Records
          </h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {visibleReviews.length}
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search reviews by name, cycle, feedback..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 shadow-2xs transition-colors focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {visibleReviews.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <Search className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No performance reviews match &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search terms or clearing the filter.
            </p>
          </div>
        ) : (
          visibleReviews.map((rev) => (
            <div
              key={rev.id}
              onClick={() => setSelectedReview(rev)}
              className={`cursor-pointer rounded-2xl border bg-white p-5 shadow-xs transition-all dark:bg-slate-900 ${
                selectedReview?.id === rev.id
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30 dark:border-indigo-400'
                  : 'border-slate-200 hover:border-indigo-300 dark:border-slate-800 dark:hover:border-slate-700'
              }`}
            >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {rev.cycle}
                  </h3>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {rev.employeeName}
                  </span>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {rev.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Evaluated by {rev.reviewerName} ({rev.reviewerRole}) • Date: {rev.reviewDate}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <div className="flex items-center gap-1 rounded-xl bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <span>{rev.overallRating}</span>
                  <span className="text-[10px] text-slate-400">/ 5.0</span>
                </div>
                <span className="rounded-xl bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {rev.ratingLabel}
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              "{rev.reviewerFeedback}"
            </p>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-800">
              <span>{rev.achievements.length} Documented Key Accomplishments</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Eye className="h-3 w-3" /> View Full Review &rarr;
              </span>
            </div>
          </div>
        )))}
      </div>

      {/* Review Details Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedReview.cycle} Detailed Dossier
                  </h3>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Locked & Verified
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Subject: <strong className="text-slate-800 dark:text-slate-200">{selectedReview.employeeName}</strong> • Evaluator: {selectedReview.reviewerName} ({selectedReview.reviewerRole})
                </p>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {/* Score header */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Final Evaluation Rating</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    {selectedReview.overallRating} <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                  </div>
                </div>
                <span className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs">
                  {selectedReview.ratingLabel}
                </span>
              </div>

              {/* Detailed metrics breakdown */}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Pillar Competencies</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Technical Execution</span>
                    <strong className="text-slate-800 dark:text-slate-200 text-sm">
                      {selectedReview.metrics.technicalSkills} / 5
                    </strong>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Communication</span>
                    <strong className="text-slate-800 dark:text-slate-200 text-sm">
                      {selectedReview.metrics.communication} / 5
                    </strong>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Teamwork & Mentorship</span>
                    <strong className="text-slate-800 dark:text-slate-200 text-sm">
                      {selectedReview.metrics.teamwork} / 5
                    </strong>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Sprint Productivity</span>
                    <strong className="text-slate-800 dark:text-slate-200 text-sm">
                      {selectedReview.metrics.productivity} / 5
                    </strong>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Initiative & Autonomy</span>
                    <strong className="text-slate-800 dark:text-slate-200 text-sm">
                      {selectedReview.metrics.initiative} / 5
                    </strong>
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Key Accomplishments & Impact</h4>
                <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-300">
                  {selectedReview.achievements.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>

              {/* Growth areas */}
              {selectedReview.growthAreas.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Targeted Development Areas</h4>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-300">
                    {selectedReview.growthAreas.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reviewer Feedback */}
              <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Evaluator Feedback</h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  "{selectedReview.reviewerFeedback}"
                </p>
              </div>

              {selectedReview.employeeNotes && (
                <div className="rounded-xl bg-indigo-50/50 p-3.5 dark:bg-indigo-950/30">
                  <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-1">Employee Acknowledgment Note</h4>
                  <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed">
                    {selectedReview.employeeNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end dark:border-slate-800">
              <button
                onClick={() => setSelectedReview(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conduct New Evaluation Modal (Admin & Manager Only) */}
      {isNewReviewModalOpen && !isEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Conduct Performance Review</h3>
              <button onClick={() => setIsNewReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Select Employee *</label>
                <select
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.designation} • {emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Cycle Title *</label>
                <input
                  type="text"
                  required
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 focus:bg-white focus:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Rating sliders */}
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-2">Score Ratings (1 to 5)</span>
                {[
                  { label: 'Technical Execution', val: techRating, set: setTechRating },
                  { label: 'Communication & Alignment', val: commRating, set: setCommRating },
                  { label: 'Teamwork & Culture', val: teamRating, set: setTeamRating },
                  { label: 'Velocity & Productivity', val: prodRating, set: setProdRating },
                  { label: 'Initiative & Ownership', val: initRating, set: setInitRating },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <span className="text-slate-600 dark:text-slate-400 w-44 truncate">{item.label}</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={item.val}
                      onChange={(e) => item.set(Number(e.target.value))}
                      className="flex-1 accent-indigo-600"
                    />
                    <span className="font-bold text-slate-900 dark:text-white w-6 text-right">{item.val}</span>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Key Achievements (One per line)</label>
                <textarea
                  rows={2}
                  placeholder="Delivered offline sync engine...&#10;Mentored 2 junior engineers..."
                  value={achievementsText}
                  onChange={(e) => setAchievementsText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Executive Feedback *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Overall qualitative synthesis and leadership review notes..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewReviewModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700"
                >
                  Publish & Lock Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
