import React, { useState, useEffect } from 'react';
import { db } from './firebase-config';
import { collection, getDocs, addDoc, updateDoc, doc, query,where} from 'firebase/firestore';
import SortDict from './SortDict';
const Classdetails = () => {
    const initialState = {
        bid:"",
        sname: "",
        class_type: "",
        class_number: "",
        date: "",
        time: "",
        class_work: "",
        home_work: "",
        attendance: 1
    }
    const classCollectionRef = collection(db, "class_data");
    const studentCollectionRef = collection(db, "student_data")

   
    const [inputs, setInputs] = useState(initialState);
    const [classdetails,setclassdetails] =useState([]);
    const [batchids, setbatchids] = useState([]);
    const [selectedId, setSelectedBid] = useState("Demo");
    const [disabledflag, setDisabled] = useState(true);
    const [viewmode, setViewmode] = useState(false); //true means view, false is add
    var today = new Date()
    const setDate = () => {
        const date = today.getFullYear() + '-' + (today.getMonth() + 1 < 10 ? '0' : '') + (today.getMonth() + 1) + '-' + (today.getDate() < 10 ? '0' : '') + today.getDate();
        const time = (today.getHours() < 10 ? '0' : '') + today.getHours() + ':' + (today.getMinutes() < 10 ? '0' : '') + today.getMinutes();
        setInputs(values => ({ ...values, date: date, time: time }))

    }

    const getBatchids = async () => {
        const data = await getDocs(studentCollectionRef);

        setbatchids(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    }

    useEffect(() => {
        setDate();
        
        getBatchids()
        // Axios.get('http://localhost:3001/class/getbid').then((response) => {
        //     setbatchids(response.data)
        //     console.log(batchids)
        // })


    }, []);


    const handleChoice = (e) => {

        setSelectedBid(e.target.value)

        if (e.target.value == 'demo') {
            setDisabled(false)
            setInputs(values => ({ ...values, sname: "", class_type: 'demo' }))

        }
        else {
            setDisabled(false)
            setInputs(values => ({ ...values, class_type: 'class' }))
        }
    }

    const handleChange = (event) => {
        const name = event.target.name;
        const value = event.target.value;
        setInputs(values => ({ ...values, [name]: value }))
        if (name === 'attendance' && value === '0') {
            setInputs(values => ({ ...values, class_work: 'NULL', home_work: "NULL" }))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (inputs.attendance == 0) {
            setInputs(values => ({ ...values, class_number: inputs.class_number - 1 }))
        }

        await addDoc(classCollectionRef, {
            sid:selectedId,
            batch_id: inputs.bid,
            student_name:inputs.sname ,
            class_type: inputs.class_type,
            class_number: inputs.class_number,
            date: inputs.date,
            time: inputs.time,
            class_work:inputs.class_work,
            home_work: inputs.home_work,
            attendance: inputs.attendance
        })
        setInputs(initialState)
        
        setDate();
        const userDoc = doc(db, "student_data",selectedId)
	
			const  updateobject= { classes_completed:Number(inputs.class_number) }
			await updateDoc(userDoc,updateobject);
        
		getBatchids();
        // Axios.post("http://localhost:3001/class/insert", {
        //     batch_id: selectedId,
        //     inputdata: inputs

        // }).then(response => {
        //     console.log(response.data)
        //     setInputs(initialState)
        //     setCw("")
        //     setHw("")
        // }).catch(error => {
        //     console.log(error.data)

        // });
    }

    const handleGetdetails = async (e) => {
        e.preventDefault();
        
        const getclassdetails = async () => {
            const q = query(
                collection(db, "class_data"),
                where("sid", "==",selectedId )
              );
            const data = await getDocs(q);

            setclassdetails(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        }
        console.log(selectedId)
        if (selectedId != 'demo') {
            setDisabled(true)
            batchids.map((val) => {
                if (val.id === selectedId) {
                    setInputs(values => ({ ...values, sname: val.student_name,bid:val.bid }))
                    const n = Number(val.classes_completed) + 1
                    setInputs(values => ({ ...values, class_number: n }))
                }

            })

           getclassdetails()
            console.log(classdetails);
            // Axios.get(`http://localhost:3001/class/getcwhw/${selectedId}`).then((response) => {

            //   setCw(response.data[0].cw)
            //   setHw(response.data[0].hw)

            // }).catch((error) => {
            //     console.log(error)
            //     alert("class data not found")
            // })
        }
        else{
             setDisabled(false)
             setInputs(values => ({ ...values, class_work: "NULL" ,home_work:"NULL"}))
        }

    }


    const handleviewlatest = () => {

        setViewmode(!viewmode);
        // Axios.get("http://localhost:3001/class/getlatest").then((response)=>{
        //     console.log(response.data[0].batch_id);
        //     setSelectedBid(response.data[0].batch_id)

        // })

    }
    return (
        <div className='container'>
            <h1>Class details</h1>

            <button style={{ width: '100px' }} onClick={handleviewlatest}
                className={(viewmode ? 'btn btn-success' : 'btn btn-danger')}>
                {viewmode ? 'View latest' : 'Add'}
            </button>

            <div className='row'>

                <form className='col-lg-6 col-md-12'>


                    <label>Batch id</label>
                    <div className='row'>
                        <select className='form-control col-md-8 col-sm-12' style={{ marginLeft: '15px' }} value={selectedId} onChange={handleChoice}>
                            <option value='demo'>Demo</option>
                            {SortDict(batchids,'bid').map((val) => {
                                if (val.complete_status == 0) {
                                    return (
                                        <option value={val.id} key={val.id}>{val.bid}</option>
                                    )
                                }
                            })}

                        </select>
                        <button className='btn btn-info col-md-3 col-sm-12' onClick={handleGetdetails} style={{ marginLeft: '15px' }}>Get data</button>
                    </div>
                    <label> Student Name</label>
                    <div className='row'>
                    <select className='form-control col-5' value={selectedId} style={{ marginLeft: '15px' }} onChange={handleChoice}>
                            <option value='demo'>Demo</option>
                            {SortDict(batchids,'student_name').map((val) => {
                                if (val.complete_status == 0) {
                                    return (
                                        <option value={val.id} key={val.id}>{val.student_name}</option>
                                        )
                                    }
                                })}

                        </select>
                    <input type='text' value={inputs.sname} name='sname' style={{ marginLeft: '15px' }} className='form-control col-5' disabled={disabledflag} onChange={handleChange}></input>
                                </div>
                    <label>Class type</label>
                    <input type='text' value={inputs.class_type} name='class_type' className='form-control' disabled={viewmode} onChange={handleChange} />
                    <label>Class number</label>
                    <input type='text' value={inputs.class_number} name='class_number' className='form-control' disabled={viewmode} onChange={handleChange} />
                    <label>Date</label>
                    <input type='date' value={inputs.date} name='date' className='form-control' disabled={viewmode} onChange={handleChange} />
                    <label>Time</label>
                    <input type='time' value={inputs.time} name='time' className='form-control' disabled={viewmode} onChange={handleChange} />
                    <label>Class work</label><br />
                    <textarea value={inputs.class_work} name='class_work' className='form-control' onChange={handleChange}></textarea>
                    <label> Home work</label>
                    <textarea value={inputs.home_work} name='home_work' className='form-control' onChange={handleChange}></textarea>
                    <label>Student attendance</label>
                    <select className='form-control' value={inputs.attendance} name='attendance' onChange={handleChange}>
                        <option value='1'>Present</option>
                        <option value='0'>Absent</option>
                    </select>
                    <br />
                    <button className='btn btn-primary' style={{ display: viewmode ? 'none' : 'inline-block' }} onClick={handleSubmit}>Submit</button>
                </form>
                <div className='col-lg-6 col-md-12' style={{ marginTop: "30px" }}>
                    
                    <table className='table bg-info table-striped'>
                        <thead>
                            <tr>
                                <th colSpan={4}>{inputs.bid}</th>
                            </tr>
                        <tr>
                            <th scope='col' >Date</th>
                            <th scope='col'>CN/Att</th>
                            <th scope='col' className='w-50'>CW</th>
                            <th scope='col' className='w-50'>HW</th>
                        </tr>
                        </thead>
                        <tbody>
                            {SortDict(classdetails,'date').map((val)=>{
                                return(
                                    <tr key={val.id}>
                                        <td>{val.date}</td>
                                        <td>{val.class_number} / {val.attendance}</td>
                                        <td>{val.class_work}</td>
                                        <td>{val.home_work}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>

                   

                </div>
            </div>
        </div>
    )
};

export default Classdetails;
