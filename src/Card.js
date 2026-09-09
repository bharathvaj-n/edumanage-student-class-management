import React from 'react';
import {db} from './firebase-config';
import {collection, getDocs, addDoc,updateDoc,doc} from 'firebase/firestore';

function Card(props){
    const collectionref=collection(db,'todolist');

    const handleComplete= async (id)=>{
        var response=window.confirm("Are you sure that the task is complete? ")
        const userDoc=doc(db,"todolist",id)
         if(response){
            const status1={status:1}
            await updateDoc(userDoc  ,status1);

         }   
	}

    return(
        <div className="card text-white bg-info mb-3 " style={{width:"fit-content",display:"inline-block",margin:"5px"}} >
                        <div className="card-header"><h3>{props.head}</h3></div>
                        <div className="card-body">
                            <p className="card-text">
                            {props.text}
                            </p>
                            <hr/>
                            <button className='btn btn-light' onClick={()=>{handleComplete(props.id)}}>Completed</button>
                        </div>
                    </div>
    )
}
export default Card;