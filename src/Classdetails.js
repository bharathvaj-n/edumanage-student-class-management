import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase-config';
import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc,
  doc, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import EmptyState from './EmptyState';
import { useToast } from './ToastContext';
import { 
  BookOpen, 
  Search, 
  PlusCircle, 
  Eye,
  Users,
  Calendar,
  Save,
  CheckSquare
} from 'lucide-react';

import { runStudentBatchMigration } from './migration';
import { useAuth } from './AuthContext';

const Classdetails = () => {
  const { addToast } = useToast();
  const { currentUser } = useAuth();

  // State
  const [batchOptions, setBatchOptions] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [batchStudents, setBatchStudents] = useState([]);

  // Session form state
  const [sessionForm, setSessionForm] = useState({
    date: '',
    time: '',
    class_number: 1,
    class_type: 'Lecture',
    class_work: '',
    home_work: ''
  });

  // Active created or loaded session ID
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  // Student attendance map: { [studentId]: 'Present' | 'Absent' | 'Late' }
  const [attendanceMap, setAttendanceMap] = useState({});

  // History & view mode state
  const [sessionHistory, setSessionHistory] = useState([]);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [selectedSessionAttendance, setSelectedSessionAttendance] = useState([]);
  const [viewmode, setViewmode] = useState(false); // false: form/attendance, true: history focus

  // UI state
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Initialize date & time
  const setInitialDateTime = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    setSessionForm(prev => ({
      ...prev,
      date: dateStr,
      time: timeStr
    }));
  };

  // 1. Fetch actual batches from Firestore for current teacher
  const fetchBatches = useCallback(async () => {
    if (!currentUser?.uid) {
      setBatchOptions([]);
      setLoadingStudents(false);
      return;
    }
    setLoadingStudents(true);
    try {
      const q = query(collection(db, "batches"), where("teacher_id", "==", currentUser.uid));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
      }));

      setBatchOptions(list);

      // Default select first batch if available and none selected
      if (list.length > 0 && (!selectedBatch || !list.some(b => b.id === selectedBatch))) {
        setSelectedBatch(list[0].id);
      } else if (list.length === 0) {
        setSelectedBatch('');
      }
    } catch (err) {
      console.error("Error fetching batches:", err);
      if (addToast) addToast("Unable to fetch batch data.", "error");
    } finally {
      setLoadingStudents(false);
    }
  }, [addToast, currentUser?.uid, selectedBatch]);

  useEffect(() => {
    setInitialDateTime();
    fetchBatches();
  }, [fetchBatches]);

  // 2. When selectedBatch changes, query students by batch_id & load session history
  useEffect(() => {
    if (!selectedBatch) {
      setBatchStudents([]);
      setSessionHistory([]);
      setCurrentSessionId(null);
      setAttendanceMap({});
      return;
    }

    const loadBatchData = async () => {
      setLoadingStudents(true);
      try {
        const studentColRef = collection(db, "student_data");
        const q = query(studentColRef, where("batch_id", "==", selectedBatch));
        const snapshot = await getDocs(q);
        let studentList = snapshot.docs.map(docItem => ({
          id: docItem.id,
          ...docItem.data()
        }));

        // Fallback for legacy records matching bid or course if batch_id not assigned
        if (studentList.length === 0) {
          const allSnap = await getDocs(studentColRef);
          studentList = allSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(s => s.batch_id === selectedBatch || s.bid === selectedBatch);
        }

        setBatchStudents(studentList);

        const initialMap = {};
        studentList.forEach(s => {
          initialMap[s.id] = 'Present';
        });
        setAttendanceMap(initialMap);
        setCurrentSessionId(null);
      } catch (err) {
        console.error("Error loading batch students:", err);
      } finally {
        setLoadingStudents(false);
      }

      fetchBatchSessions(selectedBatch);
    };

    loadBatchData();
  }, [selectedBatch]);

  // Calculate next class number when history updates
  useEffect(() => {
    if (sessionHistory.length > 0) {
      const maxClassNo = Math.max(...sessionHistory.map(s => Number(s.class_number) || 0));
      setSessionForm(prev => ({
        ...prev,
        class_number: maxClassNo + 1
      }));
    } else {
      setSessionForm(prev => ({
        ...prev,
        class_number: 1
      }));
    }
  }, [sessionHistory]);

  // Fetch session history for batch
  const fetchBatchSessions = async (batchId) => {
    if (!batchId) return;
    setLoadingHistory(true);
    try {
      // Query class_sessions collection
      const sessionsRef = collection(db, "class_sessions");
      const q = query(sessionsRef, where("batch_id", "==", batchId));
      const snapshot = await getDocs(q);

      let sessions = snapshot.docs.map(docItem => ({
        id: docItem.id,
        ...docItem.data()
      }));

      // Sort by class_number descending or date descending
      sessions.sort((a, b) => {
        if (a.date !== b.date) {
          return new Date(b.date) - new Date(a.date);
        }
        return (Number(b.class_number) || 0) - (Number(a.class_number) || 0);
      });

      setSessionHistory(sessions);
    } catch (err) {
      console.error("Error fetching session history:", err);
      // Fallback: search existing class_data collection if class_sessions empty
      try {
        const legacyRef = collection(db, "class_data");
        const qLegacy = query(legacyRef, where("batch_id", "==", batchId));
        const legacySnap = await getDocs(qLegacy);
        const legacyList = legacySnap.docs.map(docItem => ({
          id: docItem.id,
          ...docItem.data()
        }));
        setSessionHistory(legacyList);
      } catch (legacyErr) {
        console.error("Error fetching legacy class data:", legacyErr);
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  // Form input handler
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setSessionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create Class Session
  const handleCreateSession = async (e) => {
    if (e) e.preventDefault();

    if (!selectedBatch) {
      if (addToast) addToast("Please select a batch first.", "error");
      return;
    }

    if (!sessionForm.date || !sessionForm.time || !sessionForm.class_number || !sessionForm.class_type) {
      if (addToast) addToast("Please fill in required session details (Date, Time, Class No, Class Type).", "error");
      return;
    }

    // Check for duplicate session (Same Batch + Same Date + Same Class Number)
    const isDuplicate = sessionHistory.some(s => 
      String(s.class_number) === String(sessionForm.class_number) &&
      s.date === sessionForm.date
    );

    if (isDuplicate) {
      if (addToast) addToast(`Class session #${sessionForm.class_number} on ${sessionForm.date} already exists for this batch.`, "warning");
    }

    setCreatingSession(true);
    try {
      const sessionDocData = {
        batch_id: selectedBatch,
        teacher_id: currentUser?.uid || '',
        date: sessionForm.date,
        time: sessionForm.time,
        class_number: Number(sessionForm.class_number),
        class_type: sessionForm.class_type,
        class_work: sessionForm.class_work || '',
        home_work: sessionForm.home_work || '',
        created_at: serverTimestamp(),
        total_students: batchStudents.length,
        status: 'active'
      };

      const sessionsRef = collection(db, "class_sessions");
      const docRef = await addDoc(sessionsRef, sessionDocData);

      setCurrentSessionId(docRef.id);

      // Re-fetch history to reflect newly created session
      await fetchBatchSessions(selectedBatch);

      if (addToast) addToast(`Class Session #${sessionForm.class_number} created successfully! Mark attendance below.`, "success");
    } catch (err) {
      console.error("Error creating class session:", err);
      if (addToast) addToast("Failed to create class session. Please try again.", "error");
    } finally {
      setCreatingSession(false);
    }
  };

  // Attendance status handler for individual student
  const handleAttendanceChange = (studentId, status) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // Mark all loaded students as Present
  const handleMarkAllPresent = () => {
    const updatedMap = {};
    batchStudents.forEach(s => {
      updatedMap[s.id] = 'Present';
    });
    setAttendanceMap(updatedMap);
    if (addToast) addToast("All students marked as Present", "info");
  };

  // Calculate live attendance counts
  const getAttendanceSummary = () => {
    let present = 0;
    let absent = 0;
    let late = 0;

    batchStudents.forEach(s => {
      const status = attendanceMap[s.id] || 'Present';
      if (status === 'Present') present++;
      else if (status === 'Absent') absent++;
      else if (status === 'Late') late++;
    });

    return {
      present,
      absent,
      late,
      total: batchStudents.length
    };
  };

  // Save Attendance to Firestore
  const handleSaveAttendance = async () => {
    if (batchStudents.length === 0) {
      if (addToast) addToast("No students found in this batch to save attendance.", "error");
      return;
    }

    setSavingAttendance(true);
    try {
      const sessionId = currentSessionId || `session_${selectedBatch}_${sessionForm.date}_${sessionForm.class_number}`;

      const summary = getAttendanceSummary();

      // Batch save attendance records using setDoc with composite doc keys to prevent duplicates
      const attendanceRef = collection(db, "attendance_data");

      for (let i = 0; i < batchStudents.length; i++) {
        const student = batchStudents[i];
        const status = attendanceMap[student.id] || 'Present';
        const docId = `${sessionId}_${student.id}`;

        await setDoc(doc(attendanceRef, docId), {
          session_id: sessionId,
          batch_id: selectedBatch,
          teacher_id: currentUser?.uid || '',
          student_id: student.id,
          register_number: student.bid || student.register_number || '—',
          student_name: student.student_name,
          status: status,
          date: sessionForm.date,
          class_number: Number(sessionForm.class_number)
        }, { merge: true });
      }

      // Update session summary on class_sessions doc if exists
      if (currentSessionId) {
        const sessionDocRef = doc(db, "class_sessions", currentSessionId);
        await setDoc(sessionDocRef, {
          present_count: summary.present,
          absent_count: summary.absent,
          late_count: summary.late,
          total_students: summary.total
        }, { merge: true });
      }

      await fetchBatchSessions(selectedBatch);

      if (addToast) addToast(`Attendance saved successfully for ${batchStudents.length} students!`, "success");
    } catch (err) {
      console.error("Error saving attendance:", err);
      if (addToast) addToast("Failed to save attendance. Please try again.", "error");
    } finally {
      setSavingAttendance(false);
    }
  };

  // View specific session details & student attendance
  const handleViewSessionDetail = async (sessionItem) => {
    setSelectedSessionDetail(sessionItem);
    try {
      // Query attendance records for this session
      const attendanceRef = collection(db, "attendance_data");
      const q = query(attendanceRef, where("session_id", "==", sessionItem.id));
      const snap = await getDocs(q);
      
      let records = snap.docs.map(d => d.data());

      if (records.length === 0) {
        // Fallback: construct default list from batch students
        records = batchStudents.map(s => ({
          register_number: s.bid || s.register_number || '—',
          student_name: s.student_name,
          status: 'Present'
        }));
      }

      setSelectedSessionAttendance(records);
    } catch (err) {
      console.error("Error loading session attendance detail:", err);
    }
  };

  const summaryCounts = getAttendanceSummary();

  // Filter history
  const filteredHistory = sessionHistory.filter(item => {
    const matchesSearch = 
      (item.class_work && item.class_work.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.home_work && item.home_work.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.date && item.date.includes(searchQuery));
    
    const matchesType = typeFilter === 'all' || (item.class_type && item.class_type.toLowerCase() === typeFilter.toLowerCase());

    return matchesSearch && matchesType;
  });

  return (
    <div>
      {/* Header section */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Class Management</h1>
          <p className="page-subtitle">Create batch class sessions, mark attendance, and review coursework history.</p>
        </div>
        <button 
          onClick={() => setViewmode(!viewmode)}
          className={viewmode ? 'btn-primary-saas' : 'btn-secondary-saas'}
        >
          {viewmode ? (
            <>
              <PlusCircle size={16} />
              <span>Create Session</span>
            </>
          ) : (
            <>
              <Eye size={16} />
              <span>Session History</span>
            </>
          )}
        </button>
      </div>

      {/* Two-Column Responsive Layout */}
      <div className="two-col-grid">
        
        {/* LEFT COLUMN: CLASS SESSION CREATION & ATTENDANCE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card 1: Batch & Class Session Creation Form */}
          <div className="saas-card">
            <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>
                1. Create Class Session
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Select a batch and enter class session details. All students in the batch will be loaded automatically.
              </span>
            </div>

            <form onSubmit={handleCreateSession}>
              {/* Batch / Course Dropdown */}
              <div className="form-group-saas">
                <label className="form-label-saas">Batch / Course *</label>
                <select 
                  className="form-control-saas"
                  value={selectedBatch} 
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    {batchOptions.length === 0 ? "No batches available" : "-- Select Batch --"}
                  </option>
                  {batchOptions.map(b => (
                    <option value={b.id} key={b.id}>
                      {b.batch_name || `Batch ${b.id}`} {b.course ? `(${b.course})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time Row */}
              <div className="form-grid-2">
                <div className="form-group-saas">
                  <label className="form-label-saas">Date *</label>
                  <input 
                    type="date" 
                    name="date"
                    value={sessionForm.date} 
                    className="form-control-saas" 
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group-saas">
                  <label className="form-label-saas">Time *</label>
                  <input 
                    type="time" 
                    name="time"
                    value={sessionForm.time} 
                    className="form-control-saas" 
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              {/* Class Number & Class Type Row */}
              <div className="form-grid-2">
                <div className="form-group-saas">
                  <label className="form-label-saas">Class Number *</label>
                  <input 
                    type="number" 
                    name="class_number"
                    value={sessionForm.class_number} 
                    className="form-control-saas" 
                    placeholder="01"
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group-saas">
                  <label className="form-label-saas">Class Type *</label>
                  <select 
                    name="class_type"
                    value={sessionForm.class_type} 
                    className="form-control-saas"
                    onChange={handleFormChange}
                    required
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Practical">Practical</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Demo">Demo</option>
                  </select>
                </div>
              </div>

              {/* Coursework Fields */}
              <div className="form-group-saas">
                <label className="form-label-saas">Class Work</label>
                <textarea 
                  name="class_work"
                  value={sessionForm.class_work} 
                  className="form-control-saas" 
                  onChange={handleFormChange}
                  placeholder="Topics covered in class..."
                  rows={3}
                />
              </div>

              <div className="form-group-saas">
                <label className="form-label-saas">Homework</label>
                <textarea 
                  name="home_work"
                  value={sessionForm.home_work} 
                  className="form-control-saas" 
                  onChange={handleFormChange}
                  placeholder="Tasks assigned for home..."
                  rows={2}
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary-saas" 
                style={{ width: '100%', height: '44px', marginTop: '8px' }}
                disabled={creatingSession || !selectedBatch}
              >
                {creatingSession ? 'Creating Session...' : 'Create Class Session'}
              </button>
            </form>
          </div>

          {/* Card 2: Batch Student Attendance Marking */}
          <div className="saas-card">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              borderBottom: '1px solid #E2E8F0', 
              paddingBottom: '14px', 
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  2. Attendance ({batchStudents.length} Students)
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  {selectedBatch ? `Loaded students for Batch: ${batchOptions.find(b => b.id === selectedBatch)?.batch_name || selectedBatch}` : 'Select a batch to load students'}
                </span>
              </div>

              <button 
                type="button" 
                className="btn-secondary-saas"
                style={{ padding: '6px 12px', fontSize: '13px' }}
                onClick={handleMarkAllPresent}
                disabled={batchStudents.length === 0}
              >
                <CheckSquare size={14} />
                <span>Mark All Present</span>
              </button>
            </div>

            {/* Student Attendance Table */}
            <div className="saas-table-container" style={{ marginBottom: '16px' }}>
              <div className="table-responsive-wrapper">
                <table className="saas-table">
                  <thead>
                    <tr>
                      <th>Register Number</th>
                      <th>Student Name</th>
                      <th style={{ width: '140px' }}>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingStudents ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                          Loading students...
                        </td>
                      </tr>
                    ) : batchStudents.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '0' }}>
                          <EmptyState 
                            icon={Users}
                            title="No students found in this batch"
                            description={selectedBatch ? "Add students to this batch first to take attendance." : "Select a batch above to load student attendance."}
                          />
                        </td>
                      </tr>
                    ) : (
                      batchStudents.map((s) => {
                        const status = attendanceMap[s.id] || 'Present';
                        return (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 600 }}>{s.bid || s.register_number || '—'}</td>
                            <td style={{ color: '#0F172A', fontWeight: 500 }}>{s.student_name}</td>
                            <td>
                              <select 
                                className="form-control-saas" 
                                style={{ 
                                  height: '36px', 
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: status === 'Present' ? '#15803D' : status === 'Absent' ? '#B91C1C' : '#D97706',
                                  backgroundColor: status === 'Present' ? '#DCFCE7' : status === 'Absent' ? '#FEE2E2' : '#FEF3C7'
                                }}
                                value={status}
                                onChange={(e) => handleAttendanceChange(s.id, e.target.value)}
                              >
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                                <option value="Late">Late</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Attendance Counter Summary */}
            <div className="metrics-row" style={{ marginBottom: '16px' }}>
              <div className="metric-card metric-success" style={{ padding: '10px 14px' }}>
                <span className="metric-label">Present</span>
                <span className="metric-value" style={{ fontSize: '20px', color: '#16A34A' }}>
                  {summaryCounts.present}
                </span>
              </div>

              <div className="metric-card metric-danger" style={{ padding: '10px 14px' }}>
                <span className="metric-label">Absent</span>
                <span className="metric-value" style={{ fontSize: '20px', color: '#DC2626' }}>
                  {summaryCounts.absent}
                </span>
              </div>

              <div className="metric-card" style={{ padding: '10px 14px', backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }}>
                <span className="metric-label" style={{ color: '#B45309' }}>Late</span>
                <span className="metric-value" style={{ fontSize: '20px', color: '#D97706' }}>
                  {summaryCounts.late}
                </span>
              </div>
            </div>

            {/* Save Attendance Action */}
            <button 
              type="button" 
              className="btn-primary-saas"
              style={{ width: '100%', height: '44px' }}
              onClick={handleSaveAttendance}
              disabled={savingAttendance || batchStudents.length === 0}
            >
              <Save size={16} />
              <span>{savingAttendance ? 'Saving Attendance...' : 'Save Attendance'}</span>
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: SESSION HISTORY & SESSION DETAIL PREVIEW */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* History Search & Filters */}
          <div className="saas-card" style={{ padding: '16px' }}>
            <div className="filter-toolbar">
              <div className="search-wrap">
                <Search size={16} />
                <input 
                  type="text"
                  className="form-control-saas"
                  style={{ height: '38px', fontSize: '13px' }}
                  placeholder="Search date or coursework..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="filters-wrap">
                <select 
                  className="form-control-saas"
                  style={{ height: '38px', fontSize: '13px' }}
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="lecture">Lecture</option>
                  <option value="practical">Practical</option>
                  <option value="demo">Demo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Session History Table Container */}
          <div className="saas-table-container">
            <div style={{ 
              padding: '16px 20px', 
              borderBottom: '1px solid #E2E8F0', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Session History
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  {selectedBatch ? `Batch: ${selectedBatch}` : 'No batch selected'}
                </span>
              </div>
              <span className="badge-saas badge-info">
                {filteredHistory.length} Sessions
              </span>
            </div>

            <div className="table-responsive-wrapper">
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class No</th>
                    <th>Type</th>
                    <th>Attendance</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedBatch ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '0' }}>
                        <EmptyState 
                          icon={Calendar}
                          title="No batch selected"
                          description="Select a batch to view class session history."
                        />
                      </td>
                    </tr>
                  ) : loadingHistory ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                        Loading sessions...
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '0' }}>
                        <EmptyState 
                          icon={BookOpen}
                          title="No class sessions found for this batch"
                          description={searchQuery || typeFilter !== 'all' ? "Try clearing your search or filters." : "Create your first class session above to record attendance."}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((sess) => {
                      const presentCount = sess.present_count !== undefined ? sess.present_count : sess.total_students || batchStudents.length;
                      const totalCount = sess.total_students || batchStudents.length;
                      return (
                        <tr key={sess.id}>
                          <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{sess.date}</td>
                          <td style={{ fontWeight: 600 }}>#{sess.class_number}</td>
                          <td>
                            <span className="badge-saas badge-info">{sess.class_type || 'Lecture'}</span>
                          </td>
                          <td>
                            <span className="badge-saas badge-present">
                              {presentCount}/{totalCount} Present
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              type="button"
                              className="btn-secondary-saas"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => handleViewSessionDetail(sess)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Session Detail Card Preview */}
          {selectedSessionDetail && (
            <div className="saas-card" style={{ borderLeft: '4px solid #2563EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Session #${selectedSessionDetail.class_number} Details ({selectedSessionDetail.date})
                </h4>
                <button 
                  className="btn-secondary-saas" 
                  style={{ padding: '2px 8px', fontSize: '12px' }}
                  onClick={() => setSelectedSessionDetail(null)}
                >
                  Close
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', fontSize: '13px' }}>
                <div>
                  <strong style={{ color: '#475569' }}>Class Type:</strong> {selectedSessionDetail.class_type || 'Lecture'}
                </div>
                <div>
                  <strong style={{ color: '#475569' }}>Time:</strong> {selectedSessionDetail.time || '—'}
                </div>
              </div>

              {selectedSessionDetail.class_work && (
                <div style={{ marginBottom: '10px', fontSize: '13px' }}>
                  <strong style={{ color: '#475569', display: 'block', marginBottom: '2px' }}>Class Work:</strong>
                  <p style={{ margin: 0, padding: '8px', background: '#F8FAFC', borderRadius: '6px', color: '#0F172A' }}>
                    {selectedSessionDetail.class_work}
                  </p>
                </div>
              )}

              {selectedSessionDetail.home_work && (
                <div style={{ marginBottom: '14px', fontSize: '13px' }}>
                  <strong style={{ color: '#475569', display: 'block', marginBottom: '2px' }}>Homework:</strong>
                  <p style={{ margin: 0, padding: '8px', background: '#F8FAFC', borderRadius: '6px', color: '#0F172A' }}>
                    {selectedSessionDetail.home_work}
                  </p>
                </div>
              )}

              {/* Attendance breakdown table */}
              <h5 style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
                Attendance Record ({selectedSessionAttendance.length} Students)
              </h5>
              <div className="saas-table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="saas-table">
                  <thead>
                    <tr>
                      <th>Reg No</th>
                      <th>Student Name</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSessionAttendance.map((rec, idx) => (
                      <tr key={idx}>
                        <td>{rec.register_number}</td>
                        <td>{rec.student_name}</td>
                        <td>
                          {rec.status === 'Present' ? (
                            <span className="badge-saas badge-present">Present</span>
                          ) : rec.status === 'Absent' ? (
                            <span className="badge-saas badge-absent">Absent</span>
                          ) : (
                            <span className="badge-saas badge-late">Late</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default Classdetails;
