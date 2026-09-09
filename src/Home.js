import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase-config';
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import EmptyState from './EmptyState';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { 
  Users, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  UserPlus, 
  PlusCircle, 
  CalendarCheck, 
  ListTodo, 
  CheckSquare,
  Sparkles,
  Calendar
} from 'lucide-react';

const Home = () => {
	const navigate = useNavigate();
	const { addToast } = useToast();
	const { currentUser } = useAuth();
	const [heading, setHeading] = useState("");
	const [task, setTask] = useState("");
	const [tasklist, setTasklist] = useState([]);
	const [loadingTasks, setLoadingTasks] = useState(true);

	const [totalStudents, setTotalStudents] = useState(0);
	const [activeClasses, setActiveClasses] = useState(0);
	const [attendanceRate, setAttendanceRate] = useState("0%");

	const getStudentlist = useCallback(async () => {
		if (!currentUser?.uid) {
			setTasklist([]);
			setLoadingTasks(false);
			return;
		}
		setLoadingTasks(true);
		try {
			const q = query(collection(db, "todolist"), where("teacher_id", "==", currentUser.uid));
			const data = await getDocs(q);
			var taskstemp = [];
			data.docs.forEach((docItem) => {
				const taskstatus = docItem.data().status;
				if (taskstatus === 0) {
					taskstemp.push({ ...docItem.data(), id: docItem.id });
				}
			});
			setTasklist(taskstemp);
		} catch (error) {
			console.error("Error fetching tasks:", error);
			if (addToast) addToast("Unable to load tasks. Please check connection.", "error");
		} finally {
			setLoadingTasks(false);
		}
	}, [addToast, currentUser?.uid]);

	const fetchStats = useCallback(async () => {
		if (!currentUser?.uid) {
			setTotalStudents(0);
			setActiveClasses(0);
			setAttendanceRate("0%");
			return;
		}
		try {
			// 1. Fetch batches owned by current teacher
			const batchQ = query(collection(db, "batches"), where("teacher_id", "==", currentUser.uid));
			const batchSnap = await getDocs(batchQ);
			const teacherBatchIds = batchSnap.docs.map(d => d.id);

			if (teacherBatchIds.length === 0) {
				setTotalStudents(0);
				setActiveClasses(0);
				setAttendanceRate("0%");
				return;
			}

			// 2. Fetch students belonging to teacher's batches
			const studentSnap = await getDocs(collection(db, "student_data"));
			const teacherStudents = studentSnap.docs.filter(d => teacherBatchIds.includes(d.data().batch_id));
			setTotalStudents(teacherStudents.length);

			// 3. Fetch class sessions belonging to teacher's batches or teacher_id
			const sessionSnap = await getDocs(collection(db, "class_sessions"));
			const teacherSessions = sessionSnap.docs.filter(d => 
				d.data().teacher_id === currentUser.uid || teacherBatchIds.includes(d.data().batch_id)
			);
			setActiveClasses(teacherSessions.length);

			// 4. Fetch attendance records for teacher's batches
			const attSnap = await getDocs(collection(db, "attendance_data"));
			const teacherAttendance = attSnap.docs.filter(d => 
				d.data().teacher_id === currentUser.uid || teacherBatchIds.includes(d.data().batch_id)
			);

			if (teacherAttendance.length > 0) {
				let presentCount = 0;
				teacherAttendance.forEach(d => {
					if (d.data().status === 'Present') {
						presentCount++;
					}
				});
				const rate = Math.round((presentCount / teacherAttendance.length) * 100);
				setAttendanceRate(`${rate}%`);
			} else {
				setAttendanceRate("0%");
			}
		} catch (error) {
			console.error("Error fetching stats:", error);
		}
	}, [currentUser?.uid]);

	useEffect(() => {
		getStudentlist();
		fetchStats();
	}, [getStudentlist, fetchStats]);

	const handleClick = async () => {
		if (!heading && !task) return;
		try {
			const docRef = await addDoc(collection(db, "todolist"), {
				content: task,
				heading: heading,
				status: 0,
				teacher_id: currentUser?.uid || ''
			});
			setTasklist(prev => [...prev, { heading: heading, content: task, status: 0, teacher_id: currentUser?.uid || '', id: docRef.id }]);
			setHeading("");
			setTask("");
			if (addToast) addToast("Task added successfully", "success");
		} catch (error) {
			console.error("Error adding task:", error);
			if (addToast) addToast("Unable to add task. Please try again.", "error");
		}
	};

	const handleComplete = async (id) => {
		if (!id) return;
		var response = window.confirm("Are you sure that the task is complete?");
		if (response) {
			try {
				const userDoc = doc(db, "todolist", id);
				await updateDoc(userDoc, { status: 1 });
				setTasklist(prev => prev.filter(t => t.id !== id));
				if (addToast) addToast("Task marked as completed", "success");
			} catch (error) {
				console.error("Error completing task:", error);
				if (addToast) addToast("Unable to update task status.", "error");
			}
		}
	};

	const currentDateStr = new Date().toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	return (
		<div>
			{/* Dashboard Header */}
			<div className="page-header-row" style={{ marginBottom: '20px' }}>
				<div>
					<h1 className="page-title">Good morning, Teacher</h1>
					<p className="page-subtitle">Here's what's happening with your classes today.</p>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', padding: '8px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 500, color: '#64748B', flexShrink: 0 }}>
					<Calendar size={16} style={{ color: '#2563EB' }} />
					<span>{currentDateStr}</span>
				</div>
			</div>

			{/* Statistics Cards */}
			<div className="stat-cards-grid">
				<div className="stat-card">
					<div className="stat-info">
						<span className="stat-title">Total Students</span>
						<span className="stat-value">{totalStudents}</span>
						<span className="stat-subtext">Active student profiles</span>
					</div>
					<div className="stat-icon-wrapper">
						<Users size={22} />
					</div>
				</div>

				<div className="stat-card">
					<div className="stat-info">
						<span className="stat-title">Active Classes</span>
						<span className="stat-value">{activeClasses}</span>
						<span className="stat-subtext">Sessions recorded</span>
					</div>
					<div className="stat-icon-wrapper">
						<BookOpen size={22} />
					</div>
				</div>

				<div className="stat-card">
					<div className="stat-info">
						<span className="stat-title">Attendance Rate</span>
						<span className="stat-value">{attendanceRate}</span>
						<span className="stat-subtext">Average attendance</span>
					</div>
					<div className="stat-icon-wrapper">
						<CheckCircle2 size={22} />
					</div>
				</div>

				<div className="stat-card">
					<div className="stat-info">
						<span className="stat-title">Pending Tasks</span>
						<span className="stat-value">{tasklist.length}</span>
						<span className="stat-subtext">To-do items remaining</span>
					</div>
					<div className="stat-icon-wrapper">
						<Clock size={22} />
					</div>
				</div>
			</div>

			{/* Quick Actions */}
			<div className="saas-card" style={{ marginBottom: '28px', padding: '20px 24px' }}>
				<h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
					<Sparkles size={16} style={{ color: '#2563EB' }} />
					Quick Actions
				</h3>
				<div className="quick-actions-row">
					<button className="btn-primary-saas" onClick={() => navigate('/student')}>
						<UserPlus size={16} />
						<span>+ Add Student</span>
					</button>
					<button className="btn-secondary-saas" onClick={() => navigate('/class')}>
						<PlusCircle size={16} />
						<span>+ Add Class</span>
					</button>
					<button className="btn-secondary-saas" onClick={() => navigate('/class')}>
						<CalendarCheck size={16} />
						<span>Take Attendance</span>
					</button>
					<a href="#add-task-section" className="btn-secondary-saas">
						<ListTodo size={16} />
						<span>Add Task</span>
					</a>
				</div>
			</div>

			{/* Main Grid: Tasks & Add Task */}
			<div className="tasks-grid">

				{/* Tasks List */}
				<div className="saas-card">
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
						<h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
							<CheckSquare size={20} style={{ color: '#2563EB' }} />
							Today's Tasks
						</h2>
						<span className="badge-saas badge-info">{tasklist.length} pending</span>
					</div>

					{loadingTasks ? (
						<div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
							Loading tasks...
						</div>
					) : tasklist.length === 0 ? (
						<EmptyState
							icon={CheckSquare}
							title="No tasks pending"
							description="Great job! You have completed all your tasks."
						/>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
							{tasklist.map((val) => (
								<div key={val.id} className="task-item">
									<div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: 0 }}>
										<button
											className="task-checkbox"
											onClick={() => handleComplete(val.id)}
											title="Click to complete"
											aria-label="Mark task complete"
										/>
										<div style={{ minWidth: 0 }}>
											<h4 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
												{val.heading}
											</h4>
											<p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
												{val.content}
											</p>
										</div>
									</div>
									<button
										className="btn-secondary-saas"
										style={{ padding: '4px 10px', fontSize: '12px', height: 'auto', flexShrink: 0 }}
										onClick={() => handleComplete(val.id)}
									>
										Completed
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Add Task Form */}
				<div className="saas-card" id="add-task-section" style={{ height: 'fit-content' }}>
					<h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
						Add New Task
					</h3>
					<div className="form-group-saas">
						<label className="form-label-saas">Task Heading</label>
						<input
							type="text"
							className="form-control-saas"
							placeholder="e.g. Grade assignments"
							value={heading}
							onChange={(e) => setHeading(e.target.value)}
						/>
					</div>

					<div className="form-group-saas">
						<label className="form-label-saas">Task Details</label>
						<textarea
							className="form-control-saas"
							placeholder="Describe the task details..."
							style={{ height: '120px' }}
							value={task}
							onChange={(e) => setTask(e.target.value)}
						/>
					</div>

					<button
						className="btn-primary-saas"
						style={{ width: '100%', marginTop: '8px' }}
						onClick={handleClick}
					>
						+ Add Task
					</button>
				</div>

			</div>
		</div>
	);
};

export default Home;
