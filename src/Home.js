import React, { useEffect, useState } from 'react';
import { db } from './firebase-config';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';

const Home = () => {
	const [heading, setHeading] = useState("");
	const [task, setTask] = useState("");
	const [tasklist, setTasklist] = useState([]);
	const collectionRef = collection(db, "todolist");

	const getStudentlist = async () => {
		try {
			const data = await getDocs(collectionRef);
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
		}
	};

	useEffect(() => {
		getStudentlist();
	}, []);

	const handleClick = async () => {
		if (!heading && !task) return;
		try {
			const docRef = await addDoc(collectionRef, {
				content: task,
				heading: heading,
				status: 0
			});
			setTasklist(prev => [...prev, { heading: heading, content: task, status: 0, id: docRef.id }]);
			setHeading("");
			setTask("");
		} catch (error) {
			console.error("Error adding task:", error);
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
			} catch (error) {
				console.error("Error completing task:", error);
			}
		}
	};

	return (
		<div className='container'>
			<h1>EduManage Dashboard</h1>
			<br />
			<div className='row'>
				<div className='col-lg-10 col-sm-8'>
					{tasklist.map((val) => {
						return (
							<div className="card text-white bg-info mb-3" style={{ width: "fit-content", display: "inline-block", margin: "5px" }} key={val.id}>
								<div className="card-header"><h3>{val.heading}</h3></div>
								<div className="card-body">
									<p className="card-text">
										{val.content}
									</p>
									<hr />
									<button className='btn btn-light' onClick={() => { handleComplete(val.id) }}>Completed</button>
								</div>
							</div>
						);
					})}
				</div>

				<div className='col-lg-2 col-sm-4'>
					<input type='text' className='form-control' placeholder='Add heading' value={heading} onChange={(e) => setHeading(e.target.value)} />
					<br />
					<textarea className='form-control' placeholder='Add item' style={{ height: "200px" }} value={task} onChange={(e) => setTask(e.target.value)} />
					<br />
					<button className='btn btn-warning' style={{ width: "100%" }} onClick={handleClick}>Add</button>
				</div>
			</div>
		</div>
	);
};

export default Home;
