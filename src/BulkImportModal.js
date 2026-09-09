import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { db } from './firebase-config';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { 
  X, 
  UploadCloud, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  ArrowLeft,
  FileText
} from 'lucide-react';

const REQUIRED_HEADERS = [
  'Student Name',
  'Register Number',
  'Email',
  'Phone Number',
  'Department',
  'Course',
  'Year',
  'Section',
  'Gender',
  'Date of Birth'
];

function BulkImportModal({ isOpen, onClose, existingStudents = [], onImportSuccess, batchId = null, batchName = '', batchMeta = {} }) {
  const { currentUser } = useAuth();
  // When batchId is provided, template only needs 6 student-specific columns
  const inBatchContext = Boolean(batchId);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Success Result
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [validRows, setValidRows] = useState([]);
  const [invalidRows, setInvalidRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0, skipped: 0 });
  const [errorReportData, setErrorReportData] = useState([]);
  const [parseError, setParseError] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Reset modal state
  const handleReset = () => {
    setStep(1);
    setFile(null);
    setParsedRows([]);
    setValidRows([]);
    setInvalidRows([]);
    setImporting(false);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0, skipped: 0 });
    setErrorReportData([]);
    setParseError('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Generate and download sample Excel Template
  const downloadTemplate = () => {
    try {
      // When inside a batch, template only needs student-specific columns
      const templateData = inBatchContext ? [
        {
          'Student Name': 'Alex Johnson (Sample)',
          'Register Number': 'REG-2024-001',
          'Email': 'alex.johnson@example.com',
          'Phone Number': '9876543210',
          'Gender': 'Male',
          'Date of Birth': '2002-05-15'
        }
      ] : [
        {
          'Student Name': 'Alex Johnson (Sample - Replace with student name)',
          'Register Number': 'REG-2024-001',
          'Email': 'alex.johnson@example.com',
          'Phone Number': '9876543210',
          'Department': 'Computer Science',
          'Course': 'Full Stack Web',
          'Year': '3',
          'Section': 'A',
          'Gender': 'Male',
          'Date of Birth': '2002-05-15'
        }
      ];

      const headers = inBatchContext
        ? ['Student Name', 'Register Number', 'Email', 'Phone Number', 'Gender', 'Date of Birth']
        : REQUIRED_HEADERS;

      const worksheet = XLSX.utils.json_to_sheet(templateData, { header: headers });
      
      // Set column widths for optimal display in Excel/Google Sheets
      worksheet['!cols'] = inBatchContext ? [
        { wch: 30 }, { wch: 20 }, { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 15 }
      ] : [
        { wch: 45 }, { wch: 20 }, { wch: 28 }, { wch: 16 },
        { wch: 22 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 15 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Import Template');

      // Generate binary array buffer using XLSX.write
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      // Create Blob for reliable browser file download
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
      });

      // Create object URL and trigger programmatic link download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating template download:', err);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Helper for email regex validation
  const isValidEmail = (email) => {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).trim());
  };

  // Parse Excel and run validations
  const processFile = (uploadedFile) => {
    setParseError('');
    const ext = uploadedFile.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setParseError('Invalid file type. Please upload an Excel file (.xlsx or .xls).');
      return;
    }

    setFile(uploadedFile);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON array of objects
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setParseError('The uploaded Excel file is empty.');
          return;
        }

        // Validate column headers
        const firstRowKeys = Object.keys(rawJson[0]).map(k => k.trim());
        const missingRequiredHeaders = ['Student Name', 'Register Number', 'Email'].filter(
          h => !firstRowKeys.some(k => k.toLowerCase() === h.toLowerCase())
        );

        if (missingRequiredHeaders.length > 0) {
          setParseError(`Missing required column header(s): ${missingRequiredHeaders.join(', ')}. Please use the template format.`);
          return;
        }

        // Prepare existing Reg Number set for quick duplicate checking
        const dbRegSet = new Set(
          existingStudents.map(s => String(s.bid || s.register_number || '').trim().toLowerCase())
        );

        const seenInFileRegs = new Set();
        const processedRows = [];
        const valid = [];
        const invalid = [];

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2; // Row number in Excel sheet (1-based header is row 1)

          // Normalize row key lookup (case-insensitive key mapping)
          const getVal = (keyName) => {
            const matchedKey = Object.keys(row).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
            return matchedKey ? String(row[matchedKey]).trim() : '';
          };

          const sname = getVal('Student Name');
          const regNo = getVal('Register Number');
          const email = getVal('Email');
          const phone = getVal('Phone Number');
          const dept = getVal('Department');
          const course = getVal('Course');
          const year = getVal('Year');
          const section = getVal('Section');
          const gender = getVal('Gender');
          const dob = getVal('Date of Birth');

          // Empty row check
          if (!sname && !regNo && !email && !course) {
            return; // Skip empty rows quietly
          }

          let errors = [];

          // Validate required fields
          if (!sname) errors.push('Student Name is required');
          if (!regNo) errors.push('Register Number is required');
          if (!email) errors.push('Email is required');

          // Email format check
          if (email && !isValidEmail(email)) {
            errors.push('Invalid email address format');
          }

          // Duplicate in Excel check
          const regNoLower = regNo.toLowerCase();
          if (regNo) {
            if (seenInFileRegs.has(regNoLower)) {
              errors.push('Duplicate Register Number in uploaded Excel file');
            } else {
              seenInFileRegs.add(regNoLower);
            }

            // Duplicate in DB check
            if (dbRegSet.has(regNoLower)) {
              errors.push('Register Number already exists in database');
            }
          }

          const record = {
            rowNum,
            sname,
            regNo,
            email,
            phone,
            dept,
            course,
            year,
            section,
            gender,
            dob,
            isValid: errors.length === 0,
            errorReason: errors.join('; ')
          };

          processedRows.push(record);
          if (record.isValid) {
            valid.push(record);
          } else {
            invalid.push(record);
          }
        });

        if (processedRows.length === 0) {
          setParseError('No student records found in the Excel file.');
          return;
        }

        setParsedRows(processedRows);
        setValidRows(valid);
        setInvalidRows(invalid);
        setStep(2); // Move to preview step
      } catch (err) {
        console.error('Error reading Excel file:', err);
        setParseError('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  // Perform Firestore import
  const handleImport = async () => {
    if (validRows.length === 0) return;

    setImporting(true);
    setImportProgress(0);
    const collectionRef = collection(db, 'student_data');

    let successCount = 0;
    let failedCount = 0;
    const errorsList = invalidRows.map(r => ({
      rowNum: r.rowNum,
      regNo: r.regNo || '—',
      sname: r.sname || '—',
      errorReason: r.errorReason
    }));

    for (let i = 0; i < validRows.length; i++) {
      const item = validRows[i];
      try {
        await addDoc(collectionRef, {
          // batch relationship
          batch_id: inBatchContext ? batchId : (item.regNo || ''),
          bid: item.regNo,                          // backward-compat
          register_number: item.regNo,
          student_name: item.sname,
          email: item.email,
          phone_number: item.phone,
          gender: item.gender,
          dob: item.dob,
          // batch meta: use batchMeta when in context, else use Excel columns
          department: inBatchContext ? (batchMeta.department || '') : item.dept,
          course: inBatchContext ? (batchMeta.course || '') : item.course,
          year: inBatchContext ? (batchMeta.year || '') : item.year,
          section: inBatchContext ? (batchMeta.section || '') : item.section,
          level: inBatchContext ? (batchMeta.year || '1') : (item.year || '1'),
          classes_completed: 0,
          start_date: inBatchContext ? (batchMeta.start_date || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
          complete_status: 0,
          teacher_id: currentUser?.uid || ''
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to insert row ${item.rowNum}:`, error);
        failedCount++;
        errorsList.push({
          rowNum: item.rowNum,
          regNo: item.regNo,
          sname: item.sname,
          errorReason: `Database Error: ${error.message || 'Failed to write record'}`
        });
      }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImportResults({
      success: successCount,
      failed: failedCount,
      skipped: invalidRows.length
    });
    setErrorReportData(errorsList);
    setImporting(false);
    setStep(3); // Move to final result step

    if (onImportSuccess) {
      onImportSuccess();
    }
  };

  // Generate and download Error Report Excel file
  const downloadErrorReport = () => {
    if (errorReportData.length === 0) return;

    const reportRows = errorReportData.map(err => ({
      'Row Number': err.rowNum,
      'Register Number': err.regNo,
      'Student Name': err.sname,
      'Error Reason': err.errorReason
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportRows);
    worksheet['!cols'] = [
      { wch: 12 }, // Row Number
      { wch: 18 }, // Register Number
      { wch: 22 }, // Student Name
      { wch: 45 }  // Error Reason
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Error Report');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Import_Error_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop-saas">
      <div className="modal-container-saas modal-lg">
        {/* Modal Header */}
        <div className="modal-header-saas">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet className="text-primary-blue" size={22} />
            <div>
              <h2 className="modal-title-saas">Bulk Import Students{inBatchContext ? ` — ${batchName}` : ''}</h2>
              <p className="modal-subtitle-saas">
                {step === 1 && (inBatchContext
                  ? `Importing students into batch "${batchName}". Batch details are assigned automatically.`
                  : 'Upload an Excel file (.xlsx, .xls) to add multiple students at once.')}
                {step === 2 && `Reviewing records from "${file?.name || 'uploaded file'}" before importing.`}
                {step === 3 && 'Bulk import execution summary and results.'}
              </p>
            </div>
          </div>
          <button className="btn-icon-close" onClick={handleClose} disabled={importing}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-saas">
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div className="import-step-container">
              {/* Template Download Banner */}
              <div className="template-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="icon-badge-blue">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>Need the standard Excel template?</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                      Download our pre-formatted template with required column headers and sample data.
                    </p>
                  </div>
                </div>
                <button type="button" className="btn-secondary-saas" onClick={downloadTemplate}>
                  <Download size={15} />
                  <span>Download Excel Template</span>
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div 
                className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                <div className="upload-icon-wrapper">
                  <UploadCloud size={32} />
                </div>
                
                <h3 className="upload-title">Click to upload or drag & drop Excel file</h3>
                <p className="upload-subtitle">Supports Microsoft Excel spreadsheets (.xlsx, .xls)</p>

                <button 
                  type="button" 
                  className="btn-primary-saas" 
                  style={{ marginTop: '12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current && fileInputRef.current.click();
                  }}
                >
                  Choose Excel File
                </button>
              </div>

              {/* Required Columns Info */}
              <div className="fields-info-box">
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  Required Columns:
                </span>
                <span className="badge-saas badge-required">Student Name *</span>
                <span className="badge-saas badge-required">Register Number *</span>
                <span className="badge-saas badge-required">Email *</span>
                <span className="badge-saas badge-optional">Phone Number</span>
                <span className="badge-saas badge-optional">Gender</span>
                <span className="badge-saas badge-optional">Date of Birth</span>
                {!inBatchContext && (
                  <>
                    <span className="badge-saas badge-optional">Department</span>
                    <span className="badge-saas badge-optional">Course</span>
                    <span className="badge-saas badge-optional">Year</span>
                    <span className="badge-saas badge-optional">Section</span>
                  </>
                )}
                {inBatchContext && (
                  <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '4px' }}>
                    — Batch, Course, Dept, Year, Section auto-assigned from "{batchName}"
                  </span>
                )}
              </div>

              {/* Parse Error Notification */}
              {parseError && (
                <div className="alert-box alert-danger">
                  <AlertTriangle size={18} />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATE */}
          {step === 2 && (
            <div className="import-step-container">
              {/* Metrics Summary Chips */}
              <div className="metrics-row">
                <div className="metric-card">
                  <span className="metric-label">Total Records</span>
                  <span className="metric-value">{parsedRows.length}</span>
                </div>
                <div className="metric-card metric-success">
                  <span className="metric-label">Valid Records</span>
                  <span className="metric-value" style={{ color: '#16A34A' }}>{validRows.length}</span>
                </div>
                <div className="metric-card metric-danger">
                  <span className="metric-label">Invalid Records</span>
                  <span className="metric-value" style={{ color: '#DC2626' }}>{invalidRows.length}</span>
                </div>
              </div>

              {invalidRows.length > 0 && (
                <div className="alert-box alert-warning">
                  <AlertTriangle size={18} />
                  <span>
                    {invalidRows.length} invalid record(s) found. Invalid records will be automatically excluded from the import.
                  </span>
                </div>
              )}

              {/* Preview Table */}
              <div className="saas-table-container preview-table-container">
                <table className="saas-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>Row</th>
                      <th>Register Number</th>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Course</th>
                      <th>Year</th>
                      <th>Section</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, index) => (
                      <tr key={index} className={row.isValid ? '' : 'row-invalid'}>
                        <td>#{row.rowNum}</td>
                        <td style={{ fontWeight: 600 }}>{row.regNo || '—'}</td>
                        <td style={{ color: '#0F172A', fontWeight: 500 }}>{row.sname || '—'}</td>
                        <td>{row.email || '—'}</td>
                        <td>{row.dept || '—'}</td>
                        <td>{row.course || '—'}</td>
                        <td>{row.year || '—'}</td>
                        <td>{row.section || '—'}</td>
                        <td>
                          {row.isValid ? (
                            <span className="badge-status status-valid">
                              <CheckCircle2 size={12} /> Valid
                            </span>
                          ) : (
                            <span className="badge-status status-invalid" title={row.errorReason}>
                              <XCircle size={12} /> Invalid: {row.errorReason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Importing progress bar */}
              {importing && (
                <div className="import-progress-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                    <span>Importing valid students to database...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${importProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: RESULT SUMMARY */}
          {step === 3 && (
            <div className="import-step-container" style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div className="result-icon-success">
                <CheckCircle2 size={48} color="#16A34A" />
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginTop: '12px' }}>
                Import Completed
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
                Student records have been processed and updated in the system.
              </p>

              {/* Results Breakdown Grid */}
              <div className="metrics-row" style={{ maxWidth: '500px', margin: '0 auto 24px auto' }}>
                <div className="metric-card metric-success">
                  <span className="metric-label">Successfully Imported</span>
                  <span className="metric-value" style={{ color: '#16A34A' }}>{importResults.success}</span>
                </div>
                <div className="metric-card metric-danger">
                  <span className="metric-label">Failed</span>
                  <span className="metric-value" style={{ color: '#DC2626' }}>{importResults.failed}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Skipped / Invalid</span>
                  <span className="metric-value" style={{ color: '#D97706' }}>{importResults.skipped}</span>
                </div>
              </div>

              {/* Download Error Report if there are errors */}
              {errorReportData.length > 0 && (
                <div className="error-report-download-box">
                  <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 12px 0' }}>
                    {errorReportData.length} record(s) failed or were skipped due to validation errors. You can download an error report to correct the data.
                  </p>
                  <button type="button" className="btn-secondary-saas" onClick={downloadErrorReport}>
                    <Download size={16} />
                    <span>Download Error Report</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer-saas">
          {step === 1 && (
            <button type="button" className="btn-secondary-saas" onClick={handleClose}>
              Cancel
            </button>
          )}

          {step === 2 && (
            <>
              <button 
                type="button" 
                className="btn-secondary-saas" 
                onClick={() => setStep(1)} 
                disabled={importing}
              >
                <ArrowLeft size={16} />
                <span>Upload Different File</span>
              </button>

              <button 
                type="button" 
                className="btn-primary-saas"
                disabled={validRows.length === 0 || importing}
                onClick={handleImport}
              >
                {importing ? (
                  <>
                    <Loader2 size={16} className="spin-icon" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <span>Import {validRows.length} Student{validRows.length === 1 ? '' : 's'}</span>
                )}
              </button>
            </>
          )}

          {step === 3 && (
            <button type="button" className="btn-primary-saas" onClick={handleClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BulkImportModal;
