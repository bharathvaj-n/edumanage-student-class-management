import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase-config';
import {
  collection, getDocs, addDoc, query, where, serverTimestamp
} from 'firebase/firestore';
import EmptyState from './EmptyState';
import BulkImportModal from './BulkImportModal';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import {
  Users, UserPlus, Plus, ArrowLeft, Search,
  FileSpreadsheet, GraduationCap
} from 'lucide-react';

// ── View states ──────────────────────────────────────────────
// 'batches'  → batch list (default)
// 'students' → students inside a selected batch
// ─────────────────────────────────────────────────────────────

function BatchManagement() {
  const { addToast } = useToast();
  const { currentUser } = useAuth();

  // ── View state ──
  const [view, setView] = useState('batches'); // 'batches' | 'students'
  const [selectedBatch, setSelectedBatch] = useState(null); // full batch object

  // ── Batch list ──
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [batchForm, setBatchForm] = useState({
    batch_name: '', course: '', department: '', year: '', section: '', start_date: ''
  });

  // ── Students inside a batch ──
  const [batchStudents, setBatchStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({
    student_name: '', register_number: '', email: '',
    phone_number: '', gender: '', dob: ''
  });
  const [studentSearch, setStudentSearch] = useState('');

  // ── Bulk import ──
  const [showImportModal, setShowImportModal] = useState(false);

  // ── Batch search ──
  const [batchSearch, setBatchSearch] = useState('');

  // ─────────────────────────────────────────────────────────────
  // Fetch all batches + student counts for current teacher
  // ─────────────────────────────────────────────────────────────
  const fetchBatches = useCallback(async () => {
    if (!currentUser?.uid) {
      setBatches([]);
      setLoadingBatches(false);
      return;
    }
    setLoadingBatches(true);
    try {
      const q = query(collection(db, 'batches'), where('teacher_id', '==', currentUser.uid));
      const batchSnap = await getDocs(q);
      const batchList = batchSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch student counts per batch for current teacher
      const studentQ = query(collection(db, 'student_data'), where('teacher_id', '==', currentUser.uid));
      const studentSnap = await getDocs(studentQ);
      const allStudents = studentSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const withCounts = batchList.map(b => ({
        ...b,
        studentCount: allStudents.filter(s => s.batch_id === b.id).length
      }));

      setBatches(withCounts);
    } catch (err) {
      console.error('Error fetching batches:', err);
      addToast('Unable to load batches.', 'error');
    } finally {
      setLoadingBatches(false);
    }
  }, [addToast, currentUser?.uid]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  // ─────────────────────────────────────────────────────────────
  // Create Batch
  // ─────────────────────────────────────────────────────────────
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.batch_name || !batchForm.course) {
      addToast('Batch Name and Course are required.', 'error');
      return;
    }

    // Duplicate check: same batch_name + course + year + section
    const duplicate = batches.find(b =>
      b.batch_name?.toLowerCase() === batchForm.batch_name.toLowerCase() &&
      b.course?.toLowerCase() === batchForm.course.toLowerCase() &&
      String(b.year) === String(batchForm.year) &&
      b.section?.toLowerCase() === batchForm.section.toLowerCase()
    );
    if (duplicate) {
      addToast('A batch with the same name, course, year and section already exists.', 'error');
      return;
    }

    setSavingBatch(true);
    try {
      await addDoc(collection(db, 'batches'), {
        batch_name: batchForm.batch_name,
        course: batchForm.course,
        department: batchForm.department,
        year: batchForm.year,
        section: batchForm.section,
        start_date: batchForm.start_date,
        teacher_id: currentUser?.uid || '',
        created_at: serverTimestamp()
      });
      setBatchForm({ batch_name: '', course: '', department: '', year: '', section: '', start_date: '' });
      setShowCreateBatch(false);
      await fetchBatches();
      addToast('Batch created successfully!', 'success');
    } catch (err) {
      console.error('Error creating batch:', err);
      addToast('Failed to create batch. Please try again.', 'error');
    } finally {
      setSavingBatch(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Open batch → load its students
  // ─────────────────────────────────────────────────────────────
  const openBatch = async (batch) => {
    setSelectedBatch(batch);
    setView('students');
    setStudentSearch('');
    setShowAddStudent(false);
    await fetchBatchStudents(batch.id);
  };

  const fetchBatchStudents = async (batchId) => {
    if (!currentUser?.uid || !batchId) return;
    setLoadingStudents(true);
    try {
      const q = query(
        collection(db, 'student_data'),
        where('teacher_id', '==', currentUser.uid),
        where('batch_id', '==', batchId)
      );
      const snap = await getDocs(q);
      setBatchStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching batch students:', err);
      addToast('Unable to load students for this batch.', 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Add individual student to selected batch
  // ─────────────────────────────────────────────────────────────
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.student_name || !studentForm.register_number) {
      addToast('Student Name and Register Number are required.', 'error');
      return;
    }

    // Duplicate register number check within batch
    const dup = batchStudents.find(
      s => s.register_number?.toLowerCase() === studentForm.register_number.toLowerCase()
    );
    if (dup) {
      addToast('A student with this Register Number already exists in this batch.', 'error');
      return;
    }

    setSavingStudent(true);
    try {
      await addDoc(collection(db, 'student_data'), {
        batch_id: selectedBatch.id,
        teacher_id: currentUser?.uid || '',
        bid: studentForm.register_number,          // backward-compat field
        student_name: studentForm.student_name,
        register_number: studentForm.register_number,
        email: studentForm.email,
        phone_number: studentForm.phone_number,
        gender: studentForm.gender,
        dob: studentForm.dob,
        course: selectedBatch.course,
        department: selectedBatch.department,
        year: selectedBatch.year,
        section: selectedBatch.section,
        classes_completed: 0,
        start_date: selectedBatch.start_date || '',
        complete_status: 0
      });
      setStudentForm({ student_name: '', register_number: '', email: '', phone_number: '', gender: '', dob: '' });
      setShowAddStudent(false);
      await fetchBatchStudents(selectedBatch.id);
      addToast('Student added successfully!', 'success');
    } catch (err) {
      console.error('Error adding student:', err);
      addToast('Failed to add student. Please try again.', 'error');
    } finally {
      setSavingStudent(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Filtered lists
  // ─────────────────────────────────────────────────────────────
  const filteredBatches = batches.filter(b => {
    const q = batchSearch.toLowerCase();
    return !q ||
      b.batch_name?.toLowerCase().includes(q) ||
      b.course?.toLowerCase().includes(q) ||
      b.department?.toLowerCase().includes(q) ||
      String(b.year).includes(q) ||
      b.section?.toLowerCase().includes(q);
  });

  const filteredStudents = batchStudents.filter(s => {
    const q = studentSearch.toLowerCase();
    return !q ||
      s.student_name?.toLowerCase().includes(q) ||
      s.register_number?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q);
  });

  // ─────────────────────────────────────────────────────────────
  // RENDER: BATCH LIST VIEW
  // ─────────────────────────────────────────────────────────────
  if (view === 'batches') {
    return (
      <div>
        {/* Page Header */}
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Student Management</h1>
            <p className="page-subtitle">Manage batches and student profiles.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary-saas" onClick={() => setShowImportModal(true)}>
              <FileSpreadsheet size={16} />
              <span>Bulk Import</span>
            </button>
            <button className="btn-primary-saas" onClick={() => setShowCreateBatch(!showCreateBatch)}>
              <Plus size={16} />
              <span>{showCreateBatch ? 'Cancel' : 'Create Batch'}</span>
            </button>
          </div>
        </div>

        {/* Create Batch Form */}
        {showCreateBatch && (
          <div className="saas-card" style={{ marginBottom: '24px', borderLeft: '4px solid #2563EB' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
              Create New Batch
            </h3>
            <form onSubmit={handleCreateBatch}>
              <div className="form-grid-3">
                <div className="form-group-saas">
                  <label className="form-label-saas">Batch Name *</label>
                  <input type="text" className="form-control-saas" placeholder="e.g. 2026 CSE A"
                    value={batchForm.batch_name}
                    onChange={e => setBatchForm(p => ({ ...p, batch_name: e.target.value }))} required />
                </div>
                <div className="form-group-saas">
                  <label className="form-label-saas">Course *</label>
                  <input type="text" className="form-control-saas" placeholder="e.g. B.E. Computer Science"
                    value={batchForm.course}
                    onChange={e => setBatchForm(p => ({ ...p, course: e.target.value }))} required />
                </div>
                <div className="form-group-saas">
                  <label className="form-label-saas">Department</label>
                  <input type="text" className="form-control-saas" placeholder="e.g. Computer Science"
                    value={batchForm.department}
                    onChange={e => setBatchForm(p => ({ ...p, department: e.target.value }))} />
                </div>
                <div className="form-group-saas">
                  <label className="form-label-saas">Year</label>
                  <input type="number" className="form-control-saas" placeholder="1, 2, 3, 4"
                    value={batchForm.year}
                    onChange={e => setBatchForm(p => ({ ...p, year: e.target.value }))} />
                </div>
                <div className="form-group-saas">
                  <label className="form-label-saas">Section</label>
                  <input type="text" className="form-control-saas" placeholder="A, B, C..."
                    value={batchForm.section}
                    onChange={e => setBatchForm(p => ({ ...p, section: e.target.value }))} />
                </div>
                <div className="form-group-saas">
                  <label className="form-label-saas">Start Date</label>
                  <input type="date" className="form-control-saas"
                    value={batchForm.start_date}
                    onChange={e => setBatchForm(p => ({ ...p, start_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-actions-row">
                <button type="button" className="btn-secondary-saas" onClick={() => setShowCreateBatch(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-saas" disabled={savingBatch}>
                  {savingBatch ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Batch Search */}
        <div className="saas-card" style={{ padding: '14px 16px', marginBottom: '20px' }}>
          <div className="filter-toolbar">
            <div className="search-wrap">
              <Search size={16} />
              <input type="text" className="form-control-saas" style={{ height: '40px' }}
                placeholder="Search batches by name, course, department..."
                value={batchSearch} onChange={e => setBatchSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Batch Cards Grid */}
        {loadingBatches ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>Loading batches...</div>
        ) : filteredBatches.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No batches found"
            description="Create your first batch to start managing students."
            actionButton={
              <button className="btn-primary-saas" onClick={() => setShowCreateBatch(true)}>
                <Plus size={16} /><span>Create Batch</span>
              </button>
            }
          />
        ) : (
          <div className="batch-cards-grid">
            {filteredBatches.map(batch => {
              const formattedDate = batch.start_date ? (() => {
                try {
                  const d = new Date(batch.start_date);
                  return isNaN(d.getTime()) ? batch.start_date : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                } catch (e) { return batch.start_date; }
              })() : '—';

              return (
                <div key={batch.id} className="batch-card">
                  <div className="batch-card-header">
                    <div className="batch-icon-wrap">
                      <GraduationCap size={22} />
                    </div>
                    <div className="batch-header-title">
                      <h3 className="batch-card-name">{batch.batch_name}</h3>
                      <p className="batch-card-course">{batch.course}</p>
                    </div>
                  </div>

                  <div className="batch-card-meta-grid">
                    <div className="batch-meta-row">
                      <span className="batch-meta-label">Department</span>
                      <span className="batch-meta-value">{batch.department || '—'}</span>
                    </div>
                    <div className="batch-meta-row">
                      <span className="batch-meta-label">Year</span>
                      <span className="batch-meta-value">{batch.year ? `Year ${batch.year}` : '—'}</span>
                    </div>
                    <div className="batch-meta-row">
                      <span className="batch-meta-label">Section</span>
                      <span className="batch-meta-value">{batch.section ? `Section ${batch.section}` : '—'}</span>
                    </div>
                    <div className="batch-meta-row">
                      <span className="batch-meta-label">Start Date</span>
                      <span className="batch-meta-value">{formattedDate}</span>
                    </div>
                  </div>

                  <div className="batch-card-footer">
                    <div className="batch-student-count">
                      <Users size={16} />
                      <span>{batch.studentCount} Student{batch.studentCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="batch-actions-row">
                      <button className="btn-secondary-saas" onClick={() => openBatch(batch)}>
                        <Users size={14} /><span>View Students</span>
                      </button>
                      <button className="btn-primary-saas" onClick={() => { setSelectedBatch(batch); setView('students'); setShowAddStudent(true); fetchBatchStudents(batch.id); }}>
                        <UserPlus size={14} /><span>Add Student</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: STUDENTS INSIDE BATCH VIEW
  // ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div className="page-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-secondary-saas" style={{ padding: '8px 12px' }}
            onClick={() => { setView('batches'); setSelectedBatch(null); setBatchStudents([]); }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title">{selectedBatch?.batch_name}</h1>
            <p className="page-subtitle">
              {[selectedBatch?.course, selectedBatch?.department, selectedBatch?.year && `Year ${selectedBatch.year}`, selectedBatch?.section && `Section ${selectedBatch.section}`]
                .filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary-saas"
            onClick={() => setShowImportModal(true)}>
            <FileSpreadsheet size={16} /><span>Bulk Import</span>
          </button>
          <button className="btn-primary-saas"
            onClick={() => setShowAddStudent(!showAddStudent)}>
            <UserPlus size={16} /><span>{showAddStudent ? 'Cancel' : 'Add Student'}</span>
          </button>
        </div>
      </div>

      {/* Add Student Form */}
      {showAddStudent && (
        <div className="saas-card" style={{ marginBottom: '24px', borderLeft: '4px solid #2563EB' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
            Add Student to {selectedBatch?.batch_name}
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
            Batch, course and department are automatically assigned.
          </p>
          <form onSubmit={handleAddStudent}>
            <div className="form-grid-3">
              <div className="form-group-saas">
                <label className="form-label-saas">Student Name *</label>
                <input type="text" className="form-control-saas" placeholder="Full Name"
                  value={studentForm.student_name}
                  onChange={e => setStudentForm(p => ({ ...p, student_name: e.target.value }))} required />
              </div>
              <div className="form-group-saas">
                <label className="form-label-saas">Register Number *</label>
                <input type="text" className="form-control-saas" placeholder="e.g. REG2026001"
                  value={studentForm.register_number}
                  onChange={e => setStudentForm(p => ({ ...p, register_number: e.target.value }))} required />
              </div>
              <div className="form-group-saas">
                <label className="form-label-saas">Email</label>
                <input type="email" className="form-control-saas" placeholder="student@example.com"
                  value={studentForm.email}
                  onChange={e => setStudentForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group-saas">
                <label className="form-label-saas">Phone Number</label>
                <input type="text" className="form-control-saas" placeholder="10-digit number"
                  value={studentForm.phone_number}
                  onChange={e => setStudentForm(p => ({ ...p, phone_number: e.target.value }))} />
              </div>
              <div className="form-group-saas">
                <label className="form-label-saas">Gender</label>
                <select className="form-control-saas"
                  value={studentForm.gender}
                  onChange={e => setStudentForm(p => ({ ...p, gender: e.target.value }))}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group-saas">
                <label className="form-label-saas">Date of Birth</label>
                <input type="date" className="form-control-saas"
                  value={studentForm.dob}
                  onChange={e => setStudentForm(p => ({ ...p, dob: e.target.value }))} />
              </div>
            </div>
            <div className="form-actions-row">
              <button type="button" className="btn-secondary-saas" onClick={() => setShowAddStudent(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary-saas" disabled={savingStudent}>
                {savingStudent ? 'Adding...' : 'Add Student'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Student Search */}
      <div className="saas-card" style={{ padding: '14px 16px', marginBottom: '20px' }}>
        <div className="filter-toolbar">
          <div className="search-wrap">
            <Search size={16} />
            <input type="text" className="form-control-saas" style={{ height: '40px' }}
              placeholder="Search by name, register number, email..."
              value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="saas-table-container">
        <div className="table-header-row">
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Students ({filteredStudents.length})
          </h3>
          <span className="badge-saas badge-info">{selectedBatch?.batch_name}</span>
        </div>
        <div className="table-responsive-wrapper">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Register Number</th>
                <th>Student Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Date of Birth</th>
              </tr>
            </thead>
            <tbody>
              {loadingStudents ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                  Loading students...
                </td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 0 }}>
                  <EmptyState
                    icon={Users}
                    title={studentSearch ? "No matching students found" : "No students in this batch yet"}
                    description={studentSearch ? "Try adjusting your search query." : "Add students individually or import them using Excel."}
                    actionButton={
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="btn-secondary-saas" onClick={() => setShowImportModal(true)}>
                          <FileSpreadsheet size={16} /><span>Bulk Import</span>
                        </button>
                        <button className="btn-primary-saas" onClick={() => setShowAddStudent(true)}>
                          <UserPlus size={16} /><span>Add Student</span>
                        </button>
                      </div>
                    }
                  />
                </td></tr>
              ) : (
                filteredStudents.map(s => (
                  <tr key={s.id}>
                    <td><span className="badge-saas badge-info">{s.register_number || s.bid || '—'}</span></td>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{s.student_name}</td>
                    <td>{s.email || '—'}</td>
                    <td>{s.phone_number || '—'}</td>
                    <td>{s.gender || '—'}</td>
                    <td>{s.dob || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Import Modal — batch-aware */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        batchId={selectedBatch?.id}
        batchName={selectedBatch?.batch_name}
        batchMeta={{
          course: selectedBatch?.course,
          department: selectedBatch?.department,
          year: selectedBatch?.year,
          section: selectedBatch?.section,
          start_date: selectedBatch?.start_date
        }}
        existingStudents={batchStudents}
        onImportSuccess={() => fetchBatchStudents(selectedBatch?.id)}
      />
    </div>
  );
}

export default BatchManagement;
