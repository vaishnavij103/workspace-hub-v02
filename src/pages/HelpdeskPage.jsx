import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useLocation } from '../LocationContext';
import { getTickets, createTicket, updateTicket, addTicketComment } from '../api';
import {
  LifeBuoy, Send, MessageSquare, Clock, CheckCircle2, AlertTriangle, User, Building, Tag, ShieldAlert, PlusCircle, Search, Filter
} from 'lucide-react';

const TICKET_CATEGORIES = [
  'Housekeeping',
  'Operations & Maintenance',
  'Access card',
  'ID card',
  'CUG SIM card',
  'Stationery',
  'Special Purchase Request',
  'Visiting Cards',
  'Other'
];

const ASSIGNEES = [
  'Admin - Ahmedabad',
  'Admin - Bengaluru(Domlur)',
  'Admin - Bengaluru(Signet)',
  'Admin - Chennai',
  'Admin - Coimbatore',
  'Admin - Hyderabad',
  'Admin - Mumbai',
  'Admin - Pune'
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'high', label: 'High', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'urgent', label: 'Urgent', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
];

export default function HelpdeskPage() {
  const { user, isAdmin, isLocationAdmin } = useAuth();
  const { theme } = useTheme();
  const { location: defaultLocation } = useLocation();

  const [activeTab, setActiveTab] = useState('my_tickets'); // 'my_tickets' | 'post_ticket' | 'all_tickets'
  const [tickets, setTickets] = useState([]);
  const [_loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [_assigneeFilter, setAssigneeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Ticket Drawer Modal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [commentText, setCommentText] = useState('');

  // Post Ticket Form State
  const [postSubject, setPostSubject] = useState('');
  const [postCategory, setPostCategory] = useState('');
  const [postAssignee, setPostAssignee] = useState('');
  const [postLocation] = useState(defaultLocation || 'Pune');
  const [postPriority] = useState('medium');
  const [postComment, setPostComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab === 'my_tickets' && !isAdmin) {
        params.user_id = user?.user_id;
      }
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const data = await getTickets(params);
      setTickets(data || []);
    } catch {
      // error handled
    } finally {
      setLoading(false);
    }
  }, [activeTab, user, isAdmin, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handlePostTicket = async (e) => {
    e.preventDefault();
    if (!postCategory) {
      alert('Please select a Category.');
      return;
    }
    if (!postComment.trim()) {
      alert('Please enter a Comment / Description.');
      return;
    }

    setPosting(true);
    try {
      const payload = {
        user_id: user?.user_id || 'usr_employee',
        subject: postSubject.trim() || `${postCategory} Issue - ${postAssignee || postLocation}`,
        category: postCategory,
        assignee: postAssignee,
        assigned_to: postAssignee || `Admin - ${postLocation}`,
        location: postAssignee ? postAssignee.replace('Admin - ', '') : postLocation,
        priority: postPriority,
        description: postComment,
        comment: postComment
      };

      await createTicket(payload);
      setPostSuccess(true);
      setPostSubject('');
      setPostCategory('');
      setPostAssignee('');
      setPostComment('');
      fetchTickets();
      setTimeout(() => {
        setPostSuccess(false);
        setActiveTab('my_tickets');
      }, 1500);
    } catch (err) {
      alert(err.message || 'Failed to post support ticket.');
    } finally {
      setPosting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTicket) return;

    try {
      const newComment = await addTicketComment(selectedTicket.ticket_id, {
        author_id: user?.user_id,
        author_name: user?.name,
        author_role: user?.role,
        text: commentText
      });

      setSelectedTicket(prev => ({
        ...prev,
        comments: [...(prev.comments || []), newComment]
      }));
      setCommentText('');
      fetchTickets();
    } catch (err) {
      alert(err.message || 'Failed to add comment');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      const updated = await updateTicket(selectedTicket.ticket_id, { status: newStatus });
      setSelectedTicket(updated);
      fetchTickets();
    } catch {
      alert('Failed to update ticket status');
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticket_number?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.user_name?.toLowerCase().includes(q) ||
      t.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className={`p-6 md:p-8 rounded-3xl border relative overflow-hidden ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-blue-950/50 via-[#0a122e] to-[#0c183a] border-blue-500/20 shadow-2xl'
          : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white shadow-xl'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-white/10 backdrop-blur-md border border-white/20 text-blue-200">
              Workplace Services & Support
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <LifeBuoy className="w-8 h-8 text-sky-300" />
              Admin Helpdesk Center
            </h1>
            <p className="text-sm opacity-90 max-w-2xl font-light">
              Submit support tickets for facility maintenance, IT equipment, room booking assistance, and parking access across workplace locations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('post_ticket')}
              className="px-4 py-2.5 rounded-xl bg-white text-blue-950 font-bold text-xs hover:bg-sky-50 transition shadow-md flex items-center gap-2"
            >
              <PlusCircle size={16} />
              <span>Post New Ticket</span>
            </button>
            <button
              onClick={() => setActiveTab('my_tickets')}
              className="px-4 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-white font-semibold text-xs border border-white/20 transition backdrop-blur-md flex items-center gap-2"
            >
              <MessageSquare size={16} />
              <span>My Tickets ({tickets.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700/50 pb-2">
        <button
          onClick={() => setActiveTab('my_tickets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'my_tickets'
              ? theme === 'dark' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-sky-100 text-sky-800 border border-sky-300'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare size={16} />
          <span>My Tickets</span>
        </button>

        <button
          onClick={() => setActiveTab('post_ticket')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'post_ticket'
              ? theme === 'dark' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-sky-100 text-sky-800 border border-sky-300'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Send size={16} />
          <span>Post Ticket</span>
        </button>

        {(isAdmin || isLocationAdmin) && (
          <button
            onClick={() => setActiveTab('all_tickets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'all_tickets'
                ? theme === 'dark' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert size={16} className="text-amber-400" />
            <span>Admin Helpdesk Queue</span>
          </button>
        )}
      </div>

      {/* TAB 1: POST TICKETS */}
      {activeTab === 'post_ticket' && (
        <div className="max-w-2xl mx-auto">
          <div className={`p-6 md:p-8 rounded-3xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h2 className={`text-xl font-bold mb-2 pb-2 border-b border-blue-500/20 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Post Ticket
            </h2>

            <form onSubmit={handlePostTicket} className="space-y-5 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <label className={`text-xs font-bold text-right pr-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Category <span className="text-rose-500">*</span> :
                </label>
                <div className="md:col-span-2">
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs border ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-amber-50/50 border-slate-300 text-slate-900'
                    }`}
                    required
                  >
                    <option value="">--Select Category--</option>
                    {TICKET_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <label className={`text-xs font-bold text-right pr-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Assignee <span className="text-rose-500">*</span> :
                </label>
                <div className="md:col-span-2">
                  <select
                    value={postAssignee}
                    onChange={(e) => setPostAssignee(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs border ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-amber-50/50 border-slate-300 text-slate-900'
                    }`}
                    required
                  >
                    <option value="">--Select Assignee--</option>
                    {ASSIGNEES.map(asgn => <option key={asgn} value={asgn}>{asgn}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                <label className={`text-xs font-bold text-right pr-2 pt-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Comment <span className="text-rose-500">*</span> :
                </label>
                <div className="md:col-span-2">
                  <textarea
                    rows={4}
                    placeholder="Enter ticket details or comment..."
                    value={postComment}
                    onChange={(e) => setPostComment(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs border ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={posting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
                >
                  {posting ? (
                    <span>Posting...</span>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Post Ticket</span>
                    </>
                  )}
                </button>
              </div>

              {postSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold text-center flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Ticket posted successfully!</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* TAB 2 & 3: MY TICKETS & ADMIN QUEUE */}
      {(activeTab === 'my_tickets' || activeTab === 'all_tickets') && (
        <div className="space-y-6">
          {/* Search Box - Legacy Enterprise Header */}
          <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="text-xs font-extrabold uppercase text-blue-600 border-b border-blue-500/20 pb-2 mb-4 tracking-wider">
              Search
            </h3>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <label className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-amber-50/50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">--Select Category--</option>
                  {TICKET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">Open</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchTickets}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm transition"
                >
                  View Tickets
                </button>

                <button
                  onClick={() => {
                    setCategoryFilter('');
                    setStatusFilter('');
                    setAssigneeFilter('');
                    setSearchQuery('');
                    fetchTickets();
                  }}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm transition"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Table View matching screenshot 1 */}
          <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400">
                My Tickets
              </h3>
              <div className="flex items-center gap-2">
                <Search size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Quick filter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`px-3 py-1 rounded-lg text-xs border outline-none ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className={`text-[0.7rem] uppercase tracking-wider font-extrabold border-b ${
                  theme === 'dark' ? 'bg-slate-900/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Comments</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Post Date</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredTickets.length > 0 ? (
                    filteredTickets.map(tkt => (
                      <tr key={tkt.ticket_id} className={`hover:bg-slate-500/5 transition ${
                        theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">{tkt.ticket_number}</td>
                        <td className="px-4 py-3 font-medium">{tkt.category}</td>
                        <td className="px-4 py-3 max-w-xs truncate">{tkt.description || tkt.subject}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase ${
                            tkt.status === 'open' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                            tkt.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                            'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}>
                            {tkt.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{tkt.created_at?.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedTicket(tkt)}
                            className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold text-[0.65rem]"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                        No Record Found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Drawer Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className={`w-full max-w-xl h-full p-6 overflow-y-auto flex flex-col justify-between ${
            theme === 'dark' ? 'bg-[#0f1420] text-white border-l border-slate-800' : 'bg-white text-slate-900'
          }`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-sky-400">{selectedTicket.ticket_number}</span>
                  <h2 className="text-lg font-bold">{selectedTicket.subject}</h2>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold"
                >
                  Close
                </button>
              </div>

              {/* Status Update bar for Admin */}
              {(isAdmin || isLocationAdmin) && (
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-300">Update Status:</span>
                  <div className="flex items-center gap-1.5">
                    {['open', 'in_progress', 'resolved', 'closed'].map(st => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className={`px-2.5 py-1 rounded-lg text-[0.65rem] font-bold uppercase transition ${
                          selectedTicket.status === st
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ticket Metadata */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
                <div>Posted By: <span className="font-semibold text-white">{selectedTicket.user_name}</span></div>
                <div>Location: <span className="font-semibold text-white">{selectedTicket.location}</span></div>
                <div>Category: <span className="font-semibold text-white">{selectedTicket.category}</span></div>
                <div>Created: <span className="font-semibold text-white">{selectedTicket.created_at?.slice(0, 10)}</span></div>
              </div>

              {/* Original Issue Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Issue Description</label>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs leading-relaxed text-slate-200">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Conversation History */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <MessageSquare size={14} />
                  <span>Discussion ({selectedTicket.comments?.length || 0})</span>
                </label>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedTicket.comments?.map(cm => (
                    <div key={cm.comment_id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[0.65rem] text-slate-400">
                        <span className="font-bold text-sky-300">{cm.author_name} ({cm.author_role})</span>
                        <span>{cm.created_at?.slice(11, 16)}</span>
                      </div>
                      <p className="text-slate-200">{cm.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Post Reply */}
            <form onSubmit={handleAddComment} className="pt-4 border-t border-slate-800 space-y-2">
              <textarea
                rows={2}
                placeholder="Type a response or status note..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className={`w-full p-3 rounded-xl text-xs border ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <Send size={14} />
                <span>Post Reply</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
