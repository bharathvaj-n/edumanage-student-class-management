import { db } from './firebase-config';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

/**
 * Migration helper function.
 * Inspects 'student_data' collection and ensures every existing student has a valid `batch_id`.
 * Creates corresponding batch records in 'batches' if they do not exist yet.
 */
export async function runStudentBatchMigration() {
  try {
    const batchSnap = await getDocs(collection(db, 'batches'));
    const existingBatches = batchSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const studentSnap = await getDocs(collection(db, 'student_data'));
    const unassignedStudents = studentSnap.docs.filter(d => !d.data().batch_id);

    if (unassignedStudents.length === 0) {
      return { migratedCount: 0, batchCount: existingBatches.length };
    }

    let createdBatchesMap = {}; // key: "course|department|year|section" -> batchId

    // Map existing batches to keys
    existingBatches.forEach(b => {
      const key = `${(b.course || '').trim().toLowerCase()}|${(b.department || '').trim().toLowerCase()}|${String(b.year || '').trim()}|${(b.section || '').trim().toLowerCase()}`;
      createdBatchesMap[key] = b.id;
    });

    let count = 0;
    for (const studentDoc of unassignedStudents) {
      const s = studentDoc.data();
      const course = s.course || 'General Course';
      const department = s.department || s.course || 'General Department';
      const year = String(s.year || s.level || '1');
      const section = s.section || 'A';
      const startDate = s.start_date || new Date().toISOString().split('T')[0];

      const key = `${course.trim().toLowerCase()}|${department.trim().toLowerCase()}|${year.trim()}|${section.trim().toLowerCase()}`;

      let targetBatchId = createdBatchesMap[key];

      if (!targetBatchId) {
        // Construct descriptive batch name
        const yearPrefix = s.start_date && s.start_date.length >= 4 ? s.start_date.substring(0, 4) : '2026';
        const deptAbbr = department.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 4) || 'BATCH';
        const batchName = `${yearPrefix} ${deptAbbr} ${section}`;

        // Create new batch document
        const newBatchRef = await addDoc(collection(db, 'batches'), {
          batch_name: batchName,
          course: course,
          department: department,
          year: year,
          section: section,
          start_date: startDate,
          created_at: serverTimestamp()
        });

        targetBatchId = newBatchRef.id;
        createdBatchesMap[key] = targetBatchId;
      }

      // Update student document with batch_id
      await updateDoc(doc(db, 'student_data', studentDoc.id), {
        batch_id: targetBatchId,
        year: year,
        section: section,
        department: department
      });

      count++;
    }

    return { migratedCount: count, createdBatches: Object.keys(createdBatchesMap).length };
  } catch (err) {
    console.error('Error during student batch migration:', err);
    return { error: err.message };
  }
}
