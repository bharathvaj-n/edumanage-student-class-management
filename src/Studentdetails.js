import { useState,useEffect } from 'react';
import './App.css';
import {db} from './firebase-config';
import {collection, getDocs, addDoc, serverTimestamp} from 'firebase/firestore';
import SortDict from './SortDict';

function Studentdetails() {
  const [studentlist,setStudentlist] = useState([])
  const collectionRef=collection(db,"student_data");
  const initialState = {
		bid:"",
		sname:"",
		course:"",
		level:"",
		clcompl:"",
		startdate:""
	}
	const [inputs,setInputs] =useState(initialState);

  const handleChange=(event)=>{
		const name=event.target.name;
		const value =event.target.value;
		setInputs(values=>({...values,[name]:value}))
	}

  const insertStudentdata= async ()=>{
		await addDoc(collectionRef,{
      bid:inputs.bid,
      student_name:inputs.sname,
      course:inputs.course,
      level:inputs.level,
      classes_completed:inputs.clcompl,
      start_date:inputs.startdate,
      complete_status:0
    });
	setInputs(initialState)
	}
  //18602669966 tata AIA

  useEffect(()=>{
    const getStudentlist=async ()=>{
      const data=await getDocs(collectionRef);
      console.log(data.docs)
      const list=data.docs.map((doc)=>({...doc.data(),id:doc.id}));
	  setStudentlist(SortDict(list,'bid'))
	  
    }
    getStudentlist();
  },[]);

  return (
    <div className="Home">
      
      <h1>
				Student details</h1>
			<table className="table table-striped table-dark col-12">
				<thead>
					<tr>
						
						<th scope="col">Batch Id</th>
						<th scope="col">Student name</th>
						<th scope="col">Course</th>
						<th scope="col">Level</th>
						<th scope="col">Classes Completed</th>
						<th scope="col">Start Date</th>
						<th scope="col"></th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td> <input type="text" name="bid" value={inputs.bid} onChange={handleChange}></input> </td>
						<td> <input type="text" name="sname" value={inputs.sname} onChange={handleChange}></input> </td>
						<td> <input type="text" name="course" value={inputs.course} onChange={handleChange}></input> </td>
						<td> <input type="number" name="level" value={inputs.level} onChange={handleChange}></input> </td>
						<td> <input type="number" name="clcompl" value={inputs.clcompl} onChange={handleChange}></input> </td>
						<td> <input type="text" name="startdate" value={inputs.startdate} onChange={handleChange}></input> </td>
						<td> <button className='btn btn-info' onClick={insertStudentdata}>Add</button> </td>						
					</tr>
					{studentlist.map((val)=>{
						return(
							<tr>
								<td>{val.bid}</td>
								<td>{val.student_name}</td>
								<td>{val.course}</td>
								<td>{val.level}</td>
								<td>{val.classes_completed}</td>
								<td>{val.start_date}</td>
								<td></td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
  );
}

export default Studentdetails;
